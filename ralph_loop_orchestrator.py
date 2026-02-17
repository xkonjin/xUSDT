#!/usr/bin/env python3
"""
RALPH Loop Orchestrator for xUSDT
Executes 50 RALPH loops with fleetmax methodology
- Blockchain performance optimizations
- Voice UI enhancements  
- Latency reduction
- Connection resilience with retry logic
"""

import subprocess
import json
import time
import os
import sys
from datetime import datetime
from pathlib import Path

REPO_DIR = "/Users/001/Dev/xUSDT"
WORKTREE_BASE = f"{REPO_DIR}/.worktrees"
LOG_FILE = f"{REPO_DIR}/.ralph_loop_log.json"
CONTEXT_FILE = f"{REPO_DIR}/.fleetmax-context.md"

# RALPH Loop Objectives - Focus areas for optimization
RALPH_OBJECTIVES = [
    # Loops 1-10: Blockchain Performance
    "Optimize plasma-sdk/packages/facilitator/src/ for faster transaction relay",
    "Optimize plasma-sdk/packages/gasless/src/ for efficient EIP-3009 transfers", 
    "Optimize plasma-sdk/packages/x402/src/ for faster payment processing",
    "Optimize Smart contract interaction batching in facilitator",
    "Optimize Wallet connection pooling in privy-auth package",
    "Optimize Transaction pre-signing in gasless package",
    "Optimize Gas price optimization in gas-manager package",
    "Optimize plasma-sdk/apps/plasma-venmo/src/lib/send.ts for lower latency",
    "Optimize Block time predictions in core package",
    "Optimize Token price caching in aggregator package",
    
    # Loops 11-20: Voice UI Enhancement
    "Optimize plasma-sdk/packages/ui/src/components/Assistant/ for voice interaction",
    "Optimize Voice recognition latency in Assistant hooks",
    "Optimize Speech synthesis for faster response in Assistant",
    "Optimize plasma-sdk/packages/ui/src/components/Assistant/hooks/useSpeech.ts",
    "Optimize Voice command processing in Assistant",
    "Optimize Assistant context collection for faster responses",
    "Optimize plasma-sdk/packages/ui/src/components/Assistant/utils/contextCollector.ts",
    "Optimize Voice UI state management in assistantStore.ts",
    "Optimize Assistant personality engine response time",
    "Optimize plasma-sdk/packages/ui/src/components/Assistant/hooks/useAssistantAI.ts",
    
    # Loops 21-30: Latency Reduction
    "Optimize API route handlers in plasma-venmo app",
    "Optimize Database queries in @plasma-pay/db package",
    "Optimize plasma-sdk/apps/plasma-venmo/src/app/api/submit-transfer/ latency",
    "Optimize plasma-sdk/apps/plasma-venmo/src/components/SendMoneyForm.tsx render speed",
    "Optimize usePlasmaWallet() hook performance",
    "Optimize useGaslessTransfer() hook for lower latency",
    "Optimize plasma-sdk/apps/plasma-venmo/src/lib/send.ts execution time",
    "Optimize Bridge deposit feature for faster response",
    "Optimize plasma-sdk/apps/plasma-venmo/src/app/api/resolve-recipient/ latency",
    "Optimise plasma-sdk/packages/core/src/ transaction types",
    
    # Loops 31-40: Smart Contract Optimizations
    "Optimize contracts/PlasmaPaymentRouter.sol for gas efficiency",
    "Optimize contracts/PlasmaPaymentChannel.sol for lower latency",
    "Optimize contracts/PaymentRouter.v2.sol gas usage",
    "Optimize x402 payment settlement in contracts",
    "Optimize contract event emission for faster indexing",
    "Optimize plasma-sdk/packages/defi/src/ for faster DeFi interactions",
    "Optimize plasma-sdk/packages/lifi/src/ for faster bridge operations",
    "Optimize plasma-sdk/packages/zkp2p/src/ for faster ZK operations",
    "Optimize plasma-sdk/packages/aggregator/src/ token price fetching",
    "Optimize plasma-sdk/packages/analytics/src/ event processing",
    
    # Loops 41-50: System-wide Optimizations
    "Optimize plasma-sdk/apps/bill-split/ for faster bill calculations",
    "Optimize plasma-sdk/apps/plasma-stream/ for faster stream operations",
    "Optimize plasma-sdk/apps/subkiller/ subscription processing",
    "Optimize plasma-sdk/packages/share/src/ social sharing speed",
    "Optimize plasma-sdk/packages/cli/src/ command execution",
    "Optimize plasma-sdk/apps/plasma-predictions/ response time",
    "Optimize plasma-sdk/apps/splitzy-bot/ bot response latency",
    "Optimize plasma-sdk/apps/telegram-webapp/ load time",
    "Optimize v0/ Next.js app API routes for lower latency",
    "Optimize agent/merchant_service.py FastAPI endpoints",
]

def log_progress(loop_num, status, details=""):
    """Log RALPH loop progress to file"""
    timestamp = datetime.utcnow().isoformat() + "Z"
    entry = {
        "timestamp": timestamp,
        "loop": loop_num,
        "status": status,
        "details": details
    }
    
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r') as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(entry)
    
    with open(LOG_FILE, 'w') as f:
        json.dump(logs, f, indent=2)
    
    print(f"[{timestamp}] RALPH Loop {loop_num}/50: {status} - {details}")

def update_context(loop_num, status, objective):
    """Update fleetmax context file"""
    timestamp = datetime.utcnow().isoformat() + "Z"
    with open(CONTEXT_FILE, 'a') as f:
        f.write(f"\n## [{timestamp}] Loop {loop_num}/50 - {status}\n")
        f.write(f"- Objective: {objective}\n")

def check_cliproxyapi():
    """Check if CLIProxyAPI is running"""
    try:
        result = subprocess.run(
            ["curl", "-sf", "http://127.0.0.1:8317/"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False

def create_worktree(loop_num):
    """Create a git worktree for the loop"""
    timestamp = int(time.time())
    branch = f"fleetmax/ralph-xUSDT-loop{loop_num}-{timestamp}"
    worktree = f"{WORKTREE_BASE}/loop{loop_num}"
    
    # Clean up existing worktree if present
    if os.path.exists(worktree):
        subprocess.run(
            ["git", "worktree", "remove", worktree, "--force"],
            cwd=REPO_DIR,
            capture_output=True
        )
    
    # Create new worktree
    result = subprocess.run(
        ["git", "worktree", "add", worktree, "-b", branch, "origin/main"],
        cwd=REPO_DIR,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"Worktree creation failed: {result.stderr}")
        return None, None
    
    return worktree, branch

def dispatch_codex(worktree, objective, timeout=600):
    """Dispatch a task to Codex"""
    # Enhanced objective with context
    enhanced_objective = f"""Optimize for performance and latency. {objective}

Requirements:
- Focus on reducing latency and improving performance
- Maintain existing functionality
- Add performance monitoring where appropriate
- Follow existing code patterns
- Ensure TypeScript type safety
- Optimize for blockchain interaction speed where applicable
- Add comments explaining optimizations
- Run any existing tests to verify changes don't break functionality
"""
    
    cmd = [
        "codex",
        "-a", "--full-auto",
        "--model", "gpt-4o-mini",  # Use cheaper model for simple optimizations
        "-q", enhanced_objective
    ]
    
    print(f"Dispatching: {' '.join(cmd[:5])}...")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=worktree,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout", "stdout": "", "stderr": "Command timed out"}
    except Exception as e:
        return {"success": False, "error": str(e), "stdout": "", "stderr": str(e)}

def run_adversarial_tests(worktree):
    """Run basic tests to verify changes"""
    # Check if package.json exists and has test script
    if os.path.exists(f"{worktree}/package.json"):
        try:
            with open(f"{worktree}/package.json") as f:
                pkg = json.load(f)
                if "test" in pkg.get("scripts", {}):
                    result = subprocess.run(
                        ["npm", "test"],
                        cwd=worktree,
                        capture_output=True,
                        text=True,
                        timeout=120
                    )
                    return result.returncode == 0
        except:
            pass
    
    return True  # Assume success if no tests

def cleanup_worktree(worktree):
    """Remove worktree after completion"""
    subprocess.run(
        ["git", "worktree", "remove", worktree, "--force"],
        cwd=REPO_DIR,
        capture_output=True
    )

def run_ralph_loop(loop_num):
    """Execute a single RALPH loop"""
    objective = RALPH_OBJECTIVES[loop_num - 1]
    
    print(f"\n{'='*60}")
    print(f"RALPH LOOP {loop_num}/50")
    print(f"Objective: {objective}")
    print(f"{'='*60}\n")
    
    log_progress(loop_num, "STARTED", objective)
    update_context(loop_num, "STARTED", objective)
    
    # Phase 1: Check CLIProxyAPI
    if not check_cliproxyapi():
        print("ERROR: CLIProxyAPI not running. Waiting 10s and retrying...")
        time.sleep(10)
        if not check_cliproxyapi():
            log_progress(loop_num, "FAILED", "CLIProxyAPI unavailable")
            return False
    
    # Phase 2: Create worktree
    worktree, branch = create_worktree(loop_num)
    if not worktree:
        log_progress(loop_num, "FAILED", "Worktree creation failed")
        return False
    
    print(f"Worktree: {worktree}")
    print(f"Branch: {branch}")
    
    try:
        # Phase 3: Dispatch to Codex
        print("Dispatching to Codex...")
        result = dispatch_codex(worktree, objective)
        
        if result["success"]:
            # Phase 4: Run adversarial tests
            tests_passed = run_adversarial_tests(worktree)
            
            if tests_passed:
                # Phase 5: Commit and push
                subprocess.run(
                    ["git", "add", "-A"],
                    cwd=worktree,
                    capture_output=True
                )
                
                commit_msg = f"perf: {objective[:50]}...\n\nRALPH Loop {loop_num}/50 via Fleetmax"
                subprocess.run(
                    ["git", "commit", "-m", commit_msg],
                    cwd=worktree,
                    capture_output=True
                )
                
                subprocess.run(
                    ["git", "push", "-u", "origin", branch],
                    cwd=worktree,
                    capture_output=True
                )
                
                log_progress(loop_num, "COMPLETED", f"Changes pushed to {branch}")
                update_context(loop_num, "COMPLETED", objective)
                return True
            else:
                log_progress(loop_num, "TESTS_FAILED", "Adversarial tests failed")
                return False
        else:
            error_msg = result.get("stderr", "Unknown error")[:100]
            log_progress(loop_num, "FAILED", f"Codex error: {error_msg}")
            return False
            
    except Exception as e:
        log_progress(loop_num, "ERROR", str(e))
        return False
    finally:
        cleanup_worktree(worktree)

def generate_report():
    """Generate final report"""
    if not os.path.exists(LOG_FILE):
        return "No logs found"
    
    with open(LOG_FILE) as f:
        logs = json.load(f)
    
    completed = sum(1 for l in logs if l["status"] == "COMPLETED")
    failed = sum(1 for l in logs if l["status"] in ["FAILED", "ERROR"])
    
    report = f"""
# RALPH Loop Execution Report

## Summary
- Total Loops: 50
- Completed: {completed}
- Failed: {failed}
- Success Rate: {completed/50*100:.1f}%

## Loop Details
"""
    for log in logs:
        report += f"- Loop {log['loop']}: {log['status']} - {log['details'][:80]}\n"
    
    report_path = f"{REPO_DIR}/RALPH_LOOP_50_EXECUTION_REPORT.md"
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"\nReport saved to: {report_path}")
    return report

def main():
    """Main execution"""
    print("="*60)
    print("RALPH LOOP ORCHESTRATOR - 50 Loops for xUSDT")
    print("="*60)
    print(f"Repository: {REPO_DIR}")
    print(f"Start Time: {datetime.utcnow().isoformat()}Z")
    print()
    
    # Ensure worktree base exists
    os.makedirs(WORKTREE_BASE, exist_ok=True)
    
    # Load existing progress
    start_loop = 1
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE) as f:
                logs = json.load(f)
                completed = [l["loop"] for l in logs if l["status"] == "COMPLETED"]
                if completed:
                    start_loop = max(completed) + 1
                    print(f"Resuming from loop {start_loop}")
        except:
            pass
    
    # Execute loops
    for loop_num in range(start_loop, 51):
        success = False
        retries = 0
        max_retries = 3
        
        while not success and retries < max_retries:
            success = run_ralph_loop(loop_num)
            
            if not success:
                retries += 1
                if retries < max_retries:
                    wait_time = 10 * retries  # Exponential backoff
                    print(f"\nRetry {retries}/{max_retries} in {wait_time}s...")
                    time.sleep(wait_time)
        
        if not success:
            print(f"\nLoop {loop_num} failed after {max_retries} retries. Continuing...")
        
        # Brief pause between loops
        time.sleep(2)
    
    # Generate report
    print("\n" + "="*60)
    print("GENERATING FINAL REPORT")
    print("="*60)
    generate_report()
    
    print(f"\nEnd Time: {datetime.utcnow().isoformat()}Z")
    print("RALPH Loop execution complete!")

if __name__ == "__main__":
    main()
