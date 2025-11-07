// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { isProductionEnvironment } from './src/config';

if (isProductionEnvironment()) {
  Sentry.init({
  dsn: "https://4cd8e30685d21d3397d463c633ec0c5b@o4508667613151232.ingest.us.sentry.io/4509050447855616",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
}
