import { z } from "zod"

export const InferenceStatusSchema = z.enum([
  "idle",
  "thinking",
  "retrieving",
  "generating_internally",
  "judging",
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

export const AIAttachmentSchema = z.union([
  z.object({
    type: z.literal("prediction"),
    data: z.any()
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

export const JudgementStartedEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("judgement_started")
})

export const JudgementCompletedEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("judgement_completed"),
  judgement: z.record(z.string(), z.any())
})

export const HallucinationDetectedEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("hallucination_detected"),
  details: z.string()
})

export const EscalationTriggeredEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("escalation_triggered"),
  level: z.string(),
  reason: z.string()
})

export const RoutingDecisionEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("routing_decision"),
  provider: z.string(),
  model: z.string(),
  rationale: z.string(),
  estimated_latency_ms: z.number(),
  estimated_cost: z.number(),
  fallback_chain: z.array(z.string()).optional()
})

export const InferenceEnvelopeEventSchema = BaseEventMetadataSchema.extend({
  type: z.literal("inference_envelope"),
  provider: z.string(),
  model: z.string(),
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  latency_ms: z.number(),
  cost_estimate: z.number(),
  raw_response_length: z.number()
})

export const AIStreamEventSchema = z.union([
  StatusEventSchema,
  TokenEventSchema,
  CitationEventSchema,
  AttachmentEventSchema,
  TraceEventSchema,
  CompleteEventSchema,
  ErrorEventSchema,
  JudgementStartedEventSchema,
  JudgementCompletedEventSchema,
  HallucinationDetectedEventSchema,
  EscalationTriggeredEventSchema,
  RoutingDecisionEventSchema,
  InferenceEnvelopeEventSchema
])

export type AIStreamEvent = z.infer<typeof AIStreamEventSchema>
export type ClinicalError = z.infer<typeof ClinicalErrorSchema>
