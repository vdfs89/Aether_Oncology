import { z } from "zod"

export const InferenceStatusSchema = z.enum([
  "idle",
  "thinking",
  "retrieving",
  "streaming",
  "complete",
  "cancelled",
  "error"
])

export const CitationSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  url: z.string().optional(),
  relevance: z.number().min(0).max(1)
})

export const AIAttachmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("prediction"),
    data: z.any() // Can be refined to PredictionResult schema later
  }),
  z.object({
    type: z.literal("chart"),
    data: z.any()
  }),
  z.object({
    type: z.literal("evidence"),
    data: z.any()
  })
])

export const ClinicalErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  details: z.any().optional()
})

// Base Traceability for all events
const BaseEventMetadataSchema = z.object({
  sessionId: z.string(),
  patientId: z.string(),
  traceId: z.string(),
  retrievalId: z.string().optional()
})

// Protocol Events
export const StatusEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("status"),
  status: InferenceStatusSchema
})

export const TokenEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("token"),
  chunk: z.string()
})

export const CitationEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("citation"),
  citation: CitationSchema
})

export const AttachmentEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("attachment"),
  attachment: AIAttachmentSchema
})

export const TraceEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("trace")
})

export const CompleteEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("complete")
})

export const ErrorEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("error"),
  error: ClinicalErrorSchema
})

export const AIStreamEventSchema = z.discriminatedUnion("type", [
  StatusEventSchema,
  TokenEventSchema,
  CitationEventSchema,
  AttachmentEventSchema,
  TraceEventSchema,
  CompleteEventSchema,
  ErrorEventSchema
])

export type AIStreamEvent = z.infer<typeof AIStreamEventSchema>
export type ClinicalError = z.infer<typeof ClinicalErrorSchema>
