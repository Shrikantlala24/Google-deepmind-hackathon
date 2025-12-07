import crypto from "node:crypto";

const SUPPORTED_ACTIONS = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
]);

export function verifyGitHubSignature({
  payload,
  signature,
  secret,
}: {
  payload: string;
  signature: string | null;
  secret?: string;
}) {
  if (!secret || !signature) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch (error) {
    console.error("[github] Failed to compare webhook signatures", error);
    return false;
  }
}

export function isSupportedAction(action: string) {
  return SUPPORTED_ACTIONS.has(action);
}
