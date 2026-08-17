import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          AUTH_SECRET: "test-secret",
          ADMIN_PASSWORD: "test-admin-password",
          FCM_PROJECT_ID: "test-project",
          FCM_CLIENT_EMAIL: "test@test.iam.gserviceaccount.com",
          FCM_PRIVATE_KEY: "test-key",
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
  },
});
