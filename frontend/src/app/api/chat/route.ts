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
            id: "demo",
            source: "PubMed",
            title: "[exemplo ilustrativo de recuperação — não é um estudo real]",
            relevance: 0
          }
        })
        await delay(300)

        // 5. Emit a prediction attachment
        enqueueEvent({
          type: "attachment",
          attachment: {
            type: "prediction",
            data: {
              confidence: 0.5,
              riskLevel: "High",
              modelMetadata: { version: "3.1.0 (protótipo · ROC≈0.50)", latencyMs: 450 }
            }
          }
        })
        await delay(400)

        // 6. Streaming the tokens
        enqueueEvent({ type: "status", status: "streaming" })
        const textToStream = "[Protótipo acadêmico — informação geral, não conselho médico.] Exemplo ilustrativo de resposta. O modelo de risco subjacente é um protótipo treinado em dados sintéticos (ROC ≈ 0.50), sem validade clínica. Para qualquer caso individual, procure um profissional de saúde."
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
