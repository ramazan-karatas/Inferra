import { config } from "../config.js";
import type { ExecutionResult, SeededAgentDefinition } from "../types.js";

const seededAgents: Record<string, SeededAgentDefinition> = {
  "research-agent": {
    fallbackName: "Research Agent",
    fallbackDescription: "Turns a prompt into a concise research brief.",
    fallbackCategory: "Research",
    fallbackPromptHint: "Analyze the current market for AI-native commerce protocols.",
    systemPrompt:
      "You are a crisp research assistant. Return a short, structured research brief with findings, risks, and next steps."
  },
  "marketing-copy-agent": {
    fallbackName: "Marketing Copy Agent",
    fallbackDescription: "Produces launch-ready marketing copy.",
    fallbackCategory: "Marketing",
    fallbackPromptHint: "Write launch copy for an ownable AI agent marketplace.",
    systemPrompt:
      "You are a marketing copy assistant. Write concise, persuasive copy with a clear headline, body, and CTA."
  },
  "summarizer-agent": {
    fallbackName: "Summarizer Agent",
    fallbackDescription: "Summarizes long input into key points.",
    fallbackCategory: "Productivity",
    fallbackPromptHint: "Summarize the key value proposition of on-chain agent commerce.",
    systemPrompt:
      "You are a summarization assistant. Produce a tight summary, key takeaways, and one-sentence conclusion."
  }
};

export function getSeededAgentDefinition(agentKey: string): SeededAgentDefinition {
  return (
    seededAgents[agentKey] ?? {
      fallbackName: "Custom Agent",
      fallbackDescription: "General-purpose prompt-based agent.",
      fallbackCategory: "General",
      fallbackPromptHint: "Enter a prompt to execute this agent once.",
      systemPrompt:
        "You are a helpful, concise AI agent. Respond clearly and directly to the user's prompt."
    }
  );
}

function buildUserPrompt(agentKey: string, prompt: string): string {
  const trimmedPrompt = prompt.trim();

  if (agentKey === "research-agent") {
    return [
      "Produce a short research brief using this structure:",
      "1. Summary",
      "2. Key findings",
      "3. Risks or unknowns",
      "4. Recommended next steps",
      "",
      `User request: ${trimmedPrompt}`
    ].join("\n");
  }

  if (agentKey === "marketing-copy-agent") {
    return [
      "Write concise marketing copy using this structure:",
      "1. Headline",
      "2. Supporting copy",
      "3. Call to action",
      "",
      `Product or campaign brief: ${trimmedPrompt}`
    ].join("\n");
  }

  if (agentKey === "summarizer-agent") {
    return [
      "Summarize the input using this structure:",
      "1. Short summary",
      "2. Key takeaways",
      "3. One-line conclusion",
      "",
      `Text to summarize: ${trimmedPrompt}`
    ].join("\n");
  }

  return trimmedPrompt;
}

function buildFallbackOutput(agentKey: string, prompt: string): string {
  if (agentKey === "research-agent") {
    return [
      "[Demo fallback for research-agent]",
      "",
      "Summary: This request was processed in fallback mode without a live AI provider.",
      "Key findings: The system successfully mapped the prompt to the research archetype.",
      "Risks or unknowns: Live model output is unavailable until OPENAI_API_KEY is configured.",
      "Recommended next steps: Add the API key and rerun the same execution flow.",
      "",
      `User request: ${prompt.trim()}`
    ].join("\n");
  }

  if (agentKey === "marketing-copy-agent") {
    return [
      "[Demo fallback for marketing-copy-agent]",
      "",
      "Headline: Launch faster with on-chain agent ownership.",
      "Supporting copy: This fallback response proves the marketplace can route execution to the marketing archetype even without a live provider.",
      "Call to action: Configure OPENAI_API_KEY to unlock live generated copy.",
      "",
      `Campaign brief: ${prompt.trim()}`
    ].join("\n");
  }

  if (agentKey === "summarizer-agent") {
    return [
      "[Demo fallback for summarizer-agent]",
      "",
      "Short summary: The backend executed the summarizer archetype in deterministic demo mode.",
      "Key takeaways: Routing works, signature verification works, and the contract-backed entitlement flow remains intact.",
      "One-line conclusion: Live summarization only requires a configured model provider.",
      "",
      `Input: ${prompt.trim()}`
    ].join("\n");
  }

  return [
    `[Demo fallback for ${agentKey}]`,
    "",
    "No OPENAI_API_KEY is configured, so the backend returned a deterministic fallback response.",
    "",
    `Prompt: ${prompt.trim()}`
  ].join("\n");
}

export async function executeAgent(params: {
  agentKey: string;
  prompt: string;
}): Promise<ExecutionResult> {
  const definition = getSeededAgentDefinition(params.agentKey);
  const userPrompt = buildUserPrompt(params.agentKey, params.prompt);

  if (!config.openAiApiKey) {
    return {
      output: buildFallbackOutput(params.agentKey, params.prompt),
      model: "demo-fallback"
    };
  }

  const response = await fetch(`${config.openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openAiApiKey}`
    },
    body: JSON.stringify({
      model: config.openAiModel,
      messages: [
        { role: "system", content: definition.systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI provider request failed: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const output = data.choices?.[0]?.message?.content?.trim();

  if (!output) {
    throw new Error("AI provider returned an empty response.");
  }

  return {
    output,
    model: config.openAiModel
  };
}
