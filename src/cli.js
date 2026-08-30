import path from "node:path";
import { scanDirectory } from "./scanner.js";
import { detectSecrets } from "./detector.js";
import { getGitHistory } from "./git.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log("LeakCheck 0.1.0");
  process.exit(0);
}

const historyMode = args.includes("--history");
const jsonMode = args.includes("--json");
const strictMode = args.includes("--strict");

const folder = args.find((arg) => !arg.startsWith("--"));

if (!folder) {
  console.error("Usage: node src/cli.js [options] <folder>");
  process.exit(1);
}

const absoluteFolder = path.resolve(folder);

let scan;

try {
  scan = await scanDirectory(absoluteFolder);
} catch (error) {
  if (jsonMode) {
    console.log(JSON.stringify({
      error: error.message,
    }, null, 2));
  } else {
    console.error(`Could not scan directory: ${error.message}`);
  }

  process.exit(1);
}

const findings = [];

for (const file of scan.files) {
  const fileFindings = detectSecrets(
    file.contents,
    file.file
  );

  for (const finding of fileFindings) {
    findings.push({
      ...finding,
      location: path.relative(
        absoluteFolder,
        file.file
      ),
      source: "current",
    });
  }
}

if (historyMode) {
  try {
    const commits = await getGitHistory(
      absoluteFolder
    );

    for (const commit of commits) {
      for (const line of commit.lines) {
        const historyFindings = detectSecrets(
          line,
          "Git history"
        );

        for (const finding of historyFindings) {
          findings.push({
            ...finding,
            location: `Git commit ${commit.commit.slice(0, 8)}`,
            source: "history",
            commit: commit.commit,
          });
        }
      }
    }
  } catch (error) {
    if (!jsonMode) {
      console.log(
        `Git history unavailable: ${error.message}`
      );
    }
  }
}

if (jsonMode) {
  printJson(findings, scan);
} else {
  printTerminal(
    findings,
    scan,
    absoluteFolder,
    historyMode
  );
}

const hasCriticalOrHigh = findings.some(
  (finding) =>
    finding.severity === "CRITICAL" ||
    finding.severity === "HIGH"
);

if (strictMode && hasCriticalOrHigh) {
  process.exitCode = 2;
} else if (findings.length > 0) {
  process.exitCode = 2;
} else {
  process.exitCode = 0;
}

function printTerminal(
  findings,
  scan,
  directory,
  historyMode
) {
  console.log("");
  console.log("LeakCheck");
  console.log("────────────────────────────────────────");
  console.log(`Scanning: ${directory}`);

  if (historyMode) {
    console.log(
      "Mode: current files + Git history"
    );
  }

  console.log("");

  for (const finding of findings) {
    console.log(
      `[${finding.severity}] ${finding.type}`
    );

    console.log(
      `  ${finding.location}:${finding.line}`
    );

    console.log(`  ${finding.match}`);

    console.log(
      `  Confidence: ${finding.confidence}%`
    );

    if (finding.signals.length > 0) {
      console.log(
        `  Signals: ${finding.signals.join(", ")}`
      );
    }

    console.log("");
  }

  console.log(
    "────────────────────────────────────────"
  );

  console.log(`Files scanned: ${scan.files.length}`);
  console.log(`Unreadable: ${scan.unreadable}`);
  console.log(`Findings: ${findings.length}`);
  console.log("");

  if (findings.length > 0) {
    console.log("⚠ Potential secrets detected.");
  } else {
    console.log("✓ No potential secrets detected.");
  }
}

function printJson(findings, scan) {
  console.log(
    JSON.stringify(
      {
        tool: "LeakCheck",
        version: "0.1.0",
        filesScanned: scan.files.length,
        unreadable: scan.unreadable,
        findings,
      },
      null,
      2
    )
  );
}

function printHelp() {
  console.log(`
LeakCheck 0.1.0

Scan source code for accidentally exposed secrets.

Usage:
  node src/cli.js [options] <folder>

Options:
  --history    Scan Git history
  --json       Output machine-readable JSON
  --strict     Fail only on HIGH/CRITICAL findings
  --help       Show this help
  --version    Show version

Examples:
  node src/cli.js .
  node src/cli.js --history .
  node src/cli.js --json .
  node src/cli.js --strict .
`);
}