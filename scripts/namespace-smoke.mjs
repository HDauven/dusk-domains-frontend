import assert from 'node:assert/strict'

export async function checkNamespaceControls(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { SubdomainList } = await import('/src/features/domains/subdomains/SubdomainList.tsx')
    root.render(React.createElement(SubdomainList, {
      onRecordTargetSelect: subname => { window.openedSubname = subname.name },
      subnames: [{node:'leaf',parentNode:'child',parentName:'docs.alice.dusk',name:'api.docs.alice.dusk',label:'api',owner:'seller',manager:'seller',expiresAt:200,parentExpiresAt:200,expiryPolicy:'inherits_parent',status:'active'}],
      authority: {
        selectedAuthority: 'root-owner',
        canControlSubname: () => true,
        onReassignSubname: async (name, owner, manager) => { window.namespaceReassigned = [name.node, owner, manager] },
        onTakeBackSubname: async name => { window.namespaceTakenBack = name.node },
        onRemoveSubname: async name => { window.namespaceRemoved = name.node },
      },
      clock: {
        currentBlockHeight: 100,
        nowSeconds: 0,
      },
      creation: {},
    }))
  })
  // A subname's name is a link to its own page, by pointer and by keyboard.
  const open = page.getByRole('link', { name: 'Open api.docs.alice.dusk', exact: true })
  assert.equal(await open.getAttribute('href'), '/name/api.docs.alice.dusk')
  await open.click()
  assert.equal(await page.evaluate(() => window.openedSubname), 'api.docs.alice.dusk')
  await page.evaluate(() => { window.openedSubname = null })
  await open.focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => window.openedSubname), 'api.docs.alice.dusk')
  await page.getByRole('button', {name:'Reassign',exact:true}).click()
  await page.getByLabel('New owner', {exact:true}).fill('new-owner')
  await page.getByLabel('New manager', {exact:true}).fill('new-manager')
  await page.getByRole('button', {name:'Save authorities',exact:true}).click()
  await page.waitForFunction(() => window.namespaceReassigned)
  assert.deepEqual(await page.evaluate(() => window.namespaceReassigned), ['leaf','new-owner','new-manager'])
  await page.getByRole('button', {name:'Take back',exact:true}).click()
  // Taking back asks first and says what the holder loses.
  await page.getByText('Take back api.docs.alice.dusk? Its records and primary name are cleared').waitFor()
  assert.equal(await page.evaluate(() => window.namespaceTakenBack), undefined)
  await page.getByRole('button', {name:'Take back name',exact:true}).click()
  await page.waitForFunction(() => window.namespaceTakenBack === 'leaf')
  await page.getByRole('button', {name:'Remove',exact:true}).click()
  await page.getByRole('button', {name:'Remove name and descendants',exact:true}).click()
  await page.waitForFunction(() => window.namespaceRemoved === 'leaf')
  await page.setViewportSize({width:390,height:900})
  assert.equal(await page.locator('.subname-list').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true)
  await page.setViewportSize({width:1440,height:900})
  await checkSubnameLayout(page)
}

// The Subnames section lines up: Create subname on the label field's line at its height, the three
// settings' labels and fields on one line each, a row's actions where its name starts, and buttons
// at their own size with space between them.
async function checkSubnameLayout(page) {
  await page.evaluate(async () => {
    await import('/src/index.css')
    await import('/src/App.css')
    const { React, root } = window
    const { SubdomainsView } = await import('/src/features/domains/SubdomainsView.tsx')
    const noop = () => {}
    root.render(React.createElement('main', { className: 'page-main', id: 'subname-layout' }, React.createElement(SubdomainsView, {
      displayName: 'sozu.dusk', error: '', managedNameExpiresAt: 200, onRecordTargetSelect: noop, txState: null,
      subnames: [{ node: 'leaf', parentNode: 'parent', parentName: 'sozu.dusk', name: 'domains.sozu.dusk', label: 'domains', owner: 'owner', manager: 'owner',
        expiresAt: 200, parentExpiresAt: 200, expiryPolicy: 'inherits_parent', status: 'active' }],
      authority: { selectedAuthority: 'owner', canControlSubname: () => true, onReassignSubname: async () => {}, onTakeBackSubname: async () => {}, onRemoveSubname: async () => {} },
      creation: { canCreateSubname: true, onCreateSubname: noop, onSubnameExpiryDateChange: noop, onSubnameExpiryPolicyChange: noop, onSubnameLabelChange: noop,
        onSubnameManagerChange: noop, subnameExpiryDate: '', subnameExpiryPolicy: 'inherits_parent', subnameLabel: 'docs', subnameManager: '' },
      clock: { currentBlockHeight: 100, nowSeconds: 0 },
    })))
  })
  await page.locator('#subname-layout .subname-advanced > summary').click()
  const box = selector => page.locator(selector).first().evaluate(element => {
    const { top, bottom, left, right, height } = element.getBoundingClientRect()
    return { top, bottom, left, right, height }
  })
  // Within a pixel: browsers place form controls at subpixel offsets that vary by machine.
  const near = (a, b) => a.every((value, i) => Math.abs(value - b[i]) <= 1)
  const label = await box('#subname-label'), create = await box('#subname-layout .field-action > .button')
  assert.ok(near([create.top, create.height], [label.top, label.height]), 'Create subname sits on the label field’s line at its height')
  const fields = await Promise.all(['subname-manager', 'subname-expiry-policy', 'subname-expiry-date'].map(async id => ({
    label: await box(`label[for="${id}"]`), control: await box(`#${id}`) })))
  for (const field of fields.slice(1)) {
    assert.ok(near([field.label.top], [fields[0].label.top]), 'The settings’ labels share a line')
    assert.ok(near([field.control.top, field.control.height], [fields[0].control.top, fields[0].control.height]), 'The settings’ fields share a line and a height')
  }
  assert.ok(fields[0].label.top - (await box('#subname-layout .subname-advanced > summary')).bottom >= 8, 'Space between Ownership and policy and its fields')
  await page.getByRole('button', { name: 'Take back', exact: true }).click()
  const name = await box('#subname-layout .subname-open'), note = await box('#subname-layout .subname-actions > p')
  assert.ok(near([name.left], [note.left]), 'A row’s actions start where its name does')
  const takeBack = await box('#subname-layout .subname-confirm .button'), cancel = await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate(element => element.getBoundingClientRect().left)
  assert.ok(cancel - takeBack.right >= 8, 'Take back name and Cancel keep apart')
  await page.getByRole('button', { name: 'Reassign', exact: true }).click()
  const owner = await box('#subname-layout .subname-reassign input'), save = await box('#subname-layout .subname-reassign button[type="submit"]')
  assert.ok(save.height <= owner.height && save.right - save.left < (owner.right - owner.left) / 2, 'Save authorities keeps a button’s size')
}
