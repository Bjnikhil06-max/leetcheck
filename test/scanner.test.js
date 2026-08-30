import test from "node:test";
import assert from "node:assert/strict";

import {
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import path from "node:path";

import { scanDirectory } from "../src/scanner.js";

test("finds files recursively", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await mkdir(path.join(directory, "src"));

  await writeFile(
    path.join(directory, "src", "app.js"),
    "console.log('test');"
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 1);
  assert.equal(result.unreadable, 0);
});

test("ignores node_modules", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await mkdir(
    path.join(directory, "node_modules"),
    { recursive: true }
  );

  await writeFile(
    path.join(directory, "node_modules", "fake.js"),
    "const password = 'fake';"
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 0);
  assert.equal(result.unreadable, 0);
});

test("ignores binary file extensions", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await writeFile(
    path.join(directory, "image.png"),
    Buffer.from([137, 80, 78, 71])
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 0);
  assert.equal(result.unreadable, 0);
});

test("continues scanning when a directory cannot be read", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await writeFile(
    path.join(directory, "not-a-directory"),
    "test"
  );

  const nested = path.join(directory, "src");

  await mkdir(nested);

  await writeFile(
    path.join(nested, "app.js"),
    "console.log('safe');"
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 1);
  assert.equal(result.unreadable, 0);
});

test("reports unreadable paths without crashing", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  const missingPath = path.join(
    directory,
    "missing"
  );

  const result = await scanDirectory(missingPath);

  assert.equal(result.files.length, 0);
  assert.equal(result.unreadable, 1);
});