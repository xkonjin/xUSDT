import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { PrivyClient } from '@privy-io/server-auth';
import csrf from 'edge-csrf';
import crypto from 'crypto';

// Initialize the csrf protection middleware.
const csrfProtect = csrf({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
  },
});

// Initialize the Privy client.
const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!); 

// Define the claims type based on what verifyAccessToken returns
interface PrivyClaims {
  userId: string;
  appId: string;
  issuer: string;
  issuedAt: number;
  expiration: number;
}

interface AuthenticatedRequest extends NextApiRequest {
  privy: PrivyClaims;
}

/**
 * A high-order function to protect API routes with authentication and CSRF protection.
 *
 * @param handler The API route handler to wrap.
 * @returns A new handler that includes the authentication and CSRF protection logic.
 */
export function withApiAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 1. CSRF Protection
      await csrfProtect(req, res);

      // 2. Privy Token Validation
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header is missing or invalid' });
      }
      const accessToken = authHeader.split(' ')[1];

      try {
        const claims = await privy.verifyAccessToken(accessToken);
        (req as AuthenticatedRequest).privy = claims as unknown as PrivyClaims;
      } catch (error) {
        console.error('Invalid access token', error);
        return res.status(401).json({ message: 'Invalid access token' });
      }

      // 3. Request Signing for sensitive endpoints
      const sensitiveEndpoints = ['/api/transfer', '/api/withdraw'];
      if (sensitiveEndpoints.includes(req.url!)) {
        const signature = req.headers['x-request-signature'] as string;
        if (!signature) {
          return res.status(401).json({ message: 'Request signature is missing' });
        }

        try {
          const isValid = await verifyRequestSignature(req, signature);
          if (!isValid) {
            return res.status(401).json({ message: 'Invalid request signature' });
          }
        } catch (error) {
          console.error('Error verifying request signature', error);
          return res.status(500).json({ message: 'Error verifying request signature' });
        }
      }

      return handler(req, res);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ message: 'Invalid CSRF token' });
      } 
      console.error('Internal Server Error in API auth middleware', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
}

/**
 * Verifies the signature of a request against a known secret.
 *
 * @param req The Next.js API request object.
 * @param signature The signature from the request headers.
 * @returns A promise that resolves to a boolean indicating whether the signature is valid.
 */
async function verifyRequestSignature(
  req: NextApiRequest,
  signature: string
): Promise<boolean> {
  const secret = process.env.REQUEST_SIGNING_SECRET!;
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
