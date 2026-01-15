"""Persistence layer for in-memory stores.

Provides a simple file-based persistence mechanism using JSON files.
Suitable for single-server deployments. Production would use Redis.
"""
from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Optional, List

logger = logging.getLogger(__name__)

# Default directory for persistence files
_DEFAULT_DATA_DIR = ".data"


def get_default_persistence_dir() -> str:
    """Get the default persistence directory from environment or fallback."""
    return os.environ.get("PERSISTENCE_DIR", _DEFAULT_DATA_DIR)


class PersistentStore:
    """Thread-safe file-based persistent key-value store.

    Each namespace gets its own subdirectory, and each key becomes a separate
    JSON file. This provides simple isolation and easy debugging.

    Args:
        data_dir: Base directory for persistence files (default: .data/)
        namespace: Subdirectory name to isolate different stores
    """

    def __init__(self, data_dir: Optional[str] = None, namespace: str = "default"):
        self._data_dir = Path(data_dir) if data_dir else Path(get_default_persistence_dir())
        self._namespace = namespace
        self._namespace_dir = self._data_dir / namespace
        self._lock = threading.Lock()

        # Create directory if it doesn't exist
        try:
            self._namespace_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Failed to create persistence directory {self._namespace_dir}: {e}")

    def _key_to_path(self, key: str) -> Path:
        """Convert a key to a file path.

        Keys are sanitized to prevent directory traversal attacks.
        """
        # Sanitize key: replace unsafe characters
        safe_key = key.replace("/", "_").replace("\\", "_").replace("..", "_")
        return self._namespace_dir / f"{safe_key}.json"

    def get(self, key: str, default: Any = None) -> Any:
        """Get a value by key.

        Args:
            key: The key to look up
            default: Value to return if key doesn't exist

        Returns:
            The stored value, or default if not found or on error
        """
        file_path = self._key_to_path(key)

        with self._lock:
            try:
                if not file_path.exists():
                    return default

                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("value", default)
            except json.JSONDecodeError as e:
                logger.warning(f"Corrupted persistence file {file_path}: {e}")
                return default
            except Exception as e:
                logger.warning(f"Failed to read persistence file {file_path}: {e}")
                return default

    def set(self, key: str, value: Any) -> bool:
        """Set a value by key.

        Args:
            key: The key to store
            value: The value to store (must be JSON-serializable)

        Returns:
            True if successful, False on error
        """
        file_path = self._key_to_path(key)

        with self._lock:
            try:
                # Write to a temporary file first, then rename for atomicity
                temp_path = file_path.with_suffix(".tmp")
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump({"value": value}, f, indent=2)

                # Atomic rename (works on POSIX systems)
                temp_path.replace(file_path)
                return True
            except Exception as e:
                logger.warning(f"Failed to write persistence file {file_path}: {e}")
                # Clean up temp file if it exists
                try:
                    if temp_path.exists():
                        temp_path.unlink()
                except Exception:
                    pass
                return False

    def delete(self, key: str) -> bool:
        """Delete a key.

        Args:
            key: The key to delete

        Returns:
            True if key was deleted, False if it didn't exist or on error
        """
        file_path = self._key_to_path(key)

        with self._lock:
            try:
                if not file_path.exists():
                    return False

                file_path.unlink()
                return True
            except Exception as e:
                logger.warning(f"Failed to delete persistence file {file_path}: {e}")
                return False

    def keys(self) -> List[str]:
        """List all keys in the namespace.

        Returns:
            List of key names
        """
        with self._lock:
            try:
                if not self._namespace_dir.exists():
                    return []

                keys = []
                for file_path in self._namespace_dir.glob("*.json"):
                    # Extract key name from filename (remove .json extension)
                    key = file_path.stem
                    keys.append(key)
                return keys
            except Exception as e:
                logger.warning(f"Failed to list keys in {self._namespace_dir}: {e}")
                return []

    def clear(self) -> bool:
        """Clear all data in the namespace.

        Returns:
            True if successful, False on error
        """
        with self._lock:
            try:
                if not self._namespace_dir.exists():
                    return True

                for file_path in self._namespace_dir.glob("*.json"):
                    try:
                        file_path.unlink()
                    except Exception as e:
                        logger.warning(f"Failed to delete {file_path}: {e}")

                return True
            except Exception as e:
                logger.warning(f"Failed to clear namespace {self._namespace_dir}: {e}")
                return False


# -----------------------------------------------------------------------------
# Factory functions for common stores
# -----------------------------------------------------------------------------

_invoice_store: Optional[PersistentStore] = None
_channel_receipt_store: Optional[PersistentStore] = None


def get_invoice_store() -> PersistentStore:
    """Get or create the invoice record store singleton."""
    global _invoice_store
    if _invoice_store is None:
        _invoice_store = PersistentStore(namespace="invoices")
    return _invoice_store


def get_channel_receipt_store() -> PersistentStore:
    """Get or create the channel receipt store singleton."""
    global _channel_receipt_store
    if _channel_receipt_store is None:
        _channel_receipt_store = PersistentStore(namespace="channel_receipts")
    return _channel_receipt_store
