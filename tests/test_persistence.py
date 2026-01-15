"""Tests for the persistence layer.

TDD Phase 1: Write failing tests first.
"""
from __future__ import annotations

import os
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch
import threading
import time

import pytest


class TestPersistentStore:
    """Test cases for the PersistentStore class."""

    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test persistence."""
        dirpath = tempfile.mkdtemp()
        yield dirpath
        shutil.rmtree(dirpath, ignore_errors=True)

    def test_init_creates_directory(self, temp_dir):
        """Test that PersistentStore creates the data directory if it doesn't exist."""
        from agent.persistence import PersistentStore

        subdir = os.path.join(temp_dir, "subdir", "data")
        store = PersistentStore(data_dir=subdir)
        assert os.path.isdir(subdir)

    def test_set_and_get_basic(self, temp_dir):
        """Test basic set and get operations."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        store.set("key1", {"invoiceId": "123", "status": "confirmed"})
        result = store.get("key1")
        assert result == {"invoiceId": "123", "status": "confirmed"}

    def test_get_nonexistent_returns_none(self, temp_dir):
        """Test that getting a non-existent key returns None."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        result = store.get("nonexistent")
        assert result is None

    def test_get_with_default(self, temp_dir):
        """Test that get returns default for non-existent keys."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        default_val = {"default": True}
        result = store.get("nonexistent", default=default_val)
        assert result == default_val

    def test_delete_existing_key(self, temp_dir):
        """Test deleting an existing key."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        store.set("key1", {"data": "value"})
        assert store.get("key1") is not None
        deleted = store.delete("key1")
        assert deleted is True
        assert store.get("key1") is None

    def test_delete_nonexistent_key(self, temp_dir):
        """Test deleting a non-existent key returns False."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        deleted = store.delete("nonexistent")
        assert deleted is False

    def test_persistence_across_instances(self, temp_dir):
        """Test that data persists when creating a new store instance."""
        from agent.persistence import PersistentStore

        store1 = PersistentStore(data_dir=temp_dir, namespace="test")
        store1.set("key1", {"invoiceId": "abc123"})

        # Create a new instance with the same directory and namespace
        store2 = PersistentStore(data_dir=temp_dir, namespace="test")
        result = store2.get("key1")
        assert result == {"invoiceId": "abc123"}

    def test_namespaces_isolated(self, temp_dir):
        """Test that different namespaces are isolated."""
        from agent.persistence import PersistentStore

        store_a = PersistentStore(data_dir=temp_dir, namespace="namespace_a")
        store_b = PersistentStore(data_dir=temp_dir, namespace="namespace_b")

        store_a.set("key1", {"from": "a"})
        store_b.set("key1", {"from": "b"})

        assert store_a.get("key1") == {"from": "a"}
        assert store_b.get("key1") == {"from": "b"}

    def test_list_all_keys(self, temp_dir):
        """Test listing all keys in a namespace."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        store.set("key1", {"data": 1})
        store.set("key2", {"data": 2})
        store.set("key3", {"data": 3})

        keys = store.keys()
        assert set(keys) == {"key1", "key2", "key3"}

    def test_update_existing_key(self, temp_dir):
        """Test updating an existing key."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        store.set("key1", {"status": "pending"})
        store.set("key1", {"status": "confirmed"})
        result = store.get("key1")
        assert result == {"status": "confirmed"}

    def test_thread_safety_concurrent_writes(self, temp_dir):
        """Test that concurrent writes don't corrupt data."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        errors = []

        def writer(thread_id: int):
            try:
                for i in range(20):
                    store.set(f"key_{thread_id}_{i}", {"thread": thread_id, "iter": i})
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=writer, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        # Verify all data was written correctly
        for tid in range(5):
            for i in range(20):
                data = store.get(f"key_{tid}_{i}")
                assert data == {"thread": tid, "iter": i}

    def test_fallback_on_corrupted_file(self, temp_dir):
        """Test graceful fallback when a file is corrupted."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        store.set("key1", {"valid": True})

        # Corrupt the file
        file_path = store._key_to_path("key1")
        with open(file_path, "w") as f:
            f.write("not valid json {{{")

        # Should return None and not crash
        result = store.get("key1")
        assert result is None

    def test_env_variable_configuration(self, temp_dir):
        """Test that PERSISTENCE_DIR env variable configures the default directory."""
        from agent.persistence import PersistentStore, get_default_persistence_dir

        env_dir = os.path.join(temp_dir, "env_configured")
        with patch.dict(os.environ, {"PERSISTENCE_DIR": env_dir}):
            # Clear any cached value
            default_dir = get_default_persistence_dir()
            assert default_dir == env_dir

    def test_clear_namespace(self, temp_dir):
        """Test clearing all data in a namespace."""
        from agent.persistence import PersistentStore

        store = PersistentStore(data_dir=temp_dir, namespace="test")
        store.set("key1", {"data": 1})
        store.set("key2", {"data": 2})
        
        store.clear()
        
        assert store.get("key1") is None
        assert store.get("key2") is None
        assert store.keys() == []


class TestPersistentStoreIntegration:
    """Integration tests for persistence with merchant_agent and merchant_service."""

    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test persistence."""
        dirpath = tempfile.mkdtemp()
        yield dirpath
        shutil.rmtree(dirpath, ignore_errors=True)

    def test_invoice_store_factory(self, temp_dir):
        """Test the invoice store factory function."""
        from agent.persistence import get_invoice_store

        with patch.dict(os.environ, {"PERSISTENCE_DIR": temp_dir}):
            store = get_invoice_store()
            store.set("inv-001", {"invoiceId": "inv-001", "status": "confirmed"})
            result = store.get("inv-001")
            assert result["invoiceId"] == "inv-001"

    def test_channel_receipt_store_factory(self, temp_dir):
        """Test the channel receipt store factory function."""
        from agent.persistence import get_channel_receipt_store

        with patch.dict(os.environ, {"PERSISTENCE_DIR": temp_dir}):
            store = get_channel_receipt_store()
            receipts = [{"payer": "0x123", "amount": 100}]
            store.set("pending", receipts)
            result = store.get("pending")
            assert result == receipts
