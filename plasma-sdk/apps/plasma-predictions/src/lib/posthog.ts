import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      // Session Replay
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskTextSelector: ".mask-text",
      },
      // Identify app for unified project
      bootstrap: {
        distinctID: undefined,
      },
      loaded: (posthog) => {
        // Set app identifier for unified project tracking
        posthog.register({
          app: "plasma-predictions",
        });
      },
    });
  }
  return posthog;
};

export { posthog };
