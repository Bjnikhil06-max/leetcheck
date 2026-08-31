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
const IGNORE_FILE = ".leakcheckignore";

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

async function walk(
  directory,
  rootDirectory,
  state,
  ignorePatterns
) {
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

    if (
      shouldIgnore(
        fullPath,
        rootDirectory,
        entry.name,
        ignorePatterns
      )
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(
        ...(await walk(
          fullPath,
          rootDirectory,
          state,
          ignorePatterns
        ))
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
    try {
    const entries = await readdir(directory);
    void entries;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `Directory does not exist: ${directory}`
      );
    }

    throw new Error(
      `Cannot access directory: ${directory}`
    );
  }

  const ignorePatterns = await loadIgnorePatterns(
    directory,
    state
  );

  const files = await walk(
    directory,
    directory,
    state,
    ignorePatterns
  );

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
async function loadIgnorePatterns(directory, state) {
  const ignoreFile = path.join(
    directory,
    IGNORE_FILE
  );

  try {
    const contents = await readFile(
      ignoreFile,
      "utf8"
    );

    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith("#")
      );
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    state.unreadable++;
    return [];
  }
}

function shouldIgnore(
  fullPath,
  rootDirectory,
  entryName,
  ignorePatterns
) {
  if (entryName === IGNORE_FILE) {
    return true;
  }

  const relativePath = path
    .relative(
      rootDirectory,
      fullPath
    )
    .replaceAll("\\", "/");

  return ignorePatterns.some((pattern) => {
    if (
      pattern === entryName ||
      pattern === relativePath ||
      relativePath.startsWith(
        `${pattern}/`
      )
    ) {
      return true;
    }

    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" +
          pattern
            .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
            .replaceAll("*", ".*") +
          "$"
      );

      return regex.test(relativePath);
    }

    return false;
  });
}