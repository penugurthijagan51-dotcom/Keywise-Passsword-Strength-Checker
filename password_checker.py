"""Offline password strength assessment and interactive command-line checker."""

from __future__ import annotations

import getpass
import re
import string
from dataclasses import dataclass

_COMMON_PASSWORDS = {
    "123456",
    "12345678",
    "123456789",
    "1234567890",
    "admin",
    "iloveyou",
    "letmein",
    "monkey",
    "password",
    "password1",
    "qwerty",
    "qwerty123",
    "welcome",
}
_CHARACTER_GROUPS = (
    string.ascii_lowercase,
    string.ascii_uppercase,
    string.digits,
    string.punctuation,
)


@dataclass(frozen=True)
class PasswordAssessment:
    """Results from checking one password; the password itself is never retained."""

    score: int
    strength: str
    checks: tuple[tuple[str, bool], ...]
    suggestions: tuple[str, ...]


def _has_sequence(password: str, minimum_length: int = 3) -> bool:
    """Return whether the password contains an increasing or decreasing sequence."""
    normalized = password.casefold()
    run_length = 1

    for previous, current in zip(normalized, normalized[1:]):
        if ord(current) - ord(previous) in (-1, 1):
            run_length += 1
            if run_length >= minimum_length:
                return True
        else:
            run_length = 1
    return False


def _has_repeated_pattern(password: str) -> bool:
    """Return whether a short chunk is repeated at least three times."""
    return re.search(r"(.{1,3})\1{2,}", password, flags=re.IGNORECASE) is not None


def evaluate_password(password: str) -> PasswordAssessment:
    """Assess a password locally and return a score, checks, and improvement tips."""
    if not isinstance(password, str):
        raise TypeError("password must be a string")

    suggestions: list[str] = []
    normalized = password.casefold()
    is_common = normalized in _COMMON_PASSWORDS
    has_lowercase = any(character.islower() for character in password)
    has_uppercase = any(character.isupper() for character in password)
    has_number = any(character.isdigit() for character in password)
    has_symbol = any(not character.isalnum() and not character.isspace() for character in password)
    has_multiple_groups = sum(
        any(character in group for character in password)
        for group in _CHARACTER_GROUPS
    ) >= 2
    has_sequence = _has_sequence(password)
    has_repeated_pattern = _has_repeated_pattern(password)
    unique_ratio = len(set(password)) / len(password) if password else 0

    checks = (
        ("At least 12 characters", len(password) >= 12),
        ("At least 16 characters", len(password) >= 16),
        ("Lowercase letters", has_lowercase),
        ("Uppercase letters", has_uppercase),
        ("Numbers", has_number),
        ("Symbols", has_symbol),
        ("Avoids common passwords", not is_common),
        ("Avoids obvious sequences", not has_sequence),
        ("Avoids repeated patterns", not has_repeated_pattern),
    )

    if len(password) < 12:
        suggestions.append("Use at least 12 characters; a longer passphrase is better.")
    elif len(password) < 16:
        suggestions.append("Aim for 16 or more characters for a stronger passphrase.")
    if not has_multiple_groups:
        suggestions.append("Use a mix of character types, or choose several unrelated words.")
    if unique_ratio < 0.5 and password:
        suggestions.append("Avoid repeating the same characters or short patterns.")
    if is_common:
        suggestions.append("This is a commonly used password; choose something unique.")
    if has_sequence:
        suggestions.append("Avoid predictable sequences such as abc or 123.")
    if not suggestions:
        suggestions.append("Good work. Keep this password unique to one account.")

    if len(password) < 8:
        score = 5
    elif len(password) < 12:
        score = 15
    elif len(password) < 16:
        score = 28
    elif len(password) < 20:
        score = 38
    else:
        score = 48

    score += 9 * sum((has_lowercase, has_uppercase, has_number, has_symbol))
    if unique_ratio >= 0.8:
        score += 15
    elif unique_ratio >= 0.6:
        score += 10
    elif unique_ratio >= 0.4:
        score += 5
    if is_common:
        score -= 45
    if has_sequence:
        score -= 10
    if has_repeated_pattern:
        score -= 15
    score = max(0, min(100, score))
    if len(password) < 12:
        score = min(score, 39)
    elif len(password) < 16:
        score = min(score, 69)

    if score < 40:
        strength = "Weak"
    elif score < 60:
        strength = "Fair"
    elif score < 80:
        strength = "Good"
    else:
        strength = "Strong"

    return PasswordAssessment(
        score=score,
        strength=strength,
        checks=checks,
        suggestions=tuple(suggestions),
    )


def format_report(assessment: PasswordAssessment) -> str:
    """Format an assessment for terminal output without including the password."""
    lines = [
        "\n--- Password Strength Report ---",
        f"Strength: {assessment.strength}",
        f"Score: {assessment.score}/100 (heuristic)",
        "",
        "Checks:",
    ]
    lines.extend(
        f"  [{'x' if passed else ' '}] {label}"
        for label, passed in assessment.checks
    )
    lines.append("\nSuggestions:")
    lines.extend(f"  - {suggestion}" for suggestion in assessment.suggestions)
    return "\n".join(lines)


def check_password(password: str) -> PasswordAssessment:
    """Assess and print a password, preserving the original script's entry point."""
    assessment = evaluate_password(password)
    print(format_report(assessment))
    return assessment


def main() -> int:
    """Read a password without echoing it and display a local assessment."""
    try:
        password = getpass.getpass(
            "Enter a password to check (input is hidden; Ctrl+C to quit): "
        )
    except (KeyboardInterrupt, EOFError):
        print("\nPassword check cancelled.")
        return 1

    if not password:
        print("A blank password cannot be checked.")
        return 1

    check_password(password)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
