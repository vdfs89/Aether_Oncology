import json
import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class PHIScrubber:
    """
    Detects and scrubs Personally Identifiable Information (PII) and Protected Health Information (PHI)
    from structured data. Implements HIPAA-compliant data masking for audit logs.
    """

    def __init__(self, patterns_file: str | None = None):
        self.patterns = {}
        self.compiled_patterns = {}
        self._load_patterns(patterns_file)
        self._compile_patterns()

    def _load_patterns(self, patterns_file: str | None = None):
        """Load regex patterns from config file or use defaults."""
        if patterns_file and Path(patterns_file).exists():
            try:
                with open(patterns_file) as f:
                    self.patterns = json.load(f)
                logger.info("PHI patterns loaded from %s", patterns_file)
                return
            except Exception as e:
                logger.warning(
                    "Failed to load patterns from %s: %s. Using defaults.",
                    patterns_file,
                    e,
                )

        # Default patterns for common PHI/PII
        self.patterns = {
            "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "phone": r"\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b",
            "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
            "date_of_birth": r"\b(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\d|3[01])/(?:19|20)\d{2}\b",
            "mrn": r"\bMR\d{6,8}\b",
            "name_pattern": r"\b(?:[A-Z][a-z]+ ){1,3}[A-Z][a-z]+\b",
        }

    def _compile_patterns(self):
        """Compile regex patterns for better performance."""
        for key, pattern in self.patterns.items():
            try:
                self.compiled_patterns[key] = re.compile(pattern, re.IGNORECASE)
            except Exception as e:
                logger.warning("Failed to compile pattern '%s': %s", key, e)

    def scrub_string(self, text: str) -> tuple[str, dict[str, list[str]]]:
        """
        Scrub PHI from a string and return scrubbed text + detected PHI summary.

        Args:
            text: Input string to scrub

        Returns:
            Tuple of (scrubbed_text, detected_phi_dict)
        """
        if not isinstance(text, str):
            return str(text), {}

        scrubbed = text
        detected = {}

        for pattern_name, compiled_pattern in self.compiled_patterns.items():
            matches = compiled_pattern.findall(text)
            if matches:
                detected[pattern_name] = matches
                # Replace matches with masked placeholder
                placeholder = f"[{pattern_name.upper()}_REDACTED]"
                scrubbed = compiled_pattern.sub(placeholder, scrubbed)

        return scrubbed, detected

    def scrub_dict(
        self, data: dict, sensitive_fields: list[str] | None = None
    ) -> tuple[dict, dict]:
        """
        Scrub PHI from dictionary values. Optionally treat specific fields as sensitive.

        Args:
            data: Input dictionary to scrub
            sensitive_fields: List of field names to treat as sensitive (scrubbed regardless)

        Returns:
            Tuple of (scrubbed_dict, detected_phi_dict)
        """
        if not isinstance(data, dict):
            return data, {}

        sensitive_fields = sensitive_fields or []
        scrubbed = {}
        all_detected = {}

        for key, value in data.items():
            is_sensitive = key.lower() in [f.lower() for f in sensitive_fields]

            if isinstance(value, str):
                scrubbed_value, detected = self.scrub_string(value)
                scrubbed[key] = scrubbed_value if detected or is_sensitive else value
                if detected:
                    all_detected[key] = detected
            elif isinstance(value, dict):
                scrubbed_value, detected = self.scrub_dict(value, sensitive_fields)
                scrubbed[key] = scrubbed_value
                if detected:
                    all_detected[key] = detected
            elif isinstance(value, list):
                scrubbed_list = []
                for item in value:
                    if isinstance(item, str):
                        scrubbed_item, detected = self.scrub_string(item)
                        scrubbed_list.append(
                            scrubbed_item if detected or is_sensitive else item
                        )
                        if detected:
                            if key not in all_detected:
                                all_detected[key] = []
                            all_detected[key].append(detected)
                    elif isinstance(item, dict):
                        scrubbed_item, detected = self.scrub_dict(
                            item, sensitive_fields
                        )
                        scrubbed_list.append(scrubbed_item)
                        if detected:
                            if key not in all_detected:
                                all_detected[key] = []
                            all_detected[key].append(detected)
                    else:
                        scrubbed_list.append(item)
                scrubbed[key] = scrubbed_list
            else:
                scrubbed[key] = value

        return scrubbed, all_detected

    def should_scrub(self, data: Any) -> bool:
        """Check if data contains any detected PHI."""
        if isinstance(data, str):
            _, detected = self.scrub_string(data)
            return bool(detected)
        elif isinstance(data, dict):
            _, detected = self.scrub_dict(data)
            return bool(detected)
        return False


# Global singleton instance
_scrubber_instance = None


def get_phi_scrubber() -> PHIScrubber:
    """Get or create global PHI scrubber instance."""
    global _scrubber_instance
    if _scrubber_instance is None:
        config_path = (
            Path(__file__).resolve().parents[1] / "config" / "phi_patterns.json"
        )
        _scrubber_instance = PHIScrubber(str(config_path))
    return _scrubber_instance
