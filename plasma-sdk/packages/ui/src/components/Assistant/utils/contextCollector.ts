import type { UIContext, FormFieldState } from '../types';
import { PAGE_NAMES } from '../constants';

export function collectUIContext(): Partial<UIContext> {
  // Get current route from URL
  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '/';
  const currentPage = PAGE_NAMES[currentRoute] || currentRoute;

  // Collect form fields
  const formFields: Record<string, FormFieldState> = {};
  
  if (typeof document !== 'undefined') {
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      const input = el as HTMLInputElement;
      const fieldName = input.name || input.id;
      
      if (fieldName && !fieldName.startsWith('__')) {
        formFields[fieldName] = {
          name: fieldName,
          value: input.type === 'password' ? '***' : input.value,
          isValid: input.validity?.valid ?? true,
          isFocused: document.activeElement === input,
          errorMessage: input.validationMessage || undefined,
        };
      }
    });

    // Detect errors on page
    const errors: string[] = [];
    document.querySelectorAll('[class*="error"], [class*="Error"], [role="alert"]').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) {
        errors.push(text);
      }
    });

    // Get hover target
    let hoverTarget: string | null = null;
    const hoveredElements = document.querySelectorAll(':hover');
    hoveredElements.forEach((el) => {
      const tip = el.getAttribute('data-assistant-tip') ||
                  el.getAttribute('aria-label') ||
                  el.getAttribute('title');
      if (tip) hoverTarget = tip;
    });

    return {
      currentPage,
      currentRoute,
      formFields,
      errors,
      hoverTarget,
    };
  }

  return {
    currentPage,
    currentRoute,
    formFields: {},
    errors: [],
    hoverTarget: null,
  };
}

export function formatContextForLLM(context: UIContext): string {
  const parts: string[] = [];

  parts.push(`Page: ${context.currentPage}`);
  
  if (context.walletConnected) {
    parts.push(`Wallet: Connected (Balance: ${context.balance || 'unknown'})`);
  } else {
    parts.push('Wallet: Not connected');
  }

  if (context.pendingTransactions > 0) {
    parts.push(`Pending transactions: ${context.pendingTransactions}`);
  }

  const focusedFields = Object.values(context.formFields).filter(f => f.isFocused);
  if (focusedFields.length > 0) {
    parts.push(`Focused on: ${focusedFields.map(f => f.name).join(', ')}`);
  }

  const invalidFields = Object.values(context.formFields).filter(f => !f.isValid);
  if (invalidFields.length > 0) {
    parts.push(`Invalid fields: ${invalidFields.map(f => f.name).join(', ')}`);
  }

  if (context.errors.length > 0) {
    parts.push(`Errors: ${context.errors.slice(0, 2).join('; ')}`);
  }

  if (context.mouseIdleTime > 10000) {
    parts.push(`User idle for: ${Math.floor(context.mouseIdleTime / 1000)}s`);
  }

  if (context.hoverTarget) {
    parts.push(`Hovering: ${context.hoverTarget}`);
  }

  return parts.join('\n');
}
