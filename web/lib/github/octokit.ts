import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { env, requireServerEnv } from "@/lib/env";

function getAppAuth() {
  requireServerEnv([
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
  ]);

  return createAppAuth({
    appId: env.GITHUB_APP_ID!,
    privateKey: env.GITHUB_PRIVATE_KEY!,
    clientId: env.GITHUB_CLIENT_ID!,
    clientSecret: env.GITHUB_CLIENT_SECRET!,
  });
}

export async function getInstallationOctokit(installationId: number) {
  const auth = getAppAuth();
  const authToken = await auth({ type: "installation", installationId });

  return new Octokit({
    auth: authToken.token,
    userAgent: "ai-code-reviewer",
  });
}

export async function getAppOctokit() {
  const auth = getAppAuth();
  const { token } = await auth({ type: "app" });
  return new Octokit({ auth: token, userAgent: "ai-code-reviewer" });
}
