# Healory app icons

Source files for App Store / Play Store and native builds.

| Path | Use |
|------|-----|
| `../images/icon.png` | Expo `app.json` icon (1024×1024) |
| `../images/splash-icon.png` | Splash screen |
| `../images/logo.png` | In-app `BrandLogo` |
| `../images/healory-circle.png` | `StartupScreen` |
| `ios/icon-*.png` | iOS native sizes (16–1024) |
| `android/ic_launcher-*.png` | Android density variants |

Regenerate Expo assets after replacing `icon.png`:

```bash
npx expo prebuild --clean
```
