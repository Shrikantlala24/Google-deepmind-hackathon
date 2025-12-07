import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { env, requireServerEnv } from "@/lib/env";
import { verifyGitHubSignature, isSupportedAction } from "@/lib/github/webhook";
import { pullRequestWebhookSchema } from "@/lib/schemas/github";
import { enqueuePullRequestJob } from "@/lib/queue";

export async function POST(request: Request) {
  requireServerEnv(["GITHUB_WEBHOOK_SECRET"]);

  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery") ?? randomUUID();
  const event = request.headers.get("x-github-event");
  const payload = await request.text();

  if (!verifyGitHubSignature({
    payload,
    signature,
    secret: env.GITHUB_WEBHOOK_SECRET,
  })) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(payload);
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Malformed JSON" }, { status: 400 });
  }

  const parsed = pullRequestWebhookSchema.safeParse(parsedBody);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.format() }, { status: 400 });
  }

  if (!isSupportedAction(parsed.data.action)) {
    return NextResponse.json({ ok: true, ignored: true, reason: "Unsupported action" });
  }

  try {
    await enqueuePullRequestJob({
      installationId: parsed.data.installation.id,
      repository: {
        owner: parsed.data.repository.owner.login,
        name: parsed.data.repository.name,
      },
      pullRequestNumber: parsed.data.pull_request.number,
      action: parsed.data.action,
      deliveryId,
      headSha: parsed.data.pull_request.head.sha,
    });
  } catch (error) {
    console.error("[webhook] Unable to enqueue pull request job", error);
    return NextResponse.json({ ok: false, error: "Queue unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
