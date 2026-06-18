# ChMS Mobile

Flutter mobile client for the Church Management System. It consumes the same NestJS API as the web app (`apps/api`).

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.10+
- Running ChMS API (default: `http://localhost:4000/api`)
- iOS Simulator, Android Emulator, or a physical device

## Quick start

```bash
# From repository root — start API + web if needed
pnpm dev

# Install Flutter dependencies
cd apps/mobile
flutter pub get

# Run (pick a device — see below)
flutter run -d macos --dart-define=API_BASE_URL=http://localhost:4000/api
```

### flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
### Choosing a device

| Target | Command |
|--------|---------|
| **macOS** (no emulator needed) | `flutter run -d macos --dart-define=API_BASE_URL=http://localhost:4000/api` |
| **Chrome** (web) | `flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4000/api` |
| **Android emulator** | Start emulator, then `flutter run -d android --dart-define=API_BASE_URL=http://10.0.2.2:4000/api` |
| **iOS simulator** | Open Simulator, then `flutter run -d ios --dart-define=API_BASE_URL=http://localhost:4000/api` |

List available devices: `flutter devices`

If you see *“No supported devices connected”*, either start an Android/iOS emulator or use `-d macos` / `-d chrome` (both are enabled in this project).

## API base URL

Configure the backend URL with a compile-time define:

```bash
# iOS simulator / macOS (localhost)
flutter run --dart-define=API_BASE_URL=http://localhost:4000/api

# Android emulator (host machine)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api

# Physical device on same Wi‑Fi (replace with your machine IP)
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:4000/api
```

Default when not set: `http://localhost:4000/api`

## Authentication

The app uses the existing auth endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/login` | Sign in |
| `POST` | `/auth/refresh` | Refresh access token (httpOnly cookie) |
| `POST` | `/auth/logout` | Sign out |
| `GET` | `/auth/me` | Current user |
| `GET` | `/auth/me/profile` | Profile details |
| `PATCH` | `/auth/me` | Update account |
| `PATCH` | `/auth/me/password` | Change password |

Access tokens are stored in secure storage. Refresh tokens are persisted via cookies (same as the web app).

## Project structure

```
lib/
  main.dart                 # Entry point
  app.dart                  # MaterialApp + routing
  core/
    config/app_config.dart  # API URL & constants
    api/api_client.dart     # Dio HTTP client + auth interceptors
    data/chms_repository.dart
    theme/app_theme.dart
    routing/app_router.dart
  features/
    auth/                   # Login & session restore
    home/                   # Dashboard overview + recent activity
    explore/                # Module discovery
    activity/               # Follow-ups, events, giving, audit trail
    profile/                # Account & password
    modules/                # CRUD screens for all ChMS modules
  widgets/                  # Shared UI (headers, lists, pickers)
  models/                   # API response models
```

## Features

| Module | List | Detail | Create | Edit / actions |
|--------|------|--------|--------|----------------|
| Members | ✓ | ✓ profile | ✓ | ✓ edit |
| Events | ✓ | ✓ | ✓ | ✓ edit, register, attended |
| Groups | ✓ | ✓ | ✓ | ✓ add/remove members, log meeting |
| Attendance | ✓ | ✓ | ✓ roll call | ✓ edit roll call |
| Finance | ✓ | summary | ✓ income & expense | — |
| Follow-ups | ✓ | ✓ | ✓ | ✓ mark complete |
| Branches | ✓ | ✓ | — | — |
| Sermons | ✓ | ✓ audio/video | ✓ | ✓ edit |
| Outreach | ✓ | ✓ gallery | ✓ | ✓ edit, photo upload |
| Testimonies | ✓ | ✓ | ✓ submit | ✓ approve/reject |

**Home dashboard:** tappable stat cards, quick actions, recent activity (members, events, giving).

**Activity tab:** open follow-ups, upcoming events, recent giving, system audit trail (admin permission required).

**Permissions:** create/edit FABs and actions are hidden when the signed-in user lacks the matching API permission (super admins bypass all checks).

**Offline:** dashboard overview and members list (page 1) are cached locally (6 h TTL). When the API is unreachable, Home shows the last saved snapshot with an offline banner.

**Branding:** church name, logo, tagline, service times, email, phone, and address from Settings → `GET /settings/public` (cached offline). Shown on splash, welcome, login, home header, explore, profile, and a church info card on Home/Profile.

**Charts:** Home and Activity tabs show animated finance bar chart, attendance line chart, and member status donut from `/reports/overview`. Finance module adds trend + giving-by-type + expense-by-category charts from `/finance/summary`.

**Profile:** edit name/phone, change password, sign out, app version footer.

**Notifications:** in-app inbox at `/notifications` with unread badge on Home. Auto-notifies reviewers on new testimonies and assignees on follow-ups. Device tokens register via `POST /notifications/device-tokens`.

**Push (FCM):** optional server-side delivery when `FCM_SERVICE_ACCOUNT_PATH` or `FCM_SERVICE_ACCOUNT_JSON` is set on the API. Mobile uses `PushService` — enable with `--dart-define=ENABLE_PUSH=true` after [FlutterFire setup](https://firebase.google.com/docs/flutter/setup).

**Not yet implemented:** complete Firebase client wiring in `lib/core/push/push_service.dart` (scaffold in place).

## Building for release

```bash
# Android APK / App Bundle
flutter build apk --release --dart-define=API_BASE_URL=https://api.yourchurch.com/api
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.yourchurch.com/api

# iOS (requires macOS + Xcode)
flutter build ios --release --dart-define=API_BASE_URL=https://api.yourchurch.com/api

# macOS desktop
flutter build macos --release --dart-define=API_BASE_URL=https://api.yourchurch.com/api
```

### Production checklist

1. Point `API_BASE_URL` at your production API (must serve HTTPS except local dev).
2. Ensure the API allows CORS/cookies from mobile clients and serves uploaded files at `/uploads/files/*`.
3. Sign the Android keystore / iOS provisioning profile before store submission.
4. Test outreach photo upload and offline Home dashboard on a physical device.

### Enabling push notifications (optional)

**API**

1. Create a Firebase project and download a service account JSON key.
2. Set `FCM_SERVICE_ACCOUNT_PATH=/path/to/service-account.json` in `.env` (or `FCM_SERVICE_ACCOUNT_JSON` as a single-line JSON string).
3. Restart the API — logs should show `FCM push delivery enabled`.

**Mobile**

1. Install FlutterFire CLI: `dart pub global activate flutterfire_cli`
2. From `apps/mobile`: `flutterfire configure`
3. Add `firebase_core` and `firebase_messaging` to `pubspec.yaml`, then implement `_initFirebase()` in `lib/core/push/push_service.dart`.
4. Run with: `flutter run --dart-define=ENABLE_PUSH=true --dart-define=API_BASE_URL=...`

## Notes

- **Android emulator**: use `10.0.2.2` instead of `localhost` to reach the host machine.
- **HTTP in dev**: cleartext traffic is allowed for local development on Android/iOS.
- Extend `lib/features/` with additional modules (members, attendance, finance, etc.) using `ApiClient`.
