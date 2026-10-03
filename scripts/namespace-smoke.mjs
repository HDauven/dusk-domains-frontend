import assert from 'node:assert/strict'

export async function checkNamespaceControls(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { SubdomainList } = await import('/src/features/domains/subdomains/SubdomainList.tsx')
    root.render(React.createElement(SubdomainList, {
      onRecordTargetSelect: () => {},
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
  await page.getByRole('button', {name:'Reassign',exact:true}).click()
  await page.getByLabel('New owner', {exact:true}).fill('new-owner')
  await page.getByLabel('New manager', {exact:true}).fill('new-manager')
  await page.getByRole('button', {name:'Save authorities',exact:true}).click()
  await page.waitForFunction(() => window.namespaceReassigned)
  assert.deepEqual(await page.evaluate(() => window.namespaceReassigned), ['leaf','new-owner','new-manager'])
  await page.getByRole('button', {name:'Take back',exact:true}).click()
  await page.waitForFunction(() => window.namespaceTakenBack === 'leaf')
  await page.getByRole('button', {name:'Remove',exact:true}).click()
  await page.getByRole('button', {name:'Remove name and descendants',exact:true}).click()
  await page.waitForFunction(() => window.namespaceRemoved === 'leaf')
  await page.setViewportSize({width:390,height:900})
  assert.equal(await page.locator('.subname-list').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true)
  await page.setViewportSize({width:1440,height:900})
}
