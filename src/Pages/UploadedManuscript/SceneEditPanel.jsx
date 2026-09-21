import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LuRefreshCw } from "react-icons/lu";
import { getEllisChapterReview } from "../../api/bookGeneration";
import EllisReviewLoadingState from "./EllisReviewLoadingState";
import { EllisChapterReviewView } from "./ellisReviewFormat";
import {
  chapterProgressKey,
  getNextChapterAfter,
  normalizeChapterSuffix,
} from "./utils";
import "./SceneArchitectReview.scss";

const emptyReviewEntry = () => ({
  status: "none",
  review: null,
  error: null,
});

/**
 * Display-only Scene Edit panel — reviews are generated in Ellis' chat and
 * inserted explicitly; this panel loads saved EllisChapterReview records.
 */
const SceneEditPanel = ({
  novelId,
  selectedChapter = null,
  chapters = [],
  letterReady = false,
  blocked = false,
  reviewProgress = {},
  reviewRefreshToken = 0,
}) => {
  const [reviewStatus, setReviewStatus] = useState("none");
  const [review, setReview] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [isFetchingReview, setIsFetchingReview] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const activeChapterRef = useRef(null);
  const reviewCacheRef = useRef({});

  const chapterNumber = selectedChapter?.chapterNumber ?? null;
  const chapterSuffix = normalizeChapterSuffix(selectedChapter?.chapterSuffix);
  const chapterLabel = selectedChapter?.label || null;
  const chapterKey = Number.isFinite(Number(chapterNumber))
    ? chapterProgressKey(chapterNumber, chapterSuffix)
    : null;
  const hasAnyReviewActivity = Object.keys(reviewProgress).length > 0;

  const displayEntry = useMemo(() => {
    if (chapterKey == null) return emptyReviewEntry();
    const cached = reviewCacheRef.current[chapterKey];
    if (cached) return cached;
    if (activeChapterRef.current === chapterKey) {
      return {
        status: reviewStatus,
        review,
        error: reviewError,
      };
    }
    return emptyReviewEntry();
  }, [chapterKey, reviewStatus, review, reviewError]);

  const displayStatus = displayEntry.status;
  const displayReview = displayEntry.review;
  const displayError = displayEntry.error;

  const nextChapter = useMemo(() => {
    if (!Number.isFinite(Number(chapterNumber))) return null;
    return getNextChapterAfter(chapters, chapterNumber, chapterSuffix);
  }, [chapters, chapterNumber, chapterSuffix]);

  const isLastChapter =
    Number.isFinite(Number(chapterNumber)) &&
    chapters.length > 0 &&
    !nextChapter;

  const applyReviewEntry = useCallback((num, entry) => {
    reviewCacheRef.current[num] = entry;
    if (activeChapterRef.current === num) {
      setReviewStatus(entry.status);
      setReview(entry.review);
      setReviewError(entry.error);
    }
  }, []);

  const applyReviewResponse = useCallback(
    (num, data) => {
      applyReviewEntry(num, {
        status: data.status || "none",
        review: data.review || null,
        error: data.review?.error || null,
      });
    },
    [applyReviewEntry]
  );

  const fetchReview = useCallback(
    async (num, suffix = "") => {
      const key = chapterProgressKey(num, suffix);
      try {
        const data = await getEllisChapterReview(novelId, num, suffix);
        applyReviewResponse(key, data);
      } catch (_) {
        /* transient */
      }
    },
    [novelId, applyReviewResponse]
  );

  const hydrateFromCache = useCallback((num) => {
    const cached = reviewCacheRef.current[num];
    if (!cached) {
      setReviewStatus("none");
      setReview(null);
      setReviewError(null);
      return false;
    }
    setReviewStatus(cached.status);
    setReview(cached.review);
    setReviewError(cached.error);
    return true;
  }, []);

  useLayoutEffect(() => {
    activeChapterRef.current = chapterKey;

    if (!novelId || blocked || chapterKey == null) {
      setIsFetchingReview(false);
      return;
    }

    const hasCached = Boolean(reviewCacheRef.current[chapterKey]);
    hydrateFromCache(chapterKey);
    setIsFetchingReview(!hasCached);
  }, [novelId, blocked, chapterKey, hydrateFromCache]);

  useEffect(() => {
    if (!novelId || blocked || chapterKey == null) return;

    const key = chapterKey;
    let cancelled = false;

    (async () => {
      try {
        const data = await getEllisChapterReview(
          novelId,
          chapterNumber,
          chapterSuffix
        );
        if (cancelled || activeChapterRef.current !== key) return;
        applyReviewResponse(key, data);
      } catch (_) {
        /* leave cached or empty */
      } finally {
        if (!cancelled && activeChapterRef.current === key) {
          setIsFetchingReview(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    novelId,
    blocked,
    chapterKey,
    chapterNumber,
    chapterSuffix,
    reviewRefreshToken,
    applyReviewResponse,
  ]);

  const hasCachedReview =
    chapterKey != null && Boolean(reviewCacheRef.current[chapterKey]);

  const showChapterLoader =
    chapterKey != null &&
    isFetchingReview &&
    !hasCachedReview &&
    displayStatus !== "ready" &&
    !displayReview;

  const displayMarkdown = displayReview?.reviewMarkdown;
  const hasDisplayMarkdown = Boolean(String(displayMarkdown || "").trim());
  const showEmptyState =
    !showChapterLoader &&
    Number.isFinite(Number(chapterNumber)) &&
    letterReady &&
    !hasDisplayMarkdown &&
    displayStatus !== "failed";

  if (blocked) {
    return (
      <div className="p-3 text-muted" style={{ fontSize: 14 }}>
        Ellis' editing is available on the Studio plan. Upgrade to get an
        editorial letter and scene-by-scene developmental edits.
      </div>
    );
  }

  return (
    <div
      className="ellis-scene-review d-flex flex-column flex-grow-1"
      style={{ gap: 8, height: "100%", minHeight: 0, overflow: "hidden" }}
    >
      {letterReady &&
        !hasAnyReviewActivity &&
        !welcomeDismissed && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            background: "#eef4ff",
            border: "1px solid #c5d8f7",
            borderRadius: 8,
            padding: "10px 12px",
            flexShrink: 0,
          }}
        >
          Your editorial letter is ready. Open Ellis in chat to run your first
          chapter review, then click Insert to Revision Plan.
          <button
            type="button"
            className="ms-2"
            style={{
              background: "none",
              border: "none",
              color: "#2d72d9",
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
            onClick={() => setWelcomeDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        className="sidebar-scene-pane-header d-flex align-items-center justify-content-between mb-1"
        style={{ flexShrink: 0, paddingRight: 14 }}
      >
        <h5 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          Chapter-by-Chapter Review
        </h5>
        {chapterLabel && (
          <span className="text-muted" style={{ fontSize: 12 }}>
            {chapterLabel}
          </span>
        )}
      </div>

      {!Number.isFinite(Number(chapterNumber)) && (
        <div className="text-muted" style={{ fontSize: 13, padding: "8px 0" }}>
          Select a chapter on the left to view its saved developmental edit.
        </div>
      )}

      {Number.isFinite(Number(chapterNumber)) && !letterReady && (
        <div className="text-muted" style={{ fontSize: 13, padding: "8px 0" }}>
          Complete and save your editorial letter to begin scene-by-scene edits.
        </div>
      )}

      {Number.isFinite(Number(chapterNumber)) && letterReady && (
        <>
          {showChapterLoader && (
            <EllisReviewLoadingState
              variant="loading"
              chapterLabel={chapterLabel}
            />
          )}

          {!showChapterLoader && showEmptyState && (
            <div style={{ fontSize: 13, padding: "8px 0", lineHeight: 1.55 }}>
              <p className="text-muted mb-0">
                No review saved yet. Open Ellis in chat, run a developmental
                edit pass for this chapter, then click{" "}
                <strong>Insert to Revision Plan</strong>.
              </p>
            </div>
          )}

          {displayStatus === "failed" && (
            <div style={{ fontSize: 13, padding: "8px 0" }}>
              <div className="text-danger mb-2">
                {displayError || "The saved review could not be loaded."}
              </div>
              <button
                type="button"
                className="sg-btn-outline d-flex align-items-center gap-1"
                style={{ height: 30, fontSize: 12 }}
                onClick={() => fetchReview(chapterNumber, chapterSuffix)}
              >
                <LuRefreshCw size={13} /> Reload
              </button>
            </div>
          )}

          {hasDisplayMarkdown && displayReview && (
            <div className="sidebar-scene-content rounded mt-1 d-flex flex-column">
              <div className="ellis-saved-review-markdown">
                <EllisChapterReviewView text={displayMarkdown} />
              </div>
              {isLastChapter &&
                displayReview.reviewMarkdown && (
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    marginTop: 12,
                    fontWeight: 600,
                    color: "#1b7a3d",
                  }}
                >
                  This concludes your first developmental edit pass.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SceneEditPanel;
