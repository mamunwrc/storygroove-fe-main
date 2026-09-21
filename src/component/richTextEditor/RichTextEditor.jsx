import {
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import ReactQuill from "react-quill";
import Quill from "quill";
import { formatDictationText, getDictationSeparator } from "../../utils/dictationTranscript";
import {
  isVisuallyEmptyBlockElement,
  normalizeQuillHtmlForRoundTrip,
} from "../../utils/quillHtmlNormalize";
import {
  MANUSCRIPT_PARAGRAPH_INDENT,
  clipboardNeedsIndentPreservation,
  cssLengthToInches,
  getLeadingManuscriptIndent,
  hasPositiveFirstLineIndent,
  nbspsFromIndentInches,
  nbspsFromStyleAttribute,
  readParagraphIndentInches,
  preserveLeadingIndentation,
  unwrapWordFakeEmphasis,
} from "../../utils/preserveLeadingIndentation";
import "react-quill/dist/quill.snow.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./RichTextEditor.css";
import {
  resolveManuscriptEnterIndentCount,
  scheduleIndentAfterNativeEnter,
} from "./quillEnterNewline.js";

// Curated highlighter palette — soft, accessible pastels that read well on
// white paper. Final `false` entry maps to the "remove highlight" swatch.
const HIGHLIGHT_COLORS = [
  "#fff59d", // yellow
  "#bbf7d0", // green
  "#bfdbfe", // blue
  "#fbcfe8", // pink
  "#ddd6fe", // purple
  "#fed7aa", // orange
  "#fecaca", // red
  false,
];

/** Manuscript fonts — both explicit; unset body text inherits Times New Roman from CSS. */
const FONT_WHITELIST = ["times-new-roman", "arial"];

/** Manuscript-oriented sizes in points (matches .ql-editor { font-size: 12pt }). */
const FONT_SIZES_TOOLBAR = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt"];
/** Legacy Quill saves used px — keep readable so old scenes do not lose sizing. */
const FONT_SIZES_LEGACY_PX = ["10px", "12px", "14px", "16px", "18px", "24px"];
const FONT_SIZE_WHITELIST = [...FONT_SIZES_TOOLBAR, ...FONT_SIZES_LEGACY_PX];
/**
 * Line spacing — matches Microsoft Word “multiple” presets (unitless line-height).
 * false clears inline style → manuscript default in CSS (double / 2.0).
 */
const LINE_HEIGHT_TOOLBAR = ["1", "1.15", "1.5", "2"];
const LINE_HEIGHT_WHITELIST = LINE_HEIGHT_TOOLBAR;

/** Word-style space-after-paragraph in points (12 pt body). false = no extra after. */
const PARAGRAPH_SPACING_TOOLBAR = ["0", "6pt", "12pt", "18pt"];
const PARAGRAPH_SPACING_WHITELIST = [
  ...PARAGRAPH_SPACING_TOOLBAR,
  "0.5em",
  "1em",
  "1.5em",
];

const LINE_HEIGHT_ITEM_TITLES = {
  "1": "Single spacing",
  "1.15": "1.15 line spacing",
  "1.5": "1.5 line spacing",
  "2": "Double spacing",
  "": "Manuscript default (double spacing)",
};

const PARAGRAPH_SPACING_ITEM_TITLES = {
  "0": "No space after paragraph",
  "6pt": "6 pt space after paragraph",
  "12pt": "12 pt space after paragraph",
  "18pt": "18 pt space after paragraph",
  "0.5em": "6 pt space after paragraph",
  "1em": "12 pt space after paragraph",
  "1.5em": "18 pt space after paragraph",
  "": "No extra space after (default)",
};

const FONT_ITEM_TITLES = {
  "times-new-roman": "Times New Roman",
  arial: "Arial",
};

/** Keep toolbar state when focus moves to the toolbar or outside the editor. */
const getActiveRange = (quill) => {
  const live = quill.getSelection();
  if (live != null) return live;
  const saved = quill.selection?.savedRange;
  if (saved != null) return saved;
  return null;
};

const syncFontPicker = (toolbar, activeFont) => {
  const fontPicker = toolbar.querySelector(".ql-picker.ql-font");
  if (fontPicker) {
    fontPicker.querySelectorAll(".ql-picker-item").forEach((item) => {
      item.classList.toggle(
        "ql-selected",
        item.getAttribute("data-value") === activeFont
      );
    });

    const fontPickerLabel = fontPicker.querySelector(".ql-picker-label");
    if (fontPickerLabel) {
      if (activeFont === "arial") {
        fontPickerLabel.setAttribute("data-value", "arial");
      } else {
        fontPickerLabel.removeAttribute("data-value");
      }
    }
  }

  const fontSelect = toolbar.querySelector("select.ql-font");
  if (fontSelect && fontSelect.value !== activeFont) {
    fontSelect.value = activeFont;
  }
};

const syncToolbarIndicators = (quill, root, { syncFont = true } = {}) => {
  if (!quill || !root) return;
  const toolbar = root.querySelector(".ql-toolbar");
  if (!toolbar) return;

  const range = getActiveRange(quill);
  const format = range ? quill.getFormat(range) : {};
  const sizePickerLabel = toolbar.querySelector(".ql-size .ql-picker-label");
  if (sizePickerLabel) {
    if (typeof format.size === "string" && format.size) {
      sizePickerLabel.setAttribute("data-value", format.size);
    } else {
      /* Unstyled body inherits 12pt from .ql-editor — show 12 pt, not 12px/16px. */
      sizePickerLabel.removeAttribute("data-value");
    }
  }

  const lineHeightLabel = toolbar.querySelector(
    ".ql-lineHeight .ql-picker-label"
  );
  if (lineHeightLabel) {
    if (typeof format.lineHeight === "string") {
      lineHeightLabel.setAttribute("data-value", format.lineHeight);
    } else {
      lineHeightLabel.removeAttribute("data-value");
    }
  }

  const paragraphSpacingLabel = toolbar.querySelector(
    ".ql-paragraphSpacing .ql-picker-label"
  );
  if (paragraphSpacingLabel) {
    if (typeof format.paragraphSpacing === "string") {
      paragraphSpacingLabel.setAttribute("data-value", format.paragraphSpacing);
    } else {
      paragraphSpacingLabel.removeAttribute("data-value");
    }
  }

  if (syncFont) {
    const activeFont = format.font === "arial" ? "arial" : "times-new-roman";
    syncFontPicker(toolbar, activeFont);
  }
};

const ensureToolbarLayout = (toolbar) => {
  if (!toolbar || toolbar.querySelector(".sg-toolbar-tools-scroll")) return;

  const scroll = document.createElement("div");
  scroll.className = "sg-toolbar-tools-scroll";
  [...toolbar.querySelectorAll(":scope > .ql-formats")].forEach((node) => {
    scroll.appendChild(node);
  });
  toolbar.prepend(scroll);
};

const clearPinnedPickerMenu = (options) => {
  if (!options) return;
  options.style.removeProperty("position");
  options.style.removeProperty("top");
  options.style.removeProperty("left");
  options.style.removeProperty("right");
  options.style.removeProperty("z-index");
};

/**
 * Toolbar row uses overflow-x: auto. CSS cannot clip on X and stay visible on Y,
 * and flipping overflow to visible resets scrollLeft — so right-side pickers
 * look broken. Pin open menus to the viewport instead.
 */
const pinExpandedPickerMenus = (toolbar) => {
  toolbar.querySelectorAll(".ql-picker").forEach((picker) => {
    const options = picker.querySelector(".ql-picker-options");
    if (!options) return;
    if (!picker.classList.contains("ql-expanded")) {
      clearPinnedPickerMenu(options);
      return;
    }

    const label = picker.querySelector(".ql-picker-label") || picker;
    const rect = label.getBoundingClientRect();
    options.style.position = "fixed";
    options.style.top = `${Math.round(rect.bottom + 6)}px`;
    options.style.right = "auto";
    options.style.zIndex = "2000";

    const menuWidth = options.getBoundingClientRect().width || 160;
    const maxLeft = window.innerWidth - menuWidth - 8;
    const left = Math.min(Math.max(8, rect.left), Math.max(8, maxLeft));
    options.style.left = `${Math.round(left)}px`;
  });
};

const bindPickerMenuEscape = (toolbar) => {
  const pin = () => pinExpandedPickerMenus(toolbar);
  const observer = new MutationObserver(() => {
    requestAnimationFrame(pin);
  });
  toolbar.querySelectorAll(".ql-picker").forEach((picker) => {
    observer.observe(picker, { attributes: true, attributeFilter: ["class"] });
  });
  const scrollRow = toolbar.querySelector(".sg-toolbar-tools-scroll");
  scrollRow?.addEventListener("scroll", pin, { passive: true });
  window.addEventListener("resize", pin);
  window.addEventListener("scroll", pin, true);
  return () => {
    observer.disconnect();
    scrollRow?.removeEventListener("scroll", pin);
    window.removeEventListener("resize", pin);
    window.removeEventListener("scroll", pin, true);
    toolbar.querySelectorAll(".ql-picker-options").forEach(clearPinnedPickerMenu);
  };
};

/** CSS scrolls .ql-container; Quill defaults to .ql-editor — align them. */
const bindQuillScrollContainer = (quill, rootEl, scrollContainerRef) => {
  if (!quill || !rootEl) return null;
  const container = rootEl.querySelector(".ql-container");
  if (!container) return null;
  quill.scrollingContainer = container;
  if (scrollContainerRef) {
    scrollContainerRef.current = container;
  }
  return container;
};

const Font = Quill.import("formats/font");
Font.whitelist = FONT_WHITELIST;
Quill.register(Font, true);

const SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = FONT_SIZE_WHITELIST;
Quill.register(SizeStyle, true);

const Parchment = Quill.import("parchment");
const LineHeightStyle = new Parchment.Attributor.Style(
  "lineHeight",
  "line-height",
  {
    scope: Parchment.Scope.BLOCK,
    whitelist: LINE_HEIGHT_WHITELIST,
  }
);
const ParagraphSpacingStyle = new Parchment.Attributor.Style(
  "paragraphSpacing",
  "margin-bottom",
  {
    scope: Parchment.Scope.BLOCK,
    whitelist: PARAGRAPH_SPACING_WHITELIST,
  }
);
Quill.register(LineHeightStyle, true);
Quill.register(ParagraphSpacingStyle, true);

const ManuscriptFirstLineIndentAttr = new Parchment.Attributor.Attribute(
  "manuscriptFirstLineIndent",
  "data-manuscript-first-line-indent",
  { scope: Parchment.Scope.BLOCK }
);
Quill.register(ManuscriptFirstLineIndentAttr, true);

const Delta = Quill.import("delta");

const tagManuscriptFirstLineIndentOnDelta = (delta, count) => {
  if (!delta?.ops?.length || !count) return delta;
  let tagged = false;
  const ops = delta.ops.map((op) => {
    if (tagged || typeof op.insert !== "string" || !op.insert.includes("\n")) {
      return op;
    }
    tagged = true;
    return {
      ...op,
      attributes: {
        ...(op.attributes || {}),
        manuscriptFirstLineIndent: count,
      },
    };
  });
  return tagged ? new Delta(ops) : delta;
};

const manuscriptFirstLineIndentCount = (node, delta) => {
  const first = delta?.ops?.[0];
  if (first && typeof first.insert === "string") {
    const fromText = getLeadingManuscriptIndent(first.insert).length;
    if (fromText) return fromText;
  }

  const styleText = node?.getAttribute?.("style") || "";
  if (hasPositiveFirstLineIndent(styleText)) {
    return nbspsFromStyleAttribute(styleText).length;
  }

  return 0;
};

/**
 * Quill's clipboard drops block elements that have no child nodes: `isLine()`
 * bails on `childNodes.length === 0`, so `<p></p>` contributes nothing and the
 * blank line collapses. Only `<p><br></p>` survives. Manuscript ingestion and
 * most external editors emit the bare form, and `react-quill` runs every value
 * it receives through the same converter, so blank lines were lost on paste and
 * again on each load of stored chapter HTML.
 */
const matchEmptyLine = (node, delta) => {
  if (!isVisuallyEmptyBlockElement(node)) return delta;
  const last = delta.ops?.[delta.ops.length - 1];
  const endsWithNewline =
    last &&
    typeof last.insert === "string" &&
    last.insert.endsWith("\n");
  if (endsWithNewline) return delta;
  return delta.insert("\n");
};

const indentNbspsFromPastedNode = (node) => {
  const styleText = node?.getAttribute?.("style") || "";
  const fromAttr = nbspsFromStyleAttribute(styleText);
  if (fromAttr) return fromAttr;
  const inline = node?.style?.textIndent;
  if (inline) {
    const fromInline = nbspsFromIndentInches(cssLengthToInches(inline));
    if (fromInline) return fromInline;
  }
  const inches = readParagraphIndentInches(styleText);
  if (inches != null) return nbspsFromIndentInches(inches);
  return MANUSCRIPT_PARAGRAPH_INDENT;
};

/**
 * Quill converts leftover indent CSS into a leading tab. Tabs vanish on
 * reload and do not copy on Enter — rewrite them to nbsps matching the
 * copied indent width (not a fixed 0.5").
 */
const matchWordFirstLineIndent = (node, delta) => {
  const blockTag = node?.tagName;
  if (blockTag !== "P" && blockTag !== "DIV") return delta;
  const first = delta?.ops?.[0];
  if (!first || typeof first.insert !== "string") return delta;

  let insert = first.insert;
  let changed = false;
  const indent = indentNbspsFromPastedNode(node);

  if (insert.startsWith("\t")) {
    insert = insert.replace(/^\t+/, indent);
    changed = true;
  } else if (
    hasPositiveFirstLineIndent(node.getAttribute?.("style") || "") &&
    !/^[\u00a0 ]/.test(insert)
  ) {
    insert = `${indent}${insert}`;
    changed = true;
  }

  if (!changed) {
    const count = manuscriptFirstLineIndentCount(node, delta);
    return count ? tagManuscriptFirstLineIndentOnDelta(delta, count) : delta;
  }
  return tagManuscriptFirstLineIndentOnDelta(
    new Delta([{ ...first, insert }, ...delta.ops.slice(1)]),
    indent.length
  );
};

/** Word's fake `<b style="mso-bidi-font-weight:normal">` is not real bold. */
const matchWordFakeEmphasis = (node, delta) => {
  const tag = node?.tagName;
  const style = node?.getAttribute?.("style") || "";
  const inlineWeight = node?.style?.fontWeight || "";
  const inlineStyle = node?.style?.fontStyle || "";

  if (
    (tag === "B" || tag === "STRONG") &&
    (/font-weight\s*:\s*normal/i.test(style) ||
      inlineWeight === "normal" ||
      inlineWeight === "400")
  ) {
    return delta.compose(new Delta().retain(delta.length(), { bold: null }));
  }

  if (
    (tag === "I" || tag === "EM") &&
    (/font-style\s*:\s*normal/i.test(style) || inlineStyle === "normal")
  ) {
    return delta.compose(new Delta().retain(delta.length(), { italic: null }));
  }

  return delta;
};

/* Custom matchers run after Quill's own, so this only fills the gap they leave. */
const CLIPBOARD_MATCHERS = [
  [Node.ELEMENT_NODE, matchWordFirstLineIndent],
  [Node.ELEMENT_NODE, matchWordFakeEmphasis],
  [Node.ELEMENT_NODE, matchEmptyLine],
];

/**
 * `clipboard.convert()` deletes the document's final newline whenever that op
 * carries no attributes, so a blank last line is always dropped on load. This
 * sacrificial paragraph is what gets eaten instead, leaving the real content
 * intact. It never reaches the document, so nothing needs to strip it later.
 */
const TRAILING_BLANK_SENTINEL = "<p><br></p>";

/** Round-trip blank paragraphs only — do not rewrite leading indent here (keeps Quill DOM in sync). */
const normalizeEditorHtml = (html = "") =>
  normalizeQuillHtmlForRoundTrip(html);

const TOOLBAR_CONTAINER = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ background: HIGHLIGHT_COLORS }],
  [{ align: [] }],
  [{ font: FONT_WHITELIST }],
  [{ size: [...FONT_SIZES_TOOLBAR, false] }],
  [{ lineHeight: [...LINE_HEIGHT_TOOLBAR, false] }],
  [{ paragraphSpacing: [...PARAGRAPH_SPACING_TOOLBAR, false] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link"],
];

const readHistoryAvailability = (quill) => {
  const stack = quill?.history?.stack;
  return {
    canUndo: (stack?.undo?.length ?? 0) > 0,
    canRedo: (stack?.redo?.length ?? 0) > 0,
  };
};

const EDITOR_MODULES = {
  history: {
    delay: 1000,
    maxStack: 100,
    userOnly: true,
  },
  toolbar: {
    container: TOOLBAR_CONTAINER,
    handlers: {
      font(value) {
        this.quill.format("font", value, Quill.sources.USER);
      },
    },
  },
  clipboard: { matchVisual: false, matchers: CLIPBOARD_MATCHERS },
  keyboard: {
    bindings: {
      paragraphTabIndent: {
        key: 9,
        handler() {
          const range = this.quill.getSelection();
          if (!range) return true;
          const format = this.quill.getFormat(range);
          if (format.list) return false;
          this.quill.insertText(
            range.index,
            MANUSCRIPT_PARAGRAPH_INDENT,
            Quill.sources.USER
          );
          this.quill.setSelection(
            range.index + MANUSCRIPT_PARAGRAPH_INDENT.length,
            0
          );
          return true;
        },
      },
      paragraphTabUnindent: {
        key: 9,
        shiftKey: true,
        handler() {
          const range = this.quill.getSelection();
          if (!range) return true;
          const format = this.quill.getFormat(range);
          if (format.list) return false;

          const line = this.quill.getLine(range.index);
          if (!line) return true;
          const [, offset] = line;
          const lineStart = range.index - offset;
          const beforeCursor = this.quill.getText(lineStart, offset);
          if (!/^(?:\u00a0| )+$/.test(beforeCursor)) return true;

          const removeCount = Math.min(
            MANUSCRIPT_PARAGRAPH_INDENT.length,
            beforeCursor.length
          );
          if (removeCount === 0) return true;

          this.quill.deleteText(
            range.index - removeCount,
            removeCount,
            Quill.sources.USER
          );
          this.quill.setSelection(range.index - removeCount, 0);
          return true;
        },
      },
      /**
       * Word first-line indent is a paragraph style, so Enter keeps it.
       * Let Quill handleEnter create exactly one newline; copy nbsps onto the
       * new line in the same synchronous text-change turn.
       */
      paragraphEnterContinueIndent: {
        key: 13,
        shiftKey: false,
        handler(range, context) {
          if (!range) return true;
          if (context?.format?.list || context?.format?.header) return true;
          const align = context?.format?.align;
          if (align === "center" || align === "right") return true;

          const line = this.quill.getLine(range.index);
          if (!line) return true;
          const [lineBlot, offset] = line;
          const lineStart = range.index - offset;
          const lineLength =
            typeof lineBlot.length === "function" ? lineBlot.length() : 0;
          const lineText = this.quill.getText(
            lineStart,
            Math.max(0, lineLength - 1)
          );
          const indentCount = resolveManuscriptEnterIndentCount(
            lineText,
            this.quill.getFormat(lineStart)
          );
          if (!indentCount) return true;

          scheduleIndentAfterNativeEnter(
            this.quill,
            indentCount,
            range.index + 1
          );
          return true;
        },
      },
    },
  },
};

const READONLY_MODULES = {
  toolbar: false,
  clipboard: { matchVisual: false, matchers: CLIPBOARD_MATCHERS },
};

const EDITOR_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "background",
  "align",
  "font",
  "size",
  "lineHeight",
  "paragraphSpacing",
  "list",
  "bullet",
  "link",
];

const RichTextEditor = forwardRef(function RichTextEditor(
  {
    content,
    setContent,
    height,
    readOnly = false,
    placeholder,
    onUserEdit,
    onEditorHydrated,
    onDictationManualEdit,
    onHistoryChange,
  },
  ref
) {
  const quillRef = useRef(null);
  const rootRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isUserEditRef = useRef(false);
  const dictationStartRef = useRef(null);
  const dictationEndRef = useRef(null);
  const dictationSeparatorRef = useRef("");
  const dictationPriorContextRef = useRef("");
  const dictationApplyingRef = useRef(false);
  const lastEmittedHtmlRef = useRef(null);
  const lastSilentLoadRef = useRef(null);
  // Remembers the last caret the user placed so mic focus-steal still inserts
  // where they clicked (e.g. after "testing"), not an earlier edit site.
  const lastUserSelectionIndexRef = useRef(null);
  const onDictationManualEditRef = useRef(onDictationManualEdit);
  const onUserEditRef = useRef(onUserEdit);
  const onEditorHydratedRef = useRef(onEditorHydrated);
  const onHistoryChangeRef = useRef(onHistoryChange);
  onDictationManualEditRef.current = onDictationManualEdit;
  onUserEditRef.current = onUserEdit;
  onEditorHydratedRef.current = onEditorHydrated;
  onHistoryChangeRef.current = onHistoryChange;

  /**
   * `react-quill` re-runs `clipboard.convert()` whenever `value` differs from
   * the HTML the editor last emitted, which would rewrite the document (and
   * drop the caret) on every keystroke if we handed back a rewritten string.
   * So only repair HTML that arrives from outside the editor.
   */
  const editorContent = useMemo(() => {
    if (content === lastEmittedHtmlRef.current) return content;
    return `${normalizeEditorHtml(content)}${TRAILING_BLANK_SENTINEL}`;
  }, [content]);

  /**
   * Quill / react-quill can leave the internal document out of sync with stored
   * HTML after programmatic loads. Re-apply external content with source
   * "silent" so blank `<p><br></p>` blocks survive reload.
   */
  useEffect(() => {
    if (content === lastEmittedHtmlRef.current) return;
    if (content === lastSilentLoadRef.current) return;

    let cancelled = false;
    let retryId = null;

    const applySilentLoad = () => {
      if (cancelled) return;
      const quill = quillRef.current?.getEditor?.();
      if (!quill) {
        retryId = window.setTimeout(applySilentLoad, 50);
        return;
      }
      const html = `${normalizeEditorHtml(content)}${TRAILING_BLANK_SENTINEL}`;
      quill.setContents(quill.clipboard.convert(html), Quill.sources.SILENT);
      lastSilentLoadRef.current = content;
      lastEmittedHtmlRef.current = content;
      requestAnimationFrame(() => {
        if (!cancelled) onEditorHydratedRef.current?.();
      });
    };

    applySilentLoad();

    return () => {
      cancelled = true;
      if (retryId) window.clearTimeout(retryId);
    };
  }, [content]);

  const emitHtmlFromQuill = useCallback(
    (quill) => {
      if (!quill || !setContent) return;
      const rawHtml =
        quill.root?.innerHTML ??
        (typeof quill.getHTML === "function" ? quill.getHTML() : "");
      isUserEditRef.current = true;
      lastEmittedHtmlRef.current = normalizeEditorHtml(rawHtml);
      setContent(lastEmittedHtmlRef.current);
      onUserEditRef.current?.();
    },
    [setContent]
  );

  const resolveDictationIndex = (quill) => {
    const range = quill.getSelection();
    if (range) return range.index;
    if (lastUserSelectionIndexRef.current != null) {
      return Math.max(
        0,
        Math.min(
          lastUserSelectionIndexRef.current,
          Math.max(0, quill.getLength() - 1)
        )
      );
    }
    // Last resort: focus and read (may scroll on iOS — avoid when possible).
    const focused = quill.getSelection(true);
    return focused
      ? focused.index
      : Math.max(0, quill.getLength() - 1);
  };

  const rebaseDictationAnchorToIndex = (index) => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill || index == null) return null;
    const clamped = Math.max(
      0,
      Math.min(index, Math.max(0, quill.getLength() - 1))
    );
    const before = quill.getText(0, clamped);
    dictationSeparatorRef.current = getDictationSeparator(before);
    dictationPriorContextRef.current = before;
    dictationStartRef.current = clamped;
    dictationEndRef.current = clamped;
    lastUserSelectionIndexRef.current = clamped;
    return clamped;
  };

  const rebaseDictationAnchorToSelection = () => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return null;
    return rebaseDictationAnchorToIndex(resolveDictationIndex(quill));
  };

  useImperativeHandle(
    ref,
    () => ({
      insertTextAtCursor: (text, { autoPunctuation = false } = {}) => {
        if (!text || readOnly || !setContent) return;
        const quill = quillRef.current?.getEditor?.();
        if (!quill) return;
        // Prefer remembered caret over getSelection(true) so mic focus-steal
        // does not move the insert point (and avoid iOS scroll-from-focus).
        const index = resolveDictationIndex(quill);
        const before = quill.getText(0, index);
        const separator = getDictationSeparator(before);
        const formatted = formatDictationText(String(text || "").trim(), {
          priorContext: before,
          autoPunctuation,
        });
        const insertion = separator + formatted;
        dictationApplyingRef.current = true;
        try {
          quill.insertText(index, insertion, "user");
          quill.setSelection(index + insertion.length, 0);
          lastUserSelectionIndexRef.current = index + insertion.length;
        } finally {
          dictationApplyingRef.current = false;
        }
        emitHtmlFromQuill(quill);
      },
      beginDictationAtCursor: () => {
        if (readOnly || !setContent) return null;
        const quill = quillRef.current?.getEditor?.();
        if (!quill) return null;
        return rebaseDictationAnchorToSelection();
      },
      updateDictationAtCursor: (startIndex, text, { autoPunctuation = false } = {}) => {
        if (readOnly || !setContent) return;
        const quill = quillRef.current?.getEditor?.();
        if (!quill) return;
        const start =
          startIndex ?? dictationStartRef.current ?? null;
        if (start == null) return;

        const end = dictationEndRef.current ?? start;
        const dictatedText = formatDictationText(String(text || "").trim(), {
          priorContext: dictationPriorContextRef.current,
          autoPunctuation,
        });
        const insertion = dictatedText
          ? `${dictationSeparatorRef.current}${dictatedText}`
          : "";

        dictationApplyingRef.current = true;
        try {
          if (end > start) {
            quill.deleteText(start, end - start, "user");
          }
          if (insertion) {
            quill.insertText(start, insertion, "user");
            quill.setSelection(start + insertion.length, 0);
            dictationEndRef.current = start + insertion.length;
            lastUserSelectionIndexRef.current = dictationEndRef.current;
          } else {
            dictationEndRef.current = start;
            lastUserSelectionIndexRef.current = start;
          }
        } finally {
          dictationApplyingRef.current = false;
        }
        emitHtmlFromQuill(quill);
      },
      endDictationAtCursor: (startIndex, text, { autoPunctuation = false } = {}) => {
        if (readOnly || !setContent) return;
        const quill = quillRef.current?.getEditor?.();
        if (!quill) return;
        const start =
          startIndex ?? dictationStartRef.current ?? null;
        if (start == null) return;

        const end = dictationEndRef.current ?? start;
        const dictatedText = formatDictationText(String(text || "").trim(), {
          priorContext: dictationPriorContextRef.current,
          autoPunctuation,
        });
        const insertion = dictatedText
          ? `${dictationSeparatorRef.current}${dictatedText}`
          : "";

        dictationApplyingRef.current = true;
        try {
          if (end > start) {
            quill.deleteText(start, end - start, "user");
          }
          if (insertion) {
            quill.insertText(start, insertion, "user");
            const nextIndex = start + insertion.length;
            quill.setSelection(nextIndex, 0);
            lastUserSelectionIndexRef.current = nextIndex;
          }
        } finally {
          dictationApplyingRef.current = false;
        }
        emitHtmlFromQuill(quill);

        dictationSeparatorRef.current = "";
        dictationPriorContextRef.current = "";
        dictationStartRef.current = null;
        dictationEndRef.current = null;
      },
      rebaseDictationAfterManualEdit: () => {
        if (dictationStartRef.current == null) return null;
        return rebaseDictationAnchorToSelection();
      },
      undo: () => {
        if (readOnly) return;
        const quill = quillRef.current?.getEditor?.();
        if (!quill?.history) return;
        quill.history.undo();
        emitHtmlFromQuill(quill);
        onHistoryChangeRef.current?.(readHistoryAvailability(quill));
      },
      redo: () => {
        if (readOnly) return;
        const quill = quillRef.current?.getEditor?.();
        if (!quill?.history) return;
        quill.history.redo();
        emitHtmlFromQuill(quill);
        onHistoryChangeRef.current?.(readHistoryAvailability(quill));
      },
    }),
    [readOnly, setContent, emitHtmlFromQuill]
  );

  useEffect(() => {
    if (!rootRef.current) return;

    let quillInstance = null;
    let pasteRoot = null;
    let retryId = null;
    let cancelled = false;
    let unbindPickerMenus = null;

    const handlePaste = (event) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const html = clipboard.getData("text/html");
      const text = clipboard.getData("text/plain");

      if (!clipboardNeedsIndentPreservation(html, text)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (!quillInstance) return;

      const range = quillInstance.getSelection(true);
      const index = range?.index ?? Math.max(0, quillInstance.getLength() - 1);
      const deleteLength = range?.length ?? 0;

      if (deleteLength) {
        quillInstance.deleteText(index, deleteLength, Quill.sources.USER);
      }

      if (html) {
        const converted = preserveLeadingIndentation(
          unwrapWordFakeEmphasis(normalizeQuillHtmlForRoundTrip(html))
        );
        const delta = quillInstance.clipboard.convert(converted);
        quillInstance.updateContents(
          new Delta().retain(index).concat(delta),
          Quill.sources.USER
        );
        quillInstance.setSelection(index + delta.length(), 0);
      } else {
        const insertion = String(text).replace(/\t/g, MANUSCRIPT_PARAGRAPH_INDENT);
        quillInstance.insertText(index, insertion, Quill.sources.USER);
        quillInstance.setSelection(index + insertion.length, 0);
      }
    };

    const handleSync = () => {
      if (rootRef.current && quillInstance) {
        syncToolbarIndicators(quillInstance, rootRef.current);
      }
    };

    const handleTextChangeSync = () => {
      if (rootRef.current && quillInstance) {
        /* Font picker is driven by selection-change + dropdown change only.
           text-change can fire before Quill clears the old font class. */
        syncToolbarIndicators(quillInstance, rootRef.current, {
          syncFont: false,
        });
      }
      if (quillInstance) {
        onHistoryChangeRef.current?.(readHistoryAvailability(quillInstance));
      }
    };

    const handleDictationManualEdit = (delta, _oldDelta, source) => {
      if (source !== "user") return;
      if (dictationApplyingRef.current) return;
      if (dictationStartRef.current == null) return;
      if (readOnly) return;

      const ops = delta?.ops;
      if (!Array.isArray(ops)) return;
      const hasContentChange = ops.some(
        (op) => op.insert != null || op.delete != null
      );
      if (!hasContentChange) return;

      const newStart = rebaseDictationAnchorToSelection();
      if (newStart == null) return;
      onDictationManualEditRef.current?.(newStart);
    };

    // After deleting mid-sentence, the insert point stays at the edit site.
    // If the user then clicks elsewhere (e.g. after "testing") and keeps
    // talking, move the live insert point to that caret.
    const handleDictationSelectionChange = (range, _oldRange, source) => {
      if (range) {
        lastUserSelectionIndexRef.current = range.index;
      }
      if (source !== "user") return;
      if (!range) return;
      if (dictationApplyingRef.current) return;
      if (dictationStartRef.current == null) return;
      if (readOnly) return;

      const start = dictationStartRef.current;
      const end = dictationEndRef.current ?? start;
      // Still at the live tip — no move needed.
      if (range.index === end) return;

      const newStart = rebaseDictationAnchorToIndex(range.index);
      if (newStart == null || newStart === start) return;
      onDictationManualEditRef.current?.(newStart);
    };

    const initToolbar = () => {
      if (cancelled || !rootRef.current) return;

      quillInstance = quillRef.current?.getEditor?.();
      if (!quillInstance) {
        retryId = window.setTimeout(initToolbar, 50);
        return;
      }

      bindQuillScrollContainer(
        quillInstance,
        rootRef.current,
        scrollContainerRef
      );
      onHistoryChangeRef.current?.(readHistoryAvailability(quillInstance));
      if (readOnly) return;

      const toolbar = rootRef.current.querySelector(".ql-toolbar");
      if (!toolbar) {
        retryId = window.setTimeout(initToolbar, 50);
        return;
      }

      const labels = [
        [".ql-bold", "Bold (Ctrl+B)"],
        [".ql-italic", "Italic (Ctrl+I)"],
        [".ql-underline", "Underline (Ctrl+U)"],
        [".ql-strike", "Strikethrough"],
        [".ql-link", "Insert link"],
        ['.ql-list[value="ordered"]', "Numbered list"],
        ['.ql-list[value="bullet"]', "Bullet list"],
        [".ql-header .ql-picker-label", "Paragraph style"],
        [".ql-font .ql-picker-label", "Font family"],
        [".ql-size .ql-picker-label", "Font size"],
        [".ql-lineHeight .ql-picker-label", "Line spacing (single, 1.5, double)"],
        [
          ".ql-paragraphSpacing .ql-picker-label",
          "Space after paragraph (0, 6, 12, or 18 pt)",
        ],
        [".ql-align .ql-picker-label", "Text alignment"],
        [".ql-background .ql-picker-label", "Highlight"],
      ];

      labels.forEach(([selector, label]) => {
        const el = toolbar.querySelector(selector);
        if (!el) return;
        el.setAttribute("title", label);
        el.setAttribute("aria-label", label);
      });

      const alignTitles = {
        "": "Align left",
        center: "Align center",
        right: "Align right",
        justify: "Justify",
      };
      toolbar
        .querySelectorAll(".ql-align .ql-picker-options .ql-picker-item")
        .forEach((item) => {
          const v = item.getAttribute("data-value") || "";
          const title = alignTitles[v];
          if (title) {
            item.setAttribute("title", title);
            item.setAttribute("aria-label", title);
          }
        });

      toolbar
        .querySelectorAll(".ql-lineHeight .ql-picker-options .ql-picker-item")
        .forEach((item) => {
          const v = item.getAttribute("data-value") ?? "";
          const title = LINE_HEIGHT_ITEM_TITLES[v];
          if (title) {
            item.setAttribute("title", title);
            item.setAttribute("aria-label", title);
          }
        });

      toolbar
        .querySelectorAll(
          ".ql-paragraphSpacing .ql-picker-options .ql-picker-item"
        )
        .forEach((item) => {
          const v = item.getAttribute("data-value") ?? "";
          const title = PARAGRAPH_SPACING_ITEM_TITLES[v];
          if (title) {
            item.setAttribute("title", title);
            item.setAttribute("aria-label", title);
          }
        });

      toolbar
        .querySelectorAll(".ql-font .ql-picker-options .ql-picker-item")
        .forEach((item) => {
          const v = item.getAttribute("data-value") ?? "";
          const title = FONT_ITEM_TITLES[v];
          if (title) {
            item.setAttribute("title", title);
            item.setAttribute("aria-label", title);
          }
        });

      ensureToolbarLayout(toolbar);
      unbindPickerMenus = bindPickerMenuEscape(toolbar);

      const fontSelect = toolbar.querySelector("select.ql-font");
      if (fontSelect) {
        fontSelect.addEventListener(
          "change",
          () => {
            const activeFont =
              fontSelect.value === "arial" ? "arial" : "times-new-roman";
            /* Run after Quill's own change handler + toolbar.update so stale
               getFormat() cannot snap the label back to the previous font. */
            window.queueMicrotask(() => {
              syncFontPicker(toolbar, activeFont);
            });
          },
          true
        );
      }

      quillInstance.on("selection-change", handleSync);
      quillInstance.on("selection-change", handleDictationSelectionChange);
      quillInstance.on("text-change", handleTextChangeSync);
      quillInstance.on("text-change", handleDictationManualEdit);
      if (!readOnly) {
        pasteRoot = quillInstance.root;
        pasteRoot.addEventListener("paste", handlePaste, true);
      }
      handleSync();
    };

    initToolbar();

    return () => {
      cancelled = true;
      if (retryId) window.clearTimeout(retryId);
      unbindPickerMenus?.();
      if (pasteRoot) {
        pasteRoot.removeEventListener("paste", handlePaste, true);
      }
      if (quillInstance) {
        quillInstance.off("selection-change", handleSync);
        quillInstance.off("selection-change", handleDictationSelectionChange);
        quillInstance.off("text-change", handleTextChangeSync);
        quillInstance.off("text-change", handleDictationManualEdit);
      }
    };
  }, [readOnly]);

  useLayoutEffect(() => {
    if (isUserEditRef.current) {
      isUserEditRef.current = false;
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollTop;
      }
    });
  }, [content]);

  const handleChange = (_value, _delta, source) => {
    if (readOnly || !setContent) return;
    // Only propagate genuine user edits. Quill fires text-change with source
    // "api"/"silent" when it normalizes the HTML we feed it on load (attribute
    // reordering, empty-paragraph rewrites, &nbsp; handling). Treating that echo
    // as an edit marked the editor dirty ("Unsaved") on load and could trigger
    // an autosave loop. Dictation inserts call setContent directly, so live
    // voice typing is unaffected.
    if (source !== "user") return;
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;
    emitHtmlFromQuill(quill);
  };

  return (
    <div
      ref={rootRef}
      className={`d-flex flex-column rich-text-editor-root${height === "100%" ? " rich-text-editor-root--fill" : ""}`}
      style={{
        height: height || "78vh",
        minHeight: 0,
        ...(height === "100%" ? { flex: 1 } : {}),
      }}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorContent}
        onChange={handleChange}
        modules={readOnly ? READONLY_MODULES : EDITOR_MODULES}
        formats={EDITOR_FORMATS}
        readOnly={readOnly}
        className="editor-container h-100"
        placeholder={placeholder || "Enter text here..."}
        style={{ background: "transparent" }}
      />
    </div>
  );
});

export default RichTextEditor;
