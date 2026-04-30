import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, CheckCircle, AlertTriangle } from 'lucide-react'
import { useStorage } from '../hooks/useStorage'
import { MAP_TYPES } from '../data/maps'
import { MAP_AUDIT_ITEMS } from '../data/categories'

const MAP_CODES = Object.keys(MAP_TYPES)
const STATUSES = ['DRAFT', 'AUDITED', 'DWG_PENDING', 'DWG_COMPLETE', 'SUBMITTED', 'SUPERSEDED']

const CONSISTENCY_LAYERS = ['SCP — Scenic Protection', 'HER — Heritage items or HCAs', 'FBL — Foreshore building line',
  'NRW — Watercourse buffers', 'ASS — Acid sulfate soils', 'LSZ — Lot size change needed',
  'Masterplan Option 1 boundary', 'Masterplan Option 2 boundary']

const empty = {
  id: '', title: '', mapsAffected: [], status: 'DRAFT',
  affectedArea: '', currentZone: '', currentHeight: '', currentFSR: '', currentLot: '', currentHeritage: '', currentSCP: '',
  proposedZone: '', proposedHeight: '', proposedFSR: '', proposedLot: '',
  dwellingYield: '', legalPathway: '',
  consistency: Object.fromEntries(CONSISTENCY_LAYERS.map(l => [l, false])),
  dwgFile: '', notes: '',
  auditChecks: Object.fromEntries(MAP_AUDIT_ITEMS.map(a => [a, false])),
  createdAt: '',
}

export default function MapChangeForm() {
  const navigate = useNavigate()
  const [changes, setChanges] = useStorage('mapChanges', [])
  const [form, setForm] = useState({ ...empty })
  const [saved, setSaved] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }
  function setNested(key, sub, val) { setForm(f => ({ ...f, [key]: { ...f[key], [sub]: val } })) }
  function toggleMap(code) {
    set('mapsAffected', form.mapsAffected.includes(code)
      ? form.mapsAffected.filter(c => c !== code)
      : [...form.mapsAffected, code])
  }

  const auditScore = Object.values(form.auditChecks).filter(Boolean).length
  const auditTotal = MAP_AUDIT_ITEMS.length

  function handleSave() {
    const record = {
      ...form,
      id: form.id || Date.now().toString(),
      auditPassed: auditScore === auditTotal,
      createdAt: form.createdAt || new Date().toISOString(),
    }
    setChanges(c => [...c, record])
    setSaved(true)
    setTimeout(() => navigate('/log'), 800)
  }

  const ta = "w-full bg-mosman-dark border border-mosman-border rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-mosman-teal resize-none"
  const inp = "w-full bg-mosman-dark border border-mosman-border rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-mosman-teal"

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Propose Map Change</h2>
          <p className="text-slate-400 text-sm">Suggest modifications to LEP maps — triggers full audit</p>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 bg-mosman-pink hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          {saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Title & Status */}
      <Section title="Identification">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-slate-300 text-sm font-medium">Change Title</label>
            <input className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Short descriptive title" />
          </div>
          <div className="space-y-1">
            <label className="text-slate-300 text-sm font-medium">Status</label>
            <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-slate-300 text-sm font-medium">DWG File Path</label>
            <input className={inp} value={form.dwgFile} onChange={e => set('dwgFile', e.target.value)} placeholder="map-changes/DWG/filename.dwg" />
          </div>
        </div>
      </Section>

      {/* Maps affected */}
      <Section title="Maps Affected">
        <p className="text-xs text-slate-500 mb-3">Select all map types that require modification. A zoning change typically requires LZN + HOB + FSR + LSZ.</p>
        <div className="flex flex-wrap gap-2">
          {MAP_CODES.map(code => (
            <button key={code} onClick={() => toggleMap(code)}
              className={`px-3 py-1.5 rounded font-mono text-sm font-bold transition-colors ${
                form.mapsAffected.includes(code)
                  ? 'bg-mosman-pink text-white'
                  : 'bg-mosman-dark border border-mosman-border text-slate-400 hover:text-white'
              }`}>
              {code}
              <span className="font-normal text-xs ml-1 opacity-70">{MAP_TYPES[code].name.split(' ').slice(0,2).join(' ')}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Affected area */}
      <Section title="Affected Area">
        <div className="space-y-1">
          <label className="text-slate-300 text-sm font-medium">Precise Boundary Description</label>
          <p className="text-xs text-slate-500">Use street names, lot/DP numbers, and cardinal boundaries</p>
          <textarea className={ta} rows={3} value={form.affectedArea} onChange={e => set('affectedArea', e.target.value)}
            placeholder="e.g. Bounded by Military Rd to north, Myahgah Rd to east, Spit Rd to south, Holt Ave to west" />
        </div>
      </Section>

      {/* Current vs Proposed */}
      <Section title="Current vs Proposed Controls">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs">
                <th className="text-left py-2 pr-4 font-medium">Control</th>
                <th className="text-left py-2 pr-4 font-medium">Current</th>
                <th className="text-left py-2 font-medium">Proposed</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {[
                ['Zone', 'currentZone', 'proposedZone', 'e.g. R2 Low Density', 'e.g. MU1 Mixed Use'],
                ['Max Height', 'currentHeight', 'proposedHeight', 'e.g. 9.5m', 'e.g. 18m'],
                ['Max FSR', 'currentFSR', 'proposedFSR', 'e.g. 0.5:1', 'e.g. 1.5:1'],
                ['Min Lot Size', 'currentLot', 'proposedLot', 'e.g. 550sqm', 'e.g. 400sqm'],
              ].map(([label, curKey, proKey, curPh, proPh]) => (
                <tr key={label}>
                  <td className="text-slate-400 py-1.5 pr-4 whitespace-nowrap">{label}</td>
                  <td className="pr-4 py-1.5">
                    <input className={inp} value={form[curKey]} onChange={e => set(curKey, e.target.value)} placeholder={curPh} />
                  </td>
                  <td className="py-1.5">
                    <input className={inp} value={form[proKey]} onChange={e => set(proKey, e.target.value)} placeholder={proPh} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-1">
          <label className="text-slate-300 text-sm font-medium">Dwelling Yield Impact</label>
          <p className="text-xs text-slate-500">Estimate additional dwellings. Show working: (site area × FSR uplift) ÷ avg apartment size</p>
          <textarea className={ta} rows={2} value={form.dwellingYield} onChange={e => set('dwellingYield', e.target.value)} />
        </div>
        <div className="mt-3 space-y-1">
          <label className="text-slate-300 text-sm font-medium">Legal Pathway</label>
          <p className="text-xs text-slate-500">Planning Proposal → Gateway Determination → Exhibition → Finalisation (~12–20 months)</p>
          <textarea className={ta} rows={2} value={form.legalPathway} onChange={e => set('legalPathway', e.target.value)} />
        </div>
      </Section>

      {/* Consistency check */}
      <Section title="Consistency Check — All Layers">
        <p className="text-xs text-slate-500 mb-3">Verify no conflicts before proceeding. Check every layer.</p>
        <div className="space-y-2">
          {CONSISTENCY_LAYERS.map(layer => (
            <label key={layer} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="accent-mosman-teal"
                checked={form.consistency[layer] || false}
                onChange={e => setNested('consistency', layer, e.target.checked)} />
              <span className={`text-sm ${form.consistency[layer] ? 'text-green-300 line-through opacity-60' : 'text-slate-300'}`}>
                {layer}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Map Change Audit */}
      <Section title={`Map Change Audit (${auditScore}/${auditTotal})`}>
        <div className="space-y-2">
          {MAP_AUDIT_ITEMS.map(item => (
            <label key={item} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-mosman-teal flex-shrink-0"
                checked={form.auditChecks[item] || false}
                onChange={e => setNested('auditChecks', item, e.target.checked)} />
              <span className={`text-sm ${form.auditChecks[item] ? 'text-green-300 line-through opacity-60' : 'text-slate-300'}`}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </Section>

      <div className="space-y-1">
        <label className="text-slate-300 text-sm font-medium">Notes</label>
        <textarea className={ta} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className={`rounded-xl border p-4 ${auditScore === auditTotal ? 'border-green-700 bg-green-950/30' : 'border-yellow-700 bg-yellow-950/30'}`}>
        <div className="flex items-center gap-2">
          {auditScore === auditTotal ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-yellow-400" />}
          <span className={`text-sm font-semibold ${auditScore === auditTotal ? 'text-green-300' : 'text-yellow-300'}`}>
            {auditScore === auditTotal ? 'Map Change Audit PASSED' : `${auditScore}/${auditTotal} — complete all items`}
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-mosman-card border border-mosman-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-mosman-border">
        <h3 className="text-mosman-teal font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}
