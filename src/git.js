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
  let currentFile = "unknown";

  for (const line of output.split("\n")) {
    if (line.startsWith("COMMIT:")) {
      currentCommit = {
        commit: line.slice("COMMIT:".length).trim(),
        lines: [],
      };

      commits.push(currentCommit);
      currentFile = "unknown";
      continue;
    }

    if (!currentCommit) {
      continue;
    }

    if (line.startsWith("diff --git")) {
      const match = line.match(
        /diff --git a\/(.+?) b\/(.+)$/
      );

      if (match) {
        currentFile = match[2];
      }

      continue;
    }

    if (
      line.startsWith("-") &&
      !line.startsWith("---")
    ) {
      currentCommit.lines.push({
        file: currentFile,
        contents: line.slice(1),
      });
    }
  }

  return commits;
}