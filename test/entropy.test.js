import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEntropy,
  looksRandom,
} from "../src/entropy.js";

test("empty string has zero entropy", () => {
  assert.equal(calculateEntropy(""), 0);
});

test("repeated characters have low entropy", () => {
  assert.equal(calculateEntropy("aaaaaaaaaa"), 0);
});

test("varied strings have higher entropy", () => {
  assert.ok(
    calculateEntropy("a8Fj92kLmP3xQ7vN9sZ2") > 3
  );
});

test("short strings are not considered random", () => {
  assert.equal(looksRandom("abc123"), false);
});

test("long random-looking strings are considered random", () => {
  assert.equal(
    looksRandom("a8Fj92kLmP3xQ7vN9sZ2"),
    true
  );
});