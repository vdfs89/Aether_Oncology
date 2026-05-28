/**
 * src/features/ai/services/mockInference.ts
 * 
 * Simulates a streaming response from an LLM.
 */
import { chunkTextRealistically } from "../streaming/chunk"
import { randomDelay, delay } from "../streaming/delay"
import { StreamingEmitter } from "../streaming/emitter"
import { Citation, AIAttachment } from "../types"
import { PredictionResult } from "../contracts"

// A dummy response. Later this can be tied to user input intent.
const DUMMY_RESPONSE = "Baseado na análise genômica recente, os biomarcadores do paciente sugerem uma mutação acionável no gene KRAS. A literatura clínica mais recente do PubMed indica que terapias-alvo específicas podem oferecer uma melhora significativa na sobrevida livre de progressão. Recomenda-se acompanhamento rigoroso e avaliação para inclusão em trials clínicos abertos."

export interface StreamEvent {
  type: "chunk" | "citations" | "attachments" | "done"
  content?: string
  citations?: Citation[]
  attachments?: AIAttachment[]
}

export async function simulateInferenceStream(
  prompt: string, 
  emitter: StreamingEmitter<StreamEvent>,
  signal?: AbortSignal
) {
  try {
    // 1. Simulate "thinking"
    await randomDelay(800, 1500)
    if (signal?.aborted) return

    // 2. Simulate "retrieving" (e.g. from RAG)
    await randomDelay(1000, 2000)
    if (signal?.aborted) return

    // Emit some dummy citations found during retrieval
    emitter.emit({
      type: "citations",
      citations: [
        {
          id: "pub-1",
          source: "PubMed",
          title: "Targeted Therapies in KRAS-Mutated Oncology",
          relevance: 0.95,
        }
      ]
    })

    // Emit predictive intelligence payload
    const dummyPrediction: PredictionResult = {
      id: "pred-mock-01",
      timestamp: Date.now(),
      modelVersion: "Aether Clinical v2.4",
      generatedBy: "Aether AI",
      risk: {
        level: "HIGH",
        score: 0.82,
        primaryFactors: ["KRAS G12C", "Age", "Previous Therapy Resistance"],
        recommendedAction: "Recommend oncological review within 14 days"
      },
      biomarkers: [
        { id: "b1", name: "CEA", value: 12.4, trend: "up", referenceRange: [0, 5], unit: "ng/mL" },
        { id: "b2", name: "CA 19-9", value: 45, trend: "up", referenceRange: [0, 37], unit: "U/mL" },
        { id: "b3", name: "Hemoglobin", value: 11.2, trend: "down", referenceRange: [12, 16], unit: "g/dL" }
      ],
      explainability: {
        confidenceScore: 0.87,
        features: [
          { name: "KRAS Status", impact: 0.65 },
          { name: "Prior Relapse", impact: 0.42 },
          { name: "CEA Level", impact: 0.28 },
          { name: "Patient Age", impact: -0.15 },
          { name: "ECOG Score", impact: -0.08 }
        ]
      }
    }

    emitter.emit({
      type: "attachments",
      attachments: [{ type: "prediction", data: dummyPrediction }]
    })

    // 3. Simulate "streaming"
    const chunks = chunkTextRealistically(DUMMY_RESPONSE)
    
    for (const chunk of chunks) {
      if (signal?.aborted) return
      
      // Simulate typing speed (faster for tokens, slower for punctuation)
      const baseDelay = chunk.length > 5 ? 40 : 20
      await delay(baseDelay + Math.random() * 30)
      
      emitter.emit({ type: "chunk", content: chunk })
    }

    // 4. Done
    if (!signal?.aborted) {
      emitter.emit({ type: "done" })
    }
  } catch (error) {
    console.error("Inference failed", error)
  }
}
