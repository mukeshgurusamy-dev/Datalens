import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Enterprise-grade Granular Error Boundary.
 * Catches rendering exceptions within individual dashboard cards or widgets,
 * preventing cascading white-screen crashes and providing self-healing recovery.
 */
export class CardErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DataLens CardErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="spotlight-card rounded-2xl p-6 border border-rose-500/30 bg-rose-950/20 text-rose-300 flex flex-col items-center justify-center text-center min-h-[220px]">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">
            {this.props.fallbackTitle || 'Visualization Encountered an Error'}
          </h4>
          <p className="text-xs text-rose-300/80 max-w-sm mb-4">
            {this.state.error?.message || 'A mathematical anomaly interrupted rendering for this card.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-xs font-medium text-white hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Recover Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
