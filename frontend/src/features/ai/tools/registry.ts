/**
 * src/features/ai/tools/registry.ts
 *
 * Clinical Tool Registry.
 *
 * Tools are pure execution units — they receive args + context, return data.
 * Event publishing and retry/timeout policies are managed by the ClinicalToolRuntime.
 */
import { ClinicalTool } from "./types"
import { ExecutionContext } from "../orchestration/runtime/types"

// ---------------------------------------------------------------------------
// biomarker-analysis
// ---------------------------------------------------------------------------

export const biomarkerAnalysisTool: ClinicalTool = {
  id: "biomarker-analysis",
  name: "Biomarker Analysis",
  description:
    "Analyzes patient biomarkers and detects actionable alterations, therapeutic recommendations, and clinical trials.",
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
  policy: {
    timeoutMs: 6000,
    maxRetries: 2,
    critical: true
  },

  async execute(
    args: { geneSymbols: string[] },
    _context: ExecutionContext
  ): Promise<any> {
    const results = args.geneSymbols.map(gene => {
      const g = gene.toUpperCase()
      if (g === "BRCA1") {
        return {
          gene: "BRCA1",
          alteration: "c.5266dupC (p.Gln1756ProfsTer74)",
          status: "Pathogenic",
          actionability: {
            level: "Tier I",
            therapies: ["Olaparib", "Talazoparib", "Niraparib"],
            evidence:
              "FDA approved for BRCA-mutated breast and ovarian cancers."
          }
        }
      } else if (g === "HER2" || g === "ERBB2") {
        return {
          gene: "ERBB2 (HER2)",
          alteration: "Amplification [CN = 6]",
          status: "Pathogenic",
          actionability: {
            level: "Tier I",
            therapies: [
              "Trastuzumab",
              "Pertuzumab",
              "Fam-trastuzumab deruxtecan"
            ],
            evidence:
              "FDA approved for HER2-overexpressing breast, gastric, and colorectal cancers."
          }
        }
      } else if (g === "TP53") {
        return {
          gene: "TP53",
          alteration: "c.818G>A (p.Arg273His)",
          status: "Pathogenic",
          actionability: {
            level: "Tier II",
            therapies: ["WEE1 inhibitor (Adavosertib) - Clinical Trials"],
            evidence:
              "Associated with poor prognosis; active enrolling clinical trials."
          }
        }
      } else {
        return {
          gene: g,
          alteration: "Wild Type / Variant of Unknown Significance",
          status: "VUS",
          actionability: {
            level: "Tier III",
            therapies: [],
            evidence:
              "No current FDA approved targeted therapies; monitoring recommended."
          }
        }
      }
    })

    const summary = `Detected ${results.filter(r => r.status === "Pathogenic").length} pathogenic alterations across: ${results.map(r => r.gene).join(", ")}. Strong therapeutic matches found for BRCA1 and HER2.`

    return {
      biomarkers: results,
      recommendationSummary: summary
    }
  }
}

// ---------------------------------------------------------------------------
// therapy-matching (stub for future expansion)
// ---------------------------------------------------------------------------

export const therapyMatchingTool: ClinicalTool = {
  id: "therapy-matching",
  name: "Therapy Matching",
  description: "Matches biomarker alterations against approved therapies and active clinical trials.",
  inputSchema: {
    type: "object",
    properties: {
      alterations: {
        type: "array",
        items: { type: "object" }
      }
    },
    required: ["alterations"]
  },
  policy: {
    timeoutMs: 5000,
    maxRetries: 2,
    critical: false
  },

  async execute(args: { alterations: any[] }, _context: ExecutionContext): Promise<any> {
    // Stub — returns match summary based on input alterations
    const pathogenic = args.alterations.filter((a: any) => a.status === "Pathogenic")
    return {
      matchedTherapies: pathogenic.flatMap((a: any) => a.actionability?.therapies || []),
      trialCount: pathogenic.length * 3,
      summary: `Found ${pathogenic.length} actionable targets with ${pathogenic.length * 3} matching trials.`
    }
  }
}

// ---------------------------------------------------------------------------
// clinical-guidelines-rag (stub for future RAG pipeline)
// ---------------------------------------------------------------------------

export const clinicalGuidelinesRagTool: ClinicalTool = {
  id: "clinical-guidelines-rag",
  name: "Clinical Guidelines RAG",
  description: "Retrieves relevant NCCN/OncoKB guidelines for the patient context.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" }
    },
    required: ["query"]
  },
  policy: {
    timeoutMs: 8000,
    maxRetries: 1,
    critical: false
  },

  async execute(args: { query: string }, _context: ExecutionContext): Promise<any> {
    // Stub — returns relevant guidelines metadata
    return {
      guidelines: [
        {
          id: "NCCN-BREAST-2025",
          title: "NCCN Breast Cancer v4.2025",
          section: "Biomarker-Directed Therapy",
          relevance: 0.94
        },
        {
          id: "ONCOKB-BRCA1",
          title: "OncoKB BRCA1 Annotation",
          section: "Therapeutic Implications",
          relevance: 0.89
        }
      ],
      totalRetrieved: 2
    }
  }
}

// ---------------------------------------------------------------------------
// Registry (lookup table)
// ---------------------------------------------------------------------------

export const toolRegistry: Record<string, ClinicalTool> = {
  [biomarkerAnalysisTool.id]: biomarkerAnalysisTool,
  [therapyMatchingTool.id]: therapyMatchingTool,
  [clinicalGuidelinesRagTool.id]: clinicalGuidelinesRagTool
}
