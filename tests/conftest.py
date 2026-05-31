import os

from cryptography.fernet import Fernet

# Setup environment variables for test execution
os.environ["AUDIT_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

# Keep the suite hermetic: never reach a real MongoDB. Tests that exercise the
# Mongo store inject an in-memory mongomock collection directly.
os.environ["AUDIT_MONGO_ENABLED"] = "false"

# Deterministic auth for API tests. _RAW_API_KEY is read at import time, so this
# must be set before `src.main` is imported. A NON-eval key is used so the
# production-mode suite passes the "reject eval key" guard. Fail-closed (no key),
# dev-mode and eval-key rejection are covered by dedicated tests.
os.environ.setdefault("API_KEY", "test-secure-key-2026")

# Disable the shared slowapi rate limiter for the suite — many /predict calls
# across tests would otherwise trip the 10/min cap and 429 unrelated tests.
from src.main import limiter  # noqa: E402

limiter.enabled = False
