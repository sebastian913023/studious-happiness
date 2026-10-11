import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("UI error:", error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="error-state" role="alert">
          <div className="eyebrow">Something broke</div>
          <h2>This layer failed to render.</h2>
          <p>{this.state.error.message}</p>
          <div className="btn-row">
            <button className="btn primary" onClick={() => this.setState({ error: null })}>Try again</button>
            <button className="btn" onClick={() => { window.location.hash = "#/"; this.setState({ error: null }); }}>Back to overview</button>
          </div>
        </div>
      </div>
    );
  }
}
