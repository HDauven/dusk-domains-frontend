import { useEffect, useLayoutEffect } from 'react'

// index.html carries the home page's first render (static-shell.html) so the page shows at
// once. React replaces it on mount. If something in it had focus, its counterpart takes the
// focus, text typed into the search box is kept, and entrance animations carry on instead of
// starting over.

type Handoff = { key: string, index: number, value: string | null, selectionStart: number | null, selectionEnd: number | null }
type Typed = { key: string, index: number, value: string }

const focusable = 'a[href], button, input, select, textarea, [tabindex]'
let handoff: Handoff | null = null
// Text in the shell's fields, kept apart from focus: a visitor can type, then tab elsewhere.
let typed: Typed[] = []
let animationStarts = new Map<string, CSSNumberish>()

// Identifies an element by what it is, not where it is: the same element in the mounted app
// has the same key, since the shell is the app's own markup.
function elementKey(element: Element) {
  return [
    element.tagName,
    element.id,
    element.getAttribute('name'),
    element.getAttribute('type'),
    element.getAttribute('href'),
    element.getAttribute('aria-label'),
    (element.textContent ?? '').trim(),
  ].join('|')
}

// The shell's running CSS animations, keyed by animation and element.
function cssAnimations(container: Element) {
  if (typeof container.getAnimations !== 'function') return []
  return container.getAnimations({ subtree: true }).flatMap((animation) => {
    const target = (animation.effect as KeyframeEffect | null)?.target
    const name = (animation as CSSAnimation).animationName
    return target && name ? [{ animation, key: `${name}|${elementKey(target)}` }] : []
  })
}

function sameKey(container: Element, key: string) {
  return Array.from(container.querySelectorAll(focusable)).filter((element) => elementKey(element) === key)
}

function record(container: HTMLElement, active: Element | null) {
  if (!active || active === container || !container.contains(active)) {
    handoff = null
    return
  }
  const key = elementKey(active)
  const input = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null
  handoff = {
    key,
    index: sameKey(container, key).indexOf(active),
    value: input ? input.value : null,
    selectionStart: input?.selectionStart ?? null,
    selectionEnd: input?.selectionEnd ?? null,
  }
}

function rememberTyped(container: HTMLElement, field: Element | EventTarget | null) {
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return
  const key = elementKey(field)
  const index = sameKey(container, key).indexOf(field)
  typed = [...typed.filter((entry) => entry.key !== key || entry.index !== index), { key, index, value: field.value }]
}

let stopWatching = () => {}

/**
 * Follows focus and typing in the static shell until React replaces it. Call before React
 * mounts; the mounted app stops it.
 */
export function watchStaticShell(container: HTMLElement) {
  stopWatching()
  handoff = null
  typed = []
  if (!container.hasAttribute('data-static-shell')) return
  // Typing can start before this script runs, with nothing listening yet.
  for (const field of container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
    if (field.value !== field.defaultValue) rememberTyped(container, field)
  }
  animationStarts = new Map(cssAnimations(container).flatMap(({ animation, key }) => (
    animation.startTime === null ? [] : [[key, animation.startTime] as const]
  )))
  const update = () => record(container, document.activeElement)
  const input = (event: Event) => {
    rememberTyped(container, event.target)
    update()
  }
  // A focused node that React removes may report a blur after it is detached; that is not
  // the visitor leaving the field.
  const leave = (event: FocusEvent) => {
    if ((event.target as Node).isConnected && !container.contains(event.relatedTarget as Node | null)) handoff = null
  }
  container.addEventListener('focusin', update)
  container.addEventListener('input', input)
  container.addEventListener('focusout', leave)
  // Selecting text fires no input event.
  document.addEventListener('selectionchange', update)
  stopWatching = () => {
    container.removeEventListener('focusin', update)
    container.removeEventListener('input', input)
    container.removeEventListener('focusout', leave)
    document.removeEventListener('selectionchange', update)
    stopWatching = () => {}
  }
  update()
}

function counterpart(container: HTMLElement, saved: { key: string, index: number }) {
  const matches = sameKey(container, saved.key)
  return (matches[saved.index] ?? matches[0]) as HTMLElement | undefined
}

/**
 * Hands the static shell over to the mounted app. Focus moves before the first paint. Typed
 * text follows after the app's own effects, which reset the search box for the home route.
 */
export function useStaticShellHandoff(rootId = 'root') {
  useLayoutEffect(() => {
    const container = document.getElementById(rootId)
    if (!container) return
    stopWatching()
    container.removeAttribute('data-static-shell')
    for (const { animation, key } of cssAnimations(container)) {
      const start = animationStarts.get(key)
      if (start !== undefined) animation.startTime = start
    }
    animationStarts = new Map()
    const saved = handoff
    if (saved) counterpart(container, saved)?.focus()
  }, [rootId])

  useEffect(() => {
    const container = document.getElementById(rootId)
    const saved = handoff
    if (container) {
      for (const entry of typed) {
        const target = counterpart(container, entry)
        if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) continue
        // Set the value as typing would, so React's onChange sees it.
        const prototype = target instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
        Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(target, entry.value)
        target.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    // React writes the restored text on its next commit, which moves the caret to the end, so
    // the selection follows a frame later.
    const focused = container && saved ? counterpart(container, saved) : undefined
    const start = saved?.selectionStart ?? null
    const frame = focused instanceof HTMLInputElement && start !== null
      ? requestAnimationFrame(() => {
        if (document.activeElement === focused) focused.setSelectionRange(start, saved?.selectionEnd ?? start)
      })
      : 0
    // Cleared after this commit, not during it: Strict Mode runs the app's effects twice in
    // development, and the second run of the route effect resets the search box again.
    const timer = setTimeout(() => {
      handoff = null
      typed = []
    }, 0)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [rootId])
}
