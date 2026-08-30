import { createHash } from "node:crypto";
import { looksRandom, calculateEntropy } from "./entropy.js";
import { analyzeFinding } from "./analyzer.js";

const patterns = [
  {
    name: "Hardcoded Password",
    regex: /\b(password|passwd|pwd)\s*[:=]\s*["'`]?([^"'`\s,;]{4,})["'`]?(?=\s|;|,|$)/gi,
    valueGroup: 2,
    variableGroup: 1,
  },
  {
    name: "API Key",
    regex: /\b(api[_-]?key|apikey)\s*[:=]\s*["'`]?([A-Za-z0-9_\-]{12,})["'`]?(?=\s|;|,|$)/gi,
    valueGroup: 2,
    variableGroup: 1,
  },
  {
    name: "Secret",
    regex: /\b(secret|client_secret)\s*[:=]\s*["'`]?([^"'`\s,;]{8,})["'`]?(?=\s|;|,|$)/gi,
    valueGroup: 2,
    variableGroup: 1,
  },
  {
    name: "Access Token",
    regex: /\b(access[_-]?token|auth[_-]?token)\s*[:=]\s*["'`]?([A-Za-z0-9_\-]{12,})["'`]?(?=\s|;|,|$)/gi,
    valueGroup: 2,
    variableGroup: 1,
  },

  // Common AWS access-key formats.
  {
    name: "AWS Access Key",
    regex: /\b((?:AKIA|ASIA)[A-Z0-9]{16})\b/g,
    valueGroup: 1,
    variableGroup: null,
  },

  // Common GitHub token formats.
  {
    name: "GitHub Token",
    regex: /\b((?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}))\b/g,
    valueGroup: 1,
    variableGroup: null,
  },

  // JSON Web Tokens.
  {
    name: "JWT",
    regex: /\b(eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,})\b/g,
    valueGroup: 1,
    variableGroup: null,
  },

  // Authorization headers containing bearer credentials.
  {
    name: "Bearer Token",
    regex: /\bBearer\s+([A-Za-z0-9._~+/=-]{16,})\b/gi,
    valueGroup: 1,
    variableGroup: null,
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

      if (!value || detectedValues.has(value)) {
        continue;
      }

      const variableName =
        pattern.variableGroup === null
          ? ""
          : match[pattern.variableGroup];

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
    /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g;

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
      match: "[REDACTED]",
      fingerprint: fingerprint(value),
      ...analysis,
    });

    detectedValues.add(value);
  }

  return findings;
}

function fingerprint(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function redact(text) {
  const separator = text.search(/[:=]\s*/);

  if (separator !== -1) {
    const endOfSeparator =
      text.slice(separator).match(/[:=]\s*/)[0].length +
      separator;

    return `${text.slice(0, endOfSeparator)}[REDACTED]`;
  }

  return "[REDACTED]";
}