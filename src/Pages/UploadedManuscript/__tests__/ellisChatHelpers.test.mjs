import test from "node:test";
import assert from "node:assert/strict";
import {
  parseEllisChapterNumber,
  parseEllisChapterRef,
  parseEllisBareChapterRef,
  getNextChapterAfter,
  getNextRecommendedChapter,
  getUploadedChapterRows,
  getChapterReviewStatus,
} from "../utils.js";
import {
  isEllisDevelopmentalReviewText,
  isEllisDevelopmentalReviewMessage,
  isPartialEllisDevelopmentalReview,
  isEllisConversationalCloseText,
  stripEllisLegacyWorkflowCta,
  resolveEllisInsertChapterNumber,
  resolveEllisInsertChapterRef,
  ELLIS_CHAPTER_REVIEW_KIND,
  ELLIS_CONVERSATIONAL_KIND,
  ELLIS_REVISION_REVIEW_KIND,
  buildEllisEmptyChapterMessage,
  parseEllisChatSsePayload,
  consumeEllisChatSseChunk,
  flushEllisChatSseRest,
  parseEllisReviewOpenerTitle,
  buildEllisKickoffPlaceholderMetadata,
  mergeEllisSavedReviewMessageIds,
  mergeEllisHistoryRows,
  dropEllisOptimisticDuplicates,
  oldestEllisServerHistoryRow,
  getEllisChapterReviewFooterText,
  getEllisInsertButtonLabel,
  shouldShowEllisInsertButton,
  resolveEllisReviewMessageChapterKey,
  computeEllisInsertableReviewMessageIds,
  ELLIS_CHAPTER_REVIEW_FOOTER_TEXT,
  ELLIS_CHAPTER_REVIEW_POST_INSERT_FOOTER_TEXT,
} from "../ellisChatHelpers.js";

const reviewRow = (id, chapterNumber, chapterId, kind = ELLIS_CHAPTER_REVIEW_KIND) => ({
  id,
  role: "assistant",
  metadata: { kind, chapterNumber, chapterId },
  text: `Chapter ${chapterNumber} – POV: Test

Function in Story: ${"Setup ".repeat(20)}
Genre Beat Check: ${"Beat ".repeat(20)}
Scene Analysis
${"Body ".repeat(30)}
Creative Suggestions
Chapter Cumulative Editorial Note
The reader should leave this chapter feeling tested after the turn.`,
});

test("parseEllisChapterNumber accepts start and review phrasing", () => {
  assert.equal(parseEllisChapterNumber("Start Chapter 1"), 1);
  assert.equal(parseEllisChapterNumber("Let's review chapter 12"), 12);
  assert.equal(parseEllisChapterNumber("Start Chapter One"), 1);
  assert.equal(parseEllisChapterNumber("Start with chapter twenty-one"), 21);
  assert.equal(parseEllisChapterNumber("Review Chapter Six"), 6);
  assert.equal(parseEllisChapterNumber("look at chapter 6"), 6);
  assert.equal(parseEllisChapterNumber("work on chapter 3"), 3);
  assert.equal(parseEllisChapterNumber("How is the POV?"), null);
});

test("parseEllisChapterRef parses letter suffixes", () => {
  assert.deepEqual(parseEllisChapterRef("Start Chapter Seven A"), {
    chapterNumber: 7,
    chapterSuffix: "A",
  });
  assert.deepEqual(parseEllisChapterRef("Review Chapter 7B"), {
    chapterNumber: 7,
    chapterSuffix: "B",
  });
});

test("getUploadedChapterRows keeps lettered rows as distinct chapters", () => {
  const rows = getUploadedChapterRows([
    {
      _id: "seven",
      chapterNumber: 7,
      chapterSuffix: null,
      chapterLabel: "Chapter Seven",
      userContent: "<p>Bare</p>",
    },
    {
      _id: "sevenA",
      chapterNumber: 7,
      chapterSuffix: "A",
      chapterLabel: "Chapter Seven A",
      userContent: "<p>A</p>",
    },
    {
      _id: "sevenB",
      chapterNumber: 7,
      chapterSuffix: "B",
      chapterLabel: "Chapter Seven B",
      userContent: "<p>B</p>",
    },
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].chapterSuffix, null);
  assert.equal(rows[1].chapterSuffix, "A");
  assert.equal(rows[2].chapterSuffix, "B");
});

test("getUploadedChapterRows omits archived chapters from the map", () => {
  const rows = getUploadedChapterRows([
    { _id: "one", chapterNumber: 1, chapterLabel: "Chapter One" },
    {
      _id: "two",
      chapterNumber: 2,
      chapterLabel: "Chapter Two",
      archivedAt: new Date("2026-09-09"),
    },
    { _id: "three", chapterNumber: 3, chapterLabel: "Chapter Three" },
  ]);
  assert.deepEqual(
    rows.map((r) => r._id),
    ["one", "three"]
  );
});

test("getUploadedChapterRows keeps prologue 0 and front-matter negatives", () => {
  const rows = getUploadedChapterRows([
    { _id: "intro", chapterNumber: -1, chapterLabel: "Introduction" },
    { _id: "pro", chapterNumber: 0, chapterLabel: "Prologue" },
    { _id: "one", chapterNumber: 1, chapterLabel: "Chapter One" },
  ]);
  assert.deepEqual(
    rows.map((r) => r._id),
    ["intro", "pro", "one"]
  );
});

test("getNextChapterAfter advances by base chapter number", () => {
  const chapters = getUploadedChapterRows([
    { chapterNumber: 7, chapterSuffix: null, chapterLabel: "Chapter Seven" },
    { chapterNumber: 7, chapterSuffix: "A", chapterLabel: "Chapter Seven A" },
    { chapterNumber: 8, chapterSuffix: null, chapterLabel: "Chapter Eight" },
  ]);
  const next = getNextChapterAfter(chapters, 7);
  assert.equal(next.chapterNumber, 8);
});

test("resolveEllisInsertChapterRef accepts prologue chapterNumber 0 from metadata", () => {
  assert.deepEqual(
    resolveEllisInsertChapterRef(
      {
        role: "assistant",
        text: "Prologue review…",
        metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND, chapterNumber: 0 },
      },
      {
        selectedChapterNumber: 1,
        chapters: [{ chapterNumber: 0, chapterLabel: "Prologue", label: "Prologue" }],
      }
    ),
    { chapterNumber: 0, chapterSuffix: "" }
  );
});

test("resolveEllisInsertChapterRef resolves Prologue header via chapters list", () => {
  assert.deepEqual(
    resolveEllisInsertChapterRef(
      {
        role: "assistant",
        text: "Prologue – POV: Narrator\n\nFunction in Story: setup",
      },
      {
        selectedChapterNumber: 1,
        chapters: [
          { chapterNumber: 0, chapterLabel: "Prologue", label: "Prologue" },
          { chapterNumber: 1, chapterLabel: "Chapter One", label: "Chapter One" },
        ],
      }
    ),
    { chapterNumber: 0, chapterSuffix: "" }
  );
});

test("resolveEllisInsertChapterRef falls back to selected chapter 0", () => {
  assert.deepEqual(
    resolveEllisInsertChapterRef(
      { role: "assistant", text: "Follow-up note only." },
      {
        selectedChapterNumber: 0,
        selectedChapterLabel: "Prologue",
        chapters: [{ chapterNumber: 0, chapterLabel: "Prologue", label: "Prologue" }],
      }
    ),
    { chapterNumber: 0, chapterSuffix: "" }
  );
});

test("resolveEllisInsertChapterNumber prefers review header over UI focus", () => {
  const chapterTwoReview =
    "Chapter Two – POV: Darien as Adrien\n\nFunction in Story: Premise Demonstration";
  assert.equal(
    resolveEllisInsertChapterNumber(
      {
        role: "assistant",
        text: chapterTwoReview,
        metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND, chapterNumber: 7 },
      },
      { selectedChapterNumber: 7, targetChapterNumber: 7 }
    ),
    2
  );
});

test("resolveEllisInsertChapterNumber prefers message metadata when header missing", () => {
  assert.equal(
    resolveEllisInsertChapterNumber(
      {
        role: "assistant",
        text: "Chapter Two review…",
        metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND, chapterNumber: 2 },
      },
      { selectedChapterNumber: 1, targetChapterNumber: 1 }
    ),
    2
  );
});

test("resolveEllisInsertChapterNumber maps scene-tag header to base chapter", () => {
  assert.equal(
    resolveEllisInsertChapterNumber(
      {
        role: "assistant",
        text: "Chapter Ten A – POV: Janet\n\nFunction in Story: setup",
      },
      { selectedChapterNumber: 1, targetChapterNumber: 1 }
    ),
    10
  );
});

test("resolveEllisInsertChapterNumber falls back to selected chapter", () => {
  assert.equal(
    resolveEllisInsertChapterNumber(
      { role: "assistant", text: "Follow-up note only." },
      { selectedChapterNumber: 3, targetChapterNumber: 1 }
    ),
    3
  );
});

const SAMPLE_REVIEW = `
Chapter One — POV: Darien

Function in Story: Opening Image / Comic-Disaster Hook

Genre Beat Check (Mandatory): This scene establishes the humorous fiction promise.

Scene Analysis
This scene opens with strong comic energy but delays the corporate satire engine.

Creative Suggestions
Structural Weakness: Late corporate engine
Creative Suggestion Name: "Let the Cell Smell Like Silicon Valley"
👉 Description: Bring the job-loss stakes earlier.
👉 Example 1: Darien's phone buzzes with a calendar invite titled "Workplace Transition."
👉 Example 2: A Slack ping reads: "Please join the all-hands in five."

Chapter Cumulative Editorial Note
As a whole, this chapter establishes the comic-disaster frame while seeding corporate satire.
The reader should leave this chapter feeling amused but uneasy, because the opening promises disruption Darien cannot yet name.
`.repeat(2);

test("isEllisDevelopmentalReviewText detects full chapter reviews", () => {
  assert.equal(isEllisDevelopmentalReviewText(SAMPLE_REVIEW), true);
});

test("isEllisDevelopmentalReviewText detects a review glued onto a long custom opener", () => {
  const jammed = `
Epilogue - September- 1936 - California – POV: Myla Function in Story: This chapter closes the occult cost in Myla's body after the school collapse.
Genre Beat Check: The horror ending must land as earned consequence, not a leftover scare.
Scene Analysis: The California close still talks more than it costs, and the last image does not yet force a choice.
Creative Suggestions
Structural Weakness: The reveal still talks more than it costs
Creative Suggestion Name: Make the hallway cost her
`.repeat(2);
  assert.equal(isEllisDevelopmentalReviewText(jammed), true);
});

test("computeEllisInsertableReviewMessageIds matches a custom Epilogue title", () => {
  const body = `
Epilogue - September- 1936 - California – POV: Myla Function in Story: This chapter closes the occult cost in Myla's body after the school collapse.
Genre Beat Check: The horror ending must land as earned consequence, not a leftover scare.
Scene Analysis: The California close still talks more than it costs, and the last image does not yet force a choice.
Creative Suggestions
Structural Weakness: The last turn explains instead of charging
Creative Suggestion Name: Make the last hallway cost her
`.repeat(2);
  const messages = [
    {
      id: "epi-live",
      role: "assistant",
      text: body,
    },
  ];
  const chapters = [
    {
      chapterNumber: 12,
      chapterLabel: "Epilogue - September- 1936 - California",
      label: "Epilogue - September- 1936 - California",
    },
  ];
  assert.equal(
    parseEllisReviewOpenerTitle(body),
    "Epilogue - September- 1936 - California"
  );
  const insertable = computeEllisInsertableReviewMessageIds(
    messages,
    [],
    chapters
  );
  assert.deepEqual(insertable, ["epi-live"]);
});

test("isEllisDevelopmentalReviewText detects a truncated kickoff missing the cumulative note", () => {
  const truncated = `
Emon Work - September 1936 - California – POV: Myla

Function in Story
This chapter's job is to make the supernatural cost something in Myla's body.

Genre Beat Check
The occult pressure is no longer theoretical.

Scene Analysis
School becomes the stage where grief and paranoia collapse into each other.

Creative Suggestions
Structural Weakness: The reveal still talks more than it costs
Creative Suggestion Name: Make the hallway cost her
`.repeat(2);
  assert.equal(isEllisDevelopmentalReviewText(truncated), true);
});

test("isEllisDevelopmentalReviewText rejects short follow-ups", () => {
  assert.equal(
    isEllisDevelopmentalReviewText(
      "Good question — I'd tighten the opening beat so the jail frame pays off sooner."
    ),
    false
  );
});

test("empty-chapter notice is conversational, not a review", () => {
  const text = buildEllisEmptyChapterMessage("Chapter 1.5");
  assert.equal(isEllisDevelopmentalReviewText(text), false);
  assert.equal(
    isEllisDevelopmentalReviewMessage({
      role: "assistant",
      text,
      metadata: { kind: ELLIS_CONVERSATIONAL_KIND },
    }),
    false
  );
});

test("isEllisDevelopmentalReviewMessage requires review-shaped text even when kind is tagged", () => {
  assert.equal(
    isEllisDevelopmentalReviewMessage({
      role: "assistant",
      text: "Yes. This version is stronger than the last one.",
      metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND },
    }),
    false
  );
  assert.equal(
    isEllisDevelopmentalReviewMessage({
      role: "assistant",
      text: SAMPLE_REVIEW,
      metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND },
    }),
    true
  );
});

test("isEllisDevelopmentalReviewMessage rejects revision-check metadata", () => {
  assert.equal(
    isEllisDevelopmentalReviewMessage({
      role: "assistant",
      text: SAMPLE_REVIEW,
      metadata: { kind: ELLIS_REVISION_REVIEW_KIND },
    }),
    false
  );
});

test("isEllisDevelopmentalReviewMessage formats Output Standard text even if tagged conversational", () => {
  assert.equal(
    isEllisDevelopmentalReviewMessage({
      role: "assistant",
      text: SAMPLE_REVIEW,
      metadata: { kind: ELLIS_CONVERSATIONAL_KIND },
    }),
    true
  );
});

test("isEllisDevelopmentalReviewText rejects agentic meta-discussion citing section names", () => {
  const agenticMeta = `Yes — your earlier version is stronger on this chapter's structural problem.

Your Scene Analysis named the live seduction test with Sophie more precisely than this pass.
The Creative Suggestion about folding Betty into the in-scene beat was sharper too.
Even the Function in Story framing in your earlier note better captured why this chapter matters.

The key revision compass is scene-anchored recall, not generic flashback compression.
Keep every Betty memory tied to immediate Sophie pressure points.

👉 We've pressure-tested this chapter/issue well. Is there anything else you want to discuss here, or should we continue moving to the next chapter?`;
  assert.equal(isEllisDevelopmentalReviewText(agenticMeta), false);
});

test("isEllisConversationalCloseText detects containment-close phrasing", () => {
  assert.equal(
    isEllisConversationalCloseText(
      "We've pressure-tested this chapter/issue well."
    ),
    true
  );
});

test("isEllisDevelopmentalReviewText rejects containment-close even with section markers", () => {
  const text = `${SAMPLE_REVIEW}

👉 We've pressure-tested this chapter/issue well.`;
  assert.equal(isEllisDevelopmentalReviewText(text), false);
});

test("isPartialEllisDevelopmentalReview requires early Function in Story", () => {
  const kickoffHead = `Chapter Two – POV: Darien

Function in Story: Proof-of-premise social test that shows Adrien works in the social world before the corporate plot escalates.

Genre Beat Check: Early delight beat with thematic legibility payoff for the manuscript's central argument.`;
  assert.equal(isPartialEllisDevelopmentalReview(kickoffHead), true);

  const agenticHead = `Yes — your Scene Analysis was stronger because it named the live test with Sophie more precisely than this pass.
The Creative Suggestion about Betty was more scene-anchored than this generic pacing note about flashback compression.`;
  assert.equal(isPartialEllisDevelopmentalReview(agenticHead), false);
});

test("stripEllisLegacyWorkflowCta removes old scene-complete copy", () => {
  const input =
    'Great work.\n\nScene complete! Click the copy icon at the end of this output and paste it into your Word document. This will be your scene-by-scene developmental plan. Don\'t worry—I\'ll remind you each time. Let me know when you\'re ready for the next scene.';
  const stripped = stripEllisLegacyWorkflowCta(input);
  assert.equal(stripped, "Great work.");
});

test("parseEllisChapterRef accepts fuzzy misspellings", () => {
  assert.deepEqual(parseEllisChapterRef("Hapter 8"), {
    chapterNumber: 8,
    chapterSuffix: "",
  });
  assert.equal(parseEllisChapterNumber("ch 20"), 20);
});

test("parseEllisBareChapterRef accepts whole-message chapter shorthand", () => {
  assert.deepEqual(parseEllisBareChapterRef("Eleven"), {
    chapterNumber: 11,
    chapterSuffix: "",
  });
  assert.deepEqual(parseEllisBareChapterRef("11"), {
    chapterNumber: 11,
    chapterSuffix: "",
  });
  assert.deepEqual(parseEllisBareChapterRef("seven"), {
    chapterNumber: 7,
    chapterSuffix: "",
  });
  assert.equal(parseEllisBareChapterRef("yes"), null);
  assert.equal(parseEllisBareChapterRef("next chapter"), null);
  assert.deepEqual(parseEllisChapterRef("Eleven"), {
    chapterNumber: 11,
    chapterSuffix: "",
  });
});

test("parseEllisChapterRef extracts a named chapter from deliver phrasing", () => {
  assert.deepEqual(parseEllisChapterRef("Deliver Chapter 8"), {
    chapterNumber: 8,
    chapterSuffix: "",
  });
  assert.deepEqual(parseEllisChapterRef("Can you review chapter 1.5"), {
    chapterNumber: 1.5,
    chapterSuffix: "",
  });
});

test("getNextRecommendedChapter returns first chapter without ready review", () => {
  const chapters = [5, 6, 7, 8, 9, 10, 11].map((n) => ({
    chapterNumber: n,
    chapterSuffix: "",
  }));
  const progress = {
    6: { status: "ready" },
    7: { status: "ready" },
    8: { status: "ready" },
    9: { status: "ready" },
    10: { status: "ready" },
  };
  const next = getNextRecommendedChapter(progress, chapters);
  assert.equal(next.chapterNumber, 5);
});

test("getChapterReviewStatus prefers chapterId after a number shift", () => {
  const progress = {
    6: { status: "ready" },
    "id:ch6orig": { status: "ready" },
  };
  assert.equal(
    getChapterReviewStatus(progress, {
      _id: "ch6orig",
      chapterNumber: 8,
      chapterSuffix: "",
    }),
    "ready"
  );
  assert.equal(
    getChapterReviewStatus(progress, {
      _id: "ch8new",
      chapterNumber: 6,
      chapterSuffix: "",
    }),
    undefined
  );
});

test("getChapterReviewStatus does not leak a lettered sibling's ready state", () => {
  const progress = { "7A": { status: "ready" }, "id:ch7a": { status: "ready" } };
  assert.equal(
    getChapterReviewStatus(progress, {
      _id: "ch7a",
      chapterNumber: 7,
      chapterSuffix: "A",
    }),
    "ready"
  );
  assert.equal(
    getChapterReviewStatus(progress, {
      _id: "ch7",
      chapterNumber: 7,
      chapterSuffix: "",
    }),
    undefined
  );
});

test("getNextRecommendedChapter after backfill insert points past filled range", () => {
  const chapters = [5, 6, 7, 8, 9, 10, 11].map((n) => ({
    chapterNumber: n,
    chapterSuffix: "",
  }));
  const progress = {
    5: { status: "ready" },
    6: { status: "ready" },
    7: { status: "ready" },
    8: { status: "ready" },
    9: { status: "ready" },
    10: { status: "ready" },
  };
  const next = getNextRecommendedChapter(progress, chapters);
  assert.equal(next.chapterNumber, 11);
});

test("parseEllisChatSsePayload extracts turnNavigation", () => {
  const data = parseEllisChatSsePayload(
    'data: {"turnNavigation":{"chapterNumber":8,"chapterId":"ch8","kickoff":true,"source":"gap_advance"}}'
  );
  assert.equal(data.turnNavigation.chapterNumber, 8);
  assert.equal(data.turnNavigation.kickoff, true);
  assert.equal(data.turnNavigation.source, "gap_advance");
});

test("consumeEllisChatSseChunk keeps an incomplete trailing done event", () => {
  const { events, rest } = consumeEllisChatSseChunk(
    'data: {"token":"Hi"}\n\ndata: {"done":true,"message":{"id":"m1"'
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].token, "Hi");
  assert.match(rest, /"done":true/);
});

test("flushEllisChatSseRest parses a leftover done event without a trailing newline", () => {
  const data = flushEllisChatSseRest(
    'data: {"done":true,"message":{"id":"m1","metadata":{"kind":"ellis_chapter_review","chapterId":"chNew"}}}'
  );
  assert.equal(data.done, true);
  assert.equal(data.message.id, "m1");
  assert.equal(data.message.metadata.chapterId, "chNew");
});

test("buildEllisKickoffPlaceholderMetadata stamps chapter_review from kickoff nav", () => {
  const meta = buildEllisKickoffPlaceholderMetadata({
    kickoff: true,
    action: "start_chapter_review",
    chapterId: "chNew",
    chapterNumber: 2,
  });
  assert.equal(meta.kind, ELLIS_CHAPTER_REVIEW_KIND);
  assert.equal(meta.chapterId, "chNew");
  assert.equal(meta.chapterNumber, 2);
  assert.equal(
    buildEllisKickoffPlaceholderMetadata({
      kickoff: true,
      action: "revision_review",
      chapterId: "ch8",
      chapterNumber: 8,
    }).kind,
    ELLIS_REVISION_REVIEW_KIND
  );
});

test("mergeEllisHistoryRows keeps earlier pages when the latest page is refetched", () => {
  const older = { id: "old", sortTs: 1, text: "earlier", role: "user", timestamp: "1" };
  const mid = { id: "mid", sortTs: 2, text: "mid", role: "assistant", timestamp: "2" };
  const latest = { id: "new", sortTs: 3, text: "latest", role: "user", timestamp: "3" };
  const existing = [older, mid, latest];
  const merged = mergeEllisHistoryRows([mid, latest], existing);
  assert.equal(merged, existing);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["old", "mid", "new"]
  );
});

test("mergeEllisHistoryRows prepends a new older page", () => {
  const older = { id: "old", sortTs: 1, text: "earlier", role: "user", timestamp: "1" };
  const mid = { id: "mid", sortTs: 2, text: "mid", role: "assistant", timestamp: "2" };
  const latest = { id: "new", sortTs: 3, text: "latest", role: "user", timestamp: "3" };
  const merged = mergeEllisHistoryRows([older], [mid, latest]);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["old", "mid", "new"]
  );
});

test("oldestEllisServerHistoryRow skips optimistic ids and picks lowest sortTs", () => {
  const oldest = oldestEllisServerHistoryRow([
    { id: "user-1", sortTs: 1 },
    { id: "newer", sortTs: 30 },
    { id: "older", sortTs: 10 },
    { id: "assistant-2", sortTs: 0 },
  ]);
  assert.equal(oldest.id, "older");
});

test("mergeEllisHistoryRows lets incoming overwrite the same id", () => {
  const merged = mergeEllisHistoryRows(
    [{ id: "a", sortTs: 1, text: "server" }],
    [{ id: "a", sortTs: 1, text: "optimistic" }]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].text, "server");
});

test("dropEllisOptimisticDuplicates removes the optimistic user row once the server copy is present", () => {
  const optimistic = {
    id: "user-1",
    role: "user",
    text: "Start Chapter 1",
    sortTs: 20,
  };
  const persisted = {
    id: "abc123",
    role: "user",
    text: "Start Chapter 1",
    sortTs: 21,
  };
  const assistant = {
    id: "asst1",
    role: "assistant",
    text: "review",
    sortTs: 22,
  };
  const dropped = dropEllisOptimisticDuplicates([
    optimistic,
    persisted,
    assistant,
  ]);
  assert.deepEqual(
    dropped.map((m) => m.id),
    ["abc123", "asst1"]
  );
});

test("dropEllisOptimisticDuplicates keeps a repeated send when only an older persisted row matches", () => {
  const older = {
    id: "old",
    role: "user",
    text: "hello",
    sortTs: 1,
  };
  const optimistic = {
    id: "user-9",
    role: "user",
    text: "hello",
    sortTs: 50,
  };
  const input = [older, optimistic];
  const kept = dropEllisOptimisticDuplicates(input);
  assert.equal(kept, input);
  assert.deepEqual(
    kept.map((m) => m.id),
    ["old", "user-9"]
  );
});

test("dropEllisOptimisticDuplicates collapses two optimistic copies of the same send", () => {
  const first = {
    id: "user-1",
    role: "user",
    text: "hello",
    sortTs: 10,
  };
  const second = {
    id: "user-2",
    role: "user",
    text: "hello",
    sortTs: 11,
  };
  const dropped = dropEllisOptimisticDuplicates([first, second]);
  assert.deepEqual(
    dropped.map((m) => m.id),
    ["user-2"]
  );
});

test("mergeEllisHistoryRows drops the optimistic user row when the persisted copy arrives", () => {
  const optimistic = {
    id: "user-1",
    role: "user",
    text: "Start Chapter 1",
    sortTs: 20,
  };
  const assistant = {
    id: "asst1",
    role: "assistant",
    text: "review",
    sortTs: 22,
  };
  const persisted = {
    id: "abc123",
    role: "user",
    text: "Start Chapter 1",
    sortTs: 21,
  };
  const merged = mergeEllisHistoryRows(
    [persisted, assistant],
    [optimistic, assistant]
  );
  assert.deepEqual(
    merged.map((m) => m.id),
    ["abc123", "asst1"]
  );
});

test("mergeEllisSavedReviewMessageIds keeps optimistic local ids when server is stale", () => {
  const merged = mergeEllisSavedReviewMessageIds(
    ["local-new-id", "existing-id"],
    ["existing-id"]
  );
  assert.deepEqual(merged, ["local-new-id", "existing-id"]);
});

test("getEllisChapterReviewFooterText includes Insert CTA only before save", () => {
  assert.match(
    ELLIS_CHAPTER_REVIEW_FOOTER_TEXT,
    /click 👉 Insert to Revision Plan/
  );
  assert.match(ELLIS_CHAPTER_REVIEW_FOOTER_TEXT, /Chapter Notes/);
  assert.match(
    ELLIS_CHAPTER_REVIEW_FOOTER_TEXT,
    /move to the next chapter/
  );
  assert.doesNotMatch(
    ELLIS_CHAPTER_REVIEW_POST_INSERT_FOOTER_TEXT,
    /Insert to Revision Plan/
  );
  assert.match(ELLIS_CHAPTER_REVIEW_POST_INSERT_FOOTER_TEXT, /Chapter Notes/);
  assert.equal(
    getEllisChapterReviewFooterText(true),
    ELLIS_CHAPTER_REVIEW_POST_INSERT_FOOTER_TEXT
  );
  assert.equal(
    getEllisChapterReviewFooterText(false),
    ELLIS_CHAPTER_REVIEW_FOOTER_TEXT
  );
});

test("shouldShowEllisInsertButton stays visible while inserting after optimistic save", () => {
  const base = {
    isReviewMessage: true,
    isAssistant: true,
    isStreamingRow: false,
    hasInsertHandler: true,
  };
  assert.equal(
    shouldShowEllisInsertButton({ ...base, alreadySaved: false, isInserting: false }),
    true
  );
  assert.equal(
    shouldShowEllisInsertButton({ ...base, alreadySaved: true, isInserting: true }),
    true
  );
  assert.equal(
    shouldShowEllisInsertButton({ ...base, alreadySaved: true, isInserting: false }),
    false
  );
});

test("resolveEllisReviewMessageChapterKey groups repeated reviews of the same chapter", () => {
  const reviewA = {
    metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND, chapterNumber: 5, chapterId: "ch5" },
    text: "Chapter Five review body",
  };
  const reviewBSameChapter = {
    metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND, chapterNumber: 5, chapterId: "ch5" },
    text: "Chapter Five review body (redelivered)",
  };
  const reviewOther = {
    metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND, chapterNumber: 6, chapterId: "ch6" },
    text: "Chapter Six review body",
  };
  const keyA = resolveEllisReviewMessageChapterKey(reviewA);
  assert.equal(keyA, resolveEllisReviewMessageChapterKey(reviewBSameChapter));
  assert.notEqual(keyA, resolveEllisReviewMessageChapterKey(reviewOther));
});

test("resolveEllisReviewMessageChapterKey falls back to header when metadata is absent", () => {
  const key = resolveEllisReviewMessageChapterKey({
    text: "Chapter Eight – POV: Myla\n\nFunction in Story\n...",
  });
  assert.equal(key, "num:8");
  assert.equal(resolveEllisReviewMessageChapterKey({ text: "just chatting" }), null);
});

test("resolveEllisReviewMessageChapterKey matches an added chapter's custom title", () => {
  const chapters = [
    { chapterNumber: 1, chapterLabel: "Chapter One", label: "Chapter One" },
    { chapterNumber: 2, chapterLabel: "Bridge Scene", label: "Bridge Scene" },
  ];
  assert.equal(parseEllisReviewOpenerTitle("Bridge Scene – POV: Darien"), "Bridge Scene");
  assert.equal(
    resolveEllisReviewMessageChapterKey(
      { text: "Bridge Scene – POV: Darien\n\nFunction in Story\n..." },
      chapters
    ),
    "num:2"
  );
});

test("computeEllisInsertableReviewMessageIds: added chapter review without chapterNumber is insertable", () => {
  const body = SAMPLE_REVIEW.replace(
    "Chapter One — POV: Darien",
    "Bridge Scene – POV: Darien"
  );
  const messages = [
    {
      id: "added-live",
      role: "assistant",
      metadata: { kind: ELLIS_CHAPTER_REVIEW_KIND },
      text: body,
    },
  ];
  const chapters = [
    { chapterNumber: 2, chapterLabel: "Bridge Scene", label: "Bridge Scene" },
  ];
  const insertable = computeEllisInsertableReviewMessageIds(
    messages,
    [],
    chapters
  );
  assert.deepEqual(insertable, ["added-live"]);
});

test("computeEllisInsertableReviewMessageIds: only the latest review per chapter is insertable", () => {
  const messages = [
    reviewRow("m1", 5, "ch5"),
    reviewRow("m2", 5, "ch5"), // redelivered Chapter 5 (latest)
    reviewRow("m3", 6, "ch6"),
  ];
  const insertable = computeEllisInsertableReviewMessageIds(messages, []);
  assert.deepEqual(insertable.sort(), ["m2", "m3"]);
});

test("computeEllisInsertableReviewMessageIds: saving the latest removes its CTA", () => {
  const messages = [reviewRow("m1", 5, "ch5"), reviewRow("m2", 5, "ch5")];
  const insertable = computeEllisInsertableReviewMessageIds(messages, ["m2"]);
  assert.deepEqual(insertable, []);
});

test("computeEllisInsertableReviewMessageIds: first-pass redelivery is not insertable once the original is in the plan", () => {
  const messages = [
    reviewRow("m1", 5, "ch5"),
    reviewRow("m3", 5, "ch5"),
  ];
  const insertable = computeEllisInsertableReviewMessageIds(messages, ["m1"], [], {
    readyChapterNumbers: new Set([5]),
  });
  assert.deepEqual(insertable, []);
});

test("computeEllisInsertableReviewMessageIds: revision-check rows are never insertable", () => {
  const messages = [
    reviewRow("m1", 5, "ch5"),
    reviewRow("r1", 5, "ch5", ELLIS_REVISION_REVIEW_KIND),
    reviewRow("r2", 5, "ch5", ELLIS_REVISION_REVIEW_KIND),
  ];
  const insertable = computeEllisInsertableReviewMessageIds(messages, ["m1"], [], {
    readyChapterNumbers: new Set([5]),
  });
  assert.deepEqual(insertable, []);
});

test("computeEllisInsertableReviewMessageIds: Q&A rows are never insertable", () => {
  const messages = [
    {
      id: "q1",
      role: "assistant",
      metadata: { kind: ELLIS_CONVERSATIONAL_KIND, chapterNumber: 5, chapterId: "ch5" },
      text: "The POV in chapter 5 is close-third and consistent.",
    },
  ];
  const insertable = computeEllisInsertableReviewMessageIds(messages, [], [], {
    readyChapterNumbers: new Set([5]),
  });
  assert.deepEqual(insertable, []);
});

test("computeEllisInsertableReviewMessageIds: untagged Output Standard is insertable", () => {
  const messages = [
    {
      id: "untagged",
      role: "assistant",
      metadata: { chapterNumber: 5, chapterId: "ch5" },
      text: SAMPLE_REVIEW,
    },
  ];
  const insertable = computeEllisInsertableReviewMessageIds(messages, [], [], {
    readyChapterNumbers: new Set(),
  });
  assert.deepEqual(insertable, ["untagged"]);
});

test("getEllisInsertButtonLabel is first-pass Revision Plan only", () => {
  assert.equal(getEllisInsertButtonLabel(), "Insert to Revision Plan");
});

test("computeEllisInsertableReviewMessageIds: revision-check rows are never insertable", () => {
  const messages = [
    {
      id: "r1",
      role: "assistant",
      metadata: {
        kind: ELLIS_REVISION_REVIEW_KIND,
        chapterNumber: 8,
        chapterId: "ch6orig",
      },
      text: "You hit the core edits. This is materially stronger.",
    },
  ];
  const insertable = computeEllisInsertableReviewMessageIds(messages, []);
  assert.deepEqual(insertable, []);
});

test("isEllisDevelopmentalReviewMessage rejects revision-check metadata", () => {
  assert.equal(
    isEllisDevelopmentalReviewMessage({
      role: "assistant",
      text: SAMPLE_REVIEW,
      metadata: { kind: ELLIS_REVISION_REVIEW_KIND },
    }),
    false
  );
});

test("parseEllisChapterRef keeps decimal chapter identifiers", () => {
  assert.deepEqual(parseEllisChapterRef("review chapter 1.5"), {
    chapterNumber: 1.5,
    chapterSuffix: "",
  });
  assert.deepEqual(parseEllisChapterRef("Can you review chapter 2.5"), {
    chapterNumber: 2.5,
    chapterSuffix: "",
  });
  assert.deepEqual(parseEllisChapterRef("review chapter 2"), {
    chapterNumber: 2,
    chapterSuffix: "",
  });
  assert.notEqual(parseEllisChapterRef("review chapter 1.5").chapterNumber, 1);
  assert.notEqual(parseEllisChapterRef("review chapter 1.5").chapterNumber, 2);
});
