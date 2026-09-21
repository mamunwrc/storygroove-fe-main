import test from "node:test";
import assert from "node:assert/strict";
import {
  createDraftSaveQueue,
  isRetryableDraftSaveError,
} from "./queuedDraftSave.js";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test("overlapping enqueues keep the latest text for a scene", async () => {
  const first = deferred();
  const calls = [];
  const queue = createDraftSaveQueue({
    persist: async (sceneId, text) => {
      calls.push({ sceneId, text });
      if (calls.length === 1) await first.promise;
    },
  });

  const firstSave = queue.enqueue("scene-1", "draft-a");
  const secondSave = queue.enqueue("scene-1", "draft-b");
  first.resolve();
  await Promise.all([firstSave, secondSave]);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], { sceneId: "scene-1", text: "draft-a" });
  assert.deepEqual(calls[1], { sceneId: "scene-1", text: "draft-b" });
});

test("a busy save does not drop a later scene", async () => {
  const first = deferred();
  const calls = [];
  const queue = createDraftSaveQueue({
    persist: async (sceneId, text) => {
      calls.push({ sceneId, text });
      if (sceneId === "scene-1") await first.promise;
    },
  });

  const firstSave = queue.enqueue("scene-1", "one");
  const secondSave = queue.enqueue("scene-2", "two");
  first.resolve();
  await Promise.all([firstSave, secondSave]);

  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((c) => c.sceneId),
    ["scene-1", "scene-2"]
  );
});

test("a failed scene does not prevent saving another scene", async () => {
  const calls = [];
  const queue = createDraftSaveQueue({
    persist: async (sceneId, text) => {
      calls.push({ sceneId, text });
      if (sceneId === "scene-1") throw new Error("network");
    },
  });

  const first = queue.enqueue("scene-1", "one");
  const second = queue.enqueue("scene-2", "two");
  await Promise.allSettled([first, second]);

  assert.ok(calls.some((c) => c.sceneId === "scene-2" && c.text === "two"));
});

test("a later enqueue of the same scene saves the latest text after a failure", async () => {
  const calls = [];
  const queue = createDraftSaveQueue({
    persist: async (_sceneId, text) => {
      calls.push(text);
      if (calls.length === 1) throw new Error("network");
    },
  });

  await assert.rejects(() => queue.enqueue("scene-1", "v1"));
  await queue.enqueue("scene-1", "v2");

  assert.deepEqual(calls, ["v1", "v2"]);
});

test("timeouts are retryable and HTTP 4xx is not", () => {
  assert.equal(isRetryableDraftSaveError({ message: "timeout" }), true);
  assert.equal(isRetryableDraftSaveError({ response: { status: 404 } }), false);
  assert.equal(isRetryableDraftSaveError({ response: { status: 409 } }), false);
  assert.equal(isRetryableDraftSaveError({ response: { status: 500 } }), true);
  assert.equal(isRetryableDraftSaveError({ code: "OFFLINE" }), false);
});

test("a 4xx failure is not left pending for another drain", async () => {
  const calls = [];
  const saving = [];
  const queue = createDraftSaveQueue({
    persist: async (_sceneId, text) => {
      calls.push(text);
      const error = new Error("not found");
      error.response = { status: 404 };
      throw error;
    },
    onSavingChange: (value) => saving.push(value),
  });

  await assert.rejects(() => queue.enqueue("scene-1", "v1"));
  assert.equal(queue.pendingCount, 0);
  assert.deepEqual(saving, [true, false]);
});

test("kick does nothing when the queue is empty", async () => {
  let persistCalls = 0;
  let savingFlips = 0;
  const queue = createDraftSaveQueue({
    persist: async () => {
      persistCalls += 1;
    },
    onSavingChange: () => {
      savingFlips += 1;
    },
  });

  await queue.kick();
  assert.equal(persistCalls, 0);
  assert.equal(savingFlips, 0);
});

test("queue retries a retryable failure without another enqueue", async () => {
  const calls = [];
  const queue = createDraftSaveQueue({
    retryMs: 0,
    persist: async (_sceneId, text) => {
      calls.push(text);
      if (calls.length === 1) throw new Error("network");
    },
  });

  await assert.rejects(() => queue.enqueue("scene-1", "v1"));
  assert.equal(queue.pendingCount, 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(queue.pendingCount, 0);
  assert.deepEqual(calls, ["v1", "v1"]);
});
