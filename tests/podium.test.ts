import test from "node:test";
import assert from "node:assert/strict";
import { podiumGroups, previouslyRevealed, rankCostumes, revealSteps } from "../src/lib/podium.ts";
import type { RankedCostume } from "../src/lib/admin-types.ts";

const entry = (id: string, place: number | null, totalStars = place === null ? 0 : 40 - place * 10, votes = 3): RankedCostume => ({ id, name: id, place, totalStars, votes, photoPath: `${id}/photo.jpg` });

test("35, 15, 15 and 12 stars produce exactly three winners, one per place", () => {
  const original = [entry("winner", 1, 35), entry("tie-b", 2, 15), entry("fourth", 3, 12), entry("tie-a", 2, 15)];
  const ranked = rankCostumes(original);
  assert.deepEqual(ranked.map(({ id, totalStars, place }) => [id, totalStars, place]), [["winner", 35, 1], ["tie-a", 15, 2], ["tie-b", 15, 3], ["fourth", 12, 4]]);
  assert.deepEqual(rankCostumes([...original].reverse()), ranked);
  assert.deepEqual(original.map(({ place }) => place), [1, 2, 3, 2]);
  const groups = podiumGroups(original);
  assert.deepEqual(groups.map((group) => [group.place, group.entries.map((winner) => winner.id)]), [[3, ["tie-b"]], [2, ["tie-a"]], [1, ["winner"]]]);
});

test("four equal scores still produce only three podium winners", () => {
  const ranking = ["d", "c", "b", "a"].map((id) => entry(id, 1, 15));
  assert.deepEqual(podiumGroups(ranking).map((group) => [group.place, group.entries[0].id]), [[3, "c"], [2, "b"], [1, "a"]]);
  assert.ok(podiumGroups(ranking).every((group) => group.entries.length === 1));
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
