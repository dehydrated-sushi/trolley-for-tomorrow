from security.sanitiser import (
    is_valid_email,
    is_valid_password,
    sanitise_string,
    strip_html_tags,
    strip_whitespace,
)


class TestStripWhitespace:
    def test_strips_leading_whitespace(self):
        assert strip_whitespace("  hello") == "hello"

    def test_strips_trailing_whitespace(self):
        assert strip_whitespace("hello  ") == "hello"

    def test_strips_both_sides(self):
        assert strip_whitespace("  hello  ") == "hello"

    def test_preserves_internal_spaces(self):
        assert strip_whitespace("  hello world  ") == "hello world"

    def test_returns_non_string_unchanged(self):
        assert strip_whitespace(123) == 123
        assert strip_whitespace(None) is None


class TestStripHtmlTags:
    def test_removes_simple_tags(self):
        assert strip_html_tags("<b>bold</b>") == "bold"

    def test_removes_script_tags(self):
        assert strip_html_tags('<script>alert("xss")</script>') == 'alert("xss")'

    def test_removes_nested_tags(self):
        assert strip_html_tags("<div><p>text</p></div>") == "text"

    def test_leaves_plain_text_unchanged(self):
        assert strip_html_tags("no tags here") == "no tags here"

    def test_returns_non_string_unchanged(self):
        assert strip_html_tags(42) == 42


class TestSanitiseString:
    def test_strips_whitespace_and_tags(self):
        assert sanitise_string("  <b>hello</b>  ") == "hello"

    def test_handles_clean_input(self):
        assert sanitise_string("clean input") == "clean input"


class TestIsValidEmail:
    def test_valid_email(self):
        assert is_valid_email("user@example.com") is True

    def test_valid_email_with_dots(self):
        assert is_valid_email("first.last@example.com") is True

    def test_valid_email_with_plus(self):
        assert is_valid_email("user+tag@example.com") is True

    def test_missing_at_sign(self):
        assert is_valid_email("userexample.com") is False

    def test_missing_domain(self):
        assert is_valid_email("user@") is False

    def test_empty_string(self):
        assert is_valid_email("") is False

    def test_non_string(self):
        assert is_valid_email(None) is False

    def test_spaces(self):
        assert is_valid_email("user @example.com") is False


class TestIsValidPassword:
    def test_valid_password(self):
        assert is_valid_password("password1") is True

    def test_valid_complex_password(self):
        assert is_valid_password("Str0ngP@ss!") is True

    def test_too_short(self):
        assert is_valid_password("pass1") is False

    def test_no_number(self):
        assert is_valid_password("password") is False

    def test_exactly_eight_chars_with_number(self):
        assert is_valid_password("passwor1") is True

    def test_non_string(self):
        assert is_valid_password(12345678) is False

    def test_empty_string(self):
        assert is_valid_password("") is False
