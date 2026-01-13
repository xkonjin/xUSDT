import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskTextSelector: ".mask-text",
      },
      loaded: (posthog) => {
        posthog.register({
          app: "telegram-webapp",
        });
      },
    });
  }
  return posthog;
};

export { posthog };
