export function calculateEntropy(value) {
  if (!value) {
    return 0;
  }

  const frequencies = new Map();

  for (const character of value) {
    frequencies.set(
      character,
      (frequencies.get(character) || 0) + 1
    );
  }

  let entropy = 0;

  for (const count of frequencies.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

export function looksRandom(value) {
  if (value.length < 16) {
    return false;
  }

  return calculateEntropy(value) >= 3.5;
}
