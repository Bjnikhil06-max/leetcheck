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

test("reports missing root directories as errors", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  const missingPath = path.join(
    directory,
    "missing"
  );

  await assert.rejects(
    () => scanDirectory(missingPath),
    /Directory does not exist/
  );
});
test("ignores directories listed in .leakcheckignore", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await mkdir(
    path.join(directory, "fixtures")
  );

  await writeFile(
    path.join(directory, ".leakcheckignore"),
    "fixtures\n"
  );

  await writeFile(
    path.join(directory, "fixtures", "secret.js"),
    'const password = "should_not_be_scanned";'
  );

  await writeFile(
    path.join(directory, "app.js"),
    "console.log('safe');"
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 1);
  assert.ok(
    result.files[0].file.endsWith("app.js")
  );
});

test("ignores comments and blank lines in .leakcheckignore", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await mkdir(
    path.join(directory, "generated")
  );

  await writeFile(
    path.join(directory, ".leakcheckignore"),
    `
# Generated files

generated

`
  );

  await writeFile(
    path.join(directory, "generated", "output.js"),
    "const password = 'should_not_be_scanned';"
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 0);
  assert.equal(result.unreadable, 0);
});
test("supports wildcard patterns in .leakcheckignore", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await writeFile(
    path.join(directory, ".leakcheckignore"),
    "*.generated.js\n"
  );

  await writeFile(
    path.join(directory, "app.generated.js"),
    "const password = 'secret';"
  );

  await writeFile(
    path.join(directory, "app.js"),
    "console.log('safe');"
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 1);
  assert.ok(
    result.files[0].file.endsWith("app.js")
  );
});

test("supports wildcard patterns in nested paths", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-")
  );

  await mkdir(
    path.join(directory, "config"),
    { recursive: true }
  );

  await writeFile(
    path.join(directory, ".leakcheckignore"),
    "config/*.local.js\n"
  );

  await writeFile(
    path.join(directory, "config", "secret.local.js"),
    "const password = 'secret';"
  );

  await writeFile(
    path.join(directory, "config", "safe.js"),
    "console.log('safe');"
  );

  const result = await scanDirectory(directory);

  assert.equal(result.files.length, 1);
  assert.ok(
    result.files[0].file.endsWith("safe.js")
  );
});