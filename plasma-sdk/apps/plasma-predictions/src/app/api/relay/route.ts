import { createRelayHandler } from "@plasma-pay/gasless";

const { POST, GET } = createRelayHandler({
  apiUrl: process.env.PLASMA_GASLESS_API,
  timeout: 30000,
});

export { POST, GET };
