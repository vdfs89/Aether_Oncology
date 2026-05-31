import os

from cryptography.fernet import Fernet

# Setup environment variables for test execution
os.environ["AUDIT_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

# Keep the suite hermetic: never reach a real MongoDB. Tests that exercise the
# Mongo store inject an in-memory mongomock collection directly.
os.environ["AUDIT_MONGO_ENABLED"] = "false"
