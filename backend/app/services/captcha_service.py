"""
SmartReach AI — Captcha Service

Generates visual SVG-based CAPTCHAs with cryptographic HMAC-based verification.
Stateless and secure: no database storage required for verification.
"""

import base64
import hashlib
import hmac
import html
import random
import time
from typing import Tuple

from app.core.config import settings

# Characters excluding ambiguous glyphs (0, O, 1, I, l)
CAPTCHA_CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
CAPTCHA_LENGTH = 6
CAPTCHA_EXPIRY_SECONDS = 600  # 10 minutes

# Harmonious, legible colors for distorted glyphs
GLYPH_COLORS = [
    "#4f46e5",  # Indigo
    "#2563eb",  # Blue
    "#7c3aed",  # Violet
    "#0284c7",  # Sky
    "#059669",  # Emerald
    "#d97706",  # Amber
    "#dc2626",  # Red
    "#db2777",  # Pink
]


def _generate_random_code(length: int = CAPTCHA_LENGTH) -> str:
    """Generate a random alphanumeric string for CAPTCHA."""
    return "".join(random.choice(CAPTCHA_CHARACTERS) for _ in range(length))


def _sign_captcha(code: str, timestamp: int, salt: str) -> str:
    """Compute HMAC signature for the captcha payload."""
    payload = f"{timestamp}:{code.upper()}:{salt}"
    key = settings.JWT_SECRET.encode("utf-8")
    return hmac.new(key, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def generate_captcha() -> Tuple[str, str]:
    """
    Generate a new CAPTCHA challenge.
    
    Returns:
        tuple of (captcha_id: str, svg_content: str)
    """
    code = _generate_random_code()
    timestamp = int(time.time())
    salt = "".join(random.choices("abcdef0123456789", k=8))
    signature = _sign_captcha(code, timestamp, salt)

    # Encode token as: timestamp:salt:signature
    raw_token = f"{timestamp}:{salt}:{signature}"
    captcha_id = base64.urlsafe_b64encode(raw_token.encode("utf-8")).decode("utf-8")

    # Generate styled SVG challenge
    svg = _render_captcha_svg(code)
    return captcha_id, svg


def verify_captcha(captcha_id: str, user_code: str) -> bool:
    """
    Verify user's CAPTCHA input against the encrypted captcha_id.

    Args:
        captcha_id: The identifier returned during generation.
        user_code: The code entered by the user.

    Returns:
        bool: True if valid and not expired, False otherwise.
    """
    if not captcha_id or not user_code:
        return False

    try:
        raw_token = base64.urlsafe_b64decode(captcha_id.encode("utf-8")).decode("utf-8")
        parts = raw_token.split(":")
        if len(parts) != 3:
            return False

        timestamp_str, salt, expected_signature = parts
        timestamp = int(timestamp_str)

        # Check expiration
        current_time = int(time.time())
        if current_time - timestamp > CAPTCHA_EXPIRY_SECONDS or current_time < timestamp - 30:
            return False

        # Compute signature with user's input (normalized to uppercase)
        clean_input = user_code.strip().upper()
        computed_signature = _sign_captcha(clean_input, timestamp, salt)

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature, computed_signature)
    except Exception:
        return False


def _render_captcha_svg(code: str) -> str:
    """Build a rich, distorted SVG representation of the CAPTCHA code."""
    width = 200
    height = 56

    # Random noise lines
    lines_svg = []
    for _ in range(5):
        x1 = random.randint(0, 30)
        y1 = random.randint(10, height - 10)
        x2 = random.randint(width - 30, width)
        y2 = random.randint(10, height - 10)
        stroke_color = random.choice(["#cbd5e1", "#94a3b8", "#e2e8f0", "#a5b4fc"])
        stroke_width = random.uniform(1.2, 2.2)
        lines_svg.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke_color}" stroke-width="{stroke_width:.1f}" stroke-opacity="0.75" />'
        )

    # Random noise dots
    dots_svg = []
    for _ in range(25):
        cx = random.randint(5, width - 5)
        cy = random.randint(5, height - 5)
        r = random.uniform(1.0, 2.2)
        fill = random.choice(["#94a3b8", "#cbd5e1", "#818cf8"])
        dots_svg.append(f'<circle cx="{cx}" cy="{cy}" r="{r:.1f}" fill="{fill}" opacity="0.6"/>')

    # Glyphs with rotation, offset, and color
    char_spacing = (width - 30) / len(code)
    text_elements = []

    for i, char in enumerate(code):
        x = 20 + (i * char_spacing) + random.uniform(-3, 3)
        y = (height / 2) + 8 + random.uniform(-4, 4)
        angle = random.randint(-22, 22)
        color = random.choice(GLYPH_COLORS)
        font_size = random.randint(24, 28)

        escaped_char = html.escape(char)
        text_elements.append(
            f'<text x="{x:.1f}" y="{y:.1f}" '
            f'font-family="system-ui, -apple-system, sans-serif" '
            f'font-size="{font_size}" '
            f'font-weight="700" '
            f'fill="{color}" '
            f'transform="rotate({angle} {x:.1f} {y:.1f})" '
            f'letter-spacing="2">{escaped_char}</text>'
        )

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; user-select: none;">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  {''.join(lines_svg)}
  {''.join(dots_svg)}
  {''.join(text_elements)}
</svg>"""

    return svg_content
