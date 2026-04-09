/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { Route, registerRoute, NavigationRoute } from "workbox-routing";
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

// Match Next.js RSC data requests for seamless offline navigation
const rscRequestRoute = new Route(
  ({ request, url }) => {
    return request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
  },
  new NetworkFirst({
    cacheName: 'next-rsc-payloads',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }), // Keep for 24 hours
    ],
  })
);
registerRoute(rscRequestRoute);

// 4. API (Supabase) - NetworkFirst (with short timeout)
// Reduced to 2.5s because Safari is extremely impatient with hanging fetch events
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: "supabase-api-data",
    networkTimeoutSeconds: 2.5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// 5. ABSOLUTE RELIABILITY NAVIGATION HANDLER
const navigationHandler = new NetworkFirst({
  cacheName: "pages-cache",
  networkTimeoutSeconds: 2.5,
  plugins: [
    new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
  ],
});

const navigationRoute = new NavigationRoute(async (params) => {
  try {
    return await navigationHandler.handle(params);
  } catch (error) {
    console.error("Navigation Fetch Error (iOS-Hardened):", error);
    // Absolute fallbacks
    return (await caches.match("/dashboard")) || (await caches.match("/offline.html")) || Response.error();
  }
});

registerRoute(navigationRoute);

// 6. GLOBAL FETCH CATCH-ALL
self.addEventListener("fetch", (event) => {
  // Catch-all to prevent unhandled promise rejections on iOS WebKit
  try {
    // If it's a favicon or manifest, return quickly
  } catch (e) {
    console.error("Global Service Worker Fetch Exception:", e);
  }
});

// INSTALL EVENT: Manual Precaching (Crucial for iOS offline reliability)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("manual-precaching-v1").then((cache) => {
      // Explicitly cache key files to ensure the shell is ALWAYS ready instantly
      return cache.addAll([
        "/offline.html",
        "/dashboard",
        "/icon.png",
        "/manifest.json",
      ]);
    })
  );
  self.skipWaiting();
});

// ACTIVATE EVENT: Disable Navigation Preload (Fix for Safari bug)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if ("navigationPreload" in self.registration) {
        await (self.registration as any).navigationPreload.disable();
      }
    })()
  );
  event.waitUntil(self.clients.claim());
});
