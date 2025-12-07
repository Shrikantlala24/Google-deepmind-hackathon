import { z } from "zod";

export const pullRequestWebhookSchema = z.object({
  action: z
    .enum(["opened", "synchronize", "reopened", "ready_for_review", "closed"])
    .describe("Current pull request webhook action"),
  installation: z.object({
    id: z.number(),
  }),
  pull_request: z.object({
    number: z.number(),
    head: z.object({
      sha: z.string(),
    }),
  }),
  repository: z.object({
    name: z.string(),
    owner: z.object({
      login: z.string(),
    }),
  }),
});

export type PullRequestWebhook = z.infer<typeof pullRequestWebhookSchema>;
