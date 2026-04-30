import { useStorage } from '../hooks/useStorage'
import { useNavigate } from 'react-router-dom'
import { Download, Trash2 } from 'lucide-react'
import { AuditBadge } from './Dashboard'
import { MAP_TYPES } from '../data/maps'

export default function SessionLog() {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useStorage('suggestions', [])
  const [mapChanges, setMapChanges] = useStorage('mapChanges', [])

  function exportAll() {
    const data = { suggestions, mapChanges, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `mosman-planning-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function clearAll() {
    if (confirm('Clear ALL suggestions and map changes? This cannot be undone.')) {
      setSuggestions([]); setMapChanges([])
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Session Log</h2>
          <p className="text-slate-400 text-sm">{suggestions.length} suggestions · {mapChanges.length} map changes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportAll}
            className="flex items-center gap-2 bg-mosman-border hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm">
            <Download size={14} /> Export JSON
          </button>
          <button onClick={clearAll}
            className="flex items-center gap-2 bg-red-900/40 hover:bg-red-900 text-red-300 px-3 py-2 rounded-lg text-sm">
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <Section title="Suggestions">
        {suggestions.length === 0 ? (
          <EmptyState msg="No suggestions logged yet." action={() => navigate('/new')} actionLabel="Create first suggestion →" />
        ) : (
          <div className="divide-y divide-mosman-border">
            {suggestions.map(s => (
              <div key={s.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <AuditBadge passed={s.auditPassed} />
                    <span className="text-xs text-slate-500">{s.category}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-500">{s.priority}</span>
                    {s.mapChangeRequired && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">MAP CHANGE REQ.</span>}
                  </div>
                  <p className="text-white font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.createdAt ? new Date(s.createdAt).toLocaleString('en-AU') : '—'}</p>
                  {s.auditPassed === false && (
                    <p className="text-xs text-yellow-500 mt-1">
                      {Object.values(s.auditChecks).filter(Boolean).length}/{Object.keys(s.auditChecks).length} audit items complete
                    </p>
                  )}
                </div>
                <button onClick={() => navigate(`/new/${s.id}`)} className="text-xs text-mosman-teal hover:underline flex-shrink-0">
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Map Changes */}
      <Section title="Map Changes">
        {mapChanges.length === 0 ? (
          <EmptyState msg="No map changes proposed yet." action={() => navigate('/map-change')} actionLabel="Propose map change →" />
        ) : (
          <div className="divide-y divide-mosman-border">
            {mapChanges.map(m => (
              <div key={m.id} className="py-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusBadge status={m.status} />
                  {m.mapsAffected?.map(code => (
                    <span key={code} className={`text-xs ${MAP_TYPES[code]?.color || 'bg-slate-600'} text-white px-1.5 py-0.5 rounded font-mono`}>{code}</span>
                  ))}
                </div>
                <p className="text-white font-medium text-sm">{m.title || '(untitled)'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.affectedArea}</p>
                {m.dwgFile && <p className="text-xs text-mosman-teal mt-0.5 font-mono">{m.dwgFile}</p>}
                <p className="text-xs text-slate-600 mt-0.5">{m.createdAt ? new Date(m.createdAt).toLocaleString('en-AU') : '—'}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-mosman-card border border-mosman-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-mosman-border">
        <h3 className="text-slate-300 font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EmptyState({ msg, action, actionLabel }) {
  return (
    <div className="text-center py-6">
      <p className="text-slate-500 text-sm">{msg}</p>
      <button onClick={action} className="mt-2 text-mosman-teal hover:underline text-sm">{actionLabel}</button>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    DRAFT: 'bg-slate-700 text-slate-300',
    AUDITED: 'bg-blue-900 text-blue-300',
    DWG_PENDING: 'bg-yellow-900 text-yellow-300',
    DWG_COMPLETE: 'bg-green-900 text-green-300',
    SUBMITTED: 'bg-purple-900 text-purple-300',
    SUPERSEDED: 'bg-red-900 text-red-300',
  }
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[status] || colors.DRAFT}`}>{status}</span>
}
