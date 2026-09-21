import test from "node:test";
import assert from "node:assert/strict";
import {
  ELLIS_CHAT_MAX_WORDS,
  ELLIS_CHAT_WORD_LIMIT_TEXT,
  isEllisChatOverWordLimit,
  isEllisChatWordLimitMessage,
} from "../ellisStudioInput.js";

test("isEllisChatOverWordLimit matches Olivia's 1000-word cap", () => {
  const under = Array.from({ length: ELLIS_CHAT_MAX_WORDS }, () => "word").join(
    " "
  );
  const over = `${under} extra`;
  assert.equal(isEllisChatOverWordLimit(under), false);
  assert.equal(isEllisChatOverWordLimit(over), true);
});

test("isEllisChatWordLimitMessage matches the Ellis paste-gate script", () => {
  assert.equal(isEllisChatWordLimitMessage(ELLIS_CHAT_WORD_LIMIT_TEXT), true);
  assert.equal(isEllisChatWordLimitMessage("unrelated"), false);
  assert.equal(
    ELLIS_CHAT_WORD_LIMIT_TEXT.includes("My Manuscript"),
    true
  );
});
