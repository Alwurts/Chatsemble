import { z } from "zod";

export const toneOptions = [
	"formal",
	"casual",
	"friendly",
	"professional",
] as const;
export type Tone = (typeof toneOptions)[number];
export const toneDescriptions: Record<Tone, string> = {
	formal: "Structured language with proper grammar",
	casual: "Relaxed, conversational language, possibly with colloquialisms",
	friendly: "Warm, approachable, and encouraging",
	professional: "Business-like, efficient demeanor",
};

export const verbosityOptions = ["concise", "detailed", "adaptive"] as const;
export type Verbosity = (typeof verbosityOptions)[number];
export const verbosityDescriptions: Record<Verbosity, string> = {
	concise: "Brief, to-the-point answers focusing on key information",
	detailed: "Thorough explanations with background and context",
	adaptive: "Adjusts to complexity",
};

export const emojiUsageOptions = ["none", "occasional", "frequent"] as const;
export type EmojiUsage = (typeof emojiUsageOptions)[number];
export const emojiUsageDescriptions: Record<EmojiUsage, string> = {
	none: "No emojis in responses",
	occasional: "Sparingly used to enhance meaning or emotion",
	frequent: "Regular emoji use to add personality and visual interest",
};

export const languageStyleOptions = [
	"simple",
	"technical",
	"industry-specific",
] as const;
export type LanguageStyle = (typeof languageStyleOptions)[number];
export const languageStyleDescriptions: Record<LanguageStyle, string> = {
	simple: "Clear, straightforward language anyone can understand",
	technical: "Include technical terms and concepts for an expert audience",
	// biome-ignore lint/complexity/useLiteralKeys: Cannot be simplified
	["industry-specific"]: "Domain-specific terminology",
};

export interface Agent {
	id: string;
	email: string;
	// Identity
	name: string;
	image: string;
	description: string;
	// Personality
	tone: Tone;
	verbosity: Verbosity;
	emojiUsage: EmojiUsage;
	languageStyle: LanguageStyle;
	// Metadata
	createdAt: number;
}

export const createAgentSchema = z.object({
	// Identity
	name: z.string().min(1, "Name is required"),
	image: z.string(),
	description: z.string().min(1, "Description is required"),

	// Personality
	tone: z.enum(toneOptions),
	verbosity: z.enum(verbosityOptions),
	emojiUsage: z.enum(emojiUsageOptions),
	languageStyle: z.enum(languageStyleOptions),
});

export type AgentFormValues = z.infer<typeof createAgentSchema>;

/**
 * Represents an annotation associated with a specific tool use,
 * providing metadata like activity updates, statuses, or errors.
 */
export interface AgentToolAnnotation {
	id: string;
	type: string;
	status: "processing" | "complete" | "failed";
	message: string;
	timestamp: number;
	toolCallId: string;
	// biome-ignore lint/suspicious/noExplicitAny: Needs to be flexible for various tools
	data?: any;
}

interface AgentToolPartial {
	toolCallId: string;
	toolName: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	args: Record<string, any>;
	annotations: AgentToolAnnotation[];
}

export interface AgentToolCall extends AgentToolPartial {
	type: "tool-call";
}

export interface AgentToolResult extends AgentToolPartial {
	type: "tool-result";
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	result: any;
}

export type AgentToolUse = AgentToolCall | AgentToolResult;

export interface ToolSource {
	type: "url";
	url: string;
	title: string;
	content: string;
	icon?: string;
}
