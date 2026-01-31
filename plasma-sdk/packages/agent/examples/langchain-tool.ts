/**
 * LangChain Tool Integration Example
 * 
 * Demonstrates how to use Plasma Pay as a LangChain tool for AI agents
 */

import { PlasmaPayClient } from '@plasma-pay/agent';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Create the Plasma Pay client
const plasmaClient = new PlasmaPayClient({
  privateKey: process.env.WALLET_KEY as `0x${string}`,
});

// Define LangChain tools for Plasma Pay
export const plasmaPayTools = [
  // Tool: Get Balance
  new DynamicStructuredTool({
    name: 'plasma_get_balance',
    description: 'Get the USDT0 and XPL (gas) balance of the wallet on Plasma',
    schema: z.object({}),
    func: async () => {
      const balance = await plasmaClient.getBalance();
      return JSON.stringify({
        usdt0: balance.usdt0Formatted,
        xpl: balance.xplFormatted,
        address: plasmaClient.address,
      });
    },
  }),

  // Tool: Send Payment
  new DynamicStructuredTool({
    name: 'plasma_send_payment',
    description: 'Send USDT0 payment to a recipient address on Plasma. Use for paying for services, tipping, or transfers.',
    schema: z.object({
      to: z.string().describe('Recipient wallet address (0x...)'),
      amount: z.string().describe('Amount in USDT0 (e.g., "10.50" for $10.50)'),
      note: z.string().optional().describe('Optional payment note'),
    }),
    func: async ({ to, amount, note }) => {
      try {
        const result = await plasmaClient.sendPayment({ to, amount, note });
        return JSON.stringify({
          success: true,
          txHash: result.txHash,
          amount,
          to,
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  }),

  // Tool: Pay X402 Invoice
  new DynamicStructuredTool({
    name: 'plasma_pay_invoice',
    description: 'Pay an X402 invoice or API that requires payment. Use when receiving 402 Payment Required responses.',
    schema: z.object({
      url: z.string().describe('URL that returned 402 Payment Required'),
      maxAmount: z.string().optional().describe('Maximum amount willing to pay in USDT0'),
    }),
    func: async ({ url, maxAmount }) => {
      try {
        const response = await plasmaClient.fetch(url, {
          maxPayment: maxAmount || '1.00',
        });
        
        if (response.ok) {
          const data = await response.json();
          return JSON.stringify({
            success: true,
            data,
          });
        } else {
          return JSON.stringify({
            success: false,
            status: response.status,
          });
        }
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }
    },
  }),
];

// Example: Using with LangChain agent
async function main() {
  // This example shows how to use the tools with a LangChain agent
  // You would typically use these with ChatOpenAI or another LLM

  /*
  import { ChatOpenAI } from '@langchain/openai';
  import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
  import { ChatPromptTemplate } from '@langchain/core/prompts';

  const llm = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant with access to Plasma Pay for making payments.'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: plasmaPayTools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools: plasmaPayTools,
  });

  // Example: Agent making a payment
  const result = await agentExecutor.invoke({
    input: 'Check my balance and send $5 to 0x1234... for their help',
  });

  console.log(result.output);
  */

  // For now, just demonstrate the tools work
  console.log('Available Plasma Pay tools for LangChain:');
  plasmaPayTools.forEach((tool) => {
    console.log(`\n${tool.name}:`);
    console.log(`  ${tool.description}`);
  });

  // Test get balance
  console.log('\n\nTesting plasma_get_balance:');
  const balance = await plasmaPayTools[0].func({});
  console.log(balance);
}

main().catch(console.error);
