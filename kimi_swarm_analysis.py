#!/usr/bin/env python3
"""
Kimi K2 Swarm Analysis for xUSDT Repository
============================================

This script orchestrates Kimi K2 API (kimi-k2-thinking model) to perform
expert developer analysis across all code domains in the xUSDT repository.

Uses the thinking mode with temperature 1.0 for methodical reasoning
and step-by-step analysis of code quality, security, and architecture.
"""

import os
import json
import asyncio
import aiohttp
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime

# Kimi K2 API Configuration
MOONSHOT_API_KEY = os.environ.get("MOONSHOT_API_KEY")
MOONSHOT_API_BASE = "https://api.moonshot.ai/v1"
MODEL = "kimi-k2-thinking"  # Reasoning model for expert analysis
TEMPERATURE = 1.0  # Required for thinking mode

@dataclass
class AnalysisDomain:
    """Represents a code domain to analyze"""
    name: str
    description: str
    files: List[str]
    focus_areas: List[str]
    priority: str  # critical, high, medium, low

@dataclass
class AnalysisResult:
    """Result from Kimi K2 analysis"""
    domain: str
    reasoning: str
    findings: List[Dict[str, Any]]
    recommendations: List[str]
    severity_counts: Dict[str, int]
    timestamp: str

# Define analysis domains
ANALYSIS_DOMAINS = [
    AnalysisDomain(
        name="smart_contracts",
        description="Solidity smart contracts for payment routing and channels",
        files=[
            "contracts/PaymentRouter.sol",
            "contracts/plasma/PlasmaPaymentChannel.sol",
            "contracts/plasma/PlasmaPaymentRouter.sol",
            "contracts/MockUSDT.sol"
        ],
        focus_areas=[
            "Reentrancy vulnerabilities",
            "Integer overflow/underflow",
            "Access control issues",
            "EIP-712 signature validation",
            "Gas optimization",
            "Nonce replay protection",
            "Fee calculation accuracy"
        ],
        priority="critical"
    ),
    AnalysisDomain(
        name="agent_facilitator",
        description="Python payment facilitator and settlement logic",
        files=[
            "agent/facilitator.py",
            "agent/crypto.py",
            "agent/config.py"
        ],
        focus_areas=[
            "Private key handling security",
            "Transaction signing correctness",
            "Error handling robustness",
            "Rate limiting implementation",
            "Gasless API fallback logic",
            "Web3 connection management"
        ],
        priority="critical"
    ),
    AnalysisDomain(
        name="agent_merchant_service",
        description="FastAPI merchant service and API endpoints",
        files=[
            "agent/merchant_service.py",
            "agent/merchant_agent.py",
            "agent/x402_models.py",
            "agent/persistence.py"
        ],
        focus_areas=[
            "API input validation",
            "CORS configuration security",
            "Rate limiting effectiveness",
            "Payment verification logic",
            "Invoice management",
            "JSON serialization safety"
        ],
        priority="high"
    ),
    AnalysisDomain(
        name="gasless_package",
        description="EIP-3009 gasless transfer implementation",
        files=[
            "plasma-sdk/packages/gasless/src/eip3009.ts",
            "plasma-sdk/packages/gasless/src/signer.ts",
            "plasma-sdk/packages/gasless/src/relayer.ts",
            "plasma-sdk/packages/gasless/src/relay-handler.ts"
        ],
        focus_areas=[
            "EIP-712 typed data construction",
            "Signature validation",
            "Nonce generation security",
            "Validity window handling",
            "Authorization expiry checks"
        ],
        priority="critical"
    ),
    AnalysisDomain(
        name="core_package",
        description="Core utilities, constants, and chain configuration",
        files=[
            "plasma-sdk/packages/core/src/chains.ts",
            "plasma-sdk/packages/core/src/constants.ts",
            "plasma-sdk/packages/core/src/utils.ts",
            "plasma-sdk/packages/core/src/types.ts",
            "plasma-sdk/packages/core/src/transaction-types.ts"
        ],
        focus_areas=[
            "Chain ID correctness",
            "Address constants validation",
            "Type safety",
            "Utility function edge cases",
            "BigInt handling"
        ],
        priority="high"
    ),
    AnalysisDomain(
        name="plenmo_api_routes",
        description="Plenmo Next.js API routes for payments",
        files=[
            "plasma-sdk/apps/plasma-venmo/src/app/api/submit-transfer/route.ts",
            "plasma-sdk/apps/plasma-venmo/src/app/api/claims/route.ts",
            "plasma-sdk/apps/plasma-venmo/src/app/api/payment/route.ts",
            "plasma-sdk/apps/plasma-venmo/src/app/api/resolve-recipient/route.ts",
            "plasma-sdk/apps/plasma-venmo/src/app/api/balance/route.ts"
        ],
        focus_areas=[
            "Input validation completeness",
            "Authentication checks",
            "Rate limiting implementation",
            "Error handling patterns",
            "Amount validation (min/max)",
            "Transaction timeout handling"
        ],
        priority="critical"
    ),
    AnalysisDomain(
        name="plenmo_lib",
        description="Plenmo library utilities and core logic",
        files=[
            "plasma-sdk/apps/plasma-venmo/src/lib/send.ts",
            "plasma-sdk/apps/plasma-venmo/src/lib/relayer-wallet.ts",
            "plasma-sdk/apps/plasma-venmo/src/lib/validation.ts",
            "plasma-sdk/apps/plasma-venmo/src/lib/crypto.ts",
            "plasma-sdk/apps/plasma-venmo/src/lib/rate-limiter-redis.ts",
            "plasma-sdk/apps/plasma-venmo/src/lib/schemas.ts"
        ],
        focus_areas=[
            "Private key validation",
            "Signature splitting correctness",
            "Rate limiter bypass risks",
            "Schema validation completeness",
            "Retry logic edge cases",
            "Escrow flow security"
        ],
        priority="critical"
    ),
    AnalysisDomain(
        name="plenmo_components",
        description="Plenmo React components and UI logic",
        files=[
            "plasma-sdk/apps/plasma-venmo/src/components/SendMoneyForm.tsx",
            "plasma-sdk/apps/plasma-venmo/src/components/RequestMoneyForm.tsx",
            "plasma-sdk/apps/plasma-venmo/src/components/TransactionHistory.tsx",
            "plasma-sdk/apps/plasma-venmo/src/components/WalletManager.tsx",
            "plasma-sdk/apps/plasma-venmo/src/components/BridgeDeposit.tsx"
        ],
        focus_areas=[
            "Input sanitization",
            "State management correctness",
            "Error boundary coverage",
            "Loading state handling",
            "Amount formatting consistency"
        ],
        priority="medium"
    ),
    AnalysisDomain(
        name="x402_package",
        description="x402 payment protocol implementation",
        files=[
            "plasma-sdk/packages/x402/src/client.ts",
            "plasma-sdk/packages/x402/src/facilitator.ts",
            "plasma-sdk/packages/x402/src/middleware.ts",
            "plasma-sdk/packages/x402/src/types.ts"
        ],
        focus_areas=[
            "402 response handling",
            "Payment option parsing",
            "Signature scheme validation",
            "Invoice ID management",
            "Deadline enforcement"
        ],
        priority="high"
    ),
    AnalysisDomain(
        name="tests_coverage",
        description="Test suites and coverage analysis",
        files=[
            "tests/test_facilitator.py",
            "tests/test_crypto.py",
            "tests/test_x402_payment_flow.py",
            "test/PaymentRouter.spec.ts",
            "test/PlasmaPaymentChannel.spec.js"
        ],
        focus_areas=[
            "Edge case coverage",
            "Mock vs real testing",
            "Security test scenarios",
            "Integration test completeness",
            "Error path testing"
        ],
        priority="medium"
    )
]

def build_analysis_prompt(domain: AnalysisDomain, file_contents: Dict[str, str]) -> str:
    """Build the expert analysis prompt for Kimi K2"""
    files_section = ""
    for filepath, content in file_contents.items():
        files_section += f"\n\n### File: {filepath}\n```\n{content}\n```"
    
    return f"""You are an expert blockchain developer and security auditor. Perform a comprehensive code review of the following {domain.name} domain from the xUSDT/Plenmo payment system.

## Domain: {domain.name}
## Description: {domain.description}
## Priority: {domain.priority}

## Focus Areas for Analysis:
{chr(10).join(f"- {area}" for area in domain.focus_areas)}

## Files to Analyze:
{files_section}

## Required Analysis Output:

Provide your analysis in the following JSON structure:

```json
{{
    "domain": "{domain.name}",
    "summary": "Brief overall assessment (2-3 sentences)",
    "findings": [
        {{
            "id": "F001",
            "severity": "critical|high|medium|low|info",
            "category": "security|logic|performance|maintainability|best-practice",
            "title": "Short descriptive title",
            "file": "filename.ext",
            "line_range": "start-end or specific line",
            "description": "Detailed description of the issue",
            "impact": "What could go wrong",
            "recommendation": "How to fix it",
            "code_snippet": "Relevant code if applicable"
        }}
    ],
    "recommendations": [
        "Prioritized list of improvements"
    ],
    "positive_observations": [
        "Well-implemented patterns worth noting"
    ],
    "test_gaps": [
        "Missing test scenarios"
    ],
    "severity_counts": {{
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "info": 0
    }}
}}
```

Be thorough, specific, and actionable. Focus on real issues that could cause production problems, security vulnerabilities, or maintenance challenges. Do not report false positives or theoretical issues without evidence in the code."""

async def analyze_domain_with_kimi(
    session: aiohttp.ClientSession,
    domain: AnalysisDomain,
    repo_path: Path
) -> Optional[AnalysisResult]:
    """Analyze a single domain using Kimi K2 thinking model"""
    
    # Read file contents
    file_contents = {}
    for filepath in domain.files:
        full_path = repo_path / filepath
        if full_path.exists():
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Truncate very large files
                    if len(content) > 15000:
                        content = content[:15000] + "\n\n... [TRUNCATED - file too large]"
                    file_contents[filepath] = content
            except Exception as e:
                print(f"  Warning: Could not read {filepath}: {e}")
        else:
            print(f"  Warning: File not found: {filepath}")
    
    if not file_contents:
        print(f"  Skipping {domain.name}: No files found")
        return None
    
    prompt = build_analysis_prompt(domain, file_contents)
    
    headers = {
        "Authorization": f"Bearer {MOONSHOT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert blockchain developer and security auditor specializing in EVM smart contracts, EIP-3009 gasless transfers, and payment systems. Analyze code thoroughly and provide actionable findings."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": TEMPERATURE,
        "max_tokens": 8192
    }
    
    try:
        async with session.post(
            f"{MOONSHOT_API_BASE}/chat/completions",
            headers=headers,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=180)
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                print(f"  API Error ({response.status}): {error_text[:200]}")
                return None
            
            result = await response.json()
            
            # Extract reasoning and content
            message = result.get("choices", [{}])[0].get("message", {})
            reasoning = message.get("reasoning_content", "")
            content = message.get("content", "")
            
            # Parse JSON from content
            try:
                # Find JSON in the response
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    analysis_json = json.loads(content[json_start:json_end])
                else:
                    analysis_json = {"error": "No JSON found in response", "raw": content[:500]}
            except json.JSONDecodeError as e:
                analysis_json = {"error": f"JSON parse error: {e}", "raw": content[:500]}
            
            return AnalysisResult(
                domain=domain.name,
                reasoning=reasoning[:2000] if reasoning else "",
                findings=analysis_json.get("findings", []),
                recommendations=analysis_json.get("recommendations", []),
                severity_counts=analysis_json.get("severity_counts", {}),
                timestamp=datetime.now().isoformat()
            )
            
    except asyncio.TimeoutError:
        print(f"  Timeout analyzing {domain.name}")
        return None
    except Exception as e:
        print(f"  Error analyzing {domain.name}: {e}")
        return None

async def run_swarm_analysis(repo_path: Path) -> List[AnalysisResult]:
    """Run parallel analysis across all domains"""
    
    if not MOONSHOT_API_KEY:
        print("ERROR: MOONSHOT_API_KEY environment variable not set")
        return []
    
    print(f"\n{'='*60}")
    print("KIMI K2 SWARM ANALYSIS - xUSDT Repository")
    print(f"{'='*60}")
    print(f"Model: {MODEL}")
    print(f"Temperature: {TEMPERATURE}")
    print(f"Domains to analyze: {len(ANALYSIS_DOMAINS)}")
    print(f"Repository: {repo_path}")
    print(f"{'='*60}\n")
    
    results = []
    
    async with aiohttp.ClientSession() as session:
        # Process domains sequentially to avoid rate limits
        for i, domain in enumerate(ANALYSIS_DOMAINS, 1):
            print(f"[{i}/{len(ANALYSIS_DOMAINS)}] Analyzing: {domain.name} ({domain.priority} priority)")
            
            result = await analyze_domain_with_kimi(session, domain, repo_path)
            
            if result:
                results.append(result)
                finding_count = len(result.findings)
                print(f"  Completed: {finding_count} findings")
                
                # Show severity breakdown
                if result.severity_counts:
                    counts = result.severity_counts
                    print(f"  Severity: Critical={counts.get('critical', 0)}, High={counts.get('high', 0)}, Medium={counts.get('medium', 0)}, Low={counts.get('low', 0)}")
            else:
                print(f"  Failed or skipped")
            
            # Small delay between requests
            await asyncio.sleep(2)
    
    return results

def generate_report(results: List[AnalysisResult], output_path: Path):
    """Generate comprehensive analysis report"""
    
    report = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "model": MODEL,
            "total_domains": len(results),
            "total_findings": sum(len(r.findings) for r in results)
        },
        "summary": {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0
        },
        "domains": []
    }
    
    # Aggregate severity counts
    for result in results:
        for severity, count in result.severity_counts.items():
            if severity in report["summary"]:
                report["summary"][severity] += count
        
        report["domains"].append({
            "name": result.domain,
            "findings": result.findings,
            "recommendations": result.recommendations,
            "severity_counts": result.severity_counts,
            "reasoning_excerpt": result.reasoning[:500] if result.reasoning else ""
        })
    
    # Write JSON report
    json_path = output_path / "kimi_swarm_analysis_report.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    # Write Markdown report
    md_path = output_path / "KIMI_SWARM_ANALYSIS_REPORT.md"
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write("# Kimi K2 Swarm Analysis Report - xUSDT Repository\n\n")
        f.write(f"**Generated:** {report['metadata']['generated_at']}\n")
        f.write(f"**Model:** {MODEL}\n")
        f.write(f"**Total Findings:** {report['metadata']['total_findings']}\n\n")
        
        f.write("## Executive Summary\n\n")
        f.write("| Severity | Count |\n")
        f.write("|----------|-------|\n")
        for severity in ["critical", "high", "medium", "low", "info"]:
            f.write(f"| {severity.capitalize()} | {report['summary'][severity]} |\n")
        f.write("\n")
        
        f.write("## Findings by Domain\n\n")
        for domain_data in report["domains"]:
            f.write(f"### {domain_data['name']}\n\n")
            
            if domain_data['findings']:
                for finding in domain_data['findings']:
                    if isinstance(finding, dict):
                        severity = finding.get('severity', 'unknown').upper()
                        title = finding.get('title', 'Untitled')
                        f.write(f"#### [{severity}] {title}\n\n")
                        f.write(f"**File:** {finding.get('file', 'N/A')}\n")
                        f.write(f"**Category:** {finding.get('category', 'N/A')}\n\n")
                        f.write(f"{finding.get('description', 'No description')}\n\n")
                        if finding.get('recommendation'):
                            f.write(f"**Recommendation:** {finding['recommendation']}\n\n")
            else:
                f.write("No significant findings.\n\n")
            
            if domain_data['recommendations']:
                f.write("**Recommendations:**\n")
                for rec in domain_data['recommendations']:
                    f.write(f"- {rec}\n")
                f.write("\n")
    
    print(f"\nReports generated:")
    print(f"  - {json_path}")
    print(f"  - {md_path}")
    
    return report

async def main():
    """Main entry point"""
    repo_path = Path("/home/ubuntu/xUSDT")
    output_path = repo_path
    
    results = await run_swarm_analysis(repo_path)
    
    if results:
        report = generate_report(results, output_path)
        
        print(f"\n{'='*60}")
        print("ANALYSIS COMPLETE")
        print(f"{'='*60}")
        print(f"Domains analyzed: {len(results)}")
        print(f"Total findings: {report['metadata']['total_findings']}")
        print(f"Critical: {report['summary']['critical']}")
        print(f"High: {report['summary']['high']}")
        print(f"Medium: {report['summary']['medium']}")
        print(f"Low: {report['summary']['low']}")
    else:
        print("\nNo analysis results generated.")

if __name__ == "__main__":
    asyncio.run(main())
