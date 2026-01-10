export {
  PlasmaAnalyticsProvider,
  useAnalytics,
  useTrackPageView,
  useTrackEvent,
} from './provider';

export {
  PlasmaEvents,
  type PlasmaEventName,
  type PaymentEventProperties,
  type ShareEventProperties,
  type ReferralEventProperties,
  type BillEventProperties,
  type ErrorEventProperties,
} from './events';

// Re-export posthog for advanced usage
export { default as posthog } from 'posthog-js';
