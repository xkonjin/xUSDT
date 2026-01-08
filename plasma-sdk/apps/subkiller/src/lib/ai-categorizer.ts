/**
 * AI-powered Subscription Categorization
 * 
 * Uses OpenAI GPT-4o-mini to categorize detected subscriptions
 * and estimate their monthly costs based on service name.
 */

import OpenAI from 'openai';
import type { Subscription, SubscriptionCategory } from '@/types';

// Lazy-load OpenAI client to avoid build-time initialization errors
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

interface CategorizeInput {
  name: string;
  sender: string;
  emailCount: number;
  frequency: string;
}

interface CategorizeOutput {
  name: string;
  category: SubscriptionCategory;
  estimatedCost: number;
  confidence: number;
}

export async function categorizeWithAI(
  subscriptions: Partial<Subscription>[]
): Promise<Subscription[]> {
  const openai = getOpenAI();
  if (!openai) {
    console.warn('OpenAI API key not set, returning uncategorized subscriptions');
    return subscriptions.map(sub => ({
      ...sub,
      id: sub.id || sub.sender || crypto.randomUUID(),
      name: sub.name || sub.sender || 'Unknown',
      sender: sub.sender || '',
      email: sub.email || '',
      estimatedCost: sub.estimatedCost || 0,
      frequency: sub.frequency || 'unknown',
      category: sub.category || 'other',
      lastSeen: sub.lastSeen || new Date(),
      firstSeen: sub.firstSeen || new Date(),
      emailCount: sub.emailCount || 0,
      status: sub.status || 'active',
    })) as Subscription[];
  }

  const inputs: CategorizeInput[] = subscriptions.map(sub => ({
    name: sub.name || sub.sender || 'Unknown',
    sender: sub.sender || '',
    emailCount: sub.emailCount || 0,
    frequency: sub.frequency || 'unknown',
  }));

  const prompt = `Analyze these email subscriptions and provide categorization and estimated monthly costs.
For each subscription, return:
- A cleaned up display name
- Category (one of: streaming, software, gaming, news, fitness, food, shopping, finance, education, social, productivity, other)
- Estimated monthly cost in USD (if known, otherwise 0)
- Confidence score (0-1)

Subscriptions to analyze:
${JSON.stringify(inputs, null, 2)}

Return a JSON array with objects containing: { name, category, estimatedCost, confidence }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that categorizes email subscriptions. Always respond with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content);
    const outputs: CategorizeOutput[] = parsed.subscriptions || parsed.results || parsed;

    return subscriptions.map((sub, index) => {
      const aiResult = outputs[index];
      return {
        id: sub.id || sub.sender || crypto.randomUUID(),
        name: aiResult?.name || sub.name || sub.sender || 'Unknown',
        sender: sub.sender || '',
        email: sub.email || '',
        estimatedCost: aiResult?.estimatedCost || sub.estimatedCost || 0,
        frequency: sub.frequency || 'unknown',
        category: (aiResult?.category as SubscriptionCategory) || sub.category || 'other',
        lastSeen: sub.lastSeen || new Date(),
        firstSeen: sub.firstSeen || new Date(),
        emailCount: sub.emailCount || 0,
        unsubscribeUrl: sub.unsubscribeUrl,
        managementUrl: sub.managementUrl,
        logoUrl: sub.logoUrl,
        status: sub.status || 'active',
      } as Subscription;
    });
  } catch (error) {
    console.error('AI categorization failed:', error);
    // Return subscriptions with defaults
    return subscriptions.map(sub => ({
      id: sub.id || sub.sender || crypto.randomUUID(),
      name: sub.name || sub.sender || 'Unknown',
      sender: sub.sender || '',
      email: sub.email || '',
      estimatedCost: sub.estimatedCost || 0,
      frequency: sub.frequency || 'unknown',
      category: sub.category || 'other',
      lastSeen: sub.lastSeen || new Date(),
      firstSeen: sub.firstSeen || new Date(),
      emailCount: sub.emailCount || 0,
      unsubscribeUrl: sub.unsubscribeUrl,
      managementUrl: sub.managementUrl,
      logoUrl: sub.logoUrl,
      status: sub.status || 'active',
    })) as Subscription[];
  }
}

export async function generateCancellationEmail(subscription: Subscription): Promise<string> {
  const openai = getOpenAI();
  if (!openai) {
    return `Dear ${subscription.name} Support,

I would like to cancel my subscription effective immediately.

Please confirm the cancellation and ensure I will not be charged going forward.

Thank you.`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You write professional, polite cancellation request emails. Keep them brief and to the point.',
      },
      {
        role: 'user',
        content: `Write a cancellation email for my ${subscription.name} subscription. Be polite but firm about wanting to cancel immediately.`,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}
