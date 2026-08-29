# InuaBiz Companion

Sideload APK for the phone that holds the shop M-Pesa SIM. It forwards inbound received SMS — personal, Pochi, till, or paybill. It is **not** published on Play Store (SMS permissions). Desktop POS stays the till.

## Pairing

1. Owner opens **Settings** on https://inuabiz.co.ke/app/settings and taps **Pair phone**.
2. Copy the `ibc_…` token (shown once).
3. Install this APK, paste the token, allow SMS.
4. Keep the quiet notification running.

## Build

Needs Android SDK 35 and JDK 17.

```bash
cd android-companion
echo "sdk.dir=$HOME/Android/Sdk" > local.properties
./gradlew assembleRelease
```

Copy `app/build/outputs/apk/release/app-release.apk` to `public/downloads/inuabiz-companion.apk` so Settings can serve it.

Deep link: `inuabiz://companion` (Settings → Open Companion). Shop till link from the app: https://inuabiz.co.ke/app

The ingest URL and publishable anon key are baked into the APK (same as the website). The device token is not.
