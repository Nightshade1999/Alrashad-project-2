/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

clientsClaim();
cleanupOutdatedCaches();

// Precaching Next.js build assets
precacheAndRoute(self.__WB_MANIFEST || []);

// 1. Static Assets (Fonts/Icons) - CacheFirst
registerRoute(
  /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
  new CacheFirst({
    cacheName: "static-fonts",
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// 2. Images - StaleWhileRevalidate
registerRoute(
  /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  new StaleWhileRevalidate({
    cacheName: "static-images",
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  })
);

// 3. App Shell (JS/CSS) - StaleWhileRevalidate
registerRoute(
  /\/_next\/static\/.*/i,
  new StaleWhileRevalidate({
    cacheName: "next-static-assets",
  })
);

// 4. API (Supabase) - NetworkFirst (with 5s timeout)
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: "supabase-api-data",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// 5. HARDENED NAVIGATION HANDLER
// This wraps the navigation response in a strict try/catch to prevent the 
// Service Worker from crashing on iOS when a promise hangs/fails.
const navigationHandler = new NetworkFirst({
  cacheName: "pages-cache",
  networkTimeoutSeconds: 5,
  plugins: [
    new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
  ],
});

// We register a custom NavigationRoute that handles errors gracefully
const navigationRoute = new NavigationRoute(async (params) => {
  try {
    return await navigationHandler.handle(params);
  } catch (error) {
    console.error("Navigation Fetch Error (iOS-Hardened):", error);
    // Fallback to the lightweight static offline.html
    return (await caches.match("/offline.html")) || Response.error();
  }
});

registerRoute(navigationRoute);

// GLOBAL FETCH CATCH-ALL (Last line of defense for iOS crashes)
self.addEventListener("fetch", (event) => {
  // We only add a global catch-all for potential unhandled boundary cases
  // Everything else is handled by the Workbox routes above.
  try {
    // If it's a cross-origin request that we don't handle, workbox handles it.
  } catch (e) {
    console.error("Global Service Worker Fetch Exception:", e);
  }
});

// Self-destruct old workers if needed or force immediate activation
self.addEventListener("install", () => {
  self.skipWaiting();
});
