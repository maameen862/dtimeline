import type { CapacitorConfig } from "@capacitor/cli";

/**
 * DTimeline — Android wrapper (Capacitor)
 *
 * `server.url` points the native shell at the live published web app.
 * That means the Play Store build does NOT need a new release every time
 * the web app changes: users always get the latest version you publish
 * from Lovable. You only ship a new APK/AAB when you (MA Ameen) change
 * something native (icons, permissions, plugins, app id or version).
 */
const config: CapacitorConfig = {
  appId: "com.maameen.dtimeline",
  appName: "DTimeline",
  webDir: ".output/public",
  android: {
    allowMixedContent: false,
  },
  server: {
    url: "https://project--5e5d5a09-5786-4ac7-b6f7-fcb7b0117073.lovable.app",
    cleartext: false,
    androidScheme: "https",
    hostname: "project--5e5d5a09-5786-4ac7-b6f7-fcb7b0117073.lovable.app",
  },
};

export default config;
