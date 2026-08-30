const CREDENTIAL_WORDS = [
  "password",
  "passwd",
  "pwd",
  "api_key",
  "apikey",
  "secret",
  "token",
  "access_token",
  "auth_token",
  "private_key",
];

const STRONG_SECRET_TYPES = new Set([
  "AWS Access Key",
  "GitHub Token",
  "JWT",
  "Bearer Token",
]);

export function analyzeFinding({
  type,
  value = "",
  variableName = "",
  filePath = "",
}) {
  let score = 0;
  const signals = [];

  // Known secret patterns provide strong evidence.
  if (type !== "High-Entropy String") {
    score += 55;
    signals.push("known secret pattern");
  }

  // Provider-specific token formats are stronger evidence
  // than generic secret assignments.
  if (STRONG_SECRET_TYPES.has(type)) {
    score += 15;
    signals.push("known credential format");
  }

  // Credential-like variable names are strong evidence.
  const normalizedName = variableName
    .toLowerCase()
    .replace(/-/g, "_");

  if (
    CREDENTIAL_WORDS.some((word) =>
      normalizedName.includes(word)
    )
  ) {
    score += 20;
    signals.push("credential-like variable name");
  }

  // Long values provide additional evidence.
  if (value.length >= 20) {
    score += 10;
    signals.push("long credential-like value");
  }

  // Encoded/random-looking values provide additional evidence.
  if (value.length >= 16) {
    score += 5;
    signals.push(
      "long encoded/random-looking value"
    );
  }

  // Documentation and test files commonly contain
  // intentionally fake credentials.
  const lowerPath = filePath.toLowerCase();

  if (
    lowerPath.includes("test") ||
    lowerPath.includes("example") ||
    lowerPath.includes("fixture") ||
    lowerPath.includes("readme")
  ) {
    score -= 20;
    signals.push(
      "possible example/test file"
    );
  }

  score = Math.max(
    0,
    Math.min(100, score)
  );

  let severity = "LOW";

  if (score >= 85) {
    severity = "CRITICAL";
  } else if (score >= 65) {
    severity = "HIGH";
  } else if (score >= 40) {
    severity = "MEDIUM";
  }

  return {
    confidence: score,
    severity,
    signals,
  };
}