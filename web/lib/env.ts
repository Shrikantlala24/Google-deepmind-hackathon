import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    APP_BASE_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_PRIVATE_KEY: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional(),
    GEMINI_LOCATION: z.string().default("us-central1"),
    GEMINI_MODEL: z.string().default("gemini-1.5-pro"),
    DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),
    QUEUE_PREFIX: z.string().default("ai-code-reviewer"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  })
  .passthrough();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn("[env] Some environment variables failed validation:", parsed.error.flatten().fieldErrors);
}

export const env = (parsed.success ? parsed.data : process.env) as z.infer<typeof envSchema>;

export function requireServerEnv(keys: Array<keyof typeof env>) {
  const missing = keys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}
