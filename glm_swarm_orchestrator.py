#!/usr/bin/env python3
"""
GLM-4.7 Swarm Orchestrator for xUSDT/Plenmo Analysis
Runs specialized agents to analyze purpose, value, user stories, and aha moments
"""

import os
import json
import asyncio
import aiohttp
from typing import List, Dict, Any
from datetime import datetime

# GLM API Configuration
GLM_API_URL = "https://api.z.ai/api/paas/v4/chat/completions"
GLM_API_KEY = os.environ.get("ZAI_API_KEY")
MODEL = "glm-4.7"

# Specialized Agent Definitions
AGENTS = [
    {
        "name": "purpose_analyst",
        "role": "Product Purpose & Vision Analyst",
        "system_prompt": """You are a senior product strategist analyzing a crypto payment application called Plenmo (built on xUSDT/Plasma).

Your task is to deeply understand:
1. What is the core PURPOSE of this application?
2. What problem does it solve that existing solutions don't?
3. What is the unique value proposition?
4. Why would someone choose this over Venmo, PayPal, or other crypto wallets?

Be specific, analytical, and provide actionable insights. Focus on the genuine value, not marketing speak."""
    },
    {
        "name": "aha_moment_analyst",
        "role": "User Aha Moment Specialist",
        "system_prompt": """You are a UX researcher specializing in identifying "aha moments" - the precise instant when a user realizes the value of a product.

For this crypto payment app (Plenmo), identify:
1. What is the PRIMARY aha moment for new users?
2. What are SECONDARY aha moments that deepen engagement?
3. How quickly can users reach the aha moment?
4. What barriers might prevent users from reaching the aha moment?
5. How can the UI/UX be optimized to accelerate the aha moment?

Be specific about user psychology and behavior patterns."""
    },
    {
        "name": "user_story_analyst",
        "role": "User Story & Journey Specialist",
        "system_prompt": """You are a product manager creating comprehensive user stories for a crypto payment app (Plenmo).

Create detailed user stories covering:
1. First-time user onboarding journey
2. Sending money to a friend (crypto-native and non-crypto users)
3. Receiving money and claiming funds
4. Managing contacts and transaction history
5. Power user features (payment links, requests, etc.)

Format each as: "As a [persona], I want to [action] so that [benefit]"
Include acceptance criteria and edge cases."""
    },
    {
        "name": "value_proposition_analyst",
        "role": "Value Proposition & Differentiation Expert",
        "system_prompt": """You are a competitive analyst examining how this crypto payment app (Plenmo) creates genuine value.

Analyze:
1. What makes users' lives GENUINELY easier?
2. What insights can users gain from using this app?
3. How does it compare to: Venmo, Cash App, PayPal, MetaMask, Coinbase Wallet?
4. What are the unique advantages of gasless USDT transfers?
5. What pain points does it eliminate vs traditional crypto wallets?

Focus on real, tangible benefits - not theoretical advantages."""
    },
    {
        "name": "ux_improvement_analyst",
        "role": "UX/UI Improvement Specialist",
        "system_prompt": """You are a senior UX designer reviewing a crypto payment app (Plenmo) for production readiness.

Based on the codebase, identify:
1. Critical UX improvements needed for production
2. Accessibility issues that must be fixed
3. Mobile optimization requirements
4. Error handling and feedback improvements
5. Trust-building elements needed for financial apps

Provide specific, implementable recommendations with code examples where helpful."""
    },
    {
        "name": "code_quality_analyst",
        "role": "Code Quality & Architecture Specialist",
        "system_prompt": """You are a senior software architect reviewing a Next.js/React crypto payment app for production deployment.

Analyze the codebase for:
1. Critical bugs or issues that need immediate fixing
2. Security vulnerabilities in payment flows
3. Performance bottlenecks
4. Code organization and maintainability issues
5. Missing error handling or edge cases

Provide specific file paths and code fixes where applicable."""
    }
]

async def call_glm_agent(session: aiohttp.ClientSession, agent: Dict, context: str) -> Dict:
    """Call GLM-4.7 API with a specialized agent prompt"""
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GLM_API_KEY}"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": agent["system_prompt"]},
            {"role": "user", "content": f"""Analyze the following codebase context for the Plenmo crypto payment application:

{context}

Provide your detailed analysis based on your specialized role as {agent['role']}. Be thorough, specific, and actionable."""}
        ],
        "max_tokens": 4000,
        "temperature": 0.7
    }
    
    try:
        async with session.post(GLM_API_URL, headers=headers, json=payload, timeout=120) as response:
            if response.status == 200:
                result = await response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                reasoning = result.get("choices", [{}])[0].get("message", {}).get("reasoning_content", "")
                return {
                    "agent": agent["name"],
                    "role": agent["role"],
                    "analysis": content,
                    "reasoning": reasoning,
                    "status": "success"
                }
            else:
                error_text = await response.text()
                return {
                    "agent": agent["name"],
                    "role": agent["role"],
                    "analysis": f"API Error: {response.status} - {error_text}",
                    "status": "error"
                }
    except Exception as e:
        return {
            "agent": agent["name"],
            "role": agent["role"],
            "analysis": f"Exception: {str(e)}",
            "status": "error"
        }

async def run_swarm(context: str) -> List[Dict]:
    """Run all agents in parallel"""
    
    async with aiohttp.ClientSession() as session:
        tasks = [call_glm_agent(session, agent, context) for agent in AGENTS]
        results = await asyncio.gather(*tasks)
        return results

def load_codebase_context() -> str:
    """Load relevant codebase files for analysis"""
    
    context_parts = []
    
    # Key files to analyze
    files_to_read = [
        "/home/ubuntu/xUSDT/README.md",
        "/home/ubuntu/xUSDT/plasma-sdk/apps/plasma-venmo/src/app/page.tsx",
        "/home/ubuntu/xUSDT/plasma-sdk/apps/plasma-venmo/src/app/layout.tsx",
        "/home/ubuntu/xUSDT/plasma-sdk/apps/plasma-venmo/src/lib/send.ts",
        "/home/ubuntu/xUSDT/plasma-sdk/apps/plasma-venmo/src/components/SendMoneyForm.tsx",
        "/home/ubuntu/xUSDT/plasma-sdk/packages/gasless/src/index.ts",
    ]
    
    for filepath in files_to_read:
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                # Truncate large files
                if len(content) > 3000:
                    content = content[:3000] + "\n... [truncated]"
                context_parts.append(f"=== {filepath} ===\n{content}\n")
        except Exception as e:
            context_parts.append(f"=== {filepath} ===\nError reading file: {e}\n")
    
    return "\n".join(context_parts)

def save_results(results: List[Dict], output_path: str):
    """Save swarm results to JSON file"""
    
    output = {
        "timestamp": datetime.now().isoformat(),
        "model": MODEL,
        "agents_count": len(results),
        "results": results
    }
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    # Also create a markdown report
    md_path = output_path.replace('.json', '.md')
    with open(md_path, 'w') as f:
        f.write("# xUSDT/Plenmo GLM-4.7 Swarm Analysis Report\n\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n\n")
        
        for result in results:
            f.write(f"## {result['role']}\n\n")
            f.write(f"**Agent:** {result['agent']}\n")
            f.write(f"**Status:** {result['status']}\n\n")
            
            if result.get('reasoning'):
                f.write("### Reasoning Process\n\n")
                f.write(f"{result['reasoning']}\n\n")
            
            f.write("### Analysis\n\n")
            f.write(f"{result['analysis']}\n\n")
            f.write("---\n\n")
    
    print(f"Results saved to: {output_path}")
    print(f"Markdown report saved to: {md_path}")

async def main():
    print("=" * 60)
    print("GLM-4.7 Swarm Orchestrator for xUSDT/Plenmo Analysis")
    print("=" * 60)
    
    print("\n[1/3] Loading codebase context...")
    context = load_codebase_context()
    print(f"Loaded {len(context)} characters of context")
    
    print("\n[2/3] Running {0} specialized agents in parallel...".format(len(AGENTS)))
    results = await run_swarm(context)
    
    successful = sum(1 for r in results if r['status'] == 'success')
    print(f"Completed: {successful}/{len(results)} agents successful")
    
    print("\n[3/3] Saving results...")
    output_path = "/home/ubuntu/xUSDT/glm_swarm_analysis_results.json"
    save_results(results, output_path)
    
    print("\n" + "=" * 60)
    print("Swarm analysis complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
