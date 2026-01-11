/**
 * NextAuth Configuration for SubKiller
 * 
 * Handles Google OAuth authentication for Gmail access.
 * Scopes include gmail.readonly for subscription email scanning.
 * 
 * Required environment variables:
 * - GOOGLE_CLIENT_ID: Google OAuth client ID
 * - GOOGLE_CLIENT_SECRET: Google OAuth client secret
 * - NEXTAUTH_SECRET: Secret for encrypting session tokens
 */

import { type AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Generate a development-only secret for local testing
 */
const getSecret = (): string | undefined => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[NextAuth] Using development secret. Set NEXTAUTH_SECRET in production!'
    );
    return 'dev-secret-subkiller-do-not-use-in-production';
  }
  
  return undefined;
};

export const authOptions: AuthOptions = {
  secret: getSecret(),
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  
  pages: {
    signIn: '/',
    error: '/',
  },
  
  debug: process.env.NODE_ENV === 'development',
};
