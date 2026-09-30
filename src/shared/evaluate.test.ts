import assert from "node:assert/strict";
import test from "node:test";
import { forkConfig, validateConfig } from "./config.ts";
import { applyTwist, evaluateShow, missions } from "./evaluate.ts";
import { showById, shows, type Show } from "./shows.ts";

function idsPassing(missionId: string, twistApplied: boolean): string[] {
  const mission = missions[missionId];
  if (!mission) return [];
  const constraints = applyTwist(mission, twistApplied);
  return shows.filter((show) => evaluateShow(show, constraints).passed).map((show) => show.id);
}

test("configuration is valid and keeps three demo variants", () => {
  assert.deepEqual(validateConfig(forkConfig), []);
  assert.equal(forkConfig.variants.length, 3);
  assert.equal(forkConfig.requiredRuns.length, 4);
});

test("date night has several valid shows and near misses", () => {
  const passing = idsPassing("date-night", false);
  assert.ok(passing.length >= 3);
  assert.ok(passing.includes("the-comedy-about-spies"));
  assert.ok(passing.includes("mamma-mia"));
  assert.equal(passing.includes("wicked"), false);
  assert.equal(passing.includes("matilda-the-musical"), false);
  assert.equal(passing.includes("the-mousetrap"), false);
  assert.equal(passing.includes("witness-for-the-prosecution"), false);
});

test("group mission and the £50 twist each have a valid show", () => {
  const atEighty = idsPassing("group-night", false);
  const atFifty = idsPassing("group-night", true);
  assert.ok(atEighty.includes("faulty-towers-dining-experience"));
  assert.equal(atEighty.includes("the-book-of-mormon"), false);
  assert.ok(atFifty.includes("the-play-that-goes-wrong"));
  assert.ok(atFifty.includes("the-comedy-about-spies"));
  assert.equal(atFifty.includes("faulty-towers-dining-experience"), false);
  assert.equal(atFifty.includes("witness-for-the-prosecution"), false);
});

test("boundaries are exact and invalid ids fail closed", () => {
  const price = missions["date-night"];
  assert.ok(price);
  const eighty: Show = {
    ...showById("the-play-that-goes-wrong")!,
    id: "exact-eighty",
    priceGbp: 80,
  };
  const eightyOne: Show = { ...eighty, id: "over", priceGbp: 81 };
  assert.equal(evaluateShow(eighty, price.constraints).passed, true);
  assert.equal(evaluateShow(eightyOne, price.constraints).passed, false);

  const group = missions["group-night"];
  assert.ok(group);
  const twisted = applyTwist(group, true);
  const fifty: Show = { ...showById("the-comedy-about-spies")!, priceGbp: 50, runtimeMins: 150, minAge: 15 };
  const fiftyOne: Show = { ...fifty, priceGbp: 51 };
  assert.equal(evaluateShow(fifty, twisted).passed, true);
  assert.equal(evaluateShow(fiftyOne, twisted).passed, false);
  assert.equal(evaluateShow(undefined, price.constraints).passed, false);
  const broken = { ...eighty, priceGbp: Number.NaN };
  assert.equal(evaluateShow(broken, price.constraints).constraints[0]?.kind, "known-show");
});
