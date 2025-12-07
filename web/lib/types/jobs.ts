export type PullRequestJobPayload = {
  installationId: number;
  repository: {
    owner: string;
    name: string;
  };
  pullRequestNumber: number;
  action: "opened" | "synchronize" | "reopened" | "ready_for_review";
  deliveryId: string;
  headSha?: string;
};
