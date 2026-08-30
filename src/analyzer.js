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

export function analyzeFinding({
  type,
  value = "",
  variableName = "",
  filePath = "",
}) {
  let score = 0;
  const signals = [];

  // Strong signal: a known secret pattern matched.
  if (type !== "High-Entropy String") {
    score += 55;
    signals.push("known secret pattern");
  }

  // Credential-like variable names are strong evidence.
  const normalizedName = variableName.toLowerCase().replace(/-/g, "_");

  if (
    CREDENTIAL_WORDS.some((word) =>
      normalizedName.includes(word)
    )
  ) {
    score += 20;
    signals.push("credential-like variable name");
  }

  // Long values are more likely to be tokens.
  if (value.length >= 20) {
    score += 10;
    signals.push("long credential-like value");
  }

  // High randomness is useful evidence.
  if (value.length >= 16) {
    score += 5;
    signals.push("long encoded/random-looking value");
  }

  // Documentation and tests commonly contain examples.
  const lowerPath = filePath.toLowerCase();

  if (
    lowerPath.includes("test") ||
    lowerPath.includes("example") ||
    lowerPath.includes("fixture") ||
    lowerPath.includes("readme")
  ) {
    score -= 20;
    signals.push("possible example/test file");
  }

  score = Math.max(0, Math.min(100, score));

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