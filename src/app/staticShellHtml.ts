// The home page's first render, written by staticShell.test.ts from the app itself. After
// changing what the home page renders first, run `npm run shell` to write it again.
export const staticShellFile = 'src/app/static-shell.html'

/** Puts the static shell into index.html's empty #root, marked so the app can tell it apart. */
export function injectStaticShell(html: string, shell: string) {
  const root = '<div id="root"></div>'
  if (!html.includes(root)) throw new Error('index.html needs an empty <div id="root"></div> for the static shell.')
  return html.replace(root, `<div id="root" data-static-shell>${shell.trim()}</div>`)
}
