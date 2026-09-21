import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { updateStoryBible } from "../../api/bookGeneration";

/**
 * Editable Story Bible for the upload viewer Story Hub.
 */
const UploadStoryBiblePanel = ({ novelId, storyBible = "", onUpdated }) => {
  const [text, setText] = useState(storyBible || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setText(storyBible || "");
    setDirty(false);
  }, [storyBible, novelId]);

  const handleSave = async () => {
    if (!novelId) return;
    setSaving(true);
    try {
      const result = await updateStoryBible(novelId, text);
      const saved = result?.data?.storyBible ?? text;
      const savedWordCount = result?.data?.wordCount;
      const savedName = result?.data?.name;
      setText(saved);
      setDirty(false);
      toast.success("Story Bible updated.");
      if (typeof onUpdated === "function") {
        onUpdated(saved, savedWordCount, savedName);
      }
    } catch (_) {
      toast.error("Could not save Story Bible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="upload-story-bible-panel d-flex flex-column" style={{ gap: 10 }}>
      <p className="text-muted mb-0" style={{ fontSize: 13 }}>
        Genre, comp titles, and story context from your title page live here.
        Edit as your developmental pass evolves.
      </p>
      <textarea
        className="form-control"
        rows={14}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        style={{ fontSize: 13, lineHeight: 1.55, resize: "vertical" }}
        placeholder="Your Story Bible…"
      />
      <div>
        <button
          type="button"
          className="sg-btn-fill"
          style={{ height: 34, fontSize: 13 }}
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save Story Bible"}
        </button>
      </div>
    </div>
  );
};

export default UploadStoryBiblePanel;
