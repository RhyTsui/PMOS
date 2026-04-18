from __future__ import annotations

import shlex


FORBIDDEN_CHARS = {"|", "&", ";", ">", "<", "`"}
FORBIDDEN_SUBSTRINGS = ["$(`", "$(", "\r", "\n"]


class CliTokenizationError(ValueError):
    pass



def tokenize_command(command: str) -> list[str]:
    stripped = command.strip()
    if not stripped:
        raise CliTokenizationError("command is empty")

    for char in FORBIDDEN_CHARS:
        if char in stripped:
            raise CliTokenizationError(f"unsupported shell metacharacter: {char}")

    for needle in FORBIDDEN_SUBSTRINGS:
        if needle in stripped:
            raise CliTokenizationError("unsupported shell-like expansion or multiline input")

    try:
        tokens = shlex.split(stripped, posix=True)
    except ValueError as exc:
        raise CliTokenizationError(str(exc)) from exc

    if not tokens:
        raise CliTokenizationError("command is empty")

    return tokens
