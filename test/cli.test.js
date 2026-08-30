import test from "node:test";
import assert from "node:assert/strict";

import {
  mkdtemp,
  writeFile,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

const cliPath = path.resolve(
  "src",
  "cli.js"
);

function runCli(args) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [cliPath, ...args],
      {
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolve({
          code: error?.code ?? 0,
          stdout,
          stderr,
        });
      }
    );
  });
}

test("returns exit code 0 when no secrets are found", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-cli-")
  );

  await writeFile(
    path.join(directory, "app.js"),
    "console.log('safe');"
  );

  const result = await runCli([
    directory,
  ]);

  assert.equal(result.code, 0);
  assert.match(
    result.stdout,
    /No potential secrets detected/
  );
});

test("returns exit code 2 when a secret is found", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-cli-")
  );

  await writeFile(
    path.join(directory, "app.js"),
    'const password = "superSecret123";'
  );

  const result = await runCli([
    directory,
  ]);

  assert.equal(result.code, 2);
  assert.match(
    result.stdout,
    /Potential secrets detected/
  );
});

test("returns exit code 1 for a missing directory", async () => {
  const directory = path.join(
    tmpdir(),
    "leakcheck-does-not-exist"
  );

  const result = await runCli([
    directory,
  ]);

  assert.equal(result.code, 1);
  assert.match(
    result.stderr,
    /Directory does not exist/
  );
});

test("JSON output remains valid when findings exist", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-cli-")
  );

  await writeFile(
    path.join(directory, "app.js"),
    'const api_key = "abc123456789SECRET";'
  );

  const result = await runCli([
    "--json",
    directory,
  ]);

  assert.equal(result.code, 2);

  const output = JSON.parse(
    result.stdout
  );

  assert.equal(output.tool, "LeakCheck");
  assert.ok(
    Array.isArray(output.findings)
  );
  assert.ok(output.findings.length > 0);
});

test("JSON output remains valid for errors", async () => {
  const directory = path.join(
    tmpdir(),
    "leakcheck-does-not-exist"
  );

  const result = await runCli([
    "--json",
    directory,
  ]);

  assert.equal(result.code, 1);

  const output = JSON.parse(
    result.stdout
  );

  assert.equal(output.tool, "LeakCheck");
  assert.ok(output.error);
});