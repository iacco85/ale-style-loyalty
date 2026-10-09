import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// In dev (browser) le chiamate all'API vengono girate al Worker locale, così non serve CORS.
const api = 'http://localhost:8787'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/login': api, '/me': api, '/offers': api, '/prizes': api, '/spin': api, '/device-token': api },
  },
})
