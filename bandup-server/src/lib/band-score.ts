/**
 * Converts a raw score into an IELTS band score (0–9, 0.5 increments).
 *
 * The thresholds are derived from the IELTS Academic Reading band conversion
 * table and normalised to percentages so the function works correctly for any
 * number of questions (easy readings may have fewer than the standard 40).
 *
 * Percentage → Band:
 *   ≥ 97% → 9.0   ≥ 93% → 8.5   ≥ 87% → 8.0   ≥ 80% → 7.5
 *   ≥ 73% → 7.0   ≥ 67% → 6.5   ≥ 60% → 6.0   ≥ 53% → 5.5
 *   ≥ 47% → 5.0   ≥ 40% → 4.5   ≥ 33% → 4.0   ≥ 27% → 3.5
 *   ≥ 20% → 3.0   ≥ 13% → 2.5   ≥  7% → 2.0   ≥  3% → 1.5
 *   >   0% → 1.0  = 0% → 0.0
 */
export function calculateBandScore(correctCount: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;

  const pct = correctCount / totalQuestions;

  if (pct >= 0.97) return 9.0;
  if (pct >= 0.93) return 8.5;
  if (pct >= 0.87) return 8.0;
  if (pct >= 0.80) return 7.5;
  if (pct >= 0.73) return 7.0;
  if (pct >= 0.67) return 6.5;
  if (pct >= 0.60) return 6.0;
  if (pct >= 0.53) return 5.5;
  if (pct >= 0.47) return 5.0;
  if (pct >= 0.40) return 4.5;
  if (pct >= 0.33) return 4.0;
  if (pct >= 0.27) return 3.5;
  if (pct >= 0.20) return 3.0;
  if (pct >= 0.13) return 2.5;
  if (pct >= 0.07) return 2.0;
  if (pct >= 0.03) return 1.5;
  if (pct > 0)     return 1.0;
  return 0.0;
}
