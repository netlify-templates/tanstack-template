import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { getRouterManifest } from '@tanstack/react-start/router-manifest'
import * as Sentry from '@sentry/react'

import { createRouter } from './router'
import { initSentry } from './sentry'

// Initialize Sentry in SSR context (will be skipped if DSN is not defined)
initSentry()

// Define a stream handler based on Sentry availability
let streamHandler = defaultStreamHandler;

// Only wrap with Sentry if DSN is available
if (process.env.SENTRY_DSN) {
  const originalHandler = defaultStreamHandler;
  
  streamHandler = async (options) => {
    try {
      return await originalHandler(options);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  };
}

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(streamHandler)
