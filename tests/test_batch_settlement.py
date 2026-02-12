import pytest

pytest.importorskip("brownie")
from brownie import PlasmaPaymentChannel, accounts, reverts

@pytest.fixture
def plasma_payment_channel():
    """Deploys the PlasmaPaymentChannel contract."""
    return PlasmaPaymentChannel.deploy({'from': accounts[0]})

def test_settle_batch_valid(plasma_payment_channel):
    """Tests settling a valid batch of receipts."""
    receipts = [(accounts[1], 100), (accounts[2], 200)]
    plasma_payment_channel.settleBatch(receipts, {'from': accounts[0]})

def test_settle_batch_empty(plasma_payment_channel):
    """Tests that settling an empty batch of receipts fails."""
    with reverts("Batch cannot be empty."):
        plasma_payment_channel.settleBatch([], {'from': accounts[0]})

def test_settle_batch_exceeds_max_size(plasma_payment_channel):
    """Tests that settling a batch of receipts exceeding the max size fails."""
    receipts = [(accounts[1], 1) for _ in range(51)]
    with reverts("Exceeds maximum batch size."):
        plasma_payment_channel.settleBatch(receipts, {'from': accounts[0]})
