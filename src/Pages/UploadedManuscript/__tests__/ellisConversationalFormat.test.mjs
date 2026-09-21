import test from "node:test";
import assert from "node:assert/strict";
import { prepareEllisConversationalForDisplay } from "../ellisConversationalFormat.js";

test("prepareEllisConversationalForDisplay inserts blank line before glued list", () => {
  const input = "The pacing drags in the middle.\n- Cut the second interruption.\n- Add a private reaction.";
  const out = prepareEllisConversationalForDisplay(input);
  assert.match(out, /middle\.\n\n- Cut the second interruption/);
});

test("prepareEllisConversationalForDisplay separates heading glued to prose", () => {
  const input = "On the interview pacing ### Stakes escalation";
  const out = prepareEllisConversationalForDisplay(input);
  assert.match(out, /On the interview pacing\n\n### Stakes escalation/);
});

test("prepareEllisConversationalForDisplay bolds pointing-hand CTA line", () => {
  const input =
    "The middle third repeats the same beat.\n\n👉 Tell me which beat to focus on, or say when you're ready for the next chapter.";
  const out = prepareEllisConversationalForDisplay(input);
  assert.match(
    out,
    /👉 \*\*Tell me which beat to focus on, or say when you're ready for the next chapter\.\*\*/
  );
});

test("prepareEllisConversationalForDisplay leaves already-bold CTA unchanged", () => {
  const input = "👉 **Ready for the next chapter?**";
  const out = prepareEllisConversationalForDisplay(input);
  assert.equal(out, input);
});

test("prepareEllisConversationalForDisplay is idempotent on formatted markdown", () => {
  const input = `### On pacing

The middle third repeats the same beat.

- **Cut** the second interruption.
- **Add** a private reaction.

👉 **Tell me which beat to focus on.**`;
  const once = prepareEllisConversationalForDisplay(input);
  const twice = prepareEllisConversationalForDisplay(once);
  assert.equal(twice, once);
});

test("prepareEllisConversationalForDisplay does not invent structure in plain prose", () => {
  const input =
    "The middle third repeats the same beat without escalating stakes. I would hold the recognition moment until after she answers something strategically risky.";
  const out = prepareEllisConversationalForDisplay(input);
  assert.equal(out, input);
});

test("prepareEllisConversationalForDisplay returns empty input as-is", () => {
  assert.equal(prepareEllisConversationalForDisplay(""), "");
  assert.equal(prepareEllisConversationalForDisplay("   "), "   ");
});
