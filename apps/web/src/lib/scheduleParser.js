// Strict schedule syntax: one segment per line, "<number> minutes <title>".
// The unit word is required (no bare "5 opening discussion" fallback) so a
// stray line can't get silently misinterpreted as a duration.
const LINE_PATTERN = /^(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b\s*[.:\-]?\s*(.+)$/i

export function parseScheduleLine(rawLine) {
  const raw = rawLine.trim()
  if (!raw) return null // blank lines are just skipped, not errors

  const match = raw.match(LINE_PATTERN)
  if (!match) {
    return {
      raw,
      valid: false,
      error: 'Expected "<number> minutes <title>", e.g. "5 minutes opening discussion"',
    }
  }

  const minutes = parseFloat(match[1])
  const title = match[2].trim()

  if (minutes <= 0) {
    return { raw, valid: false, error: 'Duration must be greater than 0' }
  }
  if (!title) {
    return { raw, valid: false, error: 'Missing a title after the duration' }
  }

  return { raw, valid: true, minutes, title }
}

// Returns one entry per non-blank line (valid or not), so the UI can show
// exactly which lines failed and why instead of silently dropping them.
export function parseSchedule(text) {
  return text
    .split('\n')
    .map(parseScheduleLine)
    .filter(Boolean)
    .map((result, id) => ({ ...result, id }))
}
