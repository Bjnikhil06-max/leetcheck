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

const PLACEHOLDER_VALUES = new Set([
  "example",
  "example123",
  "changeme",
  "change_me",
  "password",
  "yourpassword",
  "your-password",
  "your_password",
  "your-api-key",
  "your_api_key",
  "your-api-key-here",
  "your_api_key_here",
  "your-token",
  "your_token",
  "your-token-here",
  "your_token_here",
  "placeholder",
  "replace-me",
  "replace_me",
  "dummy",
  "test",
  "fake",
]);

export function analyzeFinding({
  type,
  value = "",
  variableName = "",
  filePath = "",
  isComment=false,
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
    if (isComment) {
    score -= 20;
    signals.push("comment");
  }

  score = Math.max(
    0,
    Math.min(100, score)
  );

    const normalizedValue = value
    .trim()
    .toLowerCase();

  if (
    PLACEHOLDER_VALUES.has(normalizedValue) ||
    normalizedValue.includes("<your-") ||
    normalizedValue.includes("<your_") ||
    normalizedValue.includes("your-api-key-here") ||
    normalizedValue.includes("your_api_key_here")
  ) {
    score -= 35;
    signals.push("likely placeholder value");
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