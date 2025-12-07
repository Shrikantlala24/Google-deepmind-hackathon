import { VertexAI } from "@google-cloud/vertexai";
import { env, requireServerEnv } from "@/lib/env";

let vertexClient: VertexAI | null = null;

function getVertexClient() {
  if (vertexClient) {
    return vertexClient;
  }

  if (!env.GOOGLE_CLOUD_PROJECT_ID) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID is not configured.");
  }

  let credentials: Record<string, unknown> | undefined;

  if (env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      credentials = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } catch (error) {
      throw new Error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON");
    }
  }

  vertexClient = new VertexAI({
    project: env.GOOGLE_CLOUD_PROJECT_ID,
    location: env.GEMINI_LOCATION || "us-central1",
    googleAuthOptions: credentials ? { credentials } : undefined,
  });

  return vertexClient;
}

export async function summarizeDiffChunk(params: {
  diff: string;
  filePath: string;
  context?: string;
}) {
  requireServerEnv(["GEMINI_MODEL"]);
  const client = getVertexClient();
  const model = client.getGenerativeModel({ model: env.GEMINI_MODEL || "gemini-1.5-pro" });

  const prompt = `You are an AI code reviewer. Analyze the following git diff and highlight actionable issues.

FILE: ${params.filePath}
DIFF:
${params.diff}

Respond with concise markdown bullet points describing each issue and a suggested fix.`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  return text || "No actionable feedback returned.";
}
