/** Older imports replaced absent bench scores with 0. Treat those ambiguous
 * cached zeroes as unknown until fresh coverage metadata is available. */
export function isRecordedScore(
  value: unknown,
  id: string,
  missing: string[] | undefined,
  isBench: boolean,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    !missing?.includes(id) &&
    !(isBench && value === 0 && missing === undefined)
  );
}
