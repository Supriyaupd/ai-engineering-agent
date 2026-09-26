const { test } = require("node:test");
const assert = require("node:assert");
const { readFile, searchCode } = require("../services/tools");

test("readFile returns content for an existing file", () => {
  const content = readFile("server/package.json");
  assert.ok(content.length > 0);
  assert.ok(content.includes("name"));
});

test("readFile throws for a nonexistent file", () => {
  assert.throws(() => readFile("server/does-not-exist.js"));
});

test("searchCode returns an array", () => {
  const results = searchCode("express");
  assert.ok(Array.isArray(results));
});
