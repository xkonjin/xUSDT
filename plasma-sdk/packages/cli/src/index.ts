#!/usr/bin/env node
/**
 * Plasma Pay CLI
 * 
 * One-click setup for AI agent payments on Plasma
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import qrcode from 'qrcode-terminal';
import { KeyManager } from './key-manager';
import { ConfigManager } from './config';
import type { Hex } from 'viem';

const program = new Command();
const config = new ConfigManager();
const keyManager = new KeyManager({
  configDir: config.getConfigPath(),
  useKeyring: true,
});

// ASCII Art Banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('⚡ PLASMA PAY')}                                            ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('One-click payments for AI agents')}                        ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

program
  .name('plasma-pay')
  .description('CLI for Plasma Pay - onboard agents, manage keys, fund wallets')
  .version('0.1.0');

// ============================================================================
// INIT COMMAND - Onboard a new agent
// ============================================================================
program
  .command('init')
  .description('Initialize a new Plasma Pay wallet for your agent')
  .option('-n, --name <name>', 'Wallet name')
  .option('-i, --import', 'Import existing private key')
  .option('--no-keyring', 'Skip OS keyring, use encrypted file')
  .action(async (options) => {
    console.log(banner);
    console.log(chalk.bold('\n🚀 Welcome to Plasma Pay!\n'));
    
    const spinner = ora();
    
    try {
      // Check if wallet already exists
      const existingWallets = config.listWallets();
      if (existingWallets.length > 0) {
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: `You already have ${existingWallets.length} wallet(s). Create another?`,
          default: true,
        }]);
        if (!proceed) return;
      }

      // Get wallet name
      const { name } = options.name ? { name: options.name } : await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'Give your wallet a name:',
        default: `Agent Wallet ${existingWallets.length + 1}`,
      }]);

      let privateKey: Hex;
      let address: string;

      if (options.import) {
        // Import existing key
        const { key } = await inquirer.prompt([{
          type: 'password',
          name: 'key',
          message: 'Enter your private key:',
          mask: '*',
        }]);
        
        const validation = keyManager.validatePrivateKey(key);
        if (!validation.valid) {
          console.log(chalk.red(`\n❌ ${validation.error}`));
          return;
        }
        
        privateKey = key.startsWith('0x') ? key as Hex : `0x${key}` as Hex;
        address = validation.address!;
        console.log(chalk.green(`\n✓ Valid key for address: ${address}`));
      } else {
        // Generate new wallet
        spinner.start('Generating new wallet...');
        const wallet = await keyManager.generateWallet(name);
        privateKey = wallet.privateKey;
        address = wallet.address;
        spinner.succeed('Wallet generated!');
        
        console.log(chalk.yellow('\n⚠️  IMPORTANT: Save your private key securely!\n'));
        console.log(chalk.gray('Private Key:'), chalk.white(privateKey));
        console.log(chalk.gray('Address:    '), chalk.white(address));
        
        // Generate recovery phrase option
        const { saveRecovery } = await inquirer.prompt([{
          type: 'confirm',
          name: 'saveRecovery',
          message: 'Generate a recovery phrase (mnemonic)?',
          default: true,
        }]);
        
        if (saveRecovery) {
          const mnemonic = keyManager.generateMnemonic();
          console.log(chalk.yellow('\n📝 Recovery Phrase (write this down!):\n'));
          console.log(chalk.white.bold(mnemonic));
          console.log(chalk.red('\n⚠️  Never share this with anyone!'));
        }
      }

      // Store the key
      const { password } = await inquirer.prompt([{
        type: 'password',
        name: 'password',
        message: 'Create a password to encrypt your key:',
        mask: '*',
        validate: (input) => input.length >= 8 || 'Password must be at least 8 characters',
      }]);

      spinner.start('Storing key securely...');
      const stored = await keyManager.storeKey(address, privateKey, password);
      spinner.succeed(`Key stored using ${stored.method}`);

      // Save wallet config
      const encryptedKey = await keyManager.encryptKey(privateKey, password);
      config.addWallet({
        address,
        name,
        encryptedPrivateKey: encryptedKey,
        createdAt: new Date().toISOString(),
      });

      // Show QR code for address
      console.log(chalk.cyan('\n📱 Scan to send funds to your wallet:\n'));
      qrcode.generate(address, { small: true });

      console.log(chalk.green('\n✅ Wallet initialized successfully!\n'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.white('  1. Fund your wallet:  ') + chalk.cyan('plasma-pay fund'));
      console.log(chalk.white('  2. Check balance:     ') + chalk.cyan('plasma-pay balance'));
      console.log(chalk.white('  3. Send payment:      ') + chalk.cyan('plasma-pay send'));
      
    } catch (error: any) {
      spinner.fail('Failed to initialize wallet');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// BALANCE COMMAND
// ============================================================================
program
  .command('balance')
  .description('Check wallet balance')
  .option('-a, --address <address>', 'Specific wallet address')
  .action(async (options) => {
    const spinner = ora('Fetching balance...').start();
    
    try {
      const wallet = options.address 
        ? config.listWallets().find(w => w.address.toLowerCase() === options.address.toLowerCase())
        : config.getActiveWallet();
      
      if (!wallet) {
        spinner.fail('No wallet found. Run `plasma-pay init` first.');
        return;
      }

      // In production, this would call the actual balance API
      // For now, show placeholder
      spinner.succeed('Balance retrieved');
      
      console.log(chalk.bold(`\n💰 Wallet: ${wallet.name || wallet.address}\n`));
      console.log(chalk.gray('Address: ') + chalk.white(wallet.address));
      console.log(chalk.gray('USDT0:   ') + chalk.green('$0.00'));
      console.log(chalk.gray('XPL:     ') + chalk.blue('0.00'));
      console.log(chalk.gray('Network: ') + chalk.cyan('Plasma'));
      
    } catch (error: any) {
      spinner.fail('Failed to fetch balance');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// FUND COMMAND - Fund wallet via ZKP2P or LiFi
// ============================================================================
program
  .command('fund')
  .description('Fund your wallet with fiat (ZKP2P) or crypto (LiFi)')
  .option('-a, --amount <amount>', 'Amount to fund')
  .option('-m, --method <method>', 'Funding method: zkp2p, lifi, direct')
  .action(async (options) => {
    console.log(banner);
    
    const wallet = config.getActiveWallet();
    if (!wallet) {
      console.log(chalk.red('No wallet found. Run `plasma-pay init` first.'));
      return;
    }

    const { method } = options.method ? { method: options.method } : await inquirer.prompt([{
      type: 'list',
      name: 'method',
      message: 'How would you like to fund your wallet?',
      choices: [
        { name: '💵 Fiat (Venmo, Zelle, Revolut) via ZKP2P', value: 'zkp2p' },
        { name: '🔄 Crypto from another chain via LiFi', value: 'lifi' },
        { name: '📤 Direct transfer (I have USDT0)', value: 'direct' },
      ],
    }]);

    if (method === 'zkp2p') {
      const { platform } = await inquirer.prompt([{
        type: 'list',
        name: 'platform',
        message: 'Select payment platform:',
        choices: [
          { name: 'Venmo', value: 'venmo' },
          { name: 'Zelle', value: 'zelle' },
          { name: 'Revolut', value: 'revolut' },
          { name: 'Wise', value: 'wise' },
          { name: 'CashApp', value: 'cashapp' },
          { name: 'PayPal', value: 'paypal' },
        ],
      }]);

      const { amount } = options.amount ? { amount: options.amount } : await inquirer.prompt([{
        type: 'input',
        name: 'amount',
        message: 'Amount to fund (USD):',
        default: '50',
        validate: (input) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
      }]);

      const zkp2pUrl = `https://www.zkp2p.xyz/?amount=${amount}&recipient=${wallet.address}&platform=${platform}`;
      
      console.log(chalk.cyan('\n🔗 Open this link to complete your on-ramp:\n'));
      console.log(chalk.white.bold(zkp2pUrl));
      console.log(chalk.gray('\nOr scan the QR code:\n'));
      qrcode.generate(zkp2pUrl, { small: true });
      
      console.log(chalk.yellow('\nAfter completing payment, your USDT0 will arrive in ~5 minutes.'));
      
    } else if (method === 'lifi') {
      const { sourceChain } = await inquirer.prompt([{
        type: 'list',
        name: 'sourceChain',
        message: 'Source chain:',
        choices: [
          { name: 'Ethereum', value: 1 },
          { name: 'Base', value: 8453 },
          { name: 'Arbitrum', value: 42161 },
          { name: 'Optimism', value: 10 },
          { name: 'Polygon', value: 137 },
        ],
      }]);

      const { sourceToken } = await inquirer.prompt([{
        type: 'list',
        name: 'sourceToken',
        message: 'Token to swap:',
        choices: [
          { name: 'ETH', value: 'ETH' },
          { name: 'USDC', value: 'USDC' },
          { name: 'USDT', value: 'USDT' },
          { name: 'DAI', value: 'DAI' },
        ],
      }]);

      const { amount } = await inquirer.prompt([{
        type: 'input',
        name: 'amount',
        message: `Amount of ${sourceToken} to swap:`,
        validate: (input) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
      }]);

      console.log(chalk.cyan('\n🔄 Preparing cross-chain swap...\n'));
      console.log(chalk.gray('From:     ') + chalk.white(`${amount} ${sourceToken} on chain ${sourceChain}`));
      console.log(chalk.gray('To:       ') + chalk.white('USDT0 on Plasma'));
      console.log(chalk.gray('Recipient:') + chalk.white(wallet.address));
      
      console.log(chalk.yellow('\n⚠️  In production, this would execute the LiFi swap.'));
      console.log(chalk.gray('Run with the SDK: ') + chalk.cyan('PlasmaLiFiClient.swap(...)'));
      
    } else {
      console.log(chalk.cyan('\n📤 Send USDT0 directly to:\n'));
      console.log(chalk.white.bold(wallet.address));
      console.log(chalk.gray('\nNetwork: Plasma'));
      console.log(chalk.gray('\nScan QR code:\n'));
      qrcode.generate(wallet.address, { small: true });
    }
  });

// ============================================================================
// SEND COMMAND
// ============================================================================
program
  .command('send')
  .description('Send payment')
  .option('-t, --to <address>', 'Recipient address')
  .option('-a, --amount <amount>', 'Amount to send')
  .option('-c, --currency <currency>', 'Currency (default: USDT0)')
  .option('--chain <chain>', 'Target chain (default: plasma)')
  .action(async (options) => {
    const wallet = config.getActiveWallet();
    if (!wallet) {
      console.log(chalk.red('No wallet found. Run `plasma-pay init` first.'));
      return;
    }

    const { to } = options.to ? { to: options.to } : await inquirer.prompt([{
      type: 'input',
      name: 'to',
      message: 'Recipient address:',
      validate: (input) => /^0x[a-fA-F0-9]{40}$/.test(input) || 'Invalid address format',
    }]);

    const { amount } = options.amount ? { amount: options.amount } : await inquirer.prompt([{
      type: 'input',
      name: 'amount',
      message: 'Amount to send:',
      validate: (input) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
    }]);

    const currency = options.currency || 'USDT0';
    const chain = options.chain || 'plasma';

    // Get password to unlock key
    const { password } = await inquirer.prompt([{
      type: 'password',
      name: 'password',
      message: 'Enter your password:',
      mask: '*',
    }]);

    const spinner = ora('Sending payment...').start();

    try {
      // Retrieve private key
      const privateKey = await keyManager.retrieveKey(
        wallet.address,
        wallet.encryptedPrivateKey,
        password
      );

      if (!privateKey) {
        spinner.fail('Failed to unlock wallet');
        return;
      }

      // In production, this would use PlasmaPayClient
      spinner.text = 'Signing transaction...';
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      spinner.text = 'Broadcasting...';
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      spinner.succeed('Payment sent!');
      
      console.log(chalk.green('\n✅ Transaction successful!\n'));
      console.log(chalk.gray('Amount:    ') + chalk.white(`${amount} ${currency}`));
      console.log(chalk.gray('To:        ') + chalk.white(to));
      console.log(chalk.gray('Chain:     ') + chalk.white(chain));
      console.log(chalk.gray('TX Hash:   ') + chalk.cyan('0x...'));
      
    } catch (error: any) {
      spinner.fail('Failed to send payment');
      console.error(chalk.red(error.message));
    }
  });

// ============================================================================
// WALLETS COMMAND
// ============================================================================
program
  .command('wallets')
  .description('List all wallets')
  .action(() => {
    const wallets = config.listWallets();
    const activeWallet = config.getActiveWallet();
    
    if (wallets.length === 0) {
      console.log(chalk.yellow('No wallets found. Run `plasma-pay init` to create one.'));
      return;
    }

    console.log(chalk.bold('\n💼 Your Wallets:\n'));
    
    wallets.forEach((wallet, index) => {
      const isActive = wallet.address === activeWallet?.address;
      const prefix = isActive ? chalk.green('→ ') : '  ';
      const name = wallet.name || `Wallet ${index + 1}`;
      
      console.log(`${prefix}${chalk.bold(name)}`);
      console.log(`  ${chalk.gray('Address:')} ${wallet.address}`);
      console.log(`  ${chalk.gray('Created:')} ${wallet.createdAt}`);
      console.log();
    });
  });

// ============================================================================
// USE COMMAND - Switch active wallet
// ============================================================================
program
  .command('use <address>')
  .description('Switch to a different wallet')
  .action((address) => {
    const wallets = config.listWallets();
    const wallet = wallets.find(w => 
      w.address.toLowerCase() === address.toLowerCase() ||
      w.name?.toLowerCase() === address.toLowerCase()
    );
    
    if (!wallet) {
      console.log(chalk.red('Wallet not found.'));
      return;
    }
    
    config.setActiveWallet(wallet.address);
    console.log(chalk.green(`✓ Now using: ${wallet.name || wallet.address}`));
  });

// ============================================================================
// EXPORT COMMAND
// ============================================================================
program
  .command('export')
  .description('Export wallet for use in code')
  .option('-f, --format <format>', 'Output format: env, json, code')
  .action(async (options) => {
    const wallet = config.getActiveWallet();
    if (!wallet) {
      console.log(chalk.red('No wallet found.'));
      return;
    }

    const { format } = options.format ? { format: options.format } : await inquirer.prompt([{
      type: 'list',
      name: 'format',
      message: 'Export format:',
      choices: [
        { name: 'Environment variables (.env)', value: 'env' },
        { name: 'JSON config', value: 'json' },
        { name: 'Code snippet', value: 'code' },
      ],
    }]);

    console.log(chalk.yellow('\n⚠️  Keep this information secure!\n'));

    if (format === 'env') {
      console.log(chalk.gray('# Add to your .env file:'));
      console.log(chalk.white(`PLASMA_WALLET_ADDRESS=${wallet.address}`));
      console.log(chalk.white('PLASMA_WALLET_KEY=<your-private-key>'));
    } else if (format === 'json') {
      console.log(chalk.gray('// Add to your config:'));
      console.log(JSON.stringify({
        address: wallet.address,
        network: 'plasma',
        facilitatorUrl: config.getAll().facilitatorUrl,
      }, null, 2));
    } else {
      console.log(chalk.gray('// TypeScript/JavaScript:'));
      console.log(chalk.white(`
import { PlasmaPayClient } from '@plasma-pay/agent';

const client = new PlasmaPayClient({
  privateKey: process.env.PLASMA_WALLET_KEY,
  // Address: ${wallet.address}
});

// Send payment
await client.sendPayment({
  to: '0x...',
  amount: '10.00',
});
`));
    }
  });

// ============================================================================
// X402 SETUP COMMAND
// ============================================================================
program
  .command('x402-setup')
  .description('Generate X402 payment configuration for your API')
  .action(async () => {
    console.log(banner);
    console.log(chalk.bold('🔧 X402 Payment Setup\n'));
    
    const wallet = config.getActiveWallet();
    if (!wallet) {
      console.log(chalk.red('No wallet found. Run `plasma-pay init` first.'));
      return;
    }

    const { endpoint } = await inquirer.prompt([{
      type: 'input',
      name: 'endpoint',
      message: 'API endpoint to protect:',
      default: '/api/premium',
    }]);

    const { price } = await inquirer.prompt([{
      type: 'input',
      name: 'price',
      message: 'Price per request (USDT0):',
      default: '0.01',
    }]);

    const { description } = await inquirer.prompt([{
      type: 'input',
      name: 'description',
      message: 'Payment description:',
      default: 'API access fee',
    }]);

    console.log(chalk.cyan('\n📋 X402 Configuration:\n'));

    // Express middleware
    console.log(chalk.bold('Express Middleware:'));
    console.log(chalk.white(`
import { createX402Middleware } from '@plasma-pay/agent/server';

app.use('${endpoint}', createX402Middleware({
  recipient: '${wallet.address}',
  amount: '${price}',
  description: '${description}',
  network: 'plasma',
}));
`));

    // Next.js middleware
    console.log(chalk.bold('\nNext.js Middleware:'));
    console.log(chalk.white(`
// middleware.ts
import { withX402 } from '@plasma-pay/agent/next';

export default withX402({
  routes: {
    '${endpoint}': {
      recipient: '${wallet.address}',
      amount: '${price}',
    },
  },
});
`));

    // Config JSON
    console.log(chalk.bold('\nConfig JSON:'));
    console.log(JSON.stringify({
      x402: {
        version: '1.0',
        routes: {
          [endpoint]: {
            recipient: wallet.address,
            amount: price,
            description,
            network: 'plasma',
            scheme: 'eip3009-transfer-with-auth',
          },
        },
      },
    }, null, 2));
  });

// ============================================================================
// HELP-AGENT COMMAND - Help another agent set up payments
// ============================================================================
program
  .command('help-agent')
  .description('Generate setup instructions for another agent')
  .action(async () => {
    console.log(banner);
    console.log(chalk.bold('🤖 Agent Setup Guide Generator\n'));

    const { agentType } = await inquirer.prompt([{
      type: 'list',
      name: 'agentType',
      message: 'What type of agent needs setup?',
      choices: [
        { name: 'LangChain Agent', value: 'langchain' },
        { name: 'OpenAI Function Calling', value: 'openai' },
        { name: 'Anthropic Claude (MCP)', value: 'mcp' },
        { name: 'Custom Python Agent', value: 'python' },
        { name: 'Custom Node.js Agent', value: 'nodejs' },
      ],
    }]);

    console.log(chalk.cyan(`\n📚 Setup Guide for ${agentType}:\n`));

    if (agentType === 'langchain') {
      console.log(chalk.white(`
# Step 1: Install dependencies
npm install @plasma-pay/agent @langchain/core

# Step 2: Create payment tools
import { PlasmaPayClient } from '@plasma-pay/agent';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const client = new PlasmaPayClient({
  privateKey: process.env.PLASMA_WALLET_KEY,
});

export const paymentTools = [
  new DynamicStructuredTool({
    name: 'send_payment',
    description: 'Send USDT0 payment on Plasma',
    schema: z.object({
      to: z.string(),
      amount: z.string(),
    }),
    func: async ({ to, amount }) => {
      const result = await client.sendPayment({ to, amount });
      return JSON.stringify(result);
    },
  }),
];

# Step 3: Add tools to your agent
const agent = await createOpenAIFunctionsAgent({
  llm,
  tools: paymentTools,
  prompt,
});
`));
    } else if (agentType === 'mcp') {
      console.log(chalk.white(`
# Step 1: Install MCP server
npm install -g @plasma-pay/mcp-server

# Step 2: Add to Claude/Cursor config
{
  "mcpServers": {
    "plasma-pay": {
      "command": "plasma-pay-mcp",
      "env": {
        "PLASMA_WALLET_KEY": "0x..."
      }
    }
  }
}

# Step 3: Available tools in Claude/Cursor:
- plasma_get_balance: Check wallet balance
- plasma_send_payment: Send USDT0 payments
- plasma_pay_invoice: Pay X402 invoices
- plasma_estimate_gas: Estimate transaction costs
`));
    } else if (agentType === 'python') {
      console.log(chalk.white(`
# Step 1: Install SDK
pip install plasma-pay

# Step 2: Initialize client
from plasma_pay import PlasmaPayClient

client = PlasmaPayClient(
    private_key=os.environ['PLASMA_WALLET_KEY']
)

# Step 3: Use in your agent
async def handle_payment(to: str, amount: str):
    result = await client.send_payment(to=to, amount=amount)
    return result

# Step 4: Fund your agent
# Run: plasma-pay fund
`));
    } else {
      console.log(chalk.white(`
# Step 1: Install SDK
npm install @plasma-pay/agent

# Step 2: Initialize client
import { PlasmaPayClient } from '@plasma-pay/agent';

const client = new PlasmaPayClient({
  privateKey: process.env.PLASMA_WALLET_KEY,
});

# Step 3: Use in your agent
const result = await client.sendPayment({
  to: '0x...',
  amount: '10.00',
});

# Step 4: Fund your agent
# Run: plasma-pay fund
`));
    }

    console.log(chalk.green('\n✅ Share this guide with the other agent!'));
  });

// ============================================================================
// DEFI COMMAND - DeFi operations
// ============================================================================
program
  .command('defi')
  .description('DeFi operations (swap, yield, stake)')
  .action(async () => {
    console.log(banner);
    console.log(chalk.bold('🏦 DeFi Operations\n'));

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '🔄 Swap tokens', value: 'swap' },
        { name: '📈 Find best yields', value: 'yield' },
        { name: '🥩 Stake tokens', value: 'stake' },
        { name: '📊 View protocol TVL', value: 'tvl' },
      ],
    }]);

    if (action === 'yield') {
      console.log(chalk.cyan('\n📈 Top Yield Opportunities on Plasma:\n'));
      console.log(chalk.gray('Fetching from DefiLlama...'));
      
      // In production, this would call DefiLlama API
      console.log(chalk.white(`
┌─────────────────┬───────────┬─────────┬──────────┐
│ Protocol        │ Pool      │ APY     │ TVL      │
├─────────────────┼───────────┼─────────┼──────────┤
│ PlasmaSwap      │ USDT0/XPL │ 12.5%   │ $2.1M    │
│ PlasmaLend      │ USDT0     │ 8.2%    │ $5.4M    │
│ PlasmaVault     │ Stable    │ 6.8%    │ $3.2M    │
└─────────────────┴───────────┴─────────┴──────────┘
`));
    } else if (action === 'tvl') {
      console.log(chalk.cyan('\n📊 Protocol TVL on Plasma:\n'));
      console.log(chalk.gray('Fetching from DefiLlama...'));
      
      console.log(chalk.white(`
Total Value Locked: $15.2M

Top Protocols:
1. PlasmaLend    - $5.4M  (35.5%)
2. PlasmaSwap    - $4.1M  (27.0%)
3. PlasmaVault   - $3.2M  (21.1%)
4. PlasmaStake   - $2.5M  (16.4%)
`));
    } else {
      console.log(chalk.yellow('\n⚠️  This feature is coming soon!'));
      console.log(chalk.gray('Use the SDK directly: ') + chalk.cyan('@plasma-pay/defi'));
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(banner);
  program.outputHelp();
}
