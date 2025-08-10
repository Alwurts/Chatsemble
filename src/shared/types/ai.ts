import type { InferUITools, UIMessage } from "ai";
import { z } from "zod";
import type { AgentToolSet } from "../../server/ai/tools";

const aiMetadataSchema = z.record(z.string(), z.unknown());

type AiMetadata = z.infer<typeof aiMetadataSchema>;

const aiDataPartSchema = z.record(z.string(), z.unknown());

type AiDataPart = z.infer<typeof aiDataPartSchema>;

type AiTools = InferUITools<AgentToolSet>;

export type AiUIMessage = UIMessage<AiMetadata, AiDataPart, AiTools>;
