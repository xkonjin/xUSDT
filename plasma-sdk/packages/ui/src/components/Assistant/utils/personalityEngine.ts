import type { AssistantMemory, UIContext, AssistantEmotion } from '../types';

export class PersonalityEngine {
  private memory: AssistantMemory;

  constructor(memory: AssistantMemory) {
    this.memory = memory;
  }

  updateMemory(memory: AssistantMemory) {
    this.memory = memory;
  }

  // Track user actions for learning
  trackAction(action: string): Partial<AssistantMemory> {
    const commonActions = [...(this.memory.commonActions || [])];

    if (!commonActions.includes(action)) {
      commonActions.push(action);
      if (commonActions.length > 10) {
        commonActions.shift();
      }
    }

    return { commonActions };
  }

  // Record help interaction for learning
  recordHelpInteraction(
    context: string,
    helpProvided: string,
    wasHelpful: boolean
  ): Partial<AssistantMemory> {
    const helpHistory = [...(this.memory.helpHistory || [])];

    helpHistory.push({
      context,
      helpProvided,
      wasHelpful,
      timestamp: Date.now(),
    });

    if (helpHistory.length > 20) {
      helpHistory.shift();
    }

    return { helpHistory };
  }

  // Suggest emotion based on context
  suggestEmotion(context: UIContext): AssistantEmotion {
    // Error state
    if (context.errors.length > 0) {
      return 'concerned';
    }

    // User struggling
    if (context.mouseIdleTime > 15000 && Object.keys(context.formFields).length > 0) {
      return 'thinking';
    }

    // Long idle
    if (context.mouseIdleTime > 60000) {
      return 'sleepy';
    }

    // Success indicators (no errors, completed form)
    const allFieldsValid = Object.values(context.formFields).every((f) => f.isValid);
    if (allFieldsValid && Object.keys(context.formFields).length > 0) {
      return 'happy';
    }

    return 'neutral';
  }

  // Determine if should proactively offer help
  shouldOfferHelp(context: UIContext): { should: boolean; reason?: string } {
    // Don't offer help too frequently
    const timeSinceLastHelp = Date.now() - this.memory.lastInteraction;
    if (timeSinceLastHelp < 30000) {
      return { should: false };
    }

    // Errors on page
    if (context.errors.length > 0) {
      return { should: true, reason: 'error' };
    }

    // User stuck on send page without wallet
    if (context.currentPage === 'Send Money' && !context.walletConnected) {
      return { should: true, reason: 'wallet_required' };
    }

    // Long idle on a form
    if (
      context.mouseIdleTime > 20000 &&
      Object.keys(context.formFields).length > 0
    ) {
      return { should: true, reason: 'idle_on_form' };
    }

    // First time on certain pages
    const visitKey = `visited_${context.currentRoute}`;
    if (!this.memory.commonActions?.includes(visitKey)) {
      return { should: true, reason: 'first_visit' };
    }

    return { should: false };
  }

  // Get personalized greeting
  getGreeting(context: UIContext): string {
    const hour = new Date().getHours();
    const name = this.memory.userName || '';

    let greeting = '';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    if (name) greeting += `, ${name}`;
    greeting += '! ';

    // Add contextual message
    switch (context.currentPage) {
      case 'Send Money':
        greeting += 'Ready to send some money? 💸';
        break;
      case 'Receive Money':
        greeting += 'Waiting for payment? I can help!';
        break;
      case 'Transaction History':
        greeting += "Let's check your transactions.";
        break;
      case 'Settings':
        greeting += 'Customizing your experience?';
        break;
      default:
        greeting += 'What can I help you with? ✨';
    }

    return greeting;
  }

  // Get contextual tip based on hover target
  getHoverTip(hoverTarget: string): string | null {
    const tips: Record<string, string> = {
      send: 'Click here to send money instantly!',
      receive: 'Share your link to receive payments.',
      wallet: "Your wallet holds all your funds safely.",
      balance: 'This is your current balance.',
      history: 'View all your past transactions here.',
    };

    const key = Object.keys(tips).find((k) =>
      hoverTarget.toLowerCase().includes(k)
    );
    return key ? tips[key] : null;
  }
}
