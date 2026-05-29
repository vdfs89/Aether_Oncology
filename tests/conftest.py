import os

from cryptography.fernet import Fernet

# Setup environment variables for test execution
os.environ["AUDIT_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
