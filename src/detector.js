import { createHash } from "node:crypto";
import { looksRandom, calculateEntropy } from "./entropy.js";
import { analyzeFinding } from "./analyzer.js";

const patterns = [
  {
    name: "Hardcoded Password",
    regex: /\b(password|passwd|pwd)\s*[:=]\s*["'`]([^"'`]{4,})["'`]/gi,
    valueGroup: 2,
    variableGroup: 1,
  },
  {
    name: "API Key",
    regex: /\b(api[_-]?key)\s*[:=]\s*["'`]([A-Za-z0-9_\-]{12,})["'`]/gi,
    valueGroup: 2,
    variableGroup: 1,
  },
  {
    name: "Secret",
    regex: /\b(secret|client_secret)\s*[:=]\s*["'`]([^"'`]{8,})["'`]/gi,
    valueGroup: 2,
    variableGroup: 1,
  },
  {
    name: "Access Token",
    regex: /\b(access[_-]?token|auth[_-]?token)\s*[:=]\s*["'`]([^"'`]{12,})["'`]/gi,
    valueGroup: 2,
    variableGroup: 1,
  },
];

export function detectSecrets(contents, filePath = "") {
  const findings = [];
  const detectedValues = new Set();

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;

    let match;

    while ((match = pattern.regex.exec(contents)) !== null) {
      const value = match[pattern.valueGroup];
      const variableName = match[pattern.variableGroup];

      const line = contents
        .slice(0, match.index)
        .split("\n").length;

      const analysis = analyzeFinding({
        type: pattern.name,
        value,
        variableName,
        filePath,
      });

      findings.push({
        type: pattern.name,
        line,
        match: redact(match[0]),
        fingerprint: fingerprint(value),
        ...analysis,
      });

      detectedValues.add(value);
    }
  }

  const privateKeyPattern =
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g;

  let privateKeyMatch;

  while (
    (privateKeyMatch = privateKeyPattern.exec(contents)) !== null
  ) {
    const line = contents
      .slice(0, privateKeyMatch.index)
      .split("\n").length;

    findings.push({
      type: "Private Key",
      severity: "CRITICAL",
      confidence: 100,
      line,
      match: "[PRIVATE KEY REDACTED]",
      fingerprint: fingerprint(privateKeyMatch[0]),
      signals: ["private key header"],
    });
  }

  const stringPattern = /["'`]([A-Za-z0-9+/=_-]{16,})["'`]/g;

  let stringMatch;

  while ((stringMatch = stringPattern.exec(contents)) !== null) {
    const value = stringMatch[1];

    if (
      detectedValues.has(value) ||
      !looksRandom(value)
    ) {
      continue;
    }

    const line = contents
      .slice(0, stringMatch.index)
      .split("\n").length;

    const entropy = calculateEntropy(value);

    const analysis = analyzeFinding({
      type: "High-Entropy String",
      value,
      filePath,
    });

    analysis.confidence = Math.min(
      100,
      analysis.confidence + Math.round(entropy * 8)
    );

    if (analysis.confidence >= 65) {
      analysis.severity = "HIGH";
    } else if (analysis.confidence >= 40) {
      analysis.severity = "MEDIUM";
    }

    analysis.signals.push(
      `entropy ${entropy.toFixed(2)}`
    );

    findings.push({
      type: "High-Entropy String",
      line,
      match: redact(value),
      fingerprint: fingerprint(value),
      ...analysis,
    });
  }

  return findings;
}

function fingerprint(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function redact(text) {
  if (text.length <= 12) {
    return "***";
  }

  return `${text.slice(0, 8)}${"*".repeat(
    Math.min(text.length - 8, 20)
  )}`;
}