from __future__ import annotations

import random
import re

# Short readable tokens for uniqueness (e.g. my-survey-alpha-4821).
_SUFFIX_WORDS = (
    "alpha",
    "beta",
    "gamma",
    "delta",
    "nova",
    "apex",
    "echo",
    "iris",
    "mint",
    "onyx",
    "ruby",
    "sage",
    "volt",
    "wave",
    "flux",
    "lynx",
)


def slugify_title(title: str) -> str:
    s = title.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-") or "form"
    return s[:100]


def generate_auto_slug(base: str) -> str:
    """Return `{base}-{word}-{n}` — dashed words from the title, then a token and number."""
    word = random.choice(_SUFFIX_WORDS)
    num = random.randint(100, 99999)
    suffix = f"-{word}-{num}"
    if len(base) + len(suffix) <= 100:
        return f"{base}{suffix}"
    max_base = max(1, 100 - len(suffix))
    trimmed = base[:max_base].rstrip("-")
    return f"{trimmed}{suffix}"[:100].rstrip("-")
