# Erm Actually - Desktop Frontend

This directory contains the desktop frontend client for Erm Actually. It is built for speed, scalability, and type safety using **React**, **TypeScript**, and **Vite**.

## Quick Start

Ensure you have [Node.js](https://nodejs.org/) installed, then run the following commands from the root of the repository to run the frontend:

```bash
# Navigate to the frontend client directory
cd desktop_frontend/client

# Install dependencies (this generates your local node_modules)
npm install

# Start the local development server
npm run dev
```

## Project Structure

* **`public/`**: Static assets that includes `favicon.svg` mascot and the global `icons.svg` sprite sheet.
* **`src/assets/`**: Static images.
* **`src/components/`**: Reusable React UI components (Modals, Badges, Navigation).
* **`src/hooks/`**: Custom React hooks (e.g., `useFocusTimer`, `useDashboardData`) for state management and logic separation.
* **`src/lib/`**: Utility functions, data models, and API connection handlers.
* **`src/pages/`**: Components representing the main application views (Dashboard, Calendar, Tasks, Milestones, Focus, Settings, and Home).
* **`src/styles/`**: Global stylesheets and CSS variables.

## Dependency Management

Always run `npm install` inside the `desktop_frontend/client` directory. Running it in the root folder will spawn duplicate lockfiles and cause dependency issues.

## Planner integration checks

Tasks and Milestones share the signed-in user's API records with the dashboard. Task creation,
completion, milestone creation and progress persist in MongoDB. Both pages use `/api/v1/search`
for partial title searches of two or more characters. Undated, overdue and due-today tasks appear
in the current work list; future tasks appear in Upcoming. Calendar, the standalone timer and
Settings are separate integration work.

Run the real-browser regression suite from `desktop_frontend/client`:

```sh
npm ci
npm ci --prefix ../../api
npx playwright install chromium
npm run test:e2e
```

The suite builds the API, starts Express on loopback port 4301 and Vite on 5178, and starts a
fresh temporary MongoDB. It never loads the API `.env`, uses Atlas, or sends real emails.
The first run needs network access to download the test MongoDB binary and browser. Linux
machines may need `npx playwright install --with-deps chromium` for browser system libraries.
An existing Chrome executable can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Coverage includes persistence after navigation/reload, cross-account isolation, server search,
failed-save rollback, preserving failed creation drafts, Next due completion, and lists larger
than one API page. CI runs the same suite after lint and build. Playwright saves a trace on
failure in the ignored `test-results/` directory.
