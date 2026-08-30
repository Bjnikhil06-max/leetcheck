import path from "node:path";
import { scanDirectory } from "./scanner.js";
import { detectSecrets } from "./detector.js";
import { getGitHistory } from "./git.js";

const args = process.argv.slice(2);

const historyMode = args.includes("--history");
const folder = args.find((arg) => !arg.startsWith("--"));

if (!folder) {
  console.error("Usage: node src/cli.js [--history] <folder>");
  process.exit(1);
}

const absoluteFolder = path.resolve(folder);

console.log("");
console.log("LeakCheck");
console.log("────────────────────────────────────────");
console.log(`Scanning: ${absoluteFolder}`);

if (historyMode) {
  console.log("Mode: current files + Git history");
}

console.log("");

let scan;

try {
  scan = await scanDirectory(absoluteFolder);
} catch (error) {
  console.error(`Could not scan directory: ${error.message}`);
  process.exit(1);
}

let totalFindings = 0;

for (const file of scan.files) {
  const findings = detectSecrets(file.contents, file.file);

  for (const finding of findings) {
    totalFindings++;
    printFinding(
      finding,
      path.relative(absoluteFolder, file.file)
    );
  }
}

if (historyMode) {
  console.log("Scanning Git history...\n");

  try {
    const commits = await getGitHistory(absoluteFolder);

    for (const commit of commits) {
      for (const line of commit.lines) {
        const findings = detectSecrets(line, "Git history");

        for (const finding of findings) {
          totalFindings++;

          printFinding(
            finding,
            `Git commit ${commit.commit.slice(0, 8)}`
          );
        }
      }
    }
  } catch (error) {
    console.log(`Git history unavailable: ${error.message}`);
  }
}

console.log("────────────────────────────────────────");
console.log(`Files scanned: ${scan.files.length}`);
console.log(`Unreadable: ${scan.unreadable}`);
console.log(`Findings: ${totalFindings}`);
console.log("");

if (totalFindings > 0) {
  console.log("⚠ Potential secrets detected.");
  process.exitCode = 2;
} else {
  console.log("✓ No potential secrets detected.");
}

function printFinding(finding, location) {
  console.log(`[${finding.severity}] ${finding.type}`);
  console.log(`  ${location}:${finding.line}`);
  console.log(`  ${finding.match}`);
  console.log(`  Confidence: ${finding.confidence}%`);

  if (finding.signals.length > 0) {
    console.log(`  Signals: ${finding.signals.join(", ")}`);
  }

  console.log("");
}