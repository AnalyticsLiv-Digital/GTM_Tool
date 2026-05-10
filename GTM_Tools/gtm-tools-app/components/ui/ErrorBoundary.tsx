"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

// Catches render-time errors in the subtree and shows a recoverable UI instead
// of crashing the whole page. Without this, one bad row in an entity list
// takes down everything including the navbar.

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional label included in console output / future Sentry tagging. */
  label?: string;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hand-rolled logger for now; swap for Sentry/OTel in Phase 5.
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="m-6 p-6 rounded-2xl border border-red-200 bg-red-50">
        <h2 className="text-lg font-semibold text-red-900 mb-1">
          Something went wrong
        </h2>
        <p className="text-sm text-red-700 mb-3">{error.message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }
}
