/**
 * Pure scene numbering helpers (no React). Shared by utils.jsx consumers and outlineLayout.
 */

export const computeActOffsets = (data) => {
  const offsets = {};
  let cumulative = 0;
  if (!data || !data.length) {
    for (let a = 1; a <= 3; a++) {
      offsets[a] = (a - 1) * 5;
    }
    return offsets;
  }
  if (data[0] && data[0].actScenes !== undefined) {
    for (const { actNum, actScenes } of data) {
      offsets[actNum] = cumulative;
      cumulative += actScenes.length;
    }
  } else {
    const actMax = {};
    for (const uc of data) {
      const a = Number(uc.actNumber) || 1;
      const s = Number(uc.sceneIndex) || 0;
      if (s > (actMax[a] || 0)) actMax[a] = s;
    }
    for (let a = 1; a <= 3; a++) {
      if (!actMax[a]) actMax[a] = 5;
    }
    for (const act of Object.keys(actMax).map(Number).sort((a, b) => a - b)) {
      offsets[act] = cumulative;
      cumulative += actMax[act];
    }
  }
  return offsets;
};

export const getGlobalSceneNumber = (actNumber, sceneIndex, offsets) =>
  (offsets[Number(actNumber)] || 0) + Number(sceneIndex);

/** Always the continuous chapter number (Act 3 slot 1 → 11 on the 15-spine). */
export const resolveGlobalChapterNumber = (
  actNumber,
  sceneIndex,
  _globalSceneNumber,
  offsets
) => {
  if (actNumber == null || sceneIndex == null) {
    const stored = Number(_globalSceneNumber);
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  }
  return getGlobalSceneNumber(actNumber, sceneIndex, offsets || {});
};

export const formatActChapterHeading = (actNumber, chapterNumber) =>
  `Act ${actNumber} | Chapter ${chapterNumber}`;
