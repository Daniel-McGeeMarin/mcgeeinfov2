// Copy-pasteable prompt that gets an AI's meeting-minutes/agenda output into the exact
// strict syntax scheduleParser.js requires. Keep this in sync with LINE_PATTERN there —
// if the parser's accepted syntax changes, this prompt needs to change with it.
export const AI_MINUTES_PROMPT = `You are generating a schedule for a session timer app. Convert the meeting/session notes I give you below into a strict line-based schedule.

Output format rules — follow exactly, with no exceptions:
- One segment per line, listed in the order they should occur.
- Each line must look exactly like this: <number> minutes <title>
  Example: 5 minutes opening discussion
- <number> is a plain duration in minutes only — a whole number or one decimal place (e.g. 5 or 7.5). Never use a range (write "7 minutes", not "5-10 minutes"). Always spell out the word "minutes" in full — never "min", "mins", or "m".
- <title> is a short, plain-text description (2-6 words) of that segment. No leading punctuation, numbering, bullets, dashes, or colons before or inside it.
- Output ONLY the schedule lines. No title, no headers, no blank lines between them, no markdown formatting, no code fences (no \`\`\`), no commentary before or after the list.
- If I give you a target total duration, divide time across segments so they add up to approximately that total.

Here are my meeting/session notes:
`
