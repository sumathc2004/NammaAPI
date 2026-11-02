/** Long codes shortened to their first and last three characters ("630693528366" → "630…366"); the full code goes in a tooltip and the copy button. */
export function shortCode(code: string): string {
  return code.length > 8 ? `${code.slice(0, 3)}…${code.slice(-3)}` : code;
}
