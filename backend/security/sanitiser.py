import re

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def strip_whitespace(value):
    if isinstance(value, str):
        return value.strip()
    return value


def strip_html_tags(value):
    if isinstance(value, str):
        return _HTML_TAG_RE.sub("", value)
    return value


def sanitise_string(value):
    value = strip_whitespace(value)
    value = strip_html_tags(value)
    return value


def is_valid_email(email):
    if not isinstance(email, str):
        return False
    return _EMAIL_RE.match(email) is not None


def is_valid_password(password):
    if not isinstance(password, str):
        return False
    if len(password) < 8:
        return False
    if not re.search(r"\d", password):
        return False
    return True
