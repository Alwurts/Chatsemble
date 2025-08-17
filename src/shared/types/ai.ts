import type { InferUITools, ToolUIPart, UIMessage } from "ai";
import { z } from "zod";
import type { AgentToolSet } from "../../server/ai/tools";

/**
 * Defines the structure for an agent's tool configuration.
 * - `true`: All tools are enabled.
 * - `false`: No tools are enabled.
 * - `string[]`: An array of tool keys to enable a specific subset.
 */
export type ToolSelection = string[] | boolean;

/////////////////////
/// Message Parts ///
/////////////////////

const aiMetadataSchema = z.record(z.string(), z.unknown());

type AIMetadata = z.infer<typeof aiMetadataSchema>;

const aiDataPartSchema = z.record(z.string(), z.unknown());

type AIDataPart = z.infer<typeof aiDataPartSchema>;

type AITools = InferUITools<AgentToolSet>;

export type AIToolUIPart = ToolUIPart<AITools>;

export type AIUIMessage = UIMessage<AIMetadata, AIDataPart, AITools>;
