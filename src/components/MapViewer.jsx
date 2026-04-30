import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react'
import { MAPS, MAP_TYPES } from '../data/maps'

export default function MapViewer() {
  const [selected, setSelected] = useState(null)
  const [showHistory, setShowHistory] = useState({})
  const [filterCurrent, setFilterCurrent] = useState(true)

  const grouped = Object.keys(MAP_TYPES).reduce((acc, code) => {
    acc[code] = MAPS.filter(m => m.code === code)
    return acc
  }, {})

  function toggleHistory(code) {
    setShowHistory(h => ({ ...h, [code]: !h[code] }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">LEP 2012 Maps</h2>
          <p className="text-slate-400 text-sm">61 PDFs across 10 map types — click any map to view</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={filterCurrent} onChange={e => setFilterCurrent(e.target.checked)}
            className="accent-mosman-teal" />
          Current only
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(grouped).map(([code, maps]) => {
          const type = MAP_TYPES[code]
          const current = maps.filter(m => m.isCurrent)
          const historical = maps.filter(m => !m.isCurrent)
          const display = filterCurrent ? current : maps

          return (
            <div key={code} className="bg-mosman-card border border-mosman-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-mosman-border flex items-center gap-3">
                <span className={`${type.color} text-white text-xs font-bold px-2 py-1 rounded font-mono`}>{code}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{type.name}</p>
                  <p className="text-slate-500 text-xs">{type.desc}</p>
                </div>
                <span className="ml-auto text-xs text-slate-600">{current.length} current</span>
              </div>

              <div className="p-3 space-y-1">
                {current.map(map => (
                  <MapRow key={map.id} map={map} onSelect={setSelected} />
                ))}

                {!filterCurrent && historical.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleHistory(code)}
                      className="w-full text-left text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 pt-1 pl-1"
                    >
                      {showHistory[code] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {historical.length} historical version{historical.length !== 1 ? 's' : ''}
                    </button>
                    {showHistory[code] && historical.map(map => (
                      <MapRow key={map.id} map={map} onSelect={setSelected} historical />
                    ))}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* PDF Viewer Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="bg-mosman-card border-b border-mosman-border px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{MAP_TYPES[selected.code].name} — {selected.label}</p>
              <p className="text-xs text-slate-400 font-mono">{selected.filename}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={selected.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-mosman-teal hover:underline">
                <ExternalLink size={12} /> Open in new tab
              </a>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white ml-3">
                <X size={20} />
              </button>
            </div>
          </div>
          <iframe
            src={selected.url}
            className="flex-1 w-full"
            title={selected.filename}
          />
        </div>
      )}
    </div>
  )
}

function MapRow({ map, onSelect, historical }) {
  return (
    <button
      onClick={() => onSelect(map)}
      className={`w-full text-left flex items-center gap-3 px-2 py-2 rounded hover:bg-mosman-border transition-colors ${
        historical ? 'opacity-60' : ''
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${map.isCurrent ? 'bg-mosman-teal' : 'bg-slate-600'}`} />
      <span className="text-slate-300 text-sm">{map.label}</span>
      <span className="ml-auto text-xs text-slate-600 font-mono">{map.date.replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1')}</span>
    </button>
  )
}
