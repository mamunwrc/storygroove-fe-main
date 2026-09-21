import test from "node:test";
import assert from "node:assert/strict";
import {
  OUTLINE_MIN_PX,
  OUTLINE_DEFAULT_PX,
  SCENE_COACH_MIN_PX,
  clampOutlineWidthFromLayout,
  clampCoachWidthFromLayout,
  getMainStackMinWidth,
  getResolvedOutlineWidth,
} from "./bookEditorResize.js";

test("clampOutlineWidthFromLayout respects min and ratio cap", () => {
  const rootWidth = 1600;
  const clamped = clampOutlineWidthFromLayout(rootWidth, 900, {
    hasRightPanel: true,
    coachWidthPx: null,
  });
  assert.ok(clamped <= rootWidth * 0.45 + 1);
  assert.ok(clamped >= OUTLINE_MIN_PX);
});

test("clampOutlineWidthFromLayout shrinks when coach is wide", () => {
  const rootWidth = 1400;
  const narrowCoach = clampOutlineWidthFromLayout(rootWidth, 500, {
    hasRightPanel: true,
    coachWidthPx: SCENE_COACH_MIN_PX,
  });
  const wideCoach = clampOutlineWidthFromLayout(rootWidth, 500, {
    hasRightPanel: true,
    coachWidthPx: 600,
  });
  assert.ok(wideCoach < narrowCoach);
});

test("clampCoachWidthFromLayout shrinks when workspace is narrow", () => {
  const wide = clampCoachWidthFromLayout(1200, 900, { hasRightPanel: true });
  const narrow = clampCoachWidthFromLayout(800, 900, { hasRightPanel: true });
  assert.ok(narrow < wide);
  assert.ok(narrow >= SCENE_COACH_MIN_PX);
});

test("getMainStackMinWidth reserves coach space when right panel shown", () => {
  const withCoach = getMainStackMinWidth({ hasRightPanel: true });
  const withoutCoach = getMainStackMinWidth({ hasRightPanel: false });
  assert.ok(withCoach > withoutCoach);
});

test("getResolvedOutlineWidth defaults to 320", () => {
  assert.equal(getResolvedOutlineWidth(null), OUTLINE_DEFAULT_PX);
  assert.equal(getResolvedOutlineWidth(400), 400);
});
