import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'
import * as Sentry from '@sentry/react'

import { initSentry } from './sentry'

// Initialize Sentry in SSR context (will be skipped if DSN is not defined)
initSentry()

// Define a custom handler with optional Sentry error tracking
const customHandler = defineHandlerCallback((ctx) => {
  // Only wrap with Sentry if DSN is available
  if (process.env.SENTRY_DSN) {
    try {
      return defaultStreamHandler(ctx)
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  }

  return defaultStreamHandler(ctx)
})

const fetch = createStartHandler(customHandler)
export default createServerEntry({ fetch })
