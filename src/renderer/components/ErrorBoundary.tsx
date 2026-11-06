import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center select-none"
          style={{
            background: 'var(--surface-canvas, #1a1a1a)',
            color: 'var(--text-primary, #ffffff)',
          }}
        >
          <div
            className="ds-dialog max-w-md p-6 flex flex-col items-center text-center space-y-4"
            style={{
              background: 'var(--surface-overlay, #242424)',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--line-separator, #333333)',
              boxShadow: 'var(--shadow-overlay)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-sunken, #161616)', color: 'var(--accent-fill, #e65100)' }}
            >
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Application Encountered an Issue
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="ds-btn ds-btn--primary flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
