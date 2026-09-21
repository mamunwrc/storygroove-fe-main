import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export const FAB_DRAG_THRESHOLD_PX = 4;

const DESKTOP_INSET = { right: 20, bottom: 20 };
const MOBILE_INSET = { right: 12, bottom: 12 };

export function getFabInset() {
  if (typeof window === "undefined") return DESKTOP_INSET;
  return window.matchMedia("(max-width: 767px)").matches
    ? MOBILE_INSET
    : DESKTOP_INSET;
}

export function clampFabPosition(x, y, containerEl, fabEl) {
  if (!containerEl || !fabEl) return { x, y };
  const fabWidth = fabEl.offsetWidth;
  const fabHeight = fabEl.offsetHeight;
  const maxX = Math.max(0, containerEl.clientWidth - fabWidth);
  const maxY = Math.max(0, containerEl.clientHeight - fabHeight);
  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
  };
}

export function getDefaultFabPosition(containerEl, fabEl, inset = getFabInset()) {
  if (!containerEl || !fabEl) return { x: 0, y: 0 };
  const x = containerEl.clientWidth - fabEl.offsetWidth - inset.right;
  const y = containerEl.clientHeight - fabEl.offsetHeight - inset.bottom;
  return clampFabPosition(x, y, containerEl, fabEl);
}

function applyFabPosition(anchorEl, pos) {
  if (!anchorEl || !pos) return;
  anchorEl.style.left = `${pos.x}px`;
  anchorEl.style.top = `${pos.y}px`;
  anchorEl.style.transform = "";
}

/**
 * Draggable FAB within containerRef bounds. Session-only position via React state.
 * Click (movement <= threshold) invokes onOpenChat on pointerup.
 * When snapToDefaultWhen is true (e.g. focus mode), FAB moves to bottom-right.
 */
export function useDraggableFab(containerRef, onOpenChat, snapToDefaultWhen = false) {
  const anchorRef = useRef(null);
  const buttonRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const positionRef = useRef(null);
  const dragStateRef = useRef(null);
  const onOpenChatRef = useRef(onOpenChat);

  useEffect(() => {
    onOpenChatRef.current = onOpenChat;
  }, [onOpenChat]);

  const syncPosition = useCallback(
    (nextPos, { commit = true } = {}) => {
      const container = containerRef?.current;
      const button = buttonRef.current;
      const anchor = anchorRef.current;
      if (!container || !button || !anchor || !nextPos) return null;

      const clamped = clampFabPosition(nextPos.x, nextPos.y, container, button);
      applyFabPosition(anchor, clamped);
      positionRef.current = clamped;
      if (commit) {
        setPosition(clamped);
      }
      return clamped;
    },
    [containerRef]
  );

  const resetToDefault = useCallback(() => {
    const container = containerRef?.current;
    const button = buttonRef.current;
    if (!container || !button) return;
    const defaultPos = getDefaultFabPosition(container, button);
    syncPosition(defaultPos);
    setIsPositioned(true);
  }, [containerRef, syncPosition]);

  useLayoutEffect(() => {
    if (!snapToDefaultWhen) return undefined;
    const frameId = requestAnimationFrame(() => {
      resetToDefault();
    });
    return () => cancelAnimationFrame(frameId);
  }, [snapToDefaultWhen, resetToDefault]);

  useLayoutEffect(() => {
    if (position !== null) return;
    resetToDefault();
  }, [position, resetToDefault]);

  useLayoutEffect(() => {
    if (position == null) return;
    applyFabPosition(anchorRef.current, position);
  }, [position]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      if (positionRef.current) {
        syncPosition(positionRef.current);
      } else {
        resetToDefault();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, resetToDefault, syncPosition]);

  const handlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0 || !buttonRef.current) return;

      const container = containerRef?.current;
      const button = buttonRef.current;
      const anchor = anchorRef.current;
      if (!container || !anchor) return;

      e.preventDefault();

      const currentPos =
        positionRef.current ?? getDefaultFabPosition(container, button);

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: currentPos.x,
        originY: currentPos.y,
        didDrag: false,
        pointerId: e.pointerId,
      };

      button.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        const state = dragStateRef.current;
        if (!state || ev.pointerId !== state.pointerId) return;

        const dx = ev.clientX - state.startX;
        const dy = ev.clientY - state.startY;

        if (!state.didDrag) {
          if (Math.hypot(dx, dy) <= FAB_DRAG_THRESHOLD_PX) return;
          state.didDrag = true;
          setIsDragging(true);
        }

        const clamped = clampFabPosition(
          state.originX + dx,
          state.originY + dy,
          container,
          button
        );
        applyFabPosition(anchor, clamped);
      };

      const onUp = (ev) => {
        const state = dragStateRef.current;
        if (!state || ev.pointerId !== state.pointerId) return;

        if (button.hasPointerCapture(state.pointerId)) {
          button.releasePointerCapture(state.pointerId);
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);

        if (state.didDrag) {
          const dx = ev.clientX - state.startX;
          const dy = ev.clientY - state.startY;
          syncPosition({
            x: state.originX + dx,
            y: state.originY + dy,
          });
          setIsDragging(false);
        } else {
          onOpenChatRef.current?.();
        }

        dragStateRef.current = null;
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [containerRef, syncPosition]
  );

  return {
    anchorRef,
    buttonRef,
    isDragging,
    isPositioned,
    handlePointerDown,
  };
}
