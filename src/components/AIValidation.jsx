import { useState } from 'react'
import { Sparkles, Save, RefreshCw, Key, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { useStorage } from '../hooks/useStorage'
import { buildValidationPrompt } from '../utils/validatePrompt'
import { FEASIBILITY_OPTIONS } from '../data/categories'

const FEASIBILITY_COLORS = {
  'Feasible Now': 'bg-green-900 text-green-300 border-green-700',
  'Feasible with Minor Changes': 'bg-teal-900 text-teal-300 border-teal-700',
  'Feasible with Major Changes': 'bg-yellow-900 text-yellow-300 border-yellow-700',
  'Requires State Intervention': 'bg-orange-900 text-orange-300 border-orange-700',
  'Not Feasible': 'bg-red-900 text-red-300 border-red-700',
}

export default function AIValidation({ suggestion, onSave }) {
  const [apiKey, setApiKey] = useStorage('anthropic_api_key', '')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(suggestion?.validation || null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [copied, setCopied] = useState(false)

  const prompt = buildValidationPrompt(suggestion || {})

  async function runValidation() {
    if (!apiKey) { setError('Enter Anthropic API key first'); return }
    if (!suggestion?.title && !suggestion?.problem) { setError('Add a title and problem before validating'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || `API error ${res.status}`)
      }

      const data = await res.json()
      const text = data.content[0].text

      const validation = {
        text,
        feasibility: parseFeasibility(text),
        ranAt: new Date().toISOString(),
        model: 'claude-haiku-4-5',
      }

      setResult(validation)
      onSave?.(validation)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function parseFeasibility(text) {
    for (const opt of FEASIBILITY_OPTIONS) {
      if (text.includes(opt)) return opt
    }
    return null
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ta = "w-full bg-mosman-dark border border-mosman-border rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-mosman-teal"

  return (
    <div className="space-y-4">
      <div className="p-3 bg-mosman-dark rounded-lg border border-mosman-border text-xs text-slate-400">
        Validates this suggestion against all 53 reference documents — Standard Drawings, DCPs, Policies, Plans of Management, LEP Amendments, Strategies. Identifies what's feasible now, what needs changing, and the give-take for each required change.
      </div>

      {/* API Key */}
      <div className="bg-mosman-card border border-mosman-border rounded-xl overflow-hidden">
        <button onClick={() => setShowKey(!showKey)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-mosman-border transition-colors">
          <div className="flex items-center gap-2">
            <Key size={14} className={apiKey ? 'text-green-400' : 'text-slate-500'} />
            <span className="text-sm text-slate-300">
              {apiKey ? 'API key set ✓' : 'Anthropic API key required'}
            </span>
          </div>
          {showKey ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </button>
        {showKey && (
          <div className="px-4 pb-4 space-y-2 border-t border-mosman-border pt-3">
            <p className="text-xs text-slate-500">Key stored locally in browser only. Never sent anywhere except Anthropic's API.</p>
            <input
              type="password"
              className={ta}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>
        )}
      </div>

      {/* Run button */}
      <div className="flex gap-3">
        <button
          onClick={runValidation}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-mosman-pink hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-3 rounded-xl transition-colors"
        >
          {loading
            ? <><RefreshCw size={16} className="animate-spin" /> Validating against 53 documents…</>
            : <><Sparkles size={16} /> Run AI Validation</>
          }
        </button>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="px-3 py-2 bg-mosman-border hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
          title="View prompt"
        >
          {showPrompt ? 'Hide' : 'View'} Prompt
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950/40 border border-red-800 rounded-lg p-3">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Prompt preview */}
      {showPrompt && (
        <div className="bg-mosman-dark border border-mosman-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">Full validation prompt ({prompt.length.toLocaleString()} chars)</p>
            <button onClick={copyPrompt}
              className="flex items-center gap-1 text-xs text-mosman-teal hover:underline">
              <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto">{prompt.slice(0, 1000)}…</pre>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-white font-semibold text-sm">Validation Complete</span>
            </div>
            <span className="text-xs text-slate-500">
              {result.ranAt ? new Date(result.ranAt).toLocaleString('en-AU') : ''} · {result.model}
            </span>
          </div>

          {/* Feasibility badge */}
          {result.feasibility && (
            <div className={`border rounded-xl px-4 py-3 ${FEASIBILITY_COLORS[result.feasibility] || 'bg-slate-800 text-slate-300 border-slate-600'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-0.5">Overall Feasibility</p>
              <p className="font-bold text-lg">{result.feasibility}</p>
            </div>
          )}

          {/* Full result text */}
          <div className="bg-mosman-dark border border-mosman-border rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2 font-mono">Full validation output</p>
            <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {result.text}
            </div>
          </div>

          <button
            onClick={runValidation}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-mosman-teal transition-colors"
          >
            <RefreshCw size={11} /> Re-run validation
          </button>
        </div>
      )}
    </div>
  )
}
