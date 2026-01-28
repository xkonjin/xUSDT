import { withAuth } from "@/middleware/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";

// Mock the session options to avoid depending on environment variables in tests
jest.mock("@/lib/session", () => ({
  sessionOptions: {
    cookieName: "test_session",
    password: "complex_password_for_testing_purposes_only",
    cookieOptions: {
      secure: false,
    },
  },
}));

// A simple handler to be protected by the withAuth middleware
const mockHandler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ message: "Success" });
};

// The protected handler
const protectedHandler = withAuth(mockHandler);

describe("withAuth Middleware", () => {
  test("should allow access with a valid session", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "GET",
    });

    // Create a valid session
    const session = await getIronSession(req, res, sessionOptions);
    session.user = { isAuthenticated: true };
    await session.save();

    // Set the session cookie on the request
    req.headers.cookie = res.getHeaders()["set-cookie"] as string;

    await protectedHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ message: "Success" });
  });

  test("should deny access without a session", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "GET",
    });

    await protectedHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ message: "Authentication required. Please log in." });
  });

  test("should deny access with an invalid session", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "GET",
    });

    // Create an invalid session
    const session = await getIronSession(req, res, sessionOptions);
    session.user = { isAuthenticated: false };
    await session.save();

    // Set the session cookie on the request
    req.headers.cookie = res.getHeaders()["set-cookie"] as string;

    await protectedHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ message: "Authentication required. Please log in." });
  });
});
