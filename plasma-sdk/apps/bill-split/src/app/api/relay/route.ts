/**
 * Plasma Gasless Relay API Route
 *
 * Forwards signed EIP-3009 authorizations to the Plasma gasless API.
 * Uses the shared relay handler from @plasma-pay/gasless.
 */

import { createRelayHandler } from "@plasma-pay/gasless";

const handler = createRelayHandler();

export const POST = handler.POST;
export const GET = handler.GET;
