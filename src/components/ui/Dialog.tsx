import { useLayoutEffect, useRef, type ReactNode } from 'react'

export function Dialog({ open, onClose, labelledBy, children, className = '', loading = false }: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
  className?: string
  loading?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    if (!open) return
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open])

  return open ? (
    <dialog ref={ref} tabIndex={-1} className={`dialog ${className}`} aria-labelledby={labelledBy} aria-busy={loading || undefined}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
          .filter((element) => element.checkVisibility())
        const first = controls[0], last = controls[controls.length - 1]
        if (!first) { event.preventDefault(); event.currentTarget.focus() }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}
      onCancel={(event) => { event.preventDefault(); if (!loading) onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || loading) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}>
      {children}
    </dialog>
  ) : null
}
