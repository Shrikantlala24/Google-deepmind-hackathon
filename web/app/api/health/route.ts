import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const services = {
    clerk: Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY),
    githubApp: Boolean(env.GITHUB_APP_ID && env.GITHUB_WEBHOOK_SECRET),
    redis: Boolean(env.REDIS_URL),
    gemini: Boolean(env.GOOGLE_CLOUD_PROJECT_ID),
  };

  return NextResponse.json({
    status: "ok",
    services,
  });
}
