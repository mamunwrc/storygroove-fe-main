import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARACTER_MARKDOWN_CHUNK_CHARS,
  chunkMarkdownForRender,
} from "./markdownChunks.js";

test("chunkMarkdownForRender keeps a short dossier as one chunk", () => {
  const text = "**👤 Lola: 17-Point Dossier**\n- **Name:** Lola";
  assert.deepEqual(chunkMarkdownForRender(text), [text]);
});

test("chunkMarkdownForRender splits a long body and keeps section headers together", () => {
  const section = (n) =>
    `**${n}. Title ${n}**\n- **Name:** x\n${"word ".repeat(200)}`;
  const text = [section(1), section(2), section(3)].join("\n");
  const chunks = chunkMarkdownForRender(text, 800);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some((c) => c.includes("**1. Title 1**")));
  assert.ok(chunks.some((c) => c.includes("**3. Title 3**")));
});

test("chunkMarkdownForRender uses the default cap", () => {
  const text = Array.from({ length: 12 }, () => "word ".repeat(80)).join("\n");
  assert.ok(text.length > CHARACTER_MARKDOWN_CHUNK_CHARS);
  assert.ok(chunkMarkdownForRender(text).length >= 2);
});
