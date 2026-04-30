import { useNavigate } from 'react-router-dom'
import { Play, Map, Lightbulb, AlertTriangle, CheckCircle, Clock, FileEdit, BookOpen } from 'lucide-react'
import { useStorage } from '../hooks/useStorage'
import { MAPS } from '../data/maps'
import { REFERENCE_DOCS } from '../data/referenceDocs'

export default function Dashboard() {
  const navigate = useNavigate()
  const [suggestions] = useStorage('suggestions', [])
  const [mapChanges] = useStorage('mapChanges', [])
  const [started, setStarted] = useStorage('systemStarted', false)

  const passed = suggestions.filter(s => s.auditPassed).length
  const failed = suggestions.filter(s => s.auditPassed === false).length
  const pending = suggestions.filter(s => s.auditPassed === undefined).length
  const mapsPending = mapChanges.filter(m => m.status === 'DWG_PENDING').length

  function handleStart() {
    setStarted(true)
  }

  return (
    <div className="space-y-6">
      {/* Start Banner */}
      {!started ? (
        <div className="bg-mosman-card border-2 border-mosman-pink rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center gap-2 mb-4">
            {[...Array(6)].map((_, i) => (
              <span key={i}
                className={`w-3 h-8 rounded-sm inline-block rotate-12 ${i % 2 === 0 ? 'bg-mosman-pink' : 'bg-mosman-teal'}`}
              />
            ))}
          </div>
          <h2 className="text-3xl font-bold text-white">Mosman Planning System</h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Community-led planning intelligence for Mosman LGA. Review LEP maps, generate suggestions,
            propose map changes — all with mandatory give-take audits and 20-year horizon analysis.
          </p>
          <button
            onClick={handleStart}
            className="mt-4 inline-flex items-center gap-3 bg-mosman-pink hover:bg-pink-600 text-white font-bold text-xl px-10 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-pink-900/40"
          >
            <Play size={24} fill="white" />
            START MOSMAN PLANNING SYSTEM
          </button>
          <p className="text-xs text-slate-600">Loads all maps, session log, and prior suggestions</p>
        </div>
      ) : (
        <div className="bg-mosman-card border border-mosman-border rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div>
              <p className="text-white font-semibold">System Active</p>
              <p className="text-xs text-slate-400">
                {MAPS.filter(m => m.isCurrent).length} current maps loaded · {suggestions.length} suggestions · {mapChanges.length} map changes
              </p>
            </div>
          </div>
          <button
            onClick={() => setStarted(false)}
            className="text-xs text-slate-500 hover:text-slate-300 border border-mosman-border px-3 py-1 rounded"
          >
            Reset
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Map} label="Current Maps" value={MAPS.filter(m => m.isCurrent).length} sub="across 10 types" color="text-mosman-teal" />
        <StatCard icon={BookOpen} label="Reference Docs" value={REFERENCE_DOCS.length} sub="DCPs, policies, drawings" color="text-indigo-400" />
        <StatCard icon={Lightbulb} label="Suggestions" value={suggestions.length} sub={`${passed} passed audit`} color="text-mosman-pink" />
        <StatCard icon={Clock} label="Map Changes" value={mapChanges.length} sub={`${mapsPending} DWG pending`} color="text-blue-400" />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ActionCard
            icon={Map}
            title="Browse LEP Maps"
            desc="View all 61 planning maps across 10 categories"
            color="border-mosman-teal"
            onClick={() => navigate('/maps')}
          />
          <ActionCard
            icon={Lightbulb}
            title="New Suggestion"
            desc="Create a planning suggestion with full give-take audit"
            color="border-mosman-pink"
            onClick={() => navigate('/new')}
          />
          <ActionCard
            icon={FileEdit}
            title="Propose Map Change"
            desc="Suggest modifications to LEP zoning, height, or FSR maps"
            color="border-blue-500"
            onClick={() => navigate('/map-change')}
          />
          <ActionCard
            icon={BookOpen}
            title="Reference Library"
            desc="DCPs, standard drawings, policies, plans of management"
            color="border-indigo-500"
            onClick={() => navigate('/references')}
          />
        </div>
      </div>

      {/* Recent Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-3">Recent Suggestions</h3>
          <div className="space-y-2">
            {suggestions.slice(-5).reverse().map(s => (
              <div key={s.id} className="bg-mosman-card border border-mosman-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.category} · {s.priority}</p>
                </div>
                <AuditBadge passed={s.auditPassed} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Masterplan Options Reference */}
      <div>
        <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-3">Masterplan Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RefCard label="LMR (Current State)" area="27% of LGA · 180ha" height="2–6 storeys" tag="bg-slate-600" tagLabel="CURRENT" />
          <RefCard label="Option 1 — Low & Wide" area="13% of LGA · 85ha" height="3–20 storeys" tag="bg-mosman-teal" tagLabel="OPTION 1" />
          <RefCard label="Option 2 — High & Narrow" area="9% of LGA · 60ha" height="3–28 storeys" tag="bg-mosman-pink" tagLabel="OPTION 2" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-mosman-card border border-mosman-border rounded-xl p-4">
      <Icon size={18} className={`${color} mb-2`} />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}

function ActionCard({ icon: Icon, title, desc, color, onClick }) {
  return (
    <button onClick={onClick}
      className={`bg-mosman-card border ${color} rounded-xl p-5 text-left hover:bg-mosman-border transition-colors w-full`}>
      <Icon size={20} className="text-slate-300 mb-2" />
      <p className="text-white font-semibold">{title}</p>
      <p className="text-slate-400 text-sm mt-1">{desc}</p>
    </button>
  )
}

function RefCard({ label, area, height, tag, tagLabel }) {
  return (
    <div className="bg-mosman-card border border-mosman-border rounded-xl p-4">
      <span className={`${tag} text-white text-xs font-bold px-2 py-0.5 rounded mb-2 inline-block`}>{tagLabel}</span>
      <p className="text-white font-semibold text-sm">{label}</p>
      <p className="text-slate-400 text-xs mt-1">{area}</p>
      <p className="text-slate-400 text-xs">{height}</p>
    </div>
  )
}

export function AuditBadge({ passed }) {
  if (passed === true) return <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded font-medium flex items-center gap-1"><CheckCircle size={10} /> PASSED</span>
  if (passed === false) return <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded font-medium flex items-center gap-1"><AlertTriangle size={10} /> FAILED</span>
  return <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-medium flex items-center gap-1"><Clock size={10} /> PENDING</span>
}
