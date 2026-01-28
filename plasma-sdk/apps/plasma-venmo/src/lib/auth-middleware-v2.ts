_// src/middleware/auth.ts_
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';

// This function verifies the session by checking for a valid session cookie and token.
// It ensures that the user is authenticated before allowing access to protected routes.
async function verifySession(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession(req, res, sessionOptions);

  if (!session.user?.isAuthenticated) {
    return res.status(401).json({ message: "Authentication required. Please log in." });
  }

  // Additional validation can be added here, such as checking for session expiration
  // or validating the token against a database or external service.

  return session;
}

// withAuth is a higher-order function that wraps an API route handler.
// It applies the session verification logic before executing the handler,
// effectively protecting the route from unauthorized access.
export function withAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await verifySession(req, res);

    if (session) {
      return handler(req, res);
    }
  };
}
