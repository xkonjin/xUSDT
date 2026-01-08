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
 * - NEXTAUTH_URL: Base URL of the application (optional in production)
 */

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Generate a development-only secret for local testing
 * WARNING: This should NEVER be used in production
 */
const getSecret = (): string | undefined => {
  // If a secret is explicitly set, use it
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  
  // In development, use a default secret (with warning)
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[NextAuth] Using development secret. Set NEXTAUTH_SECRET in production!'
    );
    return 'dev-secret-subkiller-do-not-use-in-production';
  }
  
  // In production without secret, NextAuth will throw an error
  return undefined;
};

const handler = NextAuth({
  // Session encryption secret
  secret: getSecret(),
  
  // Configure Google OAuth provider with Gmail read access
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          // Request Gmail read-only access for subscription scanning
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          // Request refresh token for long-term access
          access_type: 'offline',
          // Force consent screen to ensure refresh token is returned
          prompt: 'consent',
        },
      },
    }),
  ],
  
  // JWT and session callbacks for persisting OAuth tokens
  callbacks: {
    /**
     * JWT callback - persist OAuth tokens to the JWT
     * Called after sign-in and on every session check
     */
    async jwt({ token, account }) {
      // Persist OAuth tokens on initial sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    
    /**
     * Session callback - expose access token to client
     * Called whenever session is checked
     */
    async session({ session, token }) {
      // Add access token to session for Gmail API calls
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  
  // Custom pages for authentication flow
  pages: {
    signIn: '/',
    error: '/',
  },
  
  // Enable debug logging in development
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
