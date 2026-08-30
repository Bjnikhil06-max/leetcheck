import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execGit = promisify(execFile);

export async function getGitHistory(directory) {
  const { stdout } = await execGit(
    "git",
    [
      "-C",
      directory,
      "log",
      "--all",
      "-p",
      "--format=COMMIT:%H",
      "--",
    ],
    {
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
    }
  );

  return parseHistory(stdout);
}

function parseHistory(output) {
  const commits = [];

  let currentCommit = null;
  let currentFile = null;

  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("COMMIT:")) {
      currentCommit = {
        commit: line
          .slice("COMMIT:".length)
          .trim(),
        lines: [],
      };

      commits.push(currentCommit);
      currentFile = null;
      continue;
    }

    if (!currentCommit) {
      continue;
    }

    if (line.startsWith("diff --git ")) {
      const match = line.match(
        /^diff --git a\/(.+) b\/(.+)$/
      );

      if (match) {
        currentFile = match[2];
      }

      continue;
    }

    // Ignore diff metadata.
    if (
      line.startsWith("+++ ") ||
      line.startsWith("--- ") ||
      line.startsWith("@@ ") ||
      line.startsWith("diff ") ||
      line.startsWith("index ")
    ) {
      continue;
    }

    // Only inspect removed lines.
    // Added lines are already scanned by the current-file scan.
    if (
      currentFile &&
      line.startsWith("-")
    ) {
      currentCommit.lines.push({
        file: currentFile,
        contents: line.slice(1),
      });
    }
  }

  return commits;
}