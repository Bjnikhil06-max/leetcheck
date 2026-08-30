const patterns = [
  {
    name: "Hardcoded Password",
    severity: "HIGH",
    regex: /\b(password|passwd|pwd)\s*[:=]\s*["'`]([^"'`]{4,})["'`]/gi,
  },
  {
    name: "API Key",
    severity: "HIGH",
    regex: /\b(api[_-]?key)\s*[:=]\s*["'`]([A-Za-z0-9_\-]{12,})["'`]/gi,
  },
  {
    name: "Secret",
    severity: "HIGH",
    regex: /\b(secret|client_secret)\s*[:=]\s*["'`]([^"'`]{8,})["'`]/gi,
  },
  {
    name: "Access Token",
    severity: "HIGH",
    regex: /\b(access[_-]?token|auth[_-]?token)\s*[:=]\s*["'`]([^"'`]{12,})["'`]/gi,
  },
  {
    name: "Private Key",
    severity: "CRITICAL",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
];

export function detectSecrets(contents) {
  const findings = [];

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;

    let match;

    while ((match = pattern.regex.exec(contents)) !== null) {
      const line = contents.slice(0, match.index).split("\n").length;

      findings.push({
        type: pattern.name,
        severity: pattern.severity,
        line,
        match: redact(match[0]),
      });
    }
  }

  return findings;
}

function redact(text) {
  if (text.length <= 12) {
    return "***";
  }

  return `${text.slice(0, 8)}${"*".repeat(Math.min(text.length - 8, 20))}`;
}