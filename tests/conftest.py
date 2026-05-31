import os

from cryptography.fernet import Fernet

# Setup environment variables for test execution
os.environ["AUDIT_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

# Keep the suite hermetic: never reach a real MongoDB. Tests that exercise the
# Mongo store inject an in-memory mongomock collection directly.
os.environ["AUDIT_MONGO_ENABLED"] = "false"

# Deterministic auth for API tests. _RAW_API_KEY is read at import time, so this
# must be set before `src.main` is imported. Fail-closed (no key) is covered by a
# dedicated test that monkeypatches the value to None.
os.environ.setdefault("API_KEY", "aether-oncology-eval-2026")
