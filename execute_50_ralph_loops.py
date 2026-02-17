#!/usr/bin/env python3
"""
Execute 50 RALPH Loops for xUSDT with connection resilience
"""

import subprocess
import json
import time
import os
import sys
from datetime import datetime
from pathlib import Path

REPO_DIR = Path("/Users/001/Dev/xUSDT")
WORKTREE_BASE = REPO_DIR / ".worktrees"
CONTEXT_FILE = REPO_DIR / ".fleetmax-context.md"

# 50 Optimization objectives
OBJECTIVES = [
    # 1-10: Blockchain Performance
    ("facilitator", "plasma-sdk/packages/facilitator/src", "Optimize transaction relay performance"),
    ("gasless", "plasma-sdk/packages/gasless/src", "Optimize EIP-3009 transfer efficiency"),
    ("x402", "plasma-sdk/packages/x402/src", "Optimize payment processing speed"),
    ("contract-batch", "plasma-sdk/packages/facilitator/src", "Add smart contract interaction batching"),
    ("wallet-pool", "plasma-sdk/packages/privy-auth/src", "Add wallet connection pooling"),
    ("presign", "plasma-sdk/packages/gasless/src", "Add transaction pre-signing"),
    ("gas-price", "plasma-sdk/packages/gas-manager/src", "Optimize gas price calculations"),
    ("send-latency", "plasma-sdk/apps/plasma-venmo/src/lib/send.ts", "Reduce send latency"),
    ("block-predict", "plasma-sdk/packages/core/src", "Add block time predictions"),
    ("price-cache", "plasma-sdk/packages/aggregator/src", "Optimize token price caching"),
    
    # 11-20: Voice UI
    ("voice-ui", "plasma-sdk/packages/ui/src/components/Assistant", "Optimize voice UI components"),
    ("voice-recognition", "plasma-sdk/packages/ui/src/components/Assistant/hooks/useSpeech.ts", "Reduce voice recognition latency"),
    ("speech-synth", "plasma-sdk/packages/ui/src/components/Assistant/hooks/useSpeech.ts", "Optimize speech synthesis"),
    ("voice-hook", "plasma-sdk/packages/ui/src/components/Assistant/hooks/useSpeech.ts", "Optimize speech hook performance"),
    ("voice-cmd", "plasma-sdk/packages/ui/src/components/Assistant/hooks/useAssistantAI.ts", "Optimize voice command processing"),
    ("context-collect", "plasma-sdk/packages/ui/src/components/Assistant/utils/contextCollector.ts", "Optimize context collection speed"),
    ("context-util", "plasma-sdk/packages/ui/src/components/Assistant/utils/contextCollector.ts", "Optimize context collector utils"),
    ("assistant-store", "plasma-sdk/packages/ui/src/components/Assistant/store/assistantStore.ts", "Optimize assistant store"),
    ("personality", "plasma-sdk/packages/ui/src/components/Assistant/utils/personalityEngine.ts", "Optimize personality engine"),
    ("ai-hook", "plasma-sdk/packages/ui/src/components/Assistant/hooks/useAssistantAI.ts", "Optimize AI hook performance"),
    
    # 21-30: Latency Reduction
    ("api-routes", "plasma-sdk/apps/plasma-venmo/src/app/api", "Optimize API route handlers"),
    ("db-queries", "plasma-sdk/packages/db/src", "Optimize database queries"),
    ("submit-transfer", "plasma-sdk/apps/plasma-venmo/src/app/api/submit-transfer", "Reduce transfer API latency"),
    ("send-form", "plasma-sdk/apps/plasma-venmo/src/components/SendMoneyForm.tsx", "Optimize send form render speed"),
    ("wallet-hook", "plasma-sdk/packages/privy-auth/src/hooks.ts", "Optimize usePlasmaWallet hook"),
    ("transfer-hook", "plasma-sdk/packages/gasless/src/index.ts", "Optimize useGaslessTransfer hook"),
    ("send-execution", "plasma-sdk/apps/plasma-venmo/src/lib/send.ts", "Optimize send.ts execution"),
    ("bridge-deposit", "plasma-sdk/apps/plasma-venmo/src/components/BridgeDeposit.tsx", "Optimize bridge deposit speed"),
    ("resolve-recipient", "plasma-sdk/apps/plasma-venmo/src/app/api/resolve-recipient", "Optimize recipient resolution"),
    ("tx-types", "plasma-sdk/packages/core/src/transaction-types.ts", "Optimize transaction types"),
    
    # 31-40: Smart Contract
    ("router-gas", "contracts/PlasmaPaymentRouter.sol", "Optimize router gas efficiency"),
    ("channel-latency", "contracts/PlasmaPaymentChannel.sol", "Reduce channel latency"),
    ("router-v2-gas", "contracts/PaymentRouter.v2.sol", "Optimize router v2 gas"),
    ("settlement", "contracts/PlasmaPaymentRouter.sol", "Optimize payment settlement"),
    ("event-index", "contracts", "Optimize contract event emission"),
    ("defi-speed", "plasma-sdk/packages/defi/src", "Optimize DeFi interactions"),
    ("bridge-ops", "plasma-sdk/packages/lifi/src", "Optimize bridge operations"),
    ("zk-ops", "plasma-sdk/packages/zkp2p/src", "Optimize ZK operations"),
    ("price-fetch", "plasma-sdk/packages/aggregator/src", "Optimize price fetching"),
    ("analytics", "plasma-sdk/packages/analytics/src", "Optimize analytics processing"),
    
    # 41-50: System-wide
    ("bill-split", "plasma-sdk/apps/bill-split/src", "Optimize bill split calculations"),
    ("stream-ops", "plasma-sdk/apps/plasma-stream/src", "Optimize stream operations"),
    ("subkiller", "plasma-sdk/apps/subkiller/src", "Optimize subscription processing"),
    ("social-share", "plasma-sdk/packages/share/src", "Optimize social sharing"),
    ("cli-speed", "plasma-sdk/packages/cli/src", "Optimize CLI execution"),
    ("predictions", "plasma-sdk/apps/plasma-predictions/src", "Optimize predictions response"),
    ("bot-latency", "plasma-sdk/apps/splitzy-bot/src", "Reduce bot response latency"),
    ("telegram-load", "plasma-sdk/apps/telegram-webapp/src", "Optimize Telegram webapp load"),
    ("v0-api", "v0/src/app/api", "Optimize v0 API routes"),
    ("merchant-api", "agent/merchant_service.py", "Optimize merchant service endpoints"),
]

def log(msg):
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{timestamp}] {msg}")

def update_context(loop_num, status, objective):
    with open(CONTEXT_FILE, "a") as f:
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        f.write(f"\n## [{timestamp}] Loop {loop_num}/50 - {status}\n")
        f.write(f"- Target: {objective[0]}\n")
        f.write(f"- Path: {objective[1]}\n")
        f.write(f"- Goal: {objective[2]}\n")

def check_api():
    try:
        result = subprocess.run(
            ["curl", "-sf", "http://127.0.0.1:8317/"],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except:
        return False

def create_worktree(loop_num):
    timestamp = int(time.time())
    branch = f"fleetmax/ralph-loop{loop_num}-{timestamp}"
    worktree = WORKTREE_BASE / f"loop{loop_num}"
    
    # Cleanup
    if worktree.exists():
        subprocess.run(["git", "worktree", "remove", str(worktree), "--force"], 
                      cwd=REPO_DIR, capture_output=True)
        subprocess.run(["rm", "-rf", str(worktree)], capture_output=True)
    
    # Create worktree
    result = subprocess.run(
        ["git", "worktree", "add", str(worktree), "-b", branch, "origin/main"],
        cwd=REPO_DIR, capture_output=True, text=True
    )
    
    if result.returncode != 0:
        log(f"ERROR creating worktree: {result.stderr}")
        return None, None
    
    return worktree, branch

def run_codex(worktree, target, path, goal):
    """Run codex with specific optimization goal"""
    prompt = f"""TARGET: {target}
PATH: {path}
GOAL: {goal}

Analyze the code at the specified path and apply performance optimizations:
1. Reduce latency where possible
2. Add caching where beneficial
3. Optimize async operations
4. Reduce unnecessary re-renders (for UI)
5. Add memoization where appropriate
6. Optimize database queries (for API routes)
7. Add performance monitoring comments

Requirements:
- Only modify if optimizations are genuinely beneficial
- Maintain all existing functionality
- Follow existing code style
- Add comments explaining optimizations
- If no beneficial optimizations possible, state that clearly"""

    log(f"Running codex for {target}...")
    
    result = subprocess.run(
        ["codex", "-a", "--full-auto", "--model", "gpt-4o-mini", "-q", prompt],
        cwd=worktree,
        capture_output=True,
        text=True,
        timeout=300
    )
    
    return result

def run_loop(loop_num):
    target, path, goal = OBJECTIVES[loop_num - 1]
    
    log(f"\n{'='*60}")
    log(f"RALPH LOOP {loop_num}/50")
    log(f"Target: {target}")
    log(f"Path: {path}")
    log(f"Goal: {goal}")
    log(f"{'='*60}")
    
    update_context(loop_num, "STARTED", OBJECTIVES[loop_num - 1])
    
    # Check API
    if not check_api():
        log("WARNING: CLIProxyAPI not responding, waiting...")
        time.sleep(10)
        if not check_api():
            log("ERROR: API still unavailable")
            return False
    
    # Create worktree
    worktree, branch = create_worktree(loop_num)
    if not worktree:
        log("ERROR: Failed to create worktree")
        return False
    
    log(f"Worktree: {worktree}")
    log(f"Branch: {branch}")
    
    try:
        # Run codex
        result = run_codex(worktree, target, path, goal)
        
        # Check if changes were made
        diff_result = subprocess.run(
            ["git", "diff", "--stat", "HEAD"],
            cwd=worktree,
            capture_output=True,
            text=True
        )
        
        if diff_result.stdout.strip():
            changes = diff_result.stdout.strip().split('\n')[-1]
            log(f"Changes made: {changes}")
            
            # Commit and push
            subprocess.run(["git", "add", "-A"], cwd=worktree, capture_output=True)
            subprocess.run(
                ["git", "commit", "-m", f"perf({target}): {goal[:50]}...\n\nRALPH Loop {loop_num}/50"],
                cwd=worktree,
                capture_output=True
            )
            subprocess.run(
                ["git", "push", "-u", "origin", branch],
                cwd=worktree,
                capture_output=True
            )
            
            update_context(loop_num, "COMPLETED", OBJECTIVES[loop_num - 1])
            log(f"✓ Loop {loop_num} COMPLETED - pushed to {branch}")
            return True
        else:
            update_context(loop_num, "NO_CHANGES", OBJECTIVES[loop_num - 1])
            log(f"✓ Loop {loop_num} - No changes needed (already optimized)")
            return True
            
    except subprocess.TimeoutExpired:
        log(f"ERROR: Loop {loop_num} timed out")
        return False
    except Exception as e:
        log(f"ERROR: {e}")
        return False
    finally:
        # Cleanup
        subprocess.run(
            ["git", "worktree", "remove", str(worktree), "--force"],
            cwd=REPO_DIR, capture_output=True
        )

def main():
    log("="*60)
    log("50 RALPH LOOPS FOR xUSDT")
    log("="*60)
    
    WORKTREE_BASE.mkdir(exist_ok=True)
    
    # Determine start loop
    start_loop = 1
    try:
        with open(CONTEXT_FILE) as f:
            content = f.read()
            for i in range(50, 0, -1):
                if f"Loop {i}/50 - COMPLETED" in content or f"Loop {i}/50 - NO_CHANGES" in content:
                    start_loop = i + 1
                    break
    except:
        pass
    
    log(f"Starting from loop {start_loop}")
    
    completed = 0
    failed = 0
    
    for loop_num in range(start_loop, 51):
        retries = 0
        success = False
        
        while retries < 3 and not success:
            try:
                success = run_loop(loop_num)
            except Exception as e:
                log(f"Exception in loop {loop_num}: {e}")
                success = False
            
            if not success:
                retries += 1
                wait = 10 * retries
                log(f"Retry {retries}/3 in {wait}s...")
                time.sleep(wait)
        
        if success:
            completed += 1
        else:
            failed += 1
            log(f"✗ Loop {loop_num} FAILED after 3 retries")
        
        time.sleep(2)  # Brief pause
    
    log("\n" + "="*60)
    log(f"COMPLETED: {completed}/50")
    log(f"FAILED: {failed}/50")
    log("="*60)

if __name__ == "__main__":
    main()
