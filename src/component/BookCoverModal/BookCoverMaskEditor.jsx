import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuBrush,
  LuEraser,
  LuRectangleHorizontal,
  LuUndo2,
  LuRedo2,
  LuPaintbrush,
  LuSparkles,
  LuChevronDown,
  LuChevronUp,
} from "react-icons/lu";

const MAX_HISTORY = 30;
const FULL_CANVAS_THRESHOLD = 0.85;

const analyzeMaskSelection = (maskCanvas) => {
  const ctx = maskCanvas.getContext("2d");
  const { data, width, height } = ctx.getImageData(
    0,
    0,
    maskCanvas.width,
    maskCanvas.height
  );
  const total = width * height;
  if (!total) return { hasSelection: false, isFullCanvas: false };

  let whiteCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 128) whiteCount += 1;
  }

  const ratio = whiteCount / total;
  if (ratio <= 0) return { hasSelection: false, isFullCanvas: false };
  if (ratio >= FULL_CANVAS_THRESHOLD) {
    return { hasSelection: false, isFullCanvas: true };
  }
  return { hasSelection: true, isFullCanvas: false };
};

const BookCoverMaskEditor = ({
  imageUrl,
  versionNumber,
  onCancel,
  onApply,
  isApplying = false,
  enhancePrompt = false,
  onEnhancePromptChange,
}) => {
  const containerRef = useRef(null);
  const displayCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const [tool, setTool] = useState("brush");
  const [brushSize, setBrushSize] = useState(24);
  const [prompt, setPrompt] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showRegionTools, setShowRegionTools] = useState(false);
  const [localApplying, setLocalApplying] = useState(false);
  const drawingRef = useRef(false);
  const applying = isApplying || localApplying;
  const rectStartRef = useRef(null);
  const layoutRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, width: 0, height: 0 });

  const pushHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    const snapshot = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, snapshot].slice(-MAX_HISTORY);
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  const redrawDisplay = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const img = imageRef.current;
    if (!displayCanvas || !maskCanvas || !img) return;

    const ctx = displayCanvas.getContext("2d");
    const { scale, offsetX, offsetY, width, height } = layoutRef.current;

    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(img, offsetX, offsetY, width, height);

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(
      maskCanvas,
      0,
      0,
      maskCanvas.width,
      maskCanvas.height,
      offsetX,
      offsetY,
      width,
      height
    );
    ctx.restore();
  }, []);

  const initCanvas = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    const maskCanvas = maskCanvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!img || !container || !maskCanvas || !displayCanvas) return;

    const maxW = container.clientWidth;
    const maxH = Math.min(480, window.innerHeight * 0.45);
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const offsetX = Math.floor((maxW - width) / 2);
    const offsetY = 0;

    layoutRef.current = { scale, offsetX, offsetY, width, height };

    displayCanvas.width = maxW;
    displayCanvas.height = height;
    maskCanvas.width = img.naturalWidth;
    maskCanvas.height = img.naturalHeight;

    const maskCtx = maskCanvas.getContext("2d");
    maskCtx.fillStyle = "#000000";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const initial = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setHistory([initial]);
    setHistoryIndex(0);
    setImageLoaded(true);
    redrawDisplay();
  }, [redrawDisplay]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      initCanvas();
    };
    img.onerror = () => setImageLoaded(false);
    img.src = imageUrl;
  }, [imageUrl, initCanvas]);

  useEffect(() => {
    if (!showRegionTools || !imageRef.current) return undefined;
    const id = requestAnimationFrame(() => initCanvas());
    return () => cancelAnimationFrame(id);
  }, [showRegionTools, initCanvas]);

  const toMaskCoords = (clientX, clientY) => {
    const displayCanvas = displayCanvasRef.current;
    const rect = displayCanvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = layoutRef.current;
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
    return { x, y };
  };

  const paint = (x, y, erase = false) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d");
    ctx.fillStyle = erase ? "#000000" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / layoutRef.current.scale, 0, Math.PI * 2);
    ctx.fill();
    redrawDisplay();
  };

  const handlePointerDown = (e) => {
    if (applying || !showRegionTools) return;
    const { x, y } = toMaskCoords(e.clientX, e.clientY);
    drawingRef.current = true;
    if (tool === "rectangle") {
      rectStartRef.current = { x, y };
      pushHistory();
      return;
    }
    pushHistory();
    paint(x, y, tool === "eraser");
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || applying || !showRegionTools) return;
    const { x, y } = toMaskCoords(e.clientX, e.clientY);
    if (tool === "rectangle" && rectStartRef.current) {
      const maskCanvas = maskCanvasRef.current;
      const snapshot = history[historyIndex];
      if (maskCanvas && snapshot) {
        const ctx = maskCanvas.getContext("2d");
        ctx.putImageData(snapshot, 0, 0);
        const start = rectStartRef.current;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          Math.min(start.x, x),
          Math.min(start.y, y),
          Math.abs(x - start.x),
          Math.abs(y - start.y)
        );
        redrawDisplay();
      }
      return;
    }
    if (tool === "brush" || tool === "eraser") {
      paint(x, y, tool === "eraser");
    }
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    rectStartRef.current = null;
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.getContext("2d").putImageData(history[nextIndex], 0, 0);
      redrawDisplay();
    }
    setHistoryIndex(nextIndex);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      maskCanvas.getContext("2d").putImageData(history[nextIndex], 0, 0);
      redrawDisplay();
    }
    setHistoryIndex(nextIndex);
  };

  const exportMask = () =>
    new Promise((resolve, reject) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) {
        reject(new Error("Mask not ready"));
        return;
      }
      maskCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export mask"));
      }, "image/png");
    });

  const handleApply = async () => {
    if (!prompt.trim() || applying) return;
    setLocalApplying(true);
    try {
      let maskBlob = null;
      if (showRegionTools && maskCanvasRef.current) {
        const { hasSelection, isFullCanvas } = analyzeMaskSelection(
          maskCanvasRef.current
        );
        if (hasSelection) {
          maskBlob = await exportMask();
        } else if (isFullCanvas) {
          // Full-canvas paint would regenerate without book metadata — use prompt-only edit.
          maskBlob = null;
        }
      }

      await onApply?.({ prompt: prompt.trim(), maskBlob, enhancePrompt });
    } catch (err) {
      console.error("Cover refine failed:", err);
    } finally {
      setLocalApplying(false);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="bcs-mask-editor">
      <div className="bcs-mask-editor__header">
        <div className="bcs-mask-editor__title">
          <span className="bcs-mask-editor__title-icon">
            <LuPaintbrush size={16} aria-hidden />
          </span>
          <div>
            <p className="bcs-mask-editor__title-text">Refine cover</p>
            {versionNumber != null && (
              <p className="bcs-mask-editor__title-sub">
                Refining version {versionNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bcs-mask-editor__prompt-wrap bcs-mask-editor__prompt-wrap--primary">
        <label className="bcs-mask-editor__prompt-label" htmlFor="bcs-refine-prompt">
          What would you like to change?
        </label>
        <textarea
          id="bcs-refine-prompt"
          className="bcs-mask-editor__prompt"
          rows={3}
          placeholder="e.g. Remove the castle, keep mostly the moon, no figure in the foreground…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={applying}
        />
        <label className="bcs-mask-editor__enhance">
          <input
            type="checkbox"
            checked={enhancePrompt}
            onChange={(e) => onEnhancePromptChange?.(e.target.checked)}
            disabled={applying}
          />
          <LuSparkles size={14} aria-hidden />
          Enhance prompt with AI
        </label>
      </div>

      <p className="bcs-mask-editor__hint bcs-mask-editor__hint--primary">
        Describe your changes above — your book title and author name stay the
        same unless you ask to change them. Use region selection below only when
        you need a precise local fix.
      </p>

      <button
        type="button"
        className="bcs-mask-editor__region-toggle"
        onClick={() => setShowRegionTools((prev) => !prev)}
        aria-expanded={showRegionTools}
        disabled={applying}
      >
        {showRegionTools ? (
          <LuChevronUp size={16} aria-hidden />
        ) : (
          <LuChevronDown size={16} aria-hidden />
        )}
        Select a specific region (optional)
      </button>

      {showRegionTools && (
        <>
          <div className="bcs-mask-editor__toolbar">
            <div className="bcs-mask-editor__tool-group">
              <button
                type="button"
                className={`bcs-mask-editor__tool${tool === "brush" ? " is-active" : ""}`}
                onClick={() => setTool("brush")}
                title="Brush"
                aria-label="Brush"
              >
                <LuBrush size={18} />
              </button>
              <button
                type="button"
                className={`bcs-mask-editor__tool${tool === "rectangle" ? " is-active" : ""}`}
                onClick={() => setTool("rectangle")}
                title="Rectangle"
                aria-label="Rectangle"
              >
                <LuRectangleHorizontal size={18} />
              </button>
              <button
                type="button"
                className={`bcs-mask-editor__tool${tool === "eraser" ? " is-active" : ""}`}
                onClick={() => setTool("eraser")}
                title="Eraser"
                aria-label="Eraser"
              >
                <LuEraser size={18} />
              </button>
            </div>

            <label className="bcs-mask-editor__size">
              <span>Brush</span>
              <input
                type="range"
                min={8}
                max={80}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
            </label>

            <div className="bcs-mask-editor__tool-group bcs-mask-editor__tool-group--end">
              <button
                type="button"
                className="bcs-mask-editor__tool"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo"
                aria-label="Undo"
              >
                <LuUndo2 size={18} />
              </button>
              <button
                type="button"
                className="bcs-mask-editor__tool"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo"
                aria-label="Redo"
              >
                <LuRedo2 size={18} />
              </button>
            </div>
          </div>

          <div className="bcs-mask-editor__canvas-wrap" ref={containerRef}>
            <canvas
              ref={displayCanvasRef}
              className="bcs-mask-editor__canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <canvas ref={maskCanvasRef} className="bcs-mask-editor__mask-hidden" aria-hidden="true" />
            {!imageLoaded && (
              <p className="bcs-mask-editor__loading">Loading image for editing…</p>
            )}
          </div>

          <p className="bcs-mask-editor__hint">
            Paint over <strong>only</strong> the area you want to change. Leave
            the rest untouched for the cleanest local edit.
          </p>
        </>
      )}

      <div className="bcs-mask-editor__actions">
        <button
          type="button"
          className="bcs-lightbox__btn bcs-lightbox__btn--outline"
          onClick={onCancel}
          disabled={applying}
        >
          Cancel
        </button>
        <button
          type="button"
          className="bcs-lightbox__btn bcs-lightbox__btn--primary"
          onClick={handleApply}
          disabled={applying || !prompt.trim()}
          aria-busy={applying}
        >
          <LuSparkles size={16} />
          {applying ? "Applying refinement please wait" : "Apply refinement"}
        </button>
      </div>
    </div>
  );
};

export default BookCoverMaskEditor;
