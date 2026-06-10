import random
import string

_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_group_code() -> str:
    return "".join(random.choices(_CHARS, k=5))
