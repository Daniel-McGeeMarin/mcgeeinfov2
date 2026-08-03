"""Rule-based reimbursable? guesser. Returns 0=no, 1=yes, 2=needs_review."""
from __future__ import annotations

import re

_YES: list[str] = [
    # Groceries
    r"whole foods", r"safeway", r"costco", r"trader joe", r"sprouts", r"kroger",
    r"vons", r"ralphs", r"albertsons", r"aldi", r"heb", r"publix", r"wegmans",
    r"smart & final", r"food\s*4\s*less", r"gelson", r"bristol farms",
    # Household / pharmacy
    r"cvs", r"walgreens", r"rite aid", r"target",
    r"home depot", r"lowe'?s", r"ace hardware", r"menards",
    # Utilities / bills
    r"pg&e", r"sdg&e", r"sce\b", r"socal gas", r"southern california gas",
    r"at&t", r"verizon", r"t-mobile", r"comcast", r"xfinity", r"spectrum",
    r"water district", r"electric", r"utilities",
    # Pharmacy / medical
    r"pharmacy", r"rx\b",
]

_NO: list[str] = [
    # Streaming / subscriptions
    r"netflix", r"spotify", r"hulu", r"disney", r"hbo", r"peacock", r"paramount",
    r"apple\.com/bill", r"apple subscription", r"audible", r"kindle",
    # Gaming
    r"steam", r"xbox", r"playstation", r"nintendo", r"epic games",
    # Personal food / coffee
    r"starbucks", r"dutch bros",
    # Ride share / personal transport
    r"lyft", r"uber\b",
]

_RE_YES = [re.compile(p, re.IGNORECASE) for p in _YES]
_RE_NO  = [re.compile(p, re.IGNORECASE) for p in _NO]

_REIMBURSABLE_CATEGORIES = {
    "groceries", "food & drink", "supermarkets", "household",
    "health & wellness", "pharmacy", "utilities", "gas & electric",
    "home improvement",
}

_NOT_REIMBURSABLE_CATEGORIES = {
    "entertainment", "streaming", "gaming", "music", "movies & dvds",
    "rides", "ride share", "personal care",
}


def label_transaction(description: str, category: str | None, amount: float) -> int:
    if amount <= 0:
        return 0  # credits / refunds are never reimbursed

    desc = description.lower()
    cat  = (category or "").lower()

    if any(r.search(desc) for r in _RE_NO):
        return 0
    if cat in _NOT_REIMBURSABLE_CATEGORIES:
        return 0

    if any(r.search(desc) for r in _RE_YES):
        return 1
    if cat in _REIMBURSABLE_CATEGORIES:
        return 1

    return 2  # needs review
