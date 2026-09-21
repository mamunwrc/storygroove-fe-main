import { useState, useEffect, useCallback } from "react";
import { LuImage } from "react-icons/lu";
import { getCoverVersions } from "../../api/bookGeneration";
import { resolveCoverAssetUrl } from "./coverChatHelpers";

const GALLERY_PAGE_SIZE = 10;
const SKELETON_COUNT = 10;

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const GallerySkeletonGrid = () => (
  <div
    className="bcs-gallery-tab"
    role="tabpanel"
    id="bcs-panel-covers"
    aria-labelledby="bcs-tab-covers"
    aria-busy="true"
    aria-label="Loading cover gallery"
  >
    <div className="bcs-gallery-grid">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <article key={`skeleton-${i}`} className="bcs-gallery-card bcs-gallery-card--skeleton">
          <div className="bcs-gallery-skeleton__image" />
          <div className="bcs-gallery-skeleton__meta">
            <span className="bcs-gallery-skeleton__line bcs-gallery-skeleton__line--short" />
            <span className="bcs-gallery-skeleton__line bcs-gallery-skeleton__line--date" />
          </div>
        </article>
      ))}
    </div>
  </div>
);

const BookCoverGalleryTab = ({
  novelId,
  onPreview,
  refreshKey = 0,
}) => {
  const [versions, setVersions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: GALLERY_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPage = useCallback(
    async (page) => {
      if (!novelId) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await getCoverVersions(novelId, {
          page,
          limit: GALLERY_PAGE_SIZE,
        });
        setVersions(data.versions || []);
        setPagination((prev) => ({
          ...prev,
          ...(data.pagination || {}),
        }));
      } catch (err) {
        console.error("Failed to load cover versions:", err);
        setError("Could not load gallery.");
      } finally {
        setLoading(false);
      }
    },
    [novelId]
  );

  useEffect(() => {
    loadPage(pagination.page);
  }, [novelId, pagination.page, refreshKey, loadPage]);

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  if (loading && versions.length === 0) {
    return <GallerySkeletonGrid />;
  }

  if (!loading && versions.length === 0) {
    return (
      <div className="bcs-gallery-tab bcs-gallery-tab--empty">
        <span className="bcs-gallery-tab__empty-icon" aria-hidden>
          <LuImage size={28} />
        </span>
        <p>No cover versions yet.</p>
        <p className="bcs-gallery-tab__empty-hint">
          Ask for a cover in Studio — your images will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bcs-gallery-tab${loading ? " bcs-gallery-tab--refreshing" : ""}`}
      role="tabpanel"
      id="bcs-panel-covers"
      aria-labelledby="bcs-tab-covers"
      aria-busy={loading}
    >
      {error && (
        <p className="bcs-gallery-tab__error" role="alert">
          {error}
        </p>
      )}

      <div className="bcs-gallery-grid">
        {versions.map((v) => (
          <article key={v.id} className="bcs-gallery-card">
            <button
              type="button"
              className="bcs-gallery-card__image-btn"
              onClick={() => onPreview?.(v, versions)}
              aria-label={`View cover version ${v.versionNumber} larger`}
            >
              <img
                src={resolveCoverAssetUrl(v.coverUrl)}
                alt={`Cover version ${v.versionNumber}`}
                className="bcs-gallery-card__image"
              />
            </button>
            <div className="bcs-gallery-card__meta">
              <span className="bcs-gallery-card__version">v{v.versionNumber}</span>
              <span className="bcs-gallery-card__date">{formatDate(v.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="bcs-gallery-pagination">
          <button
            type="button"
            className="bcs-gallery-pagination__btn"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            Previous
          </button>
          <span className="bcs-gallery-pagination__info">
            Page {pagination.page} of {pagination.totalPages}
            {pagination.total > 0 && ` (${pagination.total} total)`}
          </span>
          <button
            type="button"
            className="bcs-gallery-pagination__btn"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default BookCoverGalleryTab;
