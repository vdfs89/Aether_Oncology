import { NextRequest } from "next/server"

// Next.js Edge runtime is recommended for streaming routes
export const runtime = "edge"

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  // Extract patient context/auth if needed (mocked)
  const patientId = req.headers.get("X-Patient-Id") || "unknown-patient"

  // Create a ReadableStream that we will push chunks into
  const stream = new ReadableStream({
    async start(controller) {
      const sessionId = "sess_mock_123"
      const traceId = "tr_clinical_99x"
      const retrievalId = "ret_rag_404"

      function enqueueEvent(eventPayload: object) {
        const payload = {
          sessionId,
          patientId,
          traceId,
          retrievalId,
          ...eventPayload
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      try {
        // 1. Emit status: thinking
        enqueueEvent({ type: "status", status: "thinking" })
        await delay(800)

        // 2. Emit a trace event
        enqueueEvent({ type: "trace" })

        // 3. Emit status: retrieving (Simulate RAG)
        enqueueEvent({ type: "status", status: "retrieving" })
        await delay(1200)

        // 4. Emit citations
        enqueueEvent({
          type: "citation",
          citation: {
            id: "pmid-3891002",
            source: "PubMed",
            title: "Advanced Oncological Decision Trees with Bayesian Logic",
            relevance: 0.95
          }
        })
        await delay(300)

        // 5. Emit a prediction attachment
        enqueueEvent({
          type: "attachment",
          attachment: {
            type: "prediction",
            data: {
              confidence: 0.94,
              riskLevel: "High",
              modelMetadata: { version: "v2.4", latencyMs: 450 }
            }
          }
        })
        await delay(400)

        // 6. Streaming the tokens
        enqueueEvent({ type: "status", status: "streaming" })
        const textToStream = "Com base nas diretrizes do NCCN e dados mais recentes..."
        const chunks = textToStream.split(" ")

        for (const chunk of chunks) {
          enqueueEvent({ type: "token", chunk: chunk + " " })
          await delay(100) // Simulated token latency
        }

        // 7. Complete
        enqueueEvent({ type: "status", status: "complete" })
        enqueueEvent({ type: "complete" })

        controller.close()
      } catch (error) {
        console.error("Streaming error in API:", error)
        enqueueEvent({
          type: "error",
          error: {
            code: "INTERNAL_STREAM_ERROR",
            message: "A fatal error occurred during inference.",
            severity: "critical"
          }
        })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
