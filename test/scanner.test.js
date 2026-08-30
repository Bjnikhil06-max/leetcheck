import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
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
});