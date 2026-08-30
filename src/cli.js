import path from "node:path";
import { scanDirectory } from "./scanner.js";
import { detectSecrets } from "./detector.js";

const folder = process.argv[2];

if (!folder) {
  console.error("Usage: node src/cli.js <folder>");
  process.exit(1);
}

const absoluteFolder = path.resolve(folder);

console.log("");
console.log("LeakCheck");
console.log("────────────────────────────────────────");
console.log(`Scanning: ${absoluteFolder}`);
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
  const findings = detectSecrets(file.contents);

  for (const finding of findings) {
    totalFindings++;

    console.log(
      `[${finding.severity}] ${finding.type}`
    );

    console.log(
      `  ${path.relative(absoluteFolder, file.file)}:${finding.line}`
    );

    console.log(`  ${finding.match}`);
    console.log("");
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