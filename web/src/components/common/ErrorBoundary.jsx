import React from 'react';

/**
 * ErrorBoundary — wraps feature areas so a single rendering failure shows a
 * recoverable message instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[AVENQRA] Render error boundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card mx-auto mt-16 max-w-lg p-8 text-center" role="alert">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
            <span className="text-xl" aria-hidden="true">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Something went wrong in this view
          </h2>
          <p className="mt-2 break-words text-sm text-slate-500 dark:text-slate-400">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" className="btn btn-primary" onClick={this.handleReset}>
              Try again
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Reload portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
