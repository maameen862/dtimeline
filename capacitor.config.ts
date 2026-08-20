import type { CapacitorConfig } from "@capacitor/cli";

/**
 * DTimeline — Android wrapper (Capacitor)
 *
 * `server.url` points the native shell at the live published web app.
 * That means the Play Store build does NOT need a new release every time
 * the web app changes: users always get the latest version you publish.
 * You only ship a new APK/AAB when you (MA Ameen) change something native
 * (icons, permissions, plugins, app id or version).
 */
const config: CapacitorConfig = {
  appId: "com.maameen.dtimeline",
  appName: "DTimeline",
  webDir: ".output/public",

  android: {
    allowMixedContent: false,
  },

  server: {
    url: "https://dtimeline.maameen862-913.workers.dev",
    cleartext: false,
    androidScheme: "https",
    hostname: "dtimeline.maameen862-913.workers.dev",
  },
};

export default config;
