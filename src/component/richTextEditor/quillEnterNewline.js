import Quill from "quill";
import { getLeadingManuscriptIndent } from "../../utils/preserveLeadingIndentation";

export const resolveManuscriptEnterIndentCount = (lineText, blockFormat) => {
  const attrCount = parseInt(blockFormat?.manuscriptFirstLineIndent, 10);
  if (Number.isFinite(attrCount) && attrCount > 0) return attrCount;
  return getLeadingManuscriptIndent(lineText || "").length;
};

/**
 * After Quill's native handleEnter runs, copy first-line nbsps onto the new
 * paragraph. Hook text-change so indent lands in the same synchronous turn as
 * the newline (before React re-renders from the first text-change).
 */
export const scheduleIndentAfterNativeEnter = (
  quill,
  indentCount,
  fallbackCursorIndex
) => {
  if (!indentCount) return;

  const indent = "\u00a0".repeat(indentCount);
  const onTextChange = (_delta, _oldDelta, source) => {
    if (source !== "user") return;
    quill.off("text-change", onTextChange);

    const sel = quill.getSelection();
    const cursorIndex =
      sel?.index ??
      (Number.isFinite(fallbackCursorIndex) ? fallbackCursorIndex : null);
    if (cursorIndex == null) return;

    const nextLine = quill.getLine(cursorIndex);
    if (!nextLine) return;
    const [, nextOffset] = nextLine;
    const nextStart = cursorIndex - (nextOffset || 0);

    const existing = quill.getText(nextStart, indent.length);
    if (getLeadingManuscriptIndent(existing).length >= indentCount) {
      quill.setSelection(nextStart + indentCount, 0, Quill.sources.SILENT);
      return;
    }

    if (quill.getText(nextStart, 1) === "\t") {
      quill.deleteText(nextStart, 1, Quill.sources.USER);
    }

    quill.insertText(nextStart, indent, Quill.sources.USER);
    quill.setSelection(
      nextStart + indent.length,
      0,
      Quill.sources.SILENT
    );
  };

  quill.on("text-change", onTextChange);
};
