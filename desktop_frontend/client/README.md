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