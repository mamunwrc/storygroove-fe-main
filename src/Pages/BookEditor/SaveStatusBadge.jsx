/**
 * Save status pill for the Book Editor and upload viewer toolbars.
 * Coloured indicator (animated for in-flight states) plus a short label.
 */
const SaveStatusBadge = ({ state, label, className = "" }) => (
  <span
    className={`save-status-pill save-status-pill--${state} ${className}`.trim()}
    role="status"
    aria-live="polite"
    aria-label={`Document status: ${label}`}
  >
    <span className="save-status-pill__indicator" aria-hidden="true" />
    <span className="save-status-pill__label">{label}</span>
  </span>
);

export default SaveStatusBadge;
