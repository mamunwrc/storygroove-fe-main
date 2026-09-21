const VARIANT_COPY = {
  loading: {
    statusLabel: "Loading review",
    subtitle: (label) => `Checking Ellis' notes for ${label}…`,
  },
  starting: {
    statusLabel: "Starting Ellis' edit",
    subtitle: (label) => `Preparing scene-by-scene review for ${label}…`,
  },
  generating: {
    statusLabel: (label) => `Ellis is reviewing ${label}`,
    subtitle: () =>
      "Scene-by-scene developmental notes will appear here. This usually takes a couple of minutes.",
  },
};

/**
 * Themed loading state for Ellis scene-by-scene review in the upload viewer.
 * Single stacked card — avoids scene-design-waiting row flex splitting strip and card.
 */
const EllisReviewLoadingState = ({
  variant = "generating",
  chapterLabel = null,
}) => {
  const label = chapterLabel || "this chapter";
  const copy = VARIANT_COPY[variant] || VARIANT_COPY.generating;
  const statusLabel =
    typeof copy.statusLabel === "function"
      ? copy.statusLabel(label)
      : copy.statusLabel;
  const subtitle = copy.subtitle(label);

  return (
    <div
      className="ellis-review-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ellis-review-loading__card">
        <div className="ellis-review-loading__header">
          <span className="ellis-review-loading__pulse" aria-hidden />
          <span className="ellis-review-loading__label">{statusLabel}</span>
        </div>
        <div className="ellis-review-loading__progress" aria-hidden>
          <div className="ellis-review-loading__progress-fill" />
        </div>
        <p className="ellis-review-loading__hint">{subtitle}</p>
        <div className="ellis-review-loading__lines" aria-hidden>
          <span className="ellis-review-loading__line" />
          <span className="ellis-review-loading__line" />
          <span className="ellis-review-loading__line ellis-review-loading__line--short" />
        </div>
      </div>
    </div>
  );
};

export default EllisReviewLoadingState;
