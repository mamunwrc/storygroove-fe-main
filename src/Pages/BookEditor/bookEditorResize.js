/** Shared layout math for Book Editor panel resize (outline left, Scene Coach right). */

export const RESIZE_HANDLE_PX = 16;
export const EDITOR_MIN_PX = 360;
export const SCENE_COACH_MIN_PX = 320;
export const OUTLINE_MIN_PX = 280;
export const OUTLINE_DEFAULT_PX = 320;
export const OUTLINE_MAX_RATIO = 0.45;

export const getResolvedOutlineWidth = (outlineWidthPx) =>
  outlineWidthPx ?? OUTLINE_DEFAULT_PX;

/**
 * Minimum width the main stack (word count + workspace) must keep.
 */
export const getMainStackMinWidth = ({ hasRightPanel, coachWidthPx } = {}) => {
  if (!hasRightPanel) return EDITOR_MIN_PX;
  const coachReserved =
    coachWidthPx != null && coachWidthPx > 0
      ? Math.max(SCENE_COACH_MIN_PX, coachWidthPx)
      : SCENE_COACH_MIN_PX;
  return EDITOR_MIN_PX + RESIZE_HANDLE_PX + coachReserved;
};

export const clampOutlineWidthFromLayout = (
  rootContentWidth,
  px,
  { hasRightPanel, coachWidthPx } = {}
) => {
  if (!Number.isFinite(rootContentWidth) || rootContentWidth <= 0) return px;
  const mainStackMin = getMainStackMinWidth({ hasRightPanel, coachWidthPx });
  const maxByEditor = rootContentWidth - RESIZE_HANDLE_PX - mainStackMin;
  const maxByRatio = rootContentWidth * OUTLINE_MAX_RATIO;
  const maxOutline = Math.max(
    OUTLINE_MIN_PX,
    Math.min(maxByRatio, maxByEditor)
  );
  return Math.max(OUTLINE_MIN_PX, Math.min(px, maxOutline));
};

export const clampCoachWidthFromLayout = (
  workspaceContentWidth,
  px,
  { hasRightPanel = false } = {}
) => {
  if (!Number.isFinite(workspaceContentWidth) || workspaceContentWidth <= 0) {
    return px;
  }
  const handlePx = hasRightPanel ? RESIZE_HANDLE_PX : 0;
  const maxCoachWidth = Math.max(
    SCENE_COACH_MIN_PX,
    Math.min(
      workspaceContentWidth * 0.8,
      workspaceContentWidth - EDITOR_MIN_PX - handlePx
    )
  );
  return Math.max(SCENE_COACH_MIN_PX, Math.min(px, maxCoachWidth));
};

export const getRootLayout = (rootEl) => {
  if (!rootEl) return null;
  const style = window.getComputedStyle(rootEl);
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const contentWidth = rootEl.clientWidth - paddingLeft - paddingRight;
  if (!Number.isFinite(contentWidth) || contentWidth <= 0) return null;
  const rect = rootEl.getBoundingClientRect();
  return {
    contentWidth,
    paddingLeft,
    paddingRight,
    contentLeft: rect.left + paddingLeft,
    contentRight: rect.right - paddingRight,
  };
};

export const getWorkspaceLayout = (node, { hasRightPanel = false } = {}) => {
  if (!node) return null;
  const style = window.getComputedStyle(node);
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const contentWidth = node.clientWidth - paddingLeft - paddingRight;
  if (!Number.isFinite(contentWidth) || contentWidth <= 0) return null;

  const maxCoachWidth = clampCoachWidthFromLayout(contentWidth, contentWidth, {
    hasRightPanel,
  });
  const rect = node.getBoundingClientRect();

  return {
    contentWidth,
    maxCoachWidth,
    minCoachWidth: SCENE_COACH_MIN_PX,
    paddingRight,
    contentRight: rect.right - paddingRight,
  };
};

export const clampOutlineWidth = (rootEl, px, options = {}) => {
  const layout = getRootLayout(rootEl);
  if (!layout) return px;
  return clampOutlineWidthFromLayout(layout.contentWidth, px, options);
};

export const clampCoachWidth = (workspaceEl, px, options = {}) => {
  const layout = getWorkspaceLayout(workspaceEl, options);
  if (!layout) return px;
  return clampCoachWidthFromLayout(layout.contentWidth, px, options);
};
