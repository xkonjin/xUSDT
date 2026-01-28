
import unittest
import redis
from unittest.mock import patch, MagicMock
from src.payment.nonce_manager import NonceManager

class TestNonceManager(unittest.TestCase):

    @patch("redis.StrictRedis")
    def test_verify_and_consume_nonce_success_redis(self, mock_redis_class):
        """Test successful nonce verification and consumption with Redis."""
        mock_redis_client = MagicMock()
        mock_redis_class.return_value = mock_redis_client
        mock_redis_client.set.return_value = True

        manager = NonceManager()
        self.assertTrue(manager.verify_and_consume_nonce("test_nonce_1"))
        mock_redis_client.set.assert_called_once_with("test_nonce_1", unittest.mock.ANY, ex=60, nx=True)

    @patch("redis.StrictRedis")
    def test_replay_attack_redis(self, mock_redis_class):
        """Test replay attack detection with Redis."""
        mock_redis_client = MagicMock()
        mock_redis_class.return_value = mock_redis_client
        mock_redis_client.set.return_value = False

        manager = NonceManager()
        self.assertFalse(manager.verify_and_consume_nonce("test_nonce_2"))
        mock_redis_client.set.assert_called_once_with("test_nonce_2", unittest.mock.ANY, ex=60, nx=True)

    @patch("redis.StrictRedis")
    def test_fallback_to_in_memory(self, mock_redis_class):
        """Test fallback to in-memory cache when Redis is unavailable."""
        mock_redis_class.side_effect = redis.exceptions.ConnectionError

        manager = NonceManager()
        self.assertFalse(manager.redis_available)
        self.assertTrue(manager.verify_and_consume_nonce("test_nonce_3"))
        self.assertIn("test_nonce_3", manager.in_memory_cache)

    @patch("redis.StrictRedis")
    def test_verify_and_consume_nonce_in_memory(self, mock_redis_class):
        """Test successful nonce verification and consumption with in-memory cache."""
        mock_redis_class.side_effect = redis.exceptions.ConnectionError

        manager = NonceManager()
        self.assertTrue(manager.verify_and_consume_nonce("test_nonce_4"))
        self.assertIn("test_nonce_4", manager.in_memory_cache)

    @patch("redis.StrictRedis")
    def test_replay_attack_in_memory(self, mock_redis_class):
        """Test replay attack detection with in-memory cache."""
        mock_redis_class.side_effect = redis.exceptions.ConnectionError

        manager = NonceManager()
        self.assertTrue(manager.verify_and_consume_nonce("test_nonce_5"))
        self.assertFalse(manager.verify_and_consume_nonce("test_nonce_5"))

    def test_empty_or_none_nonce(self):
        """Test handling of empty or None nonces."""
        manager = NonceManager()
        self.assertFalse(manager.verify_and_consume_nonce(""))
        self.assertFalse(manager.verify_and_consume_nonce(None))

if __name__ == '__main__':
    unittest.main()
