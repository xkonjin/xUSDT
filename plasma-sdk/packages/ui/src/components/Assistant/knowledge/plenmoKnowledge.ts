/**
 * Plenmo Knowledge Base for Plenny AI Assistant
 * 
 * This file contains comprehensive knowledge about the Plenmo app,
 * enabling the assistant to provide accurate, contextual help.
 */

export const PLENMO_KNOWLEDGE = {
  // ============================================================================
  // CORE PRODUCT UNDERSTANDING
  // ============================================================================
  
  product: {
    name: "Plenmo",
    tagline: "Zero-fee P2P payments powered by Plasma Chain",
    description: "Plenmo is a Venmo-style payment app that enables instant, gasless USDT0 transfers. Send money to anyone via email, phone, or wallet address - even if they don't have an account yet.",
    
    valueProposition: [
      "ZERO FEES - All gas costs are sponsored by the relayer",
      "NO CRYPTO JARGON - Users see dollars, not wei or gwei",
      "NON-CUSTODIAL - Users own their keys via Privy embedded wallets",
      "INSTANT - 2-second finality on Plasma Chain",
      "EASY ONBOARDING - Send to email/phone, recipient claims via link",
    ],
    
    currency: {
      name: "USDT0",
      fullName: "USD Tether on Plasma",
      decimals: 6,
      description: "A stablecoin pegged 1:1 to USD. 1 USDT0 = $1 USD always.",
    },
    
    network: {
      name: "Plasma Chain",
      chainId: 9745,
      rpc: "https://rpc.plasma.to",
      description: "A fast, low-cost Layer 2 blockchain optimized for payments.",
    },
  },

  // ============================================================================
  // FEATURE GUIDES
  // ============================================================================
  
  features: {
    sendMoney: {
      name: "Send Money",
      location: "Home page, top card",
      howTo: [
        "1. Enter recipient's email, phone number, or wallet address",
        "2. Enter the amount in USD (minimum $0.01, maximum $10,000)",
        "3. Click 'Review Payment' to see confirmation",
        "4. Confirm to send - transaction is instant and FREE",
      ],
      tips: [
        "You can send to anyone - they'll get an email to claim if they don't have an account",
        "Use recent contacts for quick repeat payments",
        "Quick amount buttons: $5 (coffee), $10 (pizza), $25 (movie), $50 (gift), $100 (party)",
      ],
      requirements: [
        "Connected wallet with USDT0 balance",
        "Valid recipient identifier",
        "Amount between $0.01 and $10,000",
      ],
      errorHelp: {
        "Insufficient balance": "You don't have enough USDT0. Add funds using the 'Fund Wallet' button.",
        "Invalid recipient": "Check the email/phone format or wallet address (should start with 0x)",
        "Transaction failed": "The network might be busy. Wait a moment and try again.",
      },
    },
    
    receiveMoney: {
      name: "Receive Money",
      location: "Home page, 'Receive' tab",
      howTo: [
        "1. Share your wallet address or QR code",
        "2. Or create a payment link with a specific amount",
        "3. Share the link via any messaging app",
      ],
      tips: [
        "Payment links can have preset amounts or be open-ended",
        "QR codes work great for in-person payments",
      ],
    },
    
    claimPayment: {
      name: "Claim Payment",
      location: "/claim/[token] page",
      howTo: [
        "1. Click the claim link in your email",
        "2. Sign up or log in with Privy",
        "3. Your funds will be automatically transferred to your wallet",
      ],
      notes: [
        "Claims expire after 7 days",
        "You must use the same email that received the payment",
        "Claiming is also FREE - no gas fees",
      ],
    },
    
    paymentLinks: {
      name: "Payment Links",
      location: "/pay page",
      howTo: [
        "1. Go to the Pay page",
        "2. Create a new payment link with optional amount and memo",
        "3. Share the generated link",
        "4. Anyone with the link can pay you",
      ],
      tips: [
        "Great for collecting payments from groups",
        "Set a maximum number of uses if needed",
        "Links can have expiration dates",
      ],
    },
    
    contacts: {
      name: "Contacts",
      location: "Home page, contacts section",
      howTo: [
        "1. Contacts are auto-saved when you send to someone",
        "2. Star contacts to mark as favorites",
        "3. Click a contact to quickly send to them",
      ],
      tips: [
        "Favorites appear first in the list",
        "Recent contacts show at the top of the send form",
      ],
    },
    
    fundWallet: {
      name: "Fund Wallet",
      location: "Home page, balance card",
      methods: [
        "1. BUY with card - Use Transak to purchase crypto with debit/credit card",
        "2. TRANSFER - Send USDT0 from another wallet or exchange",
        "3. RECEIVE - Have someone send you money on Plenmo",
      ],
      tips: [
        "Buying with card has a small fee from the provider",
        "Transfers from external wallets require that wallet to pay gas",
        "Receiving on Plenmo is always free",
      ],
    },
    
    socialFeed: {
      name: "Social Feed",
      location: "Home page, scroll down",
      description: "See public transactions from the Plenmo community",
      features: [
        "View recent public payments",
        "Like transactions",
        "Privacy setting: make your transactions public or private",
      ],
    },
    
    settings: {
      name: "Settings",
      location: "/settings page",
      options: [
        "Display name - How others see you",
        "Privacy - Public/private transaction visibility",
        "Notifications - Email preferences",
        "Connected accounts - Manage linked emails/phones",
      ],
    },
  },

  // ============================================================================
  // TECHNICAL UNDERSTANDING
  // ============================================================================
  
  technical: {
    howItWorks: {
      gaslessTransactions: `
Plenmo uses EIP-3009 "transferWithAuthorization" for gasless transfers:
1. You sign a message authorizing the transfer (costs nothing)
2. Our relayer submits the transaction and pays the gas fee
3. Funds move from your wallet to the recipient instantly
This means YOU NEVER PAY GAS FEES - we cover it all!`,
      
      claimFlow: `
When you send to someone without a Plenmo account:
1. Funds go to a secure escrow address
2. Recipient gets an email with a claim link
3. They sign up and claim their funds
4. Escrow releases funds to their new wallet
All of this is FREE for both sender and recipient.`,
      
      walletTypes: `
Plenmo supports two wallet types:
1. EMBEDDED WALLET - Created automatically when you sign up. Non-custodial, you own the keys.
2. EXTERNAL WALLET - Connect MetaMask, Rainbow, etc. Good if you already have crypto.`,
    },
    
    security: {
      description: "Your funds are always safe",
      features: [
        "Non-custodial: You control your private keys",
        "Embedded wallets secured by Privy (enterprise-grade security)",
        "All transactions require your signature",
        "Claim links have unique secure tokens",
        "Rate limiting prevents spam/abuse",
      ],
    },
  },

  // ============================================================================
  // COMMON QUESTIONS & ANSWERS
  // ============================================================================
  
  faq: {
    "What is USDT0?": "USDT0 is a stablecoin worth exactly $1 USD. It's the digital dollar you use on Plenmo.",
    
    "Are there any fees?": "No! Plenmo is completely free. We sponsor all transaction fees so you keep 100% of your money.",
    
    "How fast are transfers?": "Instant! Transactions confirm in about 2 seconds on Plasma Chain.",
    
    "Can I send to someone without Plenmo?": "Yes! Send to their email or phone. They'll get a link to claim the funds by signing up.",
    
    "Is my money safe?": "Absolutely. Your wallet is non-custodial (you own the keys) and secured by Privy's enterprise-grade security.",
    
    "What if I send to the wrong person?": "Crypto transactions are irreversible. Always double-check the recipient before sending.",
    
    "How do I add money?": "You can buy with a debit/credit card via Transak, transfer from another wallet, or have someone send you money.",
    
    "What's Plasma Chain?": "Plasma is a fast, low-cost Layer 2 blockchain. It's like a highway for payments - quick and cheap!",
    
    "Why do I need to sign up?": "To create your secure wallet and protect your funds. We use email/phone/social login - no seed phrases to remember!",
    
    "Can I use Plenmo internationally?": "Yes! USDT0 works globally. Send to anyone, anywhere.",
    
    "What's the minimum/maximum I can send?": "Minimum: $0.01. Maximum: $10,000 per transaction.",
    
    "How do claims work?": "When you send to someone without an account, they get an email with a secure link. They click it, sign up, and get their money!",
    
    "Can I cancel a payment?": "No, blockchain transactions are final. Only send to people you trust.",
    
    "What if my claim link expires?": "Claims expire after 7 days. If expired, the sender needs to re-send the payment.",
  },

  // ============================================================================
  // CONTEXTUAL HELP BY PAGE
  // ============================================================================
  
  pageContext: {
    "/": {
      name: "Home",
      purpose: "Your dashboard - send money, view balance, see contacts and activity",
      tips: [
        "Quick send: tap a recent contact to pay them again",
        "Pull down to refresh your balance",
        "The social feed shows community activity",
      ],
      proactiveHelp: {
        noWallet: "Connect your wallet to start sending money!",
        lowBalance: "Your balance is running low. Add funds to keep sending!",
        firstVisit: "Welcome to Plenmo! Ready to send your first payment?",
      },
    },
    
    "/pay": {
      name: "Payment Links",
      purpose: "Create and manage payment links for receiving money",
      tips: [
        "Payment links are great for collecting from groups",
        "Set an amount or leave it open-ended",
        "Share via any messaging app",
      ],
    },
    
    "/pay/[linkId]": {
      name: "Pay via Link",
      purpose: "Complete a payment using someone's payment link",
      tips: [
        "Review the amount and recipient before paying",
        "You'll need USDT0 balance to complete the payment",
      ],
    },
    
    "/claim/[token]": {
      name: "Claim Payment",
      purpose: "Claim money that was sent to you",
      tips: [
        "Sign up with the same email that received the payment",
        "Claiming is instant and free",
        "Claims expire after 7 days",
      ],
    },
    
    "/invite": {
      name: "Referrals",
      purpose: "Invite friends and earn rewards",
      tips: [
        "Share your unique referral link",
        "Earn rewards when friends sign up and transact",
      ],
    },
    
    "/settings": {
      name: "Settings",
      purpose: "Manage your profile and preferences",
      tips: [
        "Set your display name so friends recognize you",
        "Choose whether your transactions are public or private",
        "Manage notification preferences",
      ],
    },
  },

  // ============================================================================
  // ERROR MESSAGES & SOLUTIONS
  // ============================================================================
  
  errorSolutions: {
    "Insufficient balance": {
      meaning: "You don't have enough USDT0 to complete this payment",
      solution: "Add funds to your wallet using the 'Fund Wallet' button on the home page",
      emotion: "concerned",
    },
    
    "Invalid recipient": {
      meaning: "The email, phone, or address format isn't recognized",
      solution: "Check the format: emails need @, phones need country code, addresses start with 0x",
      emotion: "thinking",
    },
    
    "Transaction failed": {
      meaning: "The blockchain transaction didn't go through",
      solution: "This is usually temporary. Wait a few seconds and try again. Your funds are safe!",
      emotion: "concerned",
    },
    
    "Wallet not connected": {
      meaning: "You need to connect a wallet to send money",
      solution: "Click 'Connect Wallet' and sign in with email, phone, or social login",
      emotion: "thinking",
    },
    
    "Claim expired": {
      meaning: "The claim link is no longer valid (over 7 days old)",
      solution: "Ask the sender to send the payment again with a new claim link",
      emotion: "concerned",
    },
    
    "Rate limit exceeded": {
      meaning: "Too many requests in a short time",
      solution: "Wait a minute and try again. This protects against spam.",
      emotion: "neutral",
    },
    
    "Network error": {
      meaning: "Connection to the blockchain failed",
      solution: "Check your internet connection and refresh the page",
      emotion: "thinking",
    },
  },

  // ============================================================================
  // PERSONALITY & COMMUNICATION STYLE
  // ============================================================================
  
  personality: {
    name: "Plenny",
    traits: [
      "Friendly and approachable",
      "Knowledgeable but not condescending",
      "Celebratory on successes",
      "Empathetic on errors",
      "Proactive but not annoying",
    ],
    
    communicationStyle: {
      dos: [
        "Use simple, clear language",
        "Be encouraging and supportive",
        "Celebrate wins with enthusiasm",
        "Offer specific, actionable help",
        "Use occasional emojis (max 1 per message)",
      ],
      donts: [
        "Don't use technical jargon",
        "Don't be preachy or lecture",
        "Don't repeat information",
        "Don't give vague responses",
        "Don't overwhelm with options",
      ],
    },
    
    responseTemplates: {
      greeting: [
        "Hey! What can I help with? 👋",
        "Hi there! Ready to help!",
        "Hello! Need anything?",
      ],
      success: [
        "Awesome! That worked! 🎉",
        "Done! Money's on its way!",
        "Success! Great job! ✨",
      ],
      error: [
        "Oops! Let me help fix that.",
        "Hmm, something's off. I can help!",
        "No worries, we can sort this out.",
      ],
      encouragement: [
        "You've got this!",
        "Almost there!",
        "Looking good!",
      ],
    },
  },
};

/**
 * Get contextual knowledge based on current page/state
 */
export function getContextualKnowledge(
  currentPage: string,
  walletConnected: boolean,
  balance: string | null,
  errors: string[]
): string {
  const knowledge = PLENMO_KNOWLEDGE;
  const parts: string[] = [];
  
  // Page-specific context
  const pageKey = Object.keys(knowledge.pageContext).find(
    key => currentPage.startsWith(key.replace('[linkId]', '').replace('[token]', ''))
  ) || '/';
  const pageInfo = knowledge.pageContext[pageKey as keyof typeof knowledge.pageContext];
  
  if (pageInfo) {
    parts.push(`User is on: ${pageInfo.name}`);
    parts.push(`Page purpose: ${pageInfo.purpose}`);
  }
  
  // Wallet state
  if (!walletConnected) {
    parts.push("IMPORTANT: User's wallet is NOT connected. They need to connect to send money.");
  } else if (balance) {
    const numBalance = parseFloat(balance);
    if (numBalance < 1) {
      parts.push(`User's balance is low: $${balance}. They may need to add funds.`);
    } else {
      parts.push(`User's balance: $${balance} USDT0`);
    }
  }
  
  // Error context
  if (errors.length > 0) {
    const errorInfo = errors.map(err => {
      const solution = knowledge.errorSolutions[err as keyof typeof knowledge.errorSolutions];
      return solution 
        ? `Error: "${err}" - Solution: ${solution.solution}`
        : `Error detected: ${err}`;
    });
    parts.push("ERRORS ON PAGE:\n" + errorInfo.join("\n"));
  }
  
  return parts.join("\n");
}

/**
 * Get proactive help message if appropriate
 */
export function getProactiveMessage(
  currentPage: string,
  walletConnected: boolean,
  balance: string | null,
  idleTimeMs: number,
  hasErrors: boolean
): { message: string; emotion: 'neutral' | 'happy' | 'thinking' | 'concerned' | 'excited' } | null {
  const knowledge = PLENMO_KNOWLEDGE;
  
  // Priority 1: Errors
  if (hasErrors) {
    return {
      message: "I see an error. Need help fixing it?",
      emotion: "concerned",
    };
  }
  
  // Priority 2: No wallet on send page
  if (!walletConnected && currentPage === '/') {
    return {
      message: "Connect your wallet to start sending! It's free 🔐",
      emotion: "thinking",
    };
  }
  
  // Priority 3: Low balance
  if (walletConnected && balance && parseFloat(balance) < 1 && currentPage === '/') {
    return {
      message: "Running low! Add funds to keep sending 💰",
      emotion: "thinking",
    };
  }
  
  // Priority 4: Long idle time
  if (idleTimeMs > 30000) {
    return {
      message: "Still there? I'm here if you need help!",
      emotion: "neutral",
    };
  }
  
  return null;
}

/**
 * Answer a common question
 */
export function answerFAQ(question: string): string | null {
  const faq = PLENMO_KNOWLEDGE.faq;
  const questionLower = question.toLowerCase();
  
  // Direct match
  for (const [q, a] of Object.entries(faq)) {
    if (questionLower.includes(q.toLowerCase().replace(/[?]/g, ''))) {
      return a;
    }
  }
  
  // Keyword matching
  if (questionLower.includes('fee') || questionLower.includes('cost') || questionLower.includes('free')) {
    return faq["Are there any fees?"];
  }
  if (questionLower.includes('fast') || questionLower.includes('long') || questionLower.includes('time')) {
    return faq["How fast are transfers?"];
  }
  if (questionLower.includes('safe') || questionLower.includes('secure') || questionLower.includes('trust')) {
    return faq["Is my money safe?"];
  }
  if (questionLower.includes('add') || questionLower.includes('fund') || questionLower.includes('deposit')) {
    return faq["How do I add money?"];
  }
  if (questionLower.includes('claim') || questionLower.includes('link')) {
    return faq["How do claims work?"];
  }
  if (questionLower.includes('usdt') || questionLower.includes('dollar') || questionLower.includes('stable')) {
    return faq["What is USDT0?"];
  }
  if (questionLower.includes('plasma') || questionLower.includes('chain') || questionLower.includes('network')) {
    return faq["What's Plasma Chain?"];
  }
  if (questionLower.includes('minimum') || questionLower.includes('maximum') || questionLower.includes('limit')) {
    return faq["What's the minimum/maximum I can send?"];
  }
  if (questionLower.includes('cancel') || questionLower.includes('reverse') || questionLower.includes('undo')) {
    return faq["Can I cancel a payment?"];
  }
  if (questionLower.includes('expire') || questionLower.includes('expired')) {
    return faq["What if my claim link expires?"];
  }
  
  return null;
}

/**
 * Get feature guide for a specific action
 */
export function getFeatureGuide(action: string): string | null {
  const features = PLENMO_KNOWLEDGE.features;
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('send')) {
    const f = features.sendMoney;
    return `${f.name}: ${f.howTo.join(' ')} Tips: ${f.tips[0]}`;
  }
  if (actionLower.includes('receive') || actionLower.includes('get paid')) {
    const f = features.receiveMoney;
    return `${f.name}: ${f.howTo.join(' ')}`;
  }
  if (actionLower.includes('claim')) {
    const f = features.claimPayment;
    return `${f.name}: ${f.howTo.join(' ')}`;
  }
  if (actionLower.includes('fund') || actionLower.includes('add money') || actionLower.includes('deposit')) {
    const f = features.fundWallet;
    return `${f.name}: ${f.methods.join(' OR ')}`;
  }
  if (actionLower.includes('contact')) {
    const f = features.contacts;
    return `${f.name}: ${f.howTo.join(' ')}`;
  }
  if (actionLower.includes('link') || actionLower.includes('payment link')) {
    const f = features.paymentLinks;
    return `${f.name}: ${f.howTo.join(' ')}`;
  }
  if (actionLower.includes('setting') || actionLower.includes('profile')) {
    const f = features.settings;
    return `${f.name}: ${f.options.join(', ')}`;
  }
  
  return null;
}
