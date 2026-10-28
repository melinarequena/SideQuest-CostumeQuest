import test from "node:test";
import assert from "node:assert/strict";
import { participantSchema, voteSchema, pendingCostumes } from "../src/lib/validation.ts";

const uuid = "98107bca-c3ef-4e10-8d6e-c024ab59a1ec";
test("participant requires a real name and a scoped photo path", () => {
  assert.equal(participantSchema.safeParse({ name: " A ", costume: "", photoPath: `${uuid}/${uuid}.jpg` }).success, false);
  assert.equal(participantSchema.safeParse({ name: "Alex", costume: "", photoPath: "https://attacker/photo.jpg" }).success, false);
  const parsed = participantSchema.parse({ name: "  Alex  ", costume: " Fantasma ", photoPath: `${uuid}/${uuid}.jpg` });
  assert.equal(parsed.name, "Alex");
  assert.equal(parsed.costume, "Fantasma");
});
test("votes reject fractional, out of range, and forged values", () => {
  for (const stars of [0, 6, 1.5, "5", null]) assert.equal(voteSchema.safeParse({ participantId: uuid, stars }).success, false);
  for (const stars of [1, 2, 3, 4, 5]) assert.equal(voteSchema.safeParse({ participantId: uuid, stars }).success, true);
  assert.equal(voteSchema.safeParse({ participantId: "someone", stars: 5 }).success, false);
});
test("returning to vote excludes self and votes but preserves skipped entries", () => {
  const candidates = [{ id: "own" }, { id: "voted" }, { id: "skipped" }, { id: "new" }];
  assert.deepEqual(pendingCostumes(candidates, ["voted"], "own"), [{ id: "skipped" }, { id: "new" }]);
});
