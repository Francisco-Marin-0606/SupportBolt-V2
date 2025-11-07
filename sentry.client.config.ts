// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { isProductionEnvironment } from './src/config';

if (isProductionEnvironment()) {
  console.log("Initializing Sentry for client-side instrumentation...");
  
  Sentry.init({
    dsn: "https://4cd8e30685d21d3397d463c633ec0c5b@o4508667613151232.ingest.us.sentry.io/4509050447855616",
    tracesSampleRate: 1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
  });
} 