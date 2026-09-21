import test from "node:test";
import assert from "node:assert/strict";
import {
  STALE_CONTENT_CODE,
  decideRemoteDraftAction,
  getStaleContentPayload,
  isNewerUpdatedAt,
  toUpdatedAtIso,
} from "./sceneDraftSync.js";

test("toUpdatedAtIso normalizes Date and ISO strings", () => {
  const iso = "2026-09-21T10:30:00.123Z";
  assert.equal(toUpdatedAtIso(iso), iso);
  assert.equal(toUpdatedAtIso(new Date(iso)), iso);
  assert.equal(toUpdatedAtIso(null), null);
  assert.equal(toUpdatedAtIso("nope"), null);
});

test("isNewerUpdatedAt treats missing local token as stale", () => {
  const later = "2026-09-21T10:30:00.123Z";
  assert.equal(isNewerUpdatedAt(later, null), true);
  assert.equal(isNewerUpdatedAt(later, later), false);
  assert.equal(isNewerUpdatedAt(later, "2026-09-21T10:29:00.000Z"), true);
  assert.equal(isNewerUpdatedAt("2026-09-21T10:29:00.000Z", later), false);
});

test("getStaleContentPayload reads 409 STALE_CONTENT only", () => {
  assert.equal(getStaleContentPayload({ response: { status: 404 } }), null);
  assert.equal(
    getStaleContentPayload({
      response: { status: 409, data: { code: "OTHER" } },
    }),
    null
  );
  assert.deepEqual(
    getStaleContentPayload({
      response: {
        status: 409,
        data: {
          code: STALE_CONTENT_CODE,
          userContent: "from phone",
          updatedAt: "2026-09-21T10:30:00.123Z",
        },
      },
    }),
    {
      userContent: "from phone",
      updatedAt: "2026-09-21T10:30:00.123Z",
    }
  );
});

test("decideRemoteDraftAction ignores matching tokens", () => {
  const token = "2026-09-21T10:30:00.123Z";
  assert.equal(
    decideRemoteDraftAction({
      serverUpdatedAt: token,
      lastKnownUpdatedAt: token,
      isDirty: false,
      serverHtml: "a",
      localHtml: "b",
    }),
    "ignore"
  );
});

test("decideRemoteDraftAction applies when idle and server moved", () => {
  assert.equal(
    decideRemoteDraftAction({
      serverUpdatedAt: "2026-09-21T10:31:00.000Z",
      lastKnownUpdatedAt: "2026-09-21T10:30:00.000Z",
      isDirty: false,
      serverHtml: "<p>phone</p>",
      localHtml: "<p>laptop</p>",
    }),
    "apply"
  );
});

test("decideRemoteDraftAction conflicts when dirty and server moved", () => {
  assert.equal(
    decideRemoteDraftAction({
      serverUpdatedAt: "2026-09-21T10:31:00.000Z",
      lastKnownUpdatedAt: "2026-09-21T10:30:00.000Z",
      isDirty: true,
      serverHtml: "<p>phone</p>",
      localHtml: "<p>laptop</p>",
    }),
    "conflict"
  );
});

test("decideRemoteDraftAction adopts token when HTML already matches", () => {
  assert.equal(
    decideRemoteDraftAction({
      serverUpdatedAt: "2026-09-21T10:31:00.000Z",
      lastKnownUpdatedAt: "2026-09-21T10:30:00.000Z",
      isDirty: true,
      serverHtml: "<p>same</p>",
      localHtml: "<p>same</p>",
    }),
    "adopt-token"
  );
});
