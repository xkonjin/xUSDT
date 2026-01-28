
import redis
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NonceManager:
    """
    Manages nonces to prevent replay attacks in payment processing.

    This manager uses Redis as the primary backend for nonce storage and verification,
    ensuring atomicity and scalability across a distributed system. It provides a
    graceful fallback to an in-memory cache if the Redis service is unavailable,
    ensuring high availability, albeit with reduced protection in a distributed context.
    """

    def __init__(self, redis_host='localhost', redis_port=6379, nonce_ttl_seconds=60):
        """
        Initializes the NonceManager.

        Args:
            redis_host (str): The hostname of the Redis server.
            redis_port (int): The port of the Redis server.
            nonce_ttl_seconds (int): The time-to-live for a nonce in seconds.
        """
        self.nonce_ttl = nonce_ttl_seconds
        self.in_memory_cache = set()
        try:
            self.redis_client = redis.StrictRedis(host=redis_host, port=redis_port, db=0, decode_responses=True)
            self.redis_client.ping()  # Check the connection
            logger.info("Successfully connected to Redis.")
            self.redis_available = True
        except redis.exceptions.ConnectionError as e:
            logger.warning(f"Could not connect to Redis: {e}. Falling back to in-memory nonce cache.")
            self.redis_available = False

    def verify_and_consume_nonce(self, nonce: str) -> bool:
        """
        Verifies a nonce. If it's valid, it's consumed and cannot be used again.

        This method is atomic when using Redis, preventing race conditions.

        Args:
            nonce (str): The nonce to verify.

        Returns:
            bool: True if the nonce is valid and has been consumed, False otherwise.
        """
        if not nonce:
            logger.warning("Nonce is empty or None.")
            return False

        if self.redis_available:
            # Security: SETNX is an atomic operation. It sets the key only if it does not already exist.
            # This prevents a race condition where two requests with the same nonce could both be validated.
            # We set a value of the current timestamp for auditing purposes.
            # The 'ex' parameter sets the expiration time (TTL) for the key in seconds.
            if self.redis_client.set(nonce, str(time.time()), ex=self.nonce_ttl, nx=True):
                return True
            else:
                # If SETNX returns False, the nonce already exists and this is a potential replay attack.
                logger.warning(f"Replay attack detected for nonce: {nonce}")
                return False
        else:
            # Fallback to in-memory cache if Redis is not available.
            # This is not suitable for a distributed environment as each instance will have its own cache.
            if nonce in self.in_memory_cache:
                logger.warning(f"Replay attack detected for nonce (in-memory): {nonce}")
                return False
            self.in_memory_cache.add(nonce)
            return True
