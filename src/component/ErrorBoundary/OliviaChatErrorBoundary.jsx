import React from "react";
import "./OliviaChatErrorBoundary.scss";

/**
 * Error boundary used to catch render-time exceptions in the Olivia chat
 * (and, with the `variant="page"` prop, anywhere else in the app) so that
 * an unhandled error inside a child does not blank the whole screen.
 *
 * Two variants:
 *   - "modal" (default): compact card sized for the chat modal body.
 *   - "page": full-viewport recovery UI used at the route level.
 *
 * "Try again" remounts children by clearing the error state; "Reload page"
 * does a hard reload as the last-resort recovery. We also drop a small
 * breadcrumb in localStorage so support can ask the user about it.
 */
const BREADCRUMB_KEY = "olivia-chat-last-error";
const BREADCRUMB_MAX_LEN = 1000;

const writeBreadcrumb = (error, info) => {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      message: error?.message || String(error),
      stack: (error?.stack || "").slice(0, BREADCRUMB_MAX_LEN),
      componentStack: (info?.componentStack || "").slice(0, BREADCRUMB_MAX_LEN),
      at: new Date().toISOString(),
      path:
        typeof window.location !== "undefined" ? window.location.pathname : "",
    };
    window.localStorage.setItem(BREADCRUMB_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable — the breadcrumb is best-effort.
  }
};

class OliviaChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[OliviaChatErrorBoundary] caught render error", error, info);
    writeBreadcrumb(error, info);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  handleReload() {
    if (typeof window !== "undefined") window.location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const variant = this.props.variant || "modal";
    const title =
      this.props.title ||
      (variant === "page"
        ? "Something went wrong"
        : "Olivia hit a snag");
    const description =
      this.props.description ||
      (variant === "page"
        ? "The page ran into an unexpected error. Your work in the editor is autosaved; try reloading."
        : "The chat ran into an unexpected error. Your draft is saved — try reopening the chat.");

    return (
      <div className={`ocm-error-boundary ocm-error-boundary--${variant}`} role="alert">
        <div className="ocm-error-boundary__card">
          <h3 className="ocm-error-boundary__title">{title}</h3>
          <p className="ocm-error-boundary__desc">{description}</p>
          <div className="ocm-error-boundary__actions">
            <button
              type="button"
              className="ocm-error-boundary__btn ocm-error-boundary__btn--primary"
              onClick={this.handleRetry}
            >
              Try again
            </button>
            <button
              type="button"
              className="ocm-error-boundary__btn"
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default OliviaChatErrorBoundary;
