import test from "node:test";
import assert from "node:assert/strict";

import {
  mkdtemp,
  writeFile,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import path from "node:path";

import { getGitHistory } from "../src/git.js";

test("reads removed secret-containing lines from Git history", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-git-")
  );

  await setupGit(directory);

  await writeFile(
    path.join(directory, "app.js"),
    'const password = "firstSecret123";\n'
  );

  await runGit(directory, ["add", "."]);

  await runGit(directory, [
    "commit",
    "-m",
    "add test secret",
  ]);

  await writeFile(
    path.join(directory, "app.js"),
    "console.log('secret removed');\n"
  );

  await runGit(directory, ["add", "."]);

  await runGit(directory, [
    "commit",
    "-m",
    "remove secret",
  ]);

  const history = await getGitHistory(directory);

  assert.ok(history.length >= 2);

  const lines = history.flatMap(
    (commit) => commit.lines
  );

  assert.ok(
    lines.some(
      (line) =>
        line.file === "app.js" &&
        line.contents.includes("password") &&
        line.contents.includes("firstSecret123")
    )
  );
});

test("tracks multiple files separately in Git history", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "leakcheck-git-")
  );

  await setupGit(directory);

  await writeFile(
    path.join(directory, "one.js"),
    'const password = "secretOne";\n'
  );

  await writeFile(
    path.join(directory, "two.js"),
    'const api_key = "secretTwo123456";\n'
  );

  await runGit(directory, ["add", "."]);

  await runGit(directory, [
    "commit",
    "-m",
    "add secrets",
  ]);

  await writeFile(
    path.join(directory, "one.js"),
    "console.log('one fixed');\n"
  );

  await writeFile(
    path.join(directory, "two.js"),
    "console.log('two fixed');\n"
  );

  await runGit(directory, ["add", "."]);

  await runGit(directory, [
    "commit",
    "-m",
    "remove secrets",
  ]);

  const history = await getGitHistory(directory);

  const lines = history.flatMap(
    (commit) => commit.lines
  );

  const files = lines.map(
    (line) => line.file
  );

  assert.ok(files.includes("one.js"));
  assert.ok(files.includes("two.js"));
});

async function setupGit(directory) {
  await runGit(directory, ["init"]);

  await runGit(directory, [
    "config",
    "user.email",
    "test@example.com",
  ]);

  await runGit(directory, [
    "config",
    "user.name",
    "LeakCheck Test",
  ]);
}

async function runGit(directory, args) {
  const { execFile } = await import(
    "node:child_process"
  );

  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["-C", directory, ...args],
      {
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr || error.message
            )
          );
          return;
        }

        resolve(stdout);
      }
    );
  });
}