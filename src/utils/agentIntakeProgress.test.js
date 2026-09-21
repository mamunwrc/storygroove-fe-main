import test from "node:test";
import assert from "node:assert/strict";
import { getAgentIntakeProgress } from "./agentIntakeProgress.js";

const agentMsg = (text) => ({ type: "agent", text });

test("returns null before any question is detected", () => {
  assert.equal(getAgentIntakeProgress("simone", []), null);
  assert.equal(
    getAgentIntakeProgress("simone", [agentMsg("Welcome! Ready to begin?")]),
    null
  );
  assert.equal(getAgentIntakeProgress("ellis", [agentMsg("Question 1: x")]), null);
});

test("Simone parses Question N colon format", () => {
  const progress = getAgentIntakeProgress("simone", [
    agentMsg("**Question 11: 🏷️ What's a working title?**"),
  ]);
  assert.equal(progress.current, 11);
  assert.equal(progress.total, 20);
  assert.equal(progress.remaining, 9);
  assert.equal(progress.label, "Story Starter Kit");
  assert.ok(progress.percent >= 50 && progress.percent <= 60);
});

test("Simone uses max question across messages (no regression)", () => {
  const progress = getAgentIntakeProgress("simone", [
    agentMsg("**Question 8: ✨ What's your spark scene?**"),
    agentMsg("Can you clarify that?"),
    agentMsg("**Question 5: ⚠️ What could go horribly wrong?**"),
  ]);
  assert.equal(progress.current, 8);
  assert.equal(progress.remaining, 12);
});

test("Olivia parses en-dash question format", () => {
  const progress = getAgentIntakeProgress("olivia", [
    agentMsg("**🎭 Question 9 – Antagonist**"),
  ]);
  assert.equal(progress.current, 9);
  assert.equal(progress.total, 15);
  assert.equal(progress.remaining, 6);
  assert.equal(progress.label, "Story Bible intake");
});

test("Olivia 4b advances bar but display stays in question 4 area", () => {
  const progress = getAgentIntakeProgress("olivia", [
    agentMsg("**🌍 Question 4 – Setting**"),
    agentMsg("**🌍 Question 4b – Story World**"),
  ]);
  assert.equal(progress.current, 4);
  assert.equal(progress.remaining, 11);
  assert.equal(progress.stepKey, "4b");
  assert.ok(progress.percent > 20);
});

test("Olivia max milestone wins across messages", () => {
  const progress = getAgentIntakeProgress("olivia", [
    agentMsg("**Question 12 – Series Context**"),
    agentMsg("**Question 7 – Narrative POV**"),
  ]);
  assert.equal(progress.current, 12);
  assert.equal(progress.remaining, 3);
});

test("Olivia question 15 reaches full display progress", () => {
  const progress = getAgentIntakeProgress("olivia", [
    agentMsg("**🎭 Question 15 – Tone Guidance**"),
  ]);
  assert.equal(progress.current, 15);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.percent, 100);
});
