import type { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Get the Convex URL from environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

// Initialize the Convex client only if URL is provided
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // If no Convex URL is provided, just render the children without the ConvexProvider
  if (!convex) {
    console.warn('No Convex URL provided. Skipping Convex integration.');
    return <>{children}</>;
  }
  
  // Otherwise, wrap children with ConvexProvider
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}