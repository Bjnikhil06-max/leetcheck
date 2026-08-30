import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".java",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".swift",
  ".kt",
  ".kts",
  ".json",
  ".yaml",
  ".yml",
  ".xml",
  ".toml",
  ".ini",
  ".env",
  ".conf",
  ".config",
  ".sh",
  ".bash",
  ".ps1",
  ".sql",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".vue",
  ".md",
  ".txt",
]);

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
]);

function isScannable(file) {
  const filename = path.basename(file);
  const extension = path.extname(file).toLowerCase();

  if (filename === ".env") {
    return true;
  }

  if (
    filename.startsWith(".env.") &&
    !filename.endsWith(".temp")
  ) {
    return true;
  }

  return TEXT_EXTENSIONS.has(extension);
}

async function walk(directory, state) {
  let entries;

  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch {
    state.unreadable++;
    return [];
  }

  const files = [];

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      IGNORED_DIRECTORIES.has(entry.name)
    ) {
      continue;
    }

    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      files.push(
        ...(await walk(fullPath, state))
      );
    } else if (isScannable(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function scanDirectory(directory) {
  const state = {
    unreadable: 0,
  };

  const files = await walk(directory, state);
  const results = [];

  for (const file of files) {
    try {
      const contents = await readFile(
        file,
        "utf8"
      );

      results.push({
        file,
        contents,
      });
    } catch {
      state.unreadable++;
    }
  }

  return {
    files: results,
    unreadable: state.unreadable,
  };
}