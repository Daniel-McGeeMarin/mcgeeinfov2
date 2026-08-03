"""CSV source detection and unified parse entry-point."""
from __future__ import annotations

from finance.parsers import us_bank, capital_one, discover, venmo, amazon


_PARSERS = {
    "us_bank":     us_bank,
    "capital_one": capital_one,
    "discover":    discover,
    "venmo":       venmo,
    "amazon":      amazon,
}

# Column signatures used to fingerprint each source
_SIGNATURES: list[tuple[str, set[str]]] = [
    ("venmo",       {"amount (total)", "from", "to", "note"}),
    ("capital_one", {"card no.", "transaction date", "posted date", "debit", "credit"}),
    ("discover",    {"trans. date", "post date"}),
    ("amazon",      {"order id", "asin/isbn"}),
    ("amazon",      {"order id", "item subtotal"}),
    ("us_bank",     {"transaction", "memo", "name", "amount"}),
]


def detect_source(csv_text: str) -> str | None:
    """Return the source ID by inspecting the header row(s), or None if unrecognised."""
    for line in csv_text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        cols = {c.strip().lower().strip('"') for c in line.split(",")}
        for source_id, sig in _SIGNATURES:
            if sig.issubset(cols):
                return source_id
    return None


def detect_and_parse(csv_text: str) -> tuple[str, list[dict]]:
    """Detect source then parse. Returns (source_id, rows). Raises ValueError if unknown."""
    source_id = detect_source(csv_text)
    if source_id is None:
        raise ValueError(
            "Unrecognised CSV format. Expected columns from US Bank, Capital One, "
            "Discover, Venmo, or Amazon order history."
        )
    rows = _PARSERS[source_id].parse(csv_text)
    return source_id, rows
