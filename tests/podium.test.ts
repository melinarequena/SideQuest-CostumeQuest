import test from "node:test";
import assert from "node:assert/strict";
import { podiumGroups, previouslyRevealed, revealSteps } from "../src/lib/podium.ts";
import type { RankedCostume } from "../src/lib/admin-types.ts";

const entry = (id: string, place: number | null, totalStars = 10, votes = 3): RankedCostume => ({ id, name: id, place, totalStars, votes, photoPath: `${id}/photo.jpg` });

test("ceremony reveals third, second and first, without losing tied winners", () => {
  const groups = podiumGroups([entry("first-a", 1), entry("third", 3), entry("second", 2), entry("first-b", 1), entry("fourth", 4)]);
  assert.deepEqual(groups.map((group) => [group.place, group.entries.map((winner) => winner.id)]), [[3, ["third"]], [2, ["second"]], [1, ["first-a", "first-b"]]]);
});

test("empty places and costumes without votes are never announced as winners", () => {
  assert.deepEqual(podiumGroups([entry("unvoted", null, 0, 0), entry("invalid-zero", 1, 0, 0)]), []);
  assert.deepEqual(podiumGroups([entry("only-winner", 1)]).map((group) => group.place), [1]);
});
test("each winner waits for a click; suspense is automatic and longest for first place", () => {
  const steps = revealSteps([entry("first", 1), entry("second", 2), entry("third", 3)]);
  assert.deepEqual(steps.map((step) => [step.place, step.phase]), [[3, "suspense"], [3, "reveal"], [2, "suspense"], [2, "reveal"], [1, "suspense"], [1, "reveal"]]);
  const suspense = steps.filter((step) => step.phase === "suspense");
  assert.ok(suspense[2].duration > suspense[1].duration && suspense[1].duration > suspense[0].duration);
  assert.ok(steps.filter((step) => step.phase === "reveal").every((step) => step.duration === null));
});

test("side winners persist through suspense without revealing the current or future places", () => {
  const steps = revealSteps([entry("first", 1), entry("second", 2), entry("third", 3)]);
  assert.deepEqual(steps.map((_, index) => previouslyRevealed(steps, index).map((group) => group.place)), [[], [], [3], [3], [3, 2], [3, 2]]);
  assert.deepEqual(previouslyRevealed(steps, 5).flatMap((group) => group.entries.map((winner) => winner.id)), ["third", "second"]);
  assert.deepEqual(previouslyRevealed(steps, 0), []);
});
