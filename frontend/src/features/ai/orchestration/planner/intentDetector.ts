/**
 * src/features/ai/orchestration/planner/intentDetector.ts
 *
 * Layer 1 — Intent Detection
 *
 * Deterministic intent classification using:
 *   - Keyword matching (weighted)
 *   - Pattern heuristics
 *   - Gene symbol detection
 *   - Clinical action verb detection
 *
 * No LLM dependency. Fast, predictable, auditable.
 * Future: can be enhanced with lightweight classifier / embeddings.
 */
import { ClinicalIntent } from "./types"

// ---------------------------------------------------------------------------
// Intent patterns — weighted keyword groups
// ---------------------------------------------------------------------------

interface IntentPattern {
  intent: ClinicalIntent
  keywords: string[]
  weight: number                // base weight when any keyword matches
  boostPatterns?: RegExp[]      // regex patterns that boost confidence
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "biomarker_analysis",
    keywords: [
      "brca1", "brca2", "her2", "erbb2", "tp53", "kras", "egfr", "alk",
      "braf", "pik3ca", "msi", "tmb", "pdl1", "pd-l1", "ntrk", "ret",
      "ros1", "met", "fgfr", "biomarker", "biomarcador", "mutação",
      "mutation", "alteration", "alteração", "genômica", "genomic",
      "variant", "variante", "pathogenic", "patogênica", "vus",
      "amplification", "amplificação", "deleção", "deletion",
      "fusion", "fusão", "cnv", "copy number"
    ],
    weight: 0.85,
    boostPatterns: [
      /\b(analis|analyz|analys)\w*/i,
      /\b(detect|identif|screen)\w*/i,
      /\bp\.\w+\d+\w+/i,                // protein notation e.g. p.Arg273His
      /\bc\.\d+[A-Z>]+/i                 // cDNA notation e.g. c.818G>A
    ]
  },
  {
    intent: "therapy_matching",
    keywords: [
      "therapy", "terapia", "treatment", "tratamento", "drug", "droga",
      "medication", "medicação", "olaparib", "trastuzumab", "pertuzumab",
      "pembrolizumab", "nivolumab", "atezolizumab", "imatinib",
      "niraparib", "talazoparib", "adavosertib", "immunotherapy",
      "imunoterapia", "chemotherapy", "quimioterapia", "targeted therapy",
      "terapia alvo", "parp", "checkpoint", "inhibitor", "inibidor",
      "recommend", "recomendar", "prescribe", "prescrever", "match",
      "first-line", "segunda linha", "adjuvant", "neoadjuvant"
    ],
    weight: 0.80,
    boostPatterns: [
      /\b(recommend|suggest|match|indicat)\w*/i,
      /\b(first|second|third).?line/i,
      /\b(neo)?adjuvant/i
    ]
  },
  {
    intent: "trial_search",
    keywords: [
      "trial", "ensaio", "clinical trial", "ensaio clínico", "study",
      "estudo", "recruiting", "recrutando", "enrollment", "nct",
      "clinicaltrials", "phase", "fase", "eligibility", "elegibilidade",
      "randomized", "randomizado", "arm", "braço", "endpoint",
      "inclusion", "exclusion", "critério"
    ],
    weight: 0.80,
    boostPatterns: [
      /NCT\d{8}/i,
      /phase\s*[I1-4]+/i,
      /\b(recruit|enroll|eligib)\w*/i
    ]
  },
  {
    intent: "prognosis",
    keywords: [
      "prognosis", "prognóstico", "survival", "sobrevida", "outcome",
      "desfecho", "risk", "risco", "staging", "estadiamento", "grade",
      "grau", "recurrence", "recorrência", "progression", "progressão",
      "metastasis", "metástase", "overall survival", "pfs",
      "disease-free", "livre de doença", "hazard", "mortality",
      "mortalidade", "life expectancy"
    ],
    weight: 0.75,
    boostPatterns: [
      /\bstage\s*[I1-4]+[ABC]?/i,
      /\b(predict|estimat|prognos)\w*/i,
      /\b(surviv|mortalit)\w*/i
    ]
  },
  {
    intent: "evidence_review",
    keywords: [
      "evidence", "evidência", "literature", "literatura", "paper",
      "artigo", "pubmed", "guideline", "diretriz", "nccn", "asco",
      "esmo", "oncokb", "reference", "referência", "review",
      "revisão", "meta-analysis", "metanálise", "systematic",
      "cochrane", "journal", "doi", "citation", "citação"
    ],
    weight: 0.75,
    boostPatterns: [
      /\b(pubmed|nccn|asco|esmo|oncokb)\b/i,
      /\b(review|analys|search|find|busca)\w*\s+(literature|evidenc|artigo|paper)/i
    ]
  },
  {
    intent: "imaging_analysis",
    keywords: [
      "imaging", "imagem", "ct", "mri", "pet", "scan", "radiolog",
      "tomografia", "ressonância", "ultrasound", "ultrassom",
      "mammograph", "mamografia", "biopsy", "biópsia", "histolog",
      "pathology", "patologia", "ki67", "er", "pr", "fish",
      "ihc", "slide", "lâmina"
    ],
    weight: 0.70,
    boostPatterns: [
      /\b(CT|MRI|PET|FISH|IHC)\b/,
      /\b(imag|scan|radiolog)\w*/i
    ]
  },
  {
    intent: "risk_assessment",
    keywords: [
      "risk assessment", "avaliação de risco", "score", "escore",
      "oncotype", "mammaprint", "odx", "recurrence score",
      "decision", "decisão", "stratif", "estratific", "classify",
      "classificar", "high risk", "alto risco", "low risk", "baixo risco",
      "contraindication", "contraindicação", "adverse", "adverso",
      "toxicity", "toxicidade", "interaction", "interação"
    ],
    weight: 0.75,
    boostPatterns: [
      /\b(assess|evaluat|stratif|classif)\w*/i,
      /\b(contraindic|toxicit|adverse)\w*/i
    ]
  }
]

// Gene symbol detector (authoritative oncology gene list)
const GENE_SYMBOLS = new Set([
  "BRCA1", "BRCA2", "TP53", "HER2", "ERBB2", "KRAS", "EGFR", "ALK",
  "BRAF", "PIK3CA", "NTRK1", "NTRK2", "NTRK3", "RET", "ROS1", "MET",
  "FGFR1", "FGFR2", "FGFR3", "FGFR4", "APC", "PTEN", "RB1", "CDH1",
  "PALB2", "ATM", "CHEK2", "RAD51C", "RAD51D", "STK11", "MLH1", "MSH2",
  "MSH6", "PMS2", "EPCAM", "IDH1", "IDH2", "NF1", "NF2", "VHL",
  "WT1", "CDK4", "CDK6", "MDM2", "MYC", "CCND1", "AR", "ESR1"
])

// ---------------------------------------------------------------------------
// Intent Detection Engine
// ---------------------------------------------------------------------------

export interface IntentDetectionResult {
  intent: ClinicalIntent
  confidence: number
  detectedGenes: string[]
  matchedKeywords: string[]
  reasoning: string
}

export function detectIntent(prompt: string): IntentDetectionResult {
  const promptLower = prompt.toLowerCase()
  const promptTokens = prompt.split(/\s+/)

  // Phase 1: Detect gene symbols
  const detectedGenes = promptTokens
    .map(t => t.replace(/[^A-Za-z0-9-]/g, "").toUpperCase())
    .filter(t => GENE_SYMBOLS.has(t))

  // Phase 2: Score each intent
  const scores: Array<{
    intent: ClinicalIntent
    score: number
    matchedKeywords: string[]
  }> = []

  for (const pattern of INTENT_PATTERNS) {
    const matchedKeywords: string[] = []
    let score = 0

    // Keyword matching
    for (const kw of pattern.keywords) {
      if (promptLower.includes(kw)) {
        matchedKeywords.push(kw)
        score += pattern.weight / pattern.keywords.length * 3 // weighted contribution
      }
    }

    // Boost from regex patterns
    if (pattern.boostPatterns) {
      for (const rx of pattern.boostPatterns) {
        if (rx.test(prompt)) {
          score += 0.15
        }
      }
    }

    // Gene symbol boost for biomarker-related intents
    if (detectedGenes.length > 0 && pattern.intent === "biomarker_analysis") {
      score += 0.20 * Math.min(detectedGenes.length, 3)
    }

    // Cap at 1.0
    score = Math.min(score, 1.0)

    if (matchedKeywords.length > 0 || score > 0) {
      scores.push({ intent: pattern.intent, score, matchedKeywords })
    }
  }

  // Phase 3: Select top intent
  scores.sort((a, b) => b.score - a.score)
  const top = scores[0]

  if (!top || top.score < 0.15) {
    return {
      intent: "general_inquiry",
      confidence: 0.5,
      detectedGenes,
      matchedKeywords: [],
      reasoning: "No specific clinical intent detected; treating as general inquiry."
    }
  }

  // Build reasoning
  const reasoning = [
    `Detected intent: ${top.intent} (confidence: ${top.score.toFixed(2)})`,
    `Matched keywords: [${top.matchedKeywords.join(", ")}]`,
    detectedGenes.length > 0 ? `Gene symbols found: [${detectedGenes.join(", ")}]` : null,
    scores.length > 1
      ? `Alternative intents: ${scores.slice(1, 3).map(s => `${s.intent}(${s.score.toFixed(2)})`).join(", ")}`
      : null
  ].filter(Boolean).join(". ")

  return {
    intent: top.intent,
    confidence: Math.round(top.score * 100) / 100,
    detectedGenes,
    matchedKeywords: top.matchedKeywords,
    reasoning
  }
}
