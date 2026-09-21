import { LuRedo2, LuUndo2 } from "react-icons/lu";

/**
 * Visible Undo/Redo for the manuscript editor (Quill history).
 * Keyboard shortcuts remain handled by Quill itself.
 */
const EditorHistoryControls = ({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  disabled = false,
  className = "",
}) => {
  const undoDisabled = disabled || !canUndo;
  const redoDisabled = disabled || !canRedo;

  return (
    <div
      className={`book-editor-history-controls ${className}`.trim()}
      role="group"
      aria-label="Undo and redo"
    >
      <button
        type="button"
        className="book-editor-history-btn"
        onClick={onUndo}
        disabled={undoDisabled}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <LuUndo2 size={16} aria-hidden />
        <span>Undo</span>
      </button>
      <button
        type="button"
        className="book-editor-history-btn"
        onClick={onRedo}
        disabled={redoDisabled}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <LuRedo2 size={16} aria-hidden />
        <span className="book-editor-history-btn__redo-label">Redo</span>
      </button>
    </div>
  );
};

export default EditorHistoryControls;
