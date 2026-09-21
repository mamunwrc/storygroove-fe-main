import test from "node:test";
import assert from "node:assert/strict";
import {
  sceneDraftStorageKey,
  readSceneDraft,
  writeSceneDraft,
  clearSceneDraft,
  resolveDraftForScene,
} from "./sceneDraftStorage.js";

const mockStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
};

test("sceneDraftStorageKey includes novel and scene ids", () => {
  assert.equal(
    sceneDraftStorageKey("novel1", "scene1"),
    "bookEditor:sceneDraft:novel1:scene1"
  );
});

test("writeSceneDraft readSceneDraft and clearSceneDraft round-trip", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    writeSceneDraft("novel1", "scene1", "Hello draft", "2026-01-01T00:00:00.000Z");
    const draft = readSceneDraft("novel1", "scene1");
    assert.ok(draft);
    assert.equal(draft.text, "Hello draft");
    assert.equal(typeof draft.updatedAt, "number");
    assert.equal(draft.basedOnServerUpdatedAt, "2026-01-01T00:00:00.000Z");

    clearSceneDraft("novel1", "scene1");
    assert.equal(readSceneDraft("novel1", "scene1"), null);
  } finally {
    globalThis.window = original;
  }
});

test("writeSceneDraft removes key for empty text", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    writeSceneDraft("novel1", "scene1", "temp");
    writeSceneDraft("novel1", "scene1", "");
    assert.equal(readSceneDraft("novel1", "scene1"), null);
  } finally {
    globalThis.window = original;
  }
});

test("writeSceneDraft preserves basedOnServerUpdatedAt when omitted", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    writeSceneDraft("novel1", "scene1", "v1", "2026-01-01T00:00:00.000Z");
    writeSceneDraft("novel1", "scene1", "v2");
    const draft = readSceneDraft("novel1", "scene1");
    assert.equal(draft.text, "v2");
    assert.equal(draft.basedOnServerUpdatedAt, "2026-01-01T00:00:00.000Z");
  } finally {
    globalThis.window = original;
  }
});

test("resolveDraftForScene uses server when no local draft", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    const resolved = resolveDraftForScene("novel1", "scene1", "Server text");
    assert.equal(resolved.text, "Server text");
    assert.equal(resolved.recovered, false);
  } finally {
    globalThis.window = original;
  }
});

test("resolveDraftForScene recovers local only when basedOnServerUpdatedAt matches", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    writeSceneDraft(
      "novel1",
      "scene1",
      "Local offline edits",
      "2026-01-01T00:00:00.000Z"
    );
    const resolved = resolveDraftForScene(
      "novel1",
      "scene1",
      "Server text",
      "2026-01-01T00:00:00.000Z"
    );
    assert.equal(resolved.text, "Local offline edits");
    assert.equal(resolved.recovered, true);
  } finally {
    globalThis.window = original;
  }
});

test("resolveDraftForScene uses server when the server token moved", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    writeSceneDraft(
      "novel1",
      "scene1",
      "Local offline edits",
      "2026-01-01T00:00:00.000Z"
    );
    const resolved = resolveDraftForScene(
      "novel1",
      "scene1",
      "Server text",
      "2026-01-02T00:00:00.000Z"
    );
    assert.equal(resolved.text, "Server text");
    assert.equal(resolved.recovered, false);
    assert.equal(readSceneDraft("novel1", "scene1"), null);
  } finally {
    globalThis.window = original;
  }
});

test("resolveDraftForScene uses server when local draft has no base token", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    writeSceneDraft("novel1", "scene1", "Local offline edits");
    const resolved = resolveDraftForScene(
      "novel1",
      "scene1",
      "Server text",
      "2026-01-01T00:00:00.000Z"
    );
    assert.equal(resolved.text, "Server text");
    assert.equal(resolved.recovered, false);
  } finally {
    globalThis.window = original;
  }
});

test("resolveDraftForScene uses server when local matches", () => {
  const ls = mockStorage();
  const original = globalThis.window;
  globalThis.window = { localStorage: ls };

  try {
    writeSceneDraft("novel1", "scene1", "Same text");
    const resolved = resolveDraftForScene("novel1", "scene1", "Same text");
    assert.equal(resolved.text, "Same text");
    assert.equal(resolved.recovered, false);
  } finally {
    globalThis.window = original;
  }
});
