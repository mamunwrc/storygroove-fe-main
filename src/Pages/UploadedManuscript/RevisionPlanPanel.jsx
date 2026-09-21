import React, { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { toast } from "react-toastify";
import { LuTrash2 } from "react-icons/lu";
import {
  getRevisionPlanItems,
  deleteRevisionPlanItem,
} from "../../api/bookGeneration";

const SOURCE_LABEL = {
  editorial_letter: "Editorial Letter",
  ellis_chat: "Ellis' Edits",
  scene_review: "Scene Review",
  creative_suggestion: "Creative Suggestion",
  manual: "Note",
};

/**
 * Ellis' Editing Plan: saved Ellis' feedback for an uploaded manuscript.
 */
const RevisionPlanPanel = ({ novelId, refreshKey = 0, ellisAccessible = true }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!novelId || !ellisAccessible) return;
    setLoading(true);
    try {
      const data = await getRevisionPlanItems(novelId);
      setItems(data.items || []);
    } catch (err) {
      // Empty plan is a valid state.
    } finally {
      setLoading(false);
    }
  }, [novelId, ellisAccessible]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDelete = async (itemId) => {
    try {
      await deleteRevisionPlanItem(novelId, itemId);
      setItems((prev) => prev.filter((i) => String(i._id) !== String(itemId)));
    } catch (err) {
      toast.error("Could not remove this item.");
    }
  };

  if (!ellisAccessible) {
    return (
      <div className="p-3 text-muted" style={{ fontSize: 14 }}>
        The Ellis' Editing Plan is part of Ellis' editing, available on the Studio plan.
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="p-3 text-muted" style={{ fontSize: 14 }}>
        Nothing saved yet. As you work with Ellis, use “Save to Ellis' Editing Plan” on
        the editorial letter or any chapter feedback to build your editing plan
        here.
      </div>
    );
  }

  return (
    <div className="revision-plan-panel d-flex flex-column" style={{ gap: 10 }}>
      {loading && (
        <div className="text-muted" style={{ fontSize: 13 }}>
          Loading your Ellis' Editing Plan…
        </div>
      )}
      {items.map((item) => (
        <div
          key={item._id}
          className="revision-plan-item"
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "10px 12px",
            background: "#fff",
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#2d72d9",
                background: "#eef4ff",
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              {SOURCE_LABEL[item.source] || "Saved"}
              {item.chapterLabel ? ` · ${item.chapterLabel}` : ""}
            </span>
            <button
              type="button"
              className="revision-plan-delete"
              onClick={() => handleDelete(item._id)}
              aria-label="Remove item"
              style={{
                background: "none",
                border: "none",
                color: "#c0392b",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <LuTrash2 size={15} />
            </button>
          </div>
          {item.title && (
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>
              {item.title}
            </div>
          )}
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {item.content || ""}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RevisionPlanPanel;
