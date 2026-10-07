import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'

const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture() {
  mkdirSync('node_modules/.cache', { recursive: true })
  const root = mkdtempSync(resolve('node_modules/.cache/deploy-test-'))
  roots.push(root)
  const repo = `${root}/repo`
  for (const path of ['repo/scripts', 'repo/public/contracts', 'bin', 'server', 'tmp', 'drivers']) mkdirSync(`${root}/${path}`, { recursive: true })
  for (const file of ['deploy.sh', 'deploy-release.py', 'validate-deploy.mjs']) {
    if (existsSync(`scripts/${file}`)) cpSync(`scripts/${file}`, `${repo}/scripts/${file}`)
  }
  writeFileSync(`${repo}/public/contracts/.keep`, '')
  writeFileSync(`${repo}/release`, 'initial')
  const roles = ['DIRECTORY', 'POLICY', 'STORE', 'VAULT', 'RESOLVER', 'MARKETPLACE']
  const hash = createHash('sha256').update('\0asm').digest('hex')
  const driverPath = role => `/contracts/dusk-domains-${({ RESOLVER: 'frozen-resolver', MARKETPLACE: 'marketplace-v1' })[role] ?? role.toLowerCase()}.${hash}.data-driver.wasm`
  for (const role of roles) writeFileSync(`${root}/drivers/${driverPath(role).split('/').at(-1)}`, '\0asm')
  const driver = driverPath('STORE')
  const envFile = `${root}/network.env`
  writeFileSync(envFile, [
    'VITE_DUSK_DOMAINS_SITE_URL=https://site.example',
    'VITE_DUSK_DOMAINS_CHAIN_ID=dusk:2',
    ...roles.flatMap(role => [
      `VITE_DUSK_DOMAINS_${role}_CONTRACT_ID=0x${'11'.repeat(32)}`,
      `VITE_DUSK_DOMAINS_${role}_DRIVER_URL=${driverPath(role)}`,
    ]),
  ].join('\n'))
  const script = (name, source) => writeFileSync(`${root}/bin/${name}`, source, { mode: 0o755 })
  script('ssh', '#!/usr/bin/env bash\nset -euo pipefail\nprintf "ssh %s\\n" "$*" >> "$MOCK_LOG"\nshift\nexec "$@"\n')
  script('npm', `#!/usr/bin/env node
const fs = require('node:fs')
const { parseEnv } = require('node:util')
fs.appendFileSync(process.env.MOCK_LOG, 'npm ' + process.argv.slice(2).join(' ') + '\\n')
if (process.argv[2] === 'ci') process.exit(0)
if (process.env.FAIL_BUILD) process.exit(1)
if (process.env.VITE_DUSK_DOMAINS_SITE_URL) throw new Error('Ambient env leaked into build')
const env = parseEnv(fs.readFileSync('.env.production.local', 'utf8'))
fs.mkdirSync('dist')
fs.cpSync('public/contracts', 'dist/contracts', { recursive: true })
fs.writeFileSync('dist/version.json', JSON.stringify({frontendCommit: process.env.DUSK_DOMAINS_FRONTEND_COMMIT, siteUrl: env.VITE_DUSK_DOMAINS_SITE_URL, chainId: env.VITE_DUSK_DOMAINS_CHAIN_ID}))
fs.writeFileSync('dist/index.html', fs.readFileSync('release'))
`)
  script('rsync', `#!/usr/bin/env node
const fs = require('node:fs')
fs.appendFileSync(process.env.MOCK_LOG, 'rsync\\n')
if (process.env.FAIL_UPLOAD) process.exit(1)
const args = process.argv.slice(2)
fs.cpSync(args.at(-2), args.at(-1).split(':').slice(1).join(':'), { recursive: true })
`)
  script('curl', `#!/usr/bin/env node
const fs = require('node:fs')
fs.appendFileSync(process.env.MOCK_LOG, 'curl ' + process.argv.slice(2).join(' ') + '\\n')
const version = JSON.parse(fs.readFileSync(process.env.DEPLOY_DIR + '/version.json', 'utf8'))
if (process.env.WRONG_COMMIT) version.frontendCommit = 'wrong'
console.log(JSON.stringify(version))
`)
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Deploy Test', '-c', 'user.email=deploy-test@example.invalid', ...args], { cwd: repo, encoding: 'utf8' }).trim()
  git('init', '--quiet')
  git('add', '.')
  git('commit', '--quiet', '-m', 'Create fixture')
  const env = {
    ...process.env, PATH: `${root}/bin:${process.env.PATH}`, TMPDIR: `${root}/tmp`,
    DEPLOY_HOST: 'fixture', DEPLOY_DIR: `${root}/server/dist`, MOCK_LOG: `${root}/calls`,
    VITE_DUSK_DOMAINS_SITE_URL: 'https://wrong.example',
  }
  const run = (args = [envFile, '--contracts', `${root}/drivers`], extra = {}) => spawnSync('bash', [`${repo}/scripts/deploy.sh`, ...args], { cwd: repo, env: { ...env, ...extra }, encoding: 'utf8' })
  const commit = () => git('rev-parse', 'HEAD')
  const release = name => {
    writeFileSync(`${repo}/release`, name)
    git('add', 'release')
    git('commit', '--quiet', '-m', `Release ${name}`)
    return commit()
  }
  const version = () => JSON.parse(readFileSync(`${env.DEPLOY_DIR}/version.json`, 'utf8'))
  const backups = () => readdirSync(`${root}/server`).filter(name => name.startsWith('dist.prev-')).sort().reverse()
  const failed = () => readdirSync(`${root}/server`).filter(name => name.startsWith('dist.failed-'))
  return { root, repo, env, envFile, git, run, release, version, backups, failed, commit, driver }
}

it('builds a clean commit with selected env and drivers, uploads, verifies and cleans up', () => {
  const f = fixture()
  const result = f.run()
  expect(result.status, result.stderr).toBe(0)
  expect(f.version()).toEqual({ frontendCommit: f.commit(), chainId: 'dusk:2', siteUrl: 'https://site.example' })
  expect(readFileSync(`${f.env.DEPLOY_DIR}${f.driver}`, 'utf8')).toBe('\0asm')
  expect(readFileSync(`${f.root}/calls`, 'utf8')).toMatch(/npm ci --include=dev\nnpm run build[\s\S]*ssh [^\n]* prepare [\s\S]*rsync[\s\S]* activate [\s\S]*curl .*https:\/\/site.example\/version.json\?commit=/)
  expect(f.git('status', '--porcelain')).toBe('')
  expect(existsSync(`${f.repo}/.env.production.local`)).toBe(false)
  expect(readdirSync(`${f.root}/tmp`)).toEqual([])
  expect(readdirSync(`${f.root}/server`)).toEqual(['dist'])
})

it('keeps three prior releases and rolls back one release further each time without building', () => {
  const f = fixture()
  const commits = [f.commit()]
  expect(f.run().status).toBe(0)
  for (let i = 1; i <= 4; i++) {
    commits.push(f.release(String(i)))
    const result = f.run()
    expect(result.status, result.stderr).toBe(0)
  }
  expect(f.backups()).toHaveLength(3)
  expect(f.backups().map(name => JSON.parse(readFileSync(`${f.root}/server/${name}/version.json`)).frontendCommit)).toEqual(commits.slice(1, 4).reverse())
  writeFileSync(`${f.root}/calls`, '')
  const rollback = f.run(['--rollback'])
  expect(rollback.status, rollback.stderr).toBe(0)
  expect(f.version().frontendCommit).toBe(commits[3])
  expect(readFileSync(`${f.root}/calls`, 'utf8')).not.toMatch(/npm|rsync/)
  expect(f.failed().map(name => JSON.parse(readFileSync(`${f.root}/server/${name}/version.json`)).frontendCommit)).toEqual([commits[4]])
  expect(f.run(['--rollback']).status).toBe(0)
  expect(f.version().frontendCommit).toBe(commits[2])
}, 30_000)

it('keeps the last verified release through repeated failed verifications', () => {
  const f = fixture()
  const verified = f.commit()
  expect(f.run().status).toBe(0)
  for (let i = 1; i <= 4; i++) {
    f.release(`unverified ${i}`)
    expect(f.run(undefined, { WRONG_COMMIT: '1' }).status).not.toBe(0)
  }
  expect(f.backups().map(name => JSON.parse(readFileSync(`${f.root}/server/${name}/version.json`)).frontendCommit)).toContain(verified)
}, 30_000)

it.each(['tracked', 'untracked'])('refuses a %s dirty worktree before building or uploading', kind => {
  const f = fixture()
  writeFileSync(`${f.repo}/${kind === 'tracked' ? 'release' : 'untracked'}`, 'dirty')
  const result = f.run()
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain('dirty worktree')
  expect(existsSync(`${f.root}/calls`)).toBe(false)
})

it.each(['FAIL_BUILD', 'FAIL_UPLOAD'])('preserves the live release and cleans temporary files after %s', failure => {
  const f = fixture()
  expect(f.run().status).toBe(0)
  const initial = f.version()
  f.release('failed')
  expect(f.run(undefined, { [failure]: '1' }).status).not.toBe(0)
  expect(f.version()).toEqual(initial)
  expect(readdirSync(`${f.root}/tmp`)).toEqual([])
  expect(readdirSync(`${f.root}/server`)).toEqual(['dist'])
})

it('reports a verification mismatch and retains the previous release for rollback', () => {
  const f = fixture()
  expect(f.run().status).toBe(0)
  f.release('unverified')
  const result = f.run(undefined, { WRONG_COMMIT: '1' })
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain('differs from expected')
  expect(f.backups()).toHaveLength(1)
  expect(existsSync(`${f.env.DEPLOY_DIR}.lock`)).toBe(false)
  expect(f.run(['--rollback']).status).toBe(0)
})

it('refuses absent drivers, concurrent deploys and rollback without a backup', () => {
  const f = fixture()
  expect(f.run([f.envFile]).status).not.toBe(0)
  expect(existsSync(`${f.env.DEPLOY_DIR}`)).toBe(false)
  const rollback = f.run(['--rollback'])
  expect(rollback.status).not.toBe(0)
  expect(rollback.stderr).toContain('No previous release')
  mkdirSync(`${f.env.DEPLOY_DIR}.lock`)
  writeFileSync(`${f.env.DEPLOY_DIR}.lock/owner`, 'other-deployment')
  expect(f.run().status).not.toBe(0)
  expect(readFileSync(`${f.env.DEPLOY_DIR}.lock/owner`, 'utf8')).toBe('other-deployment')
})

it('rolls back through consecutive hand-deployed backups named prev-YYYYMMDD-N', () => {
  const f = fixture()
  const initial = f.commit()
  expect(f.run().status).toBe(0)
  for (const n of [1, 2]) {
    mkdirSync(`${f.root}/server/dist.prev-20261005-${n}`)
    writeFileSync(`${f.root}/server/dist.prev-20261005-${n}/version.json`, JSON.stringify({ frontendCommit: `handdeployed-${n}` }))
  }
  f.release('next')
  expect(f.run().status).toBe(0)
  expect(f.run(['--rollback']).status).toBe(0)
  expect(f.version().frontendCommit).toBe(initial)
  for (const n of [2, 1]) {
    const rollback = f.run(['--rollback'])
    expect(rollback.status, rollback.stderr).toBe(0)
    expect(f.version()).toMatchObject({ frontendCommit: `handdeployed-${n}`, siteUrl: 'https://site.example' })
  }
}, 30_000)
