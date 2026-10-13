import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../ui/Button'

type BoundaryState = { failed: boolean; resetKey: unknown }

// Data from the chain or the indexer can still reach a view in a shape it can't render. A failure
// is contained here, with a way to try again, and reported to the console; its message, which may
// carry raw data, is never shown.
abstract class ErrorBoundary<P extends { children: ReactNode; resetKey?: unknown }> extends Component<P, BoundaryState> {
  state: BoundaryState = { failed: false, resetKey: this.props.resetKey }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  // Another page or name starts again.
  static getDerivedStateFromProps(props: { resetKey?: unknown }, state: BoundaryState) {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey }
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('A view failed to render', error, info.componentStack)
  }
  retry = () => this.setState({ failed: false })
}

/** Keeps one broken view from taking the rest of the app with it. */
export class ViewErrorBoundary extends ErrorBoundary<{ children: ReactNode; resetKey?: unknown }> {
  render() {
    if (!this.state.failed) return this.props.children
    return <div className="search-status" role="alert">
      <p>This page couldn’t be shown. Try again, or open another page.</p>
      <Button onClick={this.retry}>Try again</Button>
    </div>
  }
}

/** The last resort around the whole app: a message and a reload instead of a blank page. */
export class RootErrorBoundary extends ErrorBoundary<{ children: ReactNode }> {
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="page-main">
      <div className="search-status" role="alert">
        <p>Dusk Domains couldn’t load this page. Reload to try again.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </main>
  }
}
