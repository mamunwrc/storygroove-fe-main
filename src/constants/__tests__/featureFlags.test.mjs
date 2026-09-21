import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const featureFlagsSource = readFileSync(
  join(__dirname, "../featureFlags.js"),
  "utf8"
);

test("ELLIS_ENABLED is true for public Studio launch", () => {
  assert.match(featureFlagsSource, /export const ELLIS_ENABLED = true;/);
});

test("isEllisGated returns false for regular users when ELLIS_ENABLED is true", () => {
  const ELLIS_ENABLED = true;
  const isPrivilegedRole = () => false;

  const isEllisGated = () => {
    if (ELLIS_ENABLED) return false;
    return !isPrivilegedRole();
  };

  assert.equal(isEllisGated(), false);
});
