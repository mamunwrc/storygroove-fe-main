import test from "node:test";
import assert from "node:assert/strict";
import {
  computeActOffsets,
  getGlobalSceneNumber,
  resolveGlobalChapterNumber,
  formatActChapterHeading,
} from "./sceneNumbering.js";

test("Act 3 slot 1 is Chapter 11 on the default 15-spine", () => {
  const offsets = computeActOffsets([]);
  assert.equal(getGlobalSceneNumber(3, 1, offsets), 11);
  assert.equal(resolveGlobalChapterNumber(3, 1, undefined, offsets), 11);
  // Stored per-act index must not win over the continuous count.
  assert.equal(resolveGlobalChapterNumber(3, 1, 1, offsets), 11);
  assert.equal(formatActChapterHeading(3, 11), "Act 3 | Chapter 11");
});
