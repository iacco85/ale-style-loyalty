import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// In dev le chiamate /admin/* vengono girate al Worker locale (wrangler dev), così non serve CORS.
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: { '/admin': 'http://localhost:8787' },
  },
})
