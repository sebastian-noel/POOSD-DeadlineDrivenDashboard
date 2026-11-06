# Erm Actually — Android app (Flutter)

The mobile version of the Deadline Driven Dashboard. It talks to the same Express API as the web app and copies the web design: black-on-white, Nunito, 2px outlines, pill buttons, the cat mascot.

| Web page | Mobile screen | Backed by |
| --- | --- | --- |
| Home, About Us, FAQ, Privacy Policy & ToS, Contact | same, behind the hamburger menu | `POST /contact` |
| Log In / Sign Up / Forgot Password | same (verification and reset links open in the browser) | `/auth/*` |
| Dashboard | greeting, 4 stat cards, upcoming deadlines (with range tabs), focus timer, milestone progress, today's tasks | `/tasks`, `/milestones`, `/dashboard`, `/search` |
| Milestones | progress list with All / Active / Completed, Next due card, New milestone | API data |
| Tasks | My tasks (Today / Upcoming), Today's progress, Focus next, New task | API data |
| Focus timer | Focus / Short break / Long break, ring, session dots, session plan, recent sessions | `/focus-sessions` |
| Settings | Profile, Notifications, Focus preferences, Calendar preferences | saved on the phone |
| Calendar | "hasn't been built yet" placeholder | — |

Differences from the web app, on purpose:
- Milestones and Tasks use real API data (the web pages still run on sample data).
- One focus timer is shared by the dashboard card and the Focus timer page, so it keeps running when you switch pages, and it uses the lengths from Settings.
- Settings are saved on the phone (the API has no settings route yet; the web keeps them only until reload).

## Code

```
lib/
  main.dart          app start, restores the saved login, picks public vs signed-in
  api.dart           API client (mirrors src/lib/api.ts), JWT kept with shared_preferences
  model.dart         dates + view models (mirrors src/lib/dates.ts and dashboardModel.ts)
  state.dart         DashboardData (useDashboardData), settings, FocusTimerController
  ui.dart            design tokens and shared widgets (panel, pills, badges, task row, timer ring…)
  shell.dart         signed-in top nav, page header, notifications, New task / New milestone dialogs
  pages.dart         Dashboard, Milestones, Tasks, Focus timer, Settings, Calendar placeholder
  public_pages.dart  Home, About, FAQ, Privacy, Contact, Log In, Sign Up, Forgot Password
assets/              mascot, feature photos, icons (rendered from the web SVGs), Nunito font
android/             standard Flutter 3.47 Android project (package edu.ucf.ermactually)
```

## Run it

Needs Flutter 3.47+ and an Android phone (USB debugging on) or emulator.

```sh
cd mobile
flutter pub get
flutter run                                   # uses https://ermactually.kirugames.com
flutter run --dart-define=API_URL=http://10.0.2.2:4000   # local API from the Android emulator
```

## Build an APK to install

```sh
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk
```

Copy the APK to the phone and open it (allow "Install unknown apps" for your file manager or browser). It is signed with the debug key, which is fine for sideloading and the class demo but not for the Play Store.

GitHub Actions also builds it: every push that touches `mobile/` runs **Mobile APK** (`.github/workflows/mobile-apk.yml`); download `erm-actually-apk` from the run's Artifacts. Run it by hand from the Actions tab to point it at a different API URL.
