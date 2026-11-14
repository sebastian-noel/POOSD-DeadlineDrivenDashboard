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
| Settings | Profile, Notifications, Focus preferences, Calendar preferences | `GET/PATCH /me` |
| Calendar | month grid (week start from Settings), milestone chips by status, task dots, "+N" / done counts, tap a day to list it, Next deadlines | API data |

Web and mobile behavior:
- Milestones, Tasks and Calendar use real API data in both clients.
- The web calendar grid scrolls sideways on a phone; the app fits the month on screen with markers per day, and tapping a day lists its milestones and tasks under the grid.
- Both clients now share one focus timer between their dashboard card and Focus timer page, using saved account preferences. Active focus sessions use the same API across devices.
- Both clients load account preferences from login or `GET /me` and save profile/preferences together through `PATCH /me`. Reopening the app or logging in again loads the latest server values.

## Code

```
lib/
  main.dart          app start, restores the saved login, picks public vs signed-in
  api.dart           API client (mirrors src/lib/api.ts), JWT kept with shared_preferences
  model.dart         dates + view models (mirrors src/lib/dates.ts and dashboardModel.ts)
  state.dart         DashboardData (useDashboardData), settings, FocusTimerController
  ui.dart            design tokens and shared widgets (panel, pills, badges, task row, timer ring…)
  shell.dart         signed-in top nav, page header, notifications, New task / New milestone dialogs
  pages.dart         Dashboard, Milestones, Tasks, Focus timer, Settings
  calendar_page.dart Calendar (mirrors pages/calendar)
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

## Account Settings

Mobile loads profile and preferences from the authenticated account response and saves
them together through `PATCH /me`. Confirmed responses update the greeting, future
focus/break lengths, and calendar week start. Existing running or paused focus blocks
keep their original target duration. Saves disable editing; failures retain the draft
for retry, and rejected sessions return to Log In. Replies received after logout or an
account switch do not update the current account.

Older `settings:<userId>` phone-only values are ignored rather than uploaded, so they
cannot overwrite newer web preferences. The saved JWT still uses SharedPreferences.
Accounts without preference fields use the standard defaults. Deploy the API containing
PR #15 before distributing this mobile build so settings saves are supported.

Email is read-only because changing a verified login address needs a separate
verification flow. Email reminders, daily summaries, default calendar view selection,
and time-zone overrides are not implemented. Those controls are disabled with the same
explanations as the web form. Calendar remains Month view and uses the device time zone.

## Test

```sh
flutter analyze --no-fatal-infos
flutter test --reporter expanded
```

Widget tests exercise the real HTTP client with an in-memory response adapter, never
the hosted database or real email. They cover restoring server settings, ignoring old
phone-only values, account isolation, confirmed saves and reopening, failed-save retry,
pending saves, session expiry, logout races, and preserving active focus targets.
The Mobile APK workflow runs these tests before building the APK.

To capture full-page review images from the same tests, set a directory outside the repo:

```sh
MOBILE_EVIDENCE_DIR=/tmp/mobile-settings-evidence flutter test
```
