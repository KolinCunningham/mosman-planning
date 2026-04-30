import { REFERENCE_DOCS, DOC_CATEGORIES } from '../data/referenceDocs'
import { MASTERPLAN_PRINCIPLES } from '../data/categories'

export function buildValidationPrompt(suggestion) {
  const docList = REFERENCE_DOCS.map(d =>
    `- [${d.code}] ${d.title} (${DOC_CATEGORIES[d.category]?.label}) — ${d.relevance}`
  ).join('\n')

  return `You are a NSW planning expert validating a planning suggestion for Mosman LGA against all current reference documentation.

## SUGGESTION TO VALIDATE

**Title:** ${suggestion.title || '(untitled)'}
**Category:** ${suggestion.category}
**Priority:** ${suggestion.priority}

**Problem Being Solved:**
${suggestion.problem || '(not provided)'}

**Proposed Solution:**
${suggestion.solution || '(not provided)'}

**Gain:**
${suggestion.gain || '(not provided)'}

**Cost / Trade-off:**
${suggestion.cost || '(not provided)'}

**Space & Infrastructure Constraints:**
${suggestion.constraints || '(not provided)'}

**Regulatory Status (as assessed by user):**
${Object.entries(suggestion.regulatory || {}).map(([k,v]) => `- ${k}: ${v}`).join('\n') || '(not assessed)'}

**State Government Ask:**
${suggestion.stateAsk || '(none)'}

**10-Year Horizon:**
${suggestion.horizon10 || '(not provided)'}

**20-Year Horizon:**
${suggestion.horizon20 || '(not provided)'}

---

## REFERENCE LIBRARY (all 53 documents available to Mosman Council)

${docList}

---

## YOUR TASK

Cross-reference this suggestion against the full reference library above.

**Step 1:** Identify every document relevant to this suggestion (by code and title).

**Step 2:** For each relevant document, provide:
- STATUS: COMPLIANT / NON-COMPLIANT / PARTIAL / NOT APPLICABLE
- RELEVANT SECTION: which clause, chapter, or section applies
- FINDING: what the document says that is relevant
- WHAT NEEDS TO CHANGE: (if non-compliant or partial) exact change required
- CHANGE PATHWAY: DCP amendment / LEP amendment / Policy review / SEPP / VPA / DA condition / No change needed
- TIMEFRAME: realistic time estimate
- GIVE-TAKE: what is gained and lost by making this change

**Step 3:** Produce a validation summary in this exact format:

OVERALL FEASIBILITY: [Feasible Now / Feasible with Minor Changes / Feasible with Major Changes / Requires State Intervention / Not Feasible]

DOCUMENTS CHECKED: [number]
COMPLIANT: [number] — [list titles]
NON-COMPLIANT: [number] — [list titles]
PARTIAL: [number] — [list titles]

CRITICAL BLOCKERS:
[List anything that makes this impossible or very difficult without major change. If none, write "None identified."]

QUICK WINS:
[List anything already permitted that could happen immediately under current controls.]

RECOMMENDED PATHWAY:
1. [action — who does it, how long, cost/effort]
2. ...

TOTAL ESTIMATED TIME TO IMPLEMENT: [realistic estimate]

KEY GIVE-TAKE FOR REQUIRED CHANGES:
[For each change needed, state what the community gains and what it gives up]

Be specific. Reference actual document sections where possible. Do not be vague about compliance. If you are uncertain about a specific clause, say so and recommend which document section to check.`
}
