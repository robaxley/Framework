import Anthropic from "@anthropic-ai/sdk";
import { RECORD_PROJECT_TOOL } from "./tools.js";
import { buildSystemPrompt } from "./systemPrompt.js";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export class ExtractionError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // empty_input | refused | truncated | rate_limited | auth | no_tool_call | api_error
  }
}

export async function extractProject({ sourceUrl, title, rawText }) {
  if (!rawText || !rawText.trim()) {
    throw new ExtractionError("Paste some caption or transcript text first.", "empty_input");
  }

  const userMessage = [
    `Source URL: ${sourceUrl || "none provided"}`,
    `Prefilled title (may be inaccurate, verify against the text below): ${title || "none"}`,
    "",
    "Pasted caption/description/transcript:",
    '"""',
    rawText.trim(),
    '"""',
  ].join("\n");

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: buildSystemPrompt(),
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      tools: [RECORD_PROJECT_TOOL],
      tool_choice: { type: "tool", name: "record_diy_project" },
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtractionError("Rate limited by the Anthropic API - wait a moment and try again.", "rate_limited");
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ExtractionError("Invalid ANTHROPIC_API_KEY - check your .env file.", "auth");
    }
    if (err instanceof Anthropic.APIError) {
      throw new ExtractionError(`Anthropic API error: ${err.message}`, "api_error");
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new ExtractionError("Claude declined to process this text.", "refused");
  }
  if (response.stop_reason === "max_tokens") {
    throw new ExtractionError("The pasted text was too long to fully extract - try trimming it.", "truncated");
  }

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === "record_diy_project"
  );
  if (!toolUse) {
    throw new ExtractionError("Claude did not return a structured project - try again or add more detail.", "no_tool_call");
  }

  // strict: true guarantees toolUse.input already matches RECORD_PROJECT_TOOL's schema
  return toolUse.input;
}
