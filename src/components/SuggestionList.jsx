import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Filter } from 'lucide-react'
import { useState } from 'react'
import { useStorage } from '../hooks/useStorage'
import { AuditBadge } from './Dashboard'
import { CATEGORIES, PRIORITIES } from '../data/categories'

export default function SuggestionList() {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useStorage('suggestions', [])
  const [filterCat, setFilterCat] = useState('All')
  const [filterPri, setFilterPri] = useState('All')
  const [filterAudit, setFilterAudit] = useState('All')

  function remove(id) {
    if (confirm('Delete this suggestion?')) setSuggestions(s => s.filter(x => x.id !== id))
  }

  const filtered = suggestions.filter(s => {
    if (filterCat !== 'All' && s.category !== filterCat) return false
    if (filterPri !== 'All' && s.priority !== filterPri) return false
    if (filterAudit === 'Passed' && !s.auditPassed) return false
    if (filterAudit === 'Failed' && s.auditPassed !== false) return false
    if (filterAudit === 'Pending' && s.auditPassed !== undefined) return false
    return true
  })

  const sel = "bg-white border border-mosman-line rounded px-2 py-1 text-slate-700 text-xs focus:outline-none"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Suggestions</h2>
          <p className="text-slate-500 text-sm">{suggestions.length} total · {filtered.length} shown</p>
        </div>
        <button onClick={() => navigate('/new')}
          className="flex items-center gap-2 bg-mosman-pink hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus size={14} /> New
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-slate-400" />
        <select className={sel} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option>All</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className={sel} value={filterPri} onChange={e => setFilterPri(e.target.value)}>
          <option>All</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className={sel} value={filterAudit} onChange={e => setFilterAudit(e.target.value)}>
          <option>All</option>
          <option>Passed</option>
          <option>Failed</option>
          <option>Pending</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-mosman-line rounded-xl p-10 text-center shadow-sm">
          <p className="text-slate-500">No suggestions yet.</p>
          <button onClick={() => navigate('/new')} className="mt-3 text-mosman-teal hover:underline text-sm">
            Create the first suggestion →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-white border border-mosman-line rounded-xl p-4 hover:border-slate-300 transition-colors shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <AuditBadge passed={s.auditPassed} />
                    <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">{s.category}</span>
                    <PriorityBadge priority={s.priority} />
                    {s.mapChangeRequired && <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">MAP CHANGE</span>}
                    {s.validation && <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">AI VALIDATED</span>}
                  </div>
                  <h3 className="text-slate-900 font-semibold">{s.title}</h3>
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">{s.problem}</p>
                  {s.validation?.feasibility && (
                    <p className="text-xs font-medium mt-1 text-purple-700">Feasibility: {s.validation.feasibility}</p>
                  )}
                  {s.createdAt && (
                    <p className="text-xs text-slate-400 mt-1">{new Date(s.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => navigate(`/new/${s.id}`)}
                    className="p-2 text-slate-400 hover:text-mosman-teal hover:bg-slate-100 rounded transition-colors">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => remove(s.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {(s.gain || s.cost) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {s.gain && (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="text-xs text-green-700 font-semibold mb-0.5">GAIN</p>
                      <p className="text-xs text-slate-700 line-clamp-2">{s.gain}</p>
                    </div>
                  )}
                  {s.cost && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-600 font-semibold mb-0.5">COST</p>
                      <p className="text-xs text-slate-700 line-clamp-2">{s.cost}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PriorityBadge({ priority }) {
  const colors = {
    Critical: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return <span className={`text-xs px-2 py-0.5 rounded border ${colors[priority] || colors.Low}`}>{priority}</span>
}
