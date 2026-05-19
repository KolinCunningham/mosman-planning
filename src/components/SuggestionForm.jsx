import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, AlertTriangle, Save } from 'lucide-react'
import { useStorage } from '../hooks/useStorage'
import { CATEGORIES, PRIORITIES, MASTERPLAN_PRINCIPLES, REGULATORY_ITEMS, AUDIT_ITEMS } from '../data/categories'
import AIValidation from './AIValidation'

const PRINCIPLE_OPTIONS = ['Supports', 'Neutral', 'Conflicts']
const REG_OPTIONS = ['Yes', 'No', 'Conditional', 'N/A']

const empty = {
  id: '', title: '', category: CATEGORIES[0], priority: PRIORITIES[1],
  problem: '', solution: '',
  gain: '', cost: '', whoBears: '', mitigation: '',
  constraints: '',
  regulatory: Object.fromEntries(REGULATORY_ITEMS.map(r => [r, ''])),
  stateAsk: '',
  principles: Object.fromEntries(MASTERPLAN_PRINCIPLES.map(p => [p, 'Neutral'])),
  horizon10: '', horizon20: '',
  currentProblems: '', dependencies: '',
  auditChecks: Object.fromEntries(AUDIT_ITEMS.map(a => [a, false])),
  auditPassed: undefined,
  mapChangeRequired: false,
  validation: null,
  createdAt: '',
}

export default function SuggestionForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [suggestions, setSuggestions] = useStorage('suggestions', [])
  const existing = id ? suggestions.find(s => s.id === id) : null
  const [form, setForm] = useState(existing || { ...empty })
  const [section, setSection] = useState(0)
  const [saved, setSaved] = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }
  function setNested(key, subkey, val) {
    setForm(f => ({ ...f, [key]: { ...f[key], [subkey]: val } }))
  }

  const auditScore = Object.values(form.auditChecks).filter(Boolean).length
  const auditTotal = AUDIT_ITEMS.length
  const auditPassed = auditScore === auditTotal

  function handleSave() {
    const record = {
      ...form,
      id: form.id || Date.now().toString(),
      auditPassed: auditScore === auditTotal ? true : auditScore > 0 ? false : undefined,
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setSuggestions(s => {
      const idx = s.findIndex(x => x.id === record.id)
      if (idx >= 0) { const n = [...s]; n[idx] = record; return n }
      return [...s, record]
    })
    setSaved(true)
    setTimeout(() => navigate('/suggestions'), 800)
  }

  function handleValidationSave(validation) {
    setForm(f => ({ ...f, validation }))
    setNested('auditChecks', 'AI reference validation run and saved', true)
  }

  const sections = [
    { label: 'Basics', fields: basics(form, set) },
    { label: 'Give-Take', fields: giveTake(form, set) },
    { label: 'Constraints', fields: constraints(form, set) },
    { label: 'Regulatory', fields: regulatory(form, setNested) },
    { label: 'Principles', fields: principles(form, setNested) },
    { label: 'Horizons', fields: horizons(form, set) },
    { label: 'Audit', fields: audit(form, setNested, auditScore, auditTotal) },
    { label: '✦ AI Validate', fields: <AIValidation suggestion={form} onSave={handleValidationSave} /> },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{existing ? 'Edit' : 'New'} Suggestion</h2>
          <p className="text-slate-500 text-sm">Complete all sections — audit runs automatically</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono ${auditPassed ? 'text-green-400' : 'text-yellow-400'}`}>
            {auditScore}/{auditTotal} audit items
          </span>
          <button onClick={handleSave}
            className="flex items-center gap-2 bg-mosman-pink hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {sections.map((s, i) => (
          <button key={i} onClick={() => setSection(i)}
            className={`flex-1 h-1.5 rounded transition-colors ${i === section ? 'bg-mosman-pink' : i < section ? 'bg-mosman-teal' : 'bg-slate-100'}`}
          />
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s, i) => (
          <button key={i} onClick={() => setSection(i)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              i === section ? 'bg-mosman-pink text-white' : 'bg-slate-100 text-slate-500 hover:text-white'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-mosman-line rounded-xl p-5 space-y-4">
        {sections[section].fields}
      </div>

      {/* Audit summary */}
      <div className={`rounded-xl border p-4 ${auditPassed ? 'border-green-700 bg-green-950/30' : 'border-yellow-700 bg-yellow-950/30'}`}>
        <div className="flex items-center gap-2">
          {auditPassed
            ? <CheckCircle size={16} className="text-green-400" />
            : <AlertTriangle size={16} className="text-yellow-400" />
          }
          <span className={`font-semibold text-sm ${auditPassed ? 'text-green-300' : 'text-yellow-300'}`}>
            {auditPassed ? 'Audit PASSED — ready to log' : `Audit ${auditScore}/${auditTotal} — complete all items before logging`}
          </span>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, note }) {
  return (
    <div className="space-y-1">
      <label className="text-slate-700 text-sm font-medium">{label}</label>
      {note && <p className="text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  )
}

const ta = "w-full bg-white border border-mosman-line rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-mosman-teal resize-none"
const inp = "w-full bg-white border border-mosman-line rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-mosman-teal"
const sel = "w-full bg-white border border-mosman-line rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-mosman-teal"

function basics(form, set) {
  return <>
    <Field label="Suggestion Title">
      <input className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Short, descriptive title" />
    </Field>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Category">
        <select className={sel} value={form.category} onChange={e => set('category', e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select className={sel} value={form.priority} onChange={e => set('priority', e.target.value)}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
      </Field>
    </div>
    <Field label="Problem Being Solved" note="Reference specific zones, streets, or map layers">
      <textarea className={ta} rows={4} value={form.problem} onChange={e => set('problem', e.target.value)} placeholder="What is broken, missing, or inadequate right now?" />
    </Field>
    <Field label="Proposed Solution" note="Specific enough that a planner could act on it">
      <textarea className={ta} rows={4} value={form.solution} onChange={e => set('solution', e.target.value)} placeholder="What exactly is being proposed?" />
    </Field>
    <Field label="Map Change Required?">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-mosman-pink" checked={form.mapChangeRequired}
          onChange={e => set('mapChangeRequired', e.target.checked)} />
        <span className="text-slate-700 text-sm">This suggestion requires a LEP map modification</span>
      </label>
    </Field>
  </>
}

function giveTake(form, set) {
  return <>
    <div className="p-3 bg-mosman-dark rounded-lg border border-mosman-line text-xs text-slate-500 mb-2">
      Give-Take is non-negotiable. State what is gained AND sacrificed. No free lunches in planning.
    </div>
    <Field label="GAIN — What does the community gain?">
      <textarea className={ta} rows={3} value={form.gain} onChange={e => set('gain', e.target.value)} placeholder="Specific, measurable benefit" />
    </Field>
    <Field label="COST — What is physically given up or constrained?">
      <textarea className={ta} rows={3} value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="Specific cost or sacrifice — do not minimise" />
    </Field>
    <Field label="Who Bears the Cost?">
      <textarea className={ta} rows={2} value={form.whoBears} onChange={e => set('whoBears', e.target.value)} placeholder="Developer / Resident / Council / State / Future residents" />
    </Field>
    <Field label="Mitigation — How can the cost be reduced?">
      <textarea className={ta} rows={2} value={form.mitigation} onChange={e => set('mitigation', e.target.value)} placeholder="How to offset or compensate for the cost" />
    </Field>
  </>
}

function constraints(form, set) {
  return <>
    <Field label="Space & Infrastructure Constraints"
      note="Physical, infrastructure, or capacity limits. Grid capacity, road width, soil type, etc.">
      <textarea className={ta} rows={4} value={form.constraints} onChange={e => set('constraints', e.target.value)} />
    </Field>
    <Field label="Current Problems This Must Not Worsen">
      <textarea className={ta} rows={3} value={form.currentProblems} onChange={e => set('currentProblems', e.target.value)} />
    </Field>
    <Field label="Dependencies — What must happen first or in parallel?">
      <textarea className={ta} rows={3} value={form.dependencies} onChange={e => set('dependencies', e.target.value)} />
    </Field>
  </>
}

function regulatory(form, setNested) {
  return <>
    <div className="p-3 bg-mosman-dark rounded-lg border border-mosman-line text-xs text-slate-500 mb-2">
      Complete all 5 rows. N/A is a valid answer.
    </div>
    {REGULATORY_ITEMS.map(item => (
      <Field key={item} label={item}>
        <select className={sel} value={form.regulatory[item] || ''}
          onChange={e => setNested('regulatory', item, e.target.value)}>
          <option value="">Select…</option>
          {REG_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>
      </Field>
    ))}
    <Field label="State Government Ask"
      note="If State cooperation needed, frame as specific request. Otherwise write N/A.">
      <textarea className={ta} rows={3} value={form.stateAsk} onChange={e => setNested('regulatory', 'stateAsk', e.target.value)}
        placeholder="We ask that [specific policy/SEPP/clause] be amended to allow [outcome] in [context]." />
    </Field>
  </>
}

function principles(form, setNested) {
  return <>
    <p className="text-slate-500 text-sm">Rate this suggestion against all 7 Masterplan Principles.</p>
    {MASTERPLAN_PRINCIPLES.map(p => (
      <div key={p} className="flex items-center justify-between">
        <span className="text-slate-700 text-sm flex-1">{p}</span>
        <div className="flex gap-2 ml-4">
          {PRINCIPLE_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setNested('principles', p, opt)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                form.principles[p] === opt
                  ? opt === 'Supports' ? 'bg-green-700 text-green-100'
                  : opt === 'Conflicts' ? 'bg-red-800 text-red-100'
                  : 'bg-slate-600 text-slate-100'
                  : 'bg-mosman-dark border border-mosman-line text-slate-500 hover:text-white'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    ))}
  </>
}

function horizons(form, set) {
  return <>
    <div className="p-3 bg-mosman-dark rounded-lg border border-mosman-line text-xs text-slate-500 mb-2">
      Always evaluate at the 10-year and 20-year mark. What works in 2025 may be obsolete or damaging by 2045.
    </div>
    <Field label="10-Year Horizon (~2035)"
      note="At least 2 concrete problems or risks this suggestion will face">
      <textarea className={ta} rows={4} value={form.horizon10} onChange={e => set('horizon10', e.target.value)}
        placeholder="What problems will this face at the 10-year mark? What needs to be built in now?" />
    </Field>
    <Field label="20-Year Horizon (~2045)"
      note="At least 2 technology, demographic, or climate interactions">
      <textarea className={ta} rows={4} value={form.horizon20} onChange={e => set('horizon20', e.target.value)}
        placeholder="Technology shifts, demographic changes, climate impacts. What might be obsolete or insufficient by 2045?" />
    </Field>
  </>
}

function audit(form, setNested, score, total) {
  return <>
    <div className="flex items-center justify-between mb-2">
      <p className="text-slate-500 text-sm">Check each item when complete. All 15 must pass before logging.</p>
      <span className={`text-sm font-mono font-bold ${score === total ? 'text-green-400' : 'text-yellow-400'}`}>
        {score}/{total}
      </span>
    </div>
    <div className="space-y-2">
      {AUDIT_ITEMS.map(item => (
        <label key={item} className="flex items-start gap-3 cursor-pointer group">
          <input type="checkbox"
            className="mt-0.5 accent-mosman-teal flex-shrink-0"
            checked={form.auditChecks[item] || false}
            onChange={e => setNested('auditChecks', item, e.target.checked)}
          />
          <span className={`text-sm ${form.auditChecks[item] ? 'text-green-300 line-through opacity-60' : 'text-slate-700'} group-hover:text-white transition-colors`}>
            {item}
          </span>
        </label>
      ))}
    </div>
  </>
}
