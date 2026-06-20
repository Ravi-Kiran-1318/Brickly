function parseDurationToDays(durationText) {
  if (!durationText) return null;
  const text = durationText.toLowerCase().trim();

  const numberMatch = text.match(/(\d+(\.\d+)?)/);
  if (!numberMatch) return null;
  const num = parseFloat(numberMatch[1]);

  if (text.includes('day'))   return Math.round(num);
  if (text.includes('week'))  return Math.round(num * 7);
  if (text.includes('month')) return Math.round(num * 30);
  if (text.includes('year'))  return Math.round(num * 365);

  return null; // unrecognized format — treat as open-ended
}

module.exports = { parseDurationToDays };
