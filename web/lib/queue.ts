import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import type { PullRequestJobPayload } from "@/lib/types/jobs";

const queueName = `${env.QUEUE_PREFIX || "ai-code-reviewer"}:pull-request`;

let queue: Queue<PullRequestJobPayload> | undefined;

if (env.REDIS_URL) {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  queue = new Queue<PullRequestJobPayload>(queueName, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    },
  });
} else if (env.NODE_ENV === "development") {
  console.warn("[queue] REDIS_URL is not set. Jobs will be skipped locally until it is provided.");
}

export async function enqueuePullRequestJob(payload: PullRequestJobPayload) {
  if (!queue) {
    throw new Error("Queue connection unavailable. Provide REDIS_URL to enable job dispatching.");
  }

  return queue.add("analyze-pr", payload, {
    jobId: payload.deliveryId,
  });
}
