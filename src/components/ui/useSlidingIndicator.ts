import { useLayoutEffect, type RefObject } from 'react'

// Places the container's ::before pill under its active item, so CSS can slide it from item to
// item. The first placement is not animated; later ones are, once data-indicator is "ready".
export function useSlidingIndicator(ref: RefObject<HTMLElement | null>, selector: string, active: unknown) {
  useLayoutEffect(() => {
    const container = ref.current
    if (!container) return
    let readiness = 0
    let pending = 0
    const place = () => {
      pending = 0
      const item = container.querySelector<HTMLElement>(selector)
      if (!item) {
        delete container.dataset.indicator
        return
      }
      // Read every measurement before writing any property, so the writes force no layout.
      const x = item.offsetLeft
      const y = item.offsetTop
      const width = item.offsetWidth
      const height = item.offsetHeight
      container.style.setProperty('--indicator-x', `${x}px`)
      container.style.setProperty('--indicator-y', `${y}px`)
      container.style.setProperty('--indicator-width', `${width}px`)
      container.style.setProperty('--indicator-height', `${height}px`)
      if (!container.dataset.indicator) {
        container.dataset.indicator = 'placed'
        readiness = requestAnimationFrame(() => {
          readiness = 0
          if (container.dataset.indicator) container.dataset.indicator = 'ready'
        })
      }
    }
    const schedule = () => { pending ||= requestAnimationFrame(place) }
    place()

    // Items resize when fonts load or the layout wraps, and can be added, removed or relabelled
    // without the active value changing.
    const resizes = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null
    const observeItems = () => {
      resizes?.observe(container)
      for (const child of container.children) resizes?.observe(child)
    }
    observeItems()
    const mutations = typeof MutationObserver === 'function' ? new MutationObserver((records) => {
      for (const record of records) for (const node of record.removedNodes) if (node instanceof Element) resizes?.unobserve(node)
      observeItems()
      schedule()
    }) : null
    mutations?.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-pressed', 'class'] })

    return () => {
      cancelAnimationFrame(pending)
      // A placement whose readiness frame never ran is undone, so the next setup (Strict Mode
      // runs it twice) places the pill again and marks it ready.
      if (readiness) {
        cancelAnimationFrame(readiness)
        if (container.dataset.indicator === 'placed') delete container.dataset.indicator
      }
      resizes?.disconnect()
      mutations?.disconnect()
    }
  }, [ref, selector, active])
}
