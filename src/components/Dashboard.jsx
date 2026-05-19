import { useNavigate } from 'react-router-dom'
import { Play, Map, Lightbulb, AlertTriangle, CheckCircle, Clock, FileEdit, BookOpen, Zap } from 'lucide-react'
import { useStorage } from '../hooks/useStorage'
import { MAPS } from '../data/maps'
import { REFERENCE_DOCS } from '../data/referenceDocs'
import { MOSMAN_POWERLINE_SUMMARY } from '../data/powerlines'

export default function Dashboard() {
  const navigate = useNavigate()
  const [suggestions] = useStorage('suggestions', [])
  const [mapChanges] = useStorage('mapChanges', [])
  const [started, setStarted] = useStorage('systemStarted', false)

  const passed = suggestions.filter(s => s.auditPassed).length
  const failed = suggestions.filter(s => s.auditPassed === false).length
  const mapsPending = mapChanges.filter(m => m.status === 'DWG_PENDING').length
  const overheadPowerlineSegments = MOSMAN_POWERLINE_SUMMARY
    .filter(item => ['hv-overhead', 'lv-overhead', 'service-overhead', 'streetlight-overhead'].includes(item.id))
    .reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-6">
      {/* Start Banner */}
      {!started ? (
        <div className="bg-white border-2 border-mosman-pink rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="flex justify-center gap-2 mb-4">
            {[...Array(6)].map((_, i) => (
              <span key={i} className={`w-3 h-8 rounded-sm inline-block rotate-12 ${i % 2 === 0 ? 'bg-mosman-pink' : 'bg-mosman-teal'}`} />
            ))}
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Mosman Planning System</h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Community-led planning intelligence for Mosman LGA. Review LEP maps, generate suggestions,
            propose map changes — all with mandatory give-take audits and 20-year horizon analysis.
          </p>
          <button onClick={() => setStarted(true)}
            className="mt-4 inline-flex items-center gap-3 bg-mosman-pink hover:bg-pink-700 text-white font-bold text-xl px-10 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-pink-200">
            <Play size={24} fill="white" />
            START MOSMAN PLANNING SYSTEM
          </button>
          <p className="text-xs text-slate-400">Loads all maps, session log, and prior suggestions</p>
        </div>
      ) : (
        <div className="bg-white border border-mosman-line rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-slate-900 font-semibold">System Active</p>
              <p className="text-xs text-slate-500">
                {MAPS.filter(m => m.isCurrent).length} current maps · {suggestions.length} suggestions · {mapChanges.length} map changes
              </p>
            </div>
          </div>
          <button onClick={() => setStarted(false)}
            className="text-xs text-slate-400 hover:text-slate-600 border border-mosman-line px-3 py-1 rounded">
            Reset
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Map} label="Current Maps" value={MAPS.filter(m => m.isCurrent).length} sub="across 10 types" color="text-mosman-teal" />
        <StatCard icon={BookOpen} label="Reference Docs" value={REFERENCE_DOCS.length} sub="DCPs, policies, drawings" color="text-indigo-500" />
        <StatCard icon={Zap} label="Powerlines" value={overheadPowerlineSegments.toLocaleString()} sub="public overhead segments" color="text-mosman-pink" />
        <StatCard icon={Clock} label="Map Changes" value={mapChanges.length} sub={`${mapsPending} DWG pending`} color="text-blue-500" />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <ActionCard icon={Map} title="Browse LEP Maps" desc="View all 61 planning maps with markup tool" color="border-mosman-teal" onClick={() => navigate('/maps')} />
          <ActionCard icon={Lightbulb} title="New Suggestion" desc="Create a suggestion with full give-take audit" color="border-mosman-pink" onClick={() => navigate('/new')} />
          <ActionCard icon={FileEdit} title="Propose Map Change" desc="Suggest LEP zoning, height, or FSR modifications" color="border-blue-400" onClick={() => navigate('/map-change')} />
          <ActionCard icon={Zap} title="Powerline Data" desc="Ausgrid HV/LV counts, voltage limits, and sizing" color="border-pink-400" onClick={() => navigate('/powerlines')} />
          <ActionCard icon={BookOpen} title="Reference Library" desc="Standard drawings, DCPs, policies, POMs" color="border-indigo-400" onClick={() => navigate('/references')} />
        </div>
      </div>

      {/* Recent Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-3">Recent Suggestions</h3>
          <div className="space-y-2">
            {suggestions.slice(-5).reverse().map(s => (
              <div key={s.id} className="bg-white border border-mosman-line rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-slate-900 text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.category} · {s.priority}</p>
                </div>
                <AuditBadge passed={s.auditPassed} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Masterplan Options */}
      <div>
        <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-3">Masterplan Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RefCard label="LMR (Current State)" area="27% of LGA · 180ha" height="2–6 storeys" tag="bg-slate-500" tagLabel="CURRENT" />
          <RefCard label="Option 1 — Low & Wide" area="13% of LGA · 85ha" height="3–20 storeys" tag="bg-mosman-teal" tagLabel="OPTION 1" />
          <RefCard label="Option 2 — High & Narrow" area="9% of LGA · 60ha" height="3–28 storeys" tag="bg-mosman-pink" tagLabel="OPTION 2" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white border border-mosman-line rounded-xl p-4 shadow-sm">
      <Icon size={18} className={`${color} mb-2`} />
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-700">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function ActionCard({ icon: Icon, title, desc, color, onClick }) {
  return (
    <button onClick={onClick}
      className={`bg-white border-2 ${color} rounded-xl p-4 text-left hover:bg-slate-50 transition-colors w-full shadow-sm`}>
      <Icon size={20} className="text-slate-600 mb-2" />
      <p className="text-slate-900 font-semibold text-sm">{title}</p>
      <p className="text-slate-500 text-xs mt-1">{desc}</p>
    </button>
  )
}

function RefCard({ label, area, height, tag, tagLabel }) {
  return (
    <div className="bg-white border border-mosman-line rounded-xl p-4 shadow-sm">
      <span className={`${tag} text-white text-xs font-bold px-2 py-0.5 rounded mb-2 inline-block`}>{tagLabel}</span>
      <p className="text-slate-900 font-semibold text-sm">{label}</p>
      <p className="text-slate-500 text-xs mt-1">{area}</p>
      <p className="text-slate-500 text-xs">{height}</p>
    </div>
  )
}

export function AuditBadge({ passed }) {
  if (passed === true) return <span className="text-xs bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded font-medium flex items-center gap-1"><CheckCircle size={10} /> PASSED</span>
  if (passed === false) return <span className="text-xs bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded font-medium flex items-center gap-1"><AlertTriangle size={10} /> FAILED</span>
  return <span className="text-xs bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded font-medium flex items-center gap-1"><Clock size={10} /> PENDING</span>
}
