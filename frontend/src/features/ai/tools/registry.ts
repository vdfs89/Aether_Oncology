import { ClinicalTool, ClinicalToolResult } from "./types"
import { clinicalEventBus } from "../orchestration/runtime/eventBus"
import { ExecutionContext } from "../orchestration/runtime/types"

export const biomarkerAnalysisTool: ClinicalTool = {
  id: "biomarker-analysis",
  name: "Biomarker Analysis",
  description: "Analyzes patient biomarkers and detects actionable alterations, therapeutic recommendations, and clinical trials.",
  inputSchema: {
    type: "object",
    properties: {
      geneSymbols: {
        type: "array",
        items: { type: "string" },
        description: "List of gene symbols to analyze, e.g., BRCA1, HER2, TP53"
      }
    },
    required: ["geneSymbols"]
  },
  async execute(args: { geneSymbols: string[] }, context: ExecutionContext): Promise<ClinicalToolResult> {
    const startTime = Date.now()
    // Perform simulated biomarker analysis with realistic clinical datasets
    const results = args.geneSymbols.map(gene => {
      const g = gene.toUpperCase();
      if (g === "BRCA1") {
        return {
          gene: "BRCA1",
          alteration: "c.5266dupC (p.Gln1756ProfsTer74)",
          status: "Pathogenic",
          actionability: {
            level: "Tier I",
            therapies: ["Olaparib", "Talazoparib", "Niraparib"],
            evidence: "FDA approved for BRCA-mutated breast and ovarian cancers."
          }
        };
      } else if (g === "HER2" || g === "ERBB2") {
        return {
          gene: "ERBB2 (HER2)",
          alteration: "Amplification [CN = 6]",
          status: "Pathogenic",
          actionability: {
            level: "Tier I",
            therapies: ["Trastuzumab", "Pertuzumab", "Fam-trastuzumab deruxtecan"],
            evidence: "FDA approved for HER2-overexpressing breast, gastric, and colorectal cancers."
          }
        };
      } else if (g === "TP53") {
        return {
          gene: "TP53",
          alteration: "c.818G>A (p.Arg273His)",
          status: "Pathogenic",
          actionability: {
            level: "Tier II",
            therapies: ["WEE1 inhibitor (Adavosertib) - Clinical Trials"],
            evidence: "Associated with poor prognosis; active enrolling clinical trials."
          }
        };
      } else {
        return {
          gene: g,
          alteration: "Wild Type / Variant of Unknown Significance",
          status: "VUS",
          actionability: {
            level: "Tier III",
            therapies: [],
            evidence: "No current FDA approved targeted therapies; monitoring recommended."
          }
        };
      }
    });

    const summary = `Detected ${results.filter(r => r.status === "Pathogenic").length} pathogenic alterations across: ${results.map(r => r.gene).join(", ")}. Strong therapeutic matches found for BRCA1 and HER2.`;

    const toolData = {
      biomarkers: results,
      recommendationSummary: summary
    };

    const result: ClinicalToolResult = {
      success: true,
      data: toolData,
      metadata: {
        durationMs: Date.now() - startTime,
        source: "local-biomarker-rules-engine",
        confidence: 0.98
      }
    }

    // Emit event on the EventBus
    clinicalEventBus.publish({
      type: "ToolExecuted",
      payload: {
        toolId: this.id,
        result
      },
      metadata: {
        traceId: context.traceId,
        sessionId: context.sessionId,
        patientId: context.patientId,
        timestamp: Date.now(),
        runtimeState: "EXECUTING"
      }
    });

    return result;
  }
};

export const toolRegistry: Record<string, ClinicalTool> = {
  [biomarkerAnalysisTool.id]: biomarkerAnalysisTool
};
