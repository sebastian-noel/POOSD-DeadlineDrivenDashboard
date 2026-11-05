import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      // The app calls the API with relative /api URLs. In development Vite forwards them to the
      // local API so no CORS setup is needed. Override with API_PROXY_TARGET in .env.local.
      proxy: {
        '/api': { target: env.API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: true },
      },
    },
  }
})
