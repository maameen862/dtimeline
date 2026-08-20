# DTimeline — Google Play Store release guide

Developer: **MA Ameen** · App ID: `com.maameen.dtimeline` · © MA Ameen

The Android app is a thin native shell that loads the live published web app.
**No Play Store update is needed when the web app changes** — the shell always
loads the newest published version. You only ship a new build when you change
something native (app icon, name, permissions, version, plugins).

Two supported paths. Pick ONE.

---

## Option A — TWA (Bubblewrap) · simplest, smallest APK

Requires: Node 18+, JDK 17, Android SDK (Bubblewrap can install them for you).

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest ./public/manifest.webmanifest
# (twa-manifest.json in this repo has the values already filled in)
bubblewrap build          # produces app-release-bundle.aab + app-release-signed.apk
```

Then finish Digital Asset Links so the app opens without a browser URL bar:

1. Upload the `.aab` to Play Console → your app → Release.
2. Play Console → Setup → App integrity → copy the **SHA-256 certificate
   fingerprint** from *App signing key certificate*.
3. Paste it into `public/.well-known/assetlinks.json`, replacing
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`, then re-publish the web app.
4. Verify: `https://<your-domain>/.well-known/assetlinks.json` returns the JSON.

---

## Option B — Capacitor · needed if you later add native APIs

`capacitor.config.ts` is already configured (remote `server.url`, so it behaves
like a TWA but with plugin access for future native usage-stats work).

```bash
npm run build           # only needed once so webDir exists
npx cap add android
npx cap sync android
npx cap open android    # Android Studio → Build → Generate Signed Bundle (.aab)
```

Keystore (keep this file + password safe forever — losing it means you cannot
update the app):

```bash
keytool -genkey -v -keystore android.keystore -alias dtimeline \
  -keyalg RSA -keysize 2048 -validity 10000
```

---

## Play Console checklist

- Google Play Developer account (one-time $25).
- App name: DTimeline · Developer name: **MA Ameen**.
- Privacy Policy URL (`/privacy`) — required because the app handles account data.
- Data safety form: account info, device info, app-usage data; encrypted in
  transit; user can request deletion (in-app Delete data page).
- Sensitive permission declaration if you later ship native usage tracking:
  `PACKAGE_USAGE_STATS` requires a "Permissions" declaration + demo video.
- Store assets: 512×512 icon, 1024×500 feature graphic, ≥2 phone screenshots.
- Content rating questionnaire, target audience, ads = No.
- Release to Internal testing first, then Production.

## Keeping ownership

- Publish under your own Play developer account (MA Ameen).
- Keep `android.keystore` + password in a password manager and an offline backup.
- Enable 2FA on the Google account that owns the Play listing.
- `© MA Ameen` appears in app metadata, manifest and structured data.
