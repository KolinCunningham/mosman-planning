import { useState } from 'react'
import { AlertTriangle, BatteryCharging, Car, ChevronDown, ChevronUp, ExternalLink, Layers, Pencil, PlugZap, Sun, X, Zap } from 'lucide-react'
import { MAPS, MAP_TYPES } from '../data/maps'
import MapMarkup from './MapMarkup'
import Mosman3DMap from './Mosman3DMap'
import { useStorage } from '../hooks/useStorage'
import {
  FUTURE_ASSUMPTIONS,
  FUTURE_DELIVERY_ROADMAP,
  FUTURE_PLAN_GAPS,
  FUTURE_SCOPES,
  FUTURE_PARKING_AREAS,
  getProjectedGridStressScore,
  GRID_STRESS_AREAS,
  GRID_UPGRADES,
  IMPACT_AREAS,
  OFFICIAL_LEP_SHEET_002_COORDS,
  OVERLAY_LAYERS,
} from '../data/planningOverlays'

export default function MapViewer() {
  const [selected, setSelected] = useState(null)
  const [markupMap, setMarkupMap] = useState(null)
  const [showHistory, setShowHistory] = useState({})
  const [filterCurrent, setFilterCurrent] = useState(true)
  const [activeLayers, setActiveLayers] = useState(['LZN'])
  const [futureScope, setFutureScope] = useState(FUTURE_SCOPES[1].id)
  const [showGridStress, setShowGridStress] = useState(false)
  const [selectedNetworkArea, setSelectedNetworkArea] = useState(GRID_STRESS_AREAS[0])
  const [selectedPlanGap, setSelectedPlanGap] = useState(FUTURE_PLAN_GAPS[0])
  const [layerOpacity, setLayerOpacity] = useState(75)
  const [calibrationMode, setCalibrationMode] = useState(false)
  const [calibratedCoords, setCalibratedCoords] = useState(() =>
    OFFICIAL_LEP_SHEET_002_COORDS.map(c => [...c])
  )

  const [futureOptions, setFutureOptions] = useState({
    managedCharging: true,
    v2g: true,
    solar: true,
    wirelessCharging: false,
    showRequired: true,
    showUpgraded: true,
    offStreetParking: true,
  })
  const [markups] = useStorage('markup_index', {})

  const grouped = Object.keys(MAP_TYPES).reduce((acc, code) => {
    acc[code] = MAPS.filter(m => m.code === code)
    return acc
  }, {})

  const selectedScope = FUTURE_SCOPES.find(scope => scope.id === futureScope) || FUTURE_SCOPES[0]
  const scenario = calculateFutureScenario(selectedScope, futureOptions)

  function hasMarkup(mapId) {
    try {
      const key = `markup_${mapId}`
      const stored = localStorage.getItem(key)
      const parsed = stored ? JSON.parse(stored) : []
      return parsed.length > 0
    } catch { return false }
  }

  function toggleLayer(code) {
    setActiveLayers(layers =>
      layers.includes(code) ? layers.filter(layer => layer !== code) : [...layers, code]
    )
  }

  function toggleFutureOption(option) {
    setFutureOptions(options => ({ ...options, [option]: !options[option] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mosman Map Workspace</h2>
          <p className="text-slate-500 text-sm">Master map overlays, official LEP PDFs, and future EV/grid assumptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="map-interface-shell overflow-hidden rounded-lg">
          <div className="map-interface-head flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-mosman-teal" />
              <p className="text-sm font-semibold text-slate-900">Master Mosman Overlay</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCalibrationMode(v => !v)}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  calibrationMode
                    ? 'bg-fuchsia-200 text-fuchsia-900'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                {calibrationMode ? 'Exit calibration' : 'Calibrate layer'}
              </button>
              <span className="text-xs text-slate-500">{activeLayers.length} layers on</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[230px_minmax(0,1fr)]">
            <div className="map-control-rail border-b border-mosman-line p-4 md:border-b-0">
              <div className="mb-4">
                <LayerToggle
                  icon={Zap}
                  label="Future LV/HV stress"
                  detail="20-30 year inadequate power-line and distributor areas"
                  checked={showGridStress}
                  onChange={() => setShowGridStress(value => !value)}
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Layer opacity</p>
                  <span className="text-xs font-mono font-bold text-slate-700">{layerOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={layerOpacity}
                  onChange={e => setLayerOpacity(Number(e.target.value))}
                  className="w-full accent-mosman-teal cursor-pointer"
                />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Planning map overlays</p>
              <div className="mt-3 space-y-2">
                {OVERLAY_LAYERS.map(layer => (
                  <label key={layer.code} className="holo-list-item flex cursor-pointer items-start gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={activeLayers.includes(layer.code)}
                      onChange={() => toggleLayer(layer.code)}
                      className="mt-1 accent-mosman-teal"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: layer.color }} />
                        <span className="text-sm font-medium text-slate-800">{layer.code}</span>
                      </span>
                      <span className="block text-xs text-slate-500">{layer.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
            <div className="px-4 pt-3 pb-2 border-b border-slate-200/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Hologram density model</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{selectedScope.label}</p>
              <p className="mt-0.5 text-xs text-slate-300">
                Neon roofline extensions follow current OSM footprints. LV and 11 kV stress pockets appear as hot translucent fields when enabled.
              </p>
            </div>

            {calibrationMode && (
              <div className="bg-fuchsia-950 border-b border-fuchsia-500/30 px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-bold text-fuchsia-200 uppercase tracking-wider">
                    Calibration — drag the corner handles to align the layer
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const text = JSON.stringify(calibratedCoords.map(c => [
                        Number(c[0].toFixed(6)),
                        Number(c[1].toFixed(6)),
                      ]))
                      navigator.clipboard.writeText(text)
                    }}
                    className="text-xs font-semibold bg-fuchsia-200 text-fuchsia-900 px-2.5 py-1 rounded hover:bg-white flex-shrink-0"
                  >
                    Copy coords
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {['NW', 'NE', 'SE', 'SW'].map((label, index) => (
                    <div key={label} className="bg-fuchsia-900/60 rounded px-2 py-1.5">
                      <p className="text-[10px] font-bold text-fuchsia-300 mb-0.5">{label}</p>
                      <p className="text-xs text-white font-mono leading-snug">
                        {calibratedCoords[index]?.[0].toFixed(4)},<br />
                        {calibratedCoords[index]?.[1].toFixed(4)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              <Mosman3DMap
                activeLayers={activeLayers}
                selectedScope={selectedScope}
                futureOptions={futureOptions}
                scenario={scenario}
                showGridStress={showGridStress}
                onNetworkAreaSelect={setSelectedNetworkArea}
                layerOpacity={layerOpacity}
                calibrationMode={calibrationMode}
                calibCoords={calibratedCoords}
                onCalibratedCoords={setCalibratedCoords}
              />
              <MapLegend activeLayers={activeLayers} showGridStress={showGridStress} />
              <NetworkStressStrip
                selectedArea={selectedNetworkArea}
                selectedScope={selectedScope}
                futureOptions={futureOptions}
                showGridStress={showGridStress}
                setShowGridStress={setShowGridStress}
              />
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                {OVERLAY_LAYERS.filter(layer => activeLayers.includes(layer.code)).map(layer => (
                  <div key={layer.code} className="holo-list-item px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: layer.color }} />
                      <p className="text-xs font-semibold text-slate-900">{layer.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{layer.summary}</p>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>

        <FutureGridPanel
          selectedScope={selectedScope}
          futureScope={futureScope}
          setFutureScope={setFutureScope}
          futureOptions={futureOptions}
          toggleFutureOption={toggleFutureOption}
          scenario={scenario}
          showGridStress={showGridStress}
          setShowGridStress={setShowGridStress}
          selectedNetworkArea={selectedNetworkArea}
          setSelectedNetworkArea={setSelectedNetworkArea}
        />
      </div>

      <FutureInfrastructureSchedule
        selectedNetworkArea={selectedNetworkArea}
        setSelectedNetworkArea={setSelectedNetworkArea}
        setShowGridStress={setShowGridStress}
        selectedScope={selectedScope}
        futureOptions={futureOptions}
      />

      <NowFutureIssueSummary
        selectedNetworkArea={selectedNetworkArea}
        setSelectedNetworkArea={setSelectedNetworkArea}
        setShowGridStress={setShowGridStress}
        selectedPlanGap={selectedPlanGap}
        setSelectedPlanGap={setSelectedPlanGap}
        setActiveLayers={setActiveLayers}
        selectedScope={selectedScope}
        futureOptions={futureOptions}
      />

      <StatePowerLawComparison
        selectedNetworkArea={selectedNetworkArea}
        setSelectedNetworkArea={setSelectedNetworkArea}
        setShowGridStress={setShowGridStress}
        selectedPlanGap={selectedPlanGap}
        setSelectedPlanGap={setSelectedPlanGap}
        setActiveLayers={setActiveLayers}
        selectedScope={selectedScope}
        futureOptions={futureOptions}
      />

      <FuturePlanGapSchedule
        selectedGap={selectedPlanGap}
        setSelectedGap={setSelectedPlanGap}
        setActiveLayers={setActiveLayers}
      />

      <FutureDeliveryRoadmap
        selectedGap={selectedPlanGap}
        setSelectedGap={setSelectedPlanGap}
        setActiveLayers={setActiveLayers}
      />

      <InfluencePanel />

      <div className="flex items-center justify-between border-t border-mosman-line pt-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Official LEP 2012 Map Library</h3>
          <p className="text-slate-500 text-sm">61 PDFs across 10 map types - view or mark up any source sheet</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
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

          return (
            <div key={code} className="bg-white border border-mosman-line rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-mosman-line flex items-center gap-3 bg-slate-50">
                <span className={`${type.color} text-white text-xs font-bold px-2 py-1 rounded font-mono`}>{code}</span>
                <div>
                  <p className="text-slate-900 font-semibold text-sm">{type.name}</p>
                  <p className="text-slate-500 text-xs">{type.desc}</p>
                </div>
                <span className="ml-auto text-xs text-slate-400">{current.length} current</span>
              </div>

              <div className="p-3 space-y-1">
                {current.map(map => (
                  <MapRow key={map.id} map={map} onView={setSelected} onMarkup={setMarkupMap} hasMarkup={hasMarkup(map.id)} />
                ))}

                {!filterCurrent && historical.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowHistory(h => ({ ...h, [code]: !h[code] }))}
                      className="w-full text-left text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 pt-1 pl-1">
                      {showHistory[code] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {historical.length} historical version{historical.length !== 1 ? 's' : ''}
                    </button>
                    {showHistory[code] && historical.map(map => (
                      <MapRow key={map.id} map={map} onView={setSelected} onMarkup={setMarkupMap} hasMarkup={hasMarkup(map.id)} historical />
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
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
          <div className="bg-white border-b border-mosman-line px-4 py-3 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-slate-900 font-semibold">{MAP_TYPES[selected.code].name} — {selected.label}</p>
              <p className="text-xs text-slate-400 font-mono">{selected.filename}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setMarkupMap(selected); setSelected(null) }}
                className="flex items-center gap-1.5 bg-mosman-pink text-white px-3 py-1.5 rounded text-sm font-medium hover:opacity-90">
                <Pencil size={13} /> Mark Up
              </button>
              <a href={selected.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-mosman-teal hover:underline">
                <ExternalLink size={12} /> New tab
              </a>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 ml-2">
                <X size={20} />
              </button>
            </div>
          </div>
          <iframe src={selected.url} className="flex-1 w-full" title={selected.filename} />
        </div>
      )}

      {/* Markup Tool */}
      {markupMap && (
        <MapMarkup map={markupMap} onClose={() => setMarkupMap(null)} />
      )}
    </div>
  )
}

function MapLegend({ activeLayers, showGridStress }) {
  const symbols = [
    { label: 'Official LEP map sheet', swatch: 'bg-rose-200 ring-2 ring-slate-300', detail: 'The checked layer is drawn from the current Mosman LEP PDF sheet 002' },
    { label: 'Current OSM building footprint', swatch: 'bg-slate-500', detail: 'Subtle grey extrusions above the official LEP sheet' },
    { label: 'Future hologram extension', swatch: 'bg-cyan-300', detail: 'Neon massing rising from existing rooflines' },
    { label: 'Hologram floor plates', swatch: 'bg-pink-300', detail: 'Bright internal deck slices in future buildings' },
    { label: 'Highest influence buffer', swatch: 'bg-pink-300 ring-4 ring-yellow-200', detail: 'Areas needing early infrastructure and controls' },
    {
      label: `Future inadequate LV/HV areas${showGridStress ? '' : ' (off)'}`,
      swatch: 'bg-rose-400 ring-4 ring-yellow-100',
      detail: '20-30 year power-line and feeder stress pockets',
    },
    {
      label: `Inadequate LV line route${showGridStress ? '' : ' (off)'}`,
      swatch: 'bg-teal-300',
      detail: 'Street-level LV distributor or service corridor needing reconductoring',
    },
    { label: 'Power demand node', swatch: 'bg-cyan-400 rounded-full border-2 border-white', detail: 'Projected local EV/solar/V2G load in MW' },
    { label: 'HV / 11 kV reinforcement', swatch: 'bg-rose-500', detail: 'Feeder or ring automation corridor' },
    { label: 'LV reconductoring', swatch: 'bg-teal-500', detail: 'Low voltage street-level upgrade corridor' },
  ]

  return (
    <div className="holo-info-panel mt-4 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legend</p>
        <p className="text-xs text-slate-400">{activeLayers.length} planning overlays visible</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {OVERLAY_LAYERS.map(layer => (
          <LegendItem
            key={layer.code}
            color={layer.color}
            label={`${layer.code} - ${layer.label}${activeLayers.includes(layer.code) ? '' : ' (off)'}`}
            detail={activeLayers.includes(layer.code) ? layer.summary : 'Available planning overlay; tick it on to show this colour on the map.'}
          />
        ))}
        {symbols.map(symbol => (
          <LegendItem key={symbol.label} className={symbol.swatch} label={symbol.label} detail={symbol.detail} />
        ))}
      </div>
    </div>
  )
}

function LegendItem({ color, className, label, detail }) {
  return (
    <div className="holo-list-item flex items-start gap-2 px-2 py-2">
      <span
        className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${className || 'rounded-sm'}`}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span>
        <span className="block text-xs font-semibold text-slate-800">{label}</span>
        <span className="block text-[11px] leading-snug text-slate-500">{detail}</span>
      </span>
    </div>
  )
}

function LayerToggle({ icon: Icon, label, detail, checked, onChange }) {
  return (
    <label className="holo-layer-toggle flex cursor-pointer items-center gap-3 px-3 py-3">
      <Icon size={16} className={checked ? 'text-rose-500' : 'text-slate-400'} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="block text-xs leading-snug text-slate-500">{detail}</span>
      </span>
      <Switch checked={checked} />
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  )
}

function Switch({ checked }) {
  return (
    <span className={`switch-shell ${checked ? 'switch-shell-on' : ''}`} aria-hidden="true">
      <span className={`switch-knob ${checked ? 'switch-knob-on' : ''}`} />
    </span>
  )
}

function NetworkStressStrip({ selectedArea, selectedScope, futureOptions, showGridStress, setShowGridStress }) {
  const topAreas = GRID_STRESS_AREAS.slice(0, 3)

  return (
    <section className="holo-info-panel mt-4 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-rose-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Future Network Inadequacy</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGridStress(value => !value)}
          className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${showGridStress ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}
        >
          {showGridStress ? 'Layer on' : 'Layer off'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SelectedNetworkArea area={selectedArea} selectedScope={selectedScope} futureOptions={futureOptions} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {topAreas.map(area => (
            <div key={area.id} className="holo-list-item px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-slate-900">{area.label}</p>
                <RiskScoreBadge score={getNetworkRiskScore(area, selectedScope, futureOptions)} compact />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">{area.networkType} · {area.severity}</p>
            </div>
          ))}
        </div>
      </div>
      <NetworkRatingGuide />
    </section>
  )
}

function SelectedNetworkArea({ area, selectedScope, futureOptions }) {
  if (!area) {
    return (
      <div className="holo-list-item px-3 py-3">
        <p className="text-sm font-semibold text-slate-900">No network area selected</p>
        <p className="mt-1 text-xs text-slate-500">The highest-risk LV/HV stress pockets remain highlighted on the map.</p>
      </div>
    )
  }

  const baseScore = getNetworkBaseScore(area)
  const score = getNetworkRiskScore(area, selectedScope, futureOptions)
  const band = getRiskBand(score)
  const shift = score - baseScore

  return (
    <article className="holo-list-item px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{area.label}</p>
          <p className="text-xs text-slate-500">{area.networkType} · {area.severity}</p>
        </div>
        <RiskScoreBadge score={score} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        {band.label} means {band.meaning}. Higher is worse. Base {baseScore}/100{shift === 0 ? '' : `, adjusted ${shift > 0 ? '+' : ''}${shift}`} for the current growth, charging, V2G, and solar settings.
      </p>
      <p className="mt-2 text-xs text-slate-600">{area.futureStress}</p>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {(area.missing || []).slice(0, 3).map(item => (
          <p key={item} className="rounded border border-white/80 bg-white/80 px-2 py-1 text-[11px] leading-snug text-slate-600">{item}</p>
        ))}
      </div>
    </article>
  )
}

function NetworkRatingGuide() {
  return (
    <div className="network-rating-guide">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rating system - higher is worse</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          This is a planning risk score, not an official Ausgrid capacity or voltage reading. It shows how likely an area is to need powerline, feeder, transformer, parking, or charging upgrades under the future scenario.
        </p>
      </div>
      <div className="network-rating-scale">
        {RISK_BANDS.map(band => (
          <span key={band.label} className={`network-rating-scale-${band.tone}`}>
            <strong>{band.range}</strong>
            {band.label}: {band.short}
          </span>
        ))}
      </div>
    </div>
  )
}

const RISK_BANDS = [
  {
    min: 90,
    range: '90-100',
    label: 'Critical',
    short: 'bad / early upgrade likely',
    meaning: 'the area is likely inadequate without early upgrade planning',
    tone: 'critical',
  },
  {
    min: 80,
    range: '80-89',
    label: 'High',
    short: 'upgrade likely',
    meaning: 'the area is under strong future pressure and likely needs targeted upgrades',
    tone: 'high',
  },
  {
    min: 70,
    range: '70-79',
    label: 'Constrained',
    short: 'mitigate and monitor',
    meaning: 'the area can possibly work, but only with controls, monitoring, or local upgrades',
    tone: 'constrained',
  },
  {
    min: 0,
    range: '<70',
    label: 'Monitor',
    short: 'watch / confirm',
    meaning: 'the area is not the first priority, but still needs confirmation as growth arrives',
    tone: 'monitor',
  },
]

function getRiskBand(score) {
  return RISK_BANDS.find(band => score >= band.min) || RISK_BANDS[RISK_BANDS.length - 1]
}

function RiskScoreBadge({ score, compact = false }) {
  const band = getRiskBand(score)
  return (
    <span className={`risk-score-badge risk-score-badge-${band.tone}`}>
      {compact ? `${band.label} ${score}` : `${band.label} ${score}/100`}
    </span>
  )
}

function getNetworkBaseScore(area) {
  return Number(area?.baseScore ?? GRID_STRESS_AREAS.find(candidate => candidate.id === area?.id)?.score ?? area?.score ?? 0)
}

function getNetworkRiskScore(area, selectedScope, futureOptions) {
  return getProjectedGridStressScore(getNetworkBaseScore(area), selectedScope, futureOptions)
}

function getStressAreaForParking(parkingArea) {
  return GRID_STRESS_AREAS.find(area =>
    parkingArea.area.includes('Spit') ? area.id.includes('spit')
      : parkingArea.area.includes('Military Road') ? area.id.includes('military')
        : parkingArea.area.includes('Village') ? area.id.includes('village')
          : parkingArea.area.includes('Balmoral') ? area.id.includes('balmoral')
            : false
  )
}

function FutureInfrastructureSchedule({ selectedNetworkArea, setSelectedNetworkArea, setShowGridStress, selectedScope, futureOptions }) {
  const lvAreas = GRID_STRESS_AREAS.filter(area => !area.networkType.includes('11 kV'))
  const hvAreas = GRID_STRESS_AREAS.filter(area => area.networkType.includes('11 kV'))

  function selectArea(area) {
    setSelectedNetworkArea(area)
    setShowGridStress(true)
  }

  function selectParkingArea(parkingArea) {
    const match = getStressAreaForParking(parkingArea)
    if (match) selectArea(match)
  }

  return (
    <section className="map-interface-shell overflow-hidden rounded-lg">
      <div className="map-interface-head flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Future LV/HV Lines And Parking Constraints</p>
          <p className="text-xs text-slate-500">Inadequate line reasons and parking/charging requirements behind the 20-30 year future overlay. Scores are planning risk out of 100, not measured spare capacity.</p>
        </div>
        <span className="rounded bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {GRID_STRESS_AREAS.length} network areas · {FUTURE_PARKING_AREAS.length} parking areas
        </span>
      </div>

      <div className="px-4 pt-4">
        <NetworkRatingGuide />
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-3">
        <InfrastructureColumn
          title="LV Line Inadequacy"
          tone="teal"
          items={lvAreas}
          selectedId={selectedNetworkArea?.id}
          onSelect={selectArea}
          selectedScope={selectedScope}
          futureOptions={futureOptions}
        />
        <InfrastructureColumn
          title="HV / 11 kV Inadequacy"
          tone="rose"
          items={hvAreas}
          selectedId={selectedNetworkArea?.id}
          onSelect={selectArea}
          selectedScope={selectedScope}
          futureOptions={futureOptions}
        />
        <ParkingColumn onSelect={selectParkingArea} />
      </div>
    </section>
  )
}

function InfrastructureColumn({ title, tone, items, selectedId, onSelect, selectedScope, futureOptions }) {
  const toneClass = tone === 'rose' ? 'text-rose-600 bg-rose-100' : 'text-teal-700 bg-teal-100'

  return (
    <div className="future-schedule-column">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${toneClass}`}>{items.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map(area => (
          (() => {
            const score = getNetworkRiskScore(area, selectedScope, futureOptions)
            const band = getRiskBand(score)

            return (
          <button
            type="button"
            key={area.id}
            onClick={() => onSelect(area)}
            className={`future-schedule-card text-left ${selectedId === area.id ? 'future-schedule-card-selected' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{area.label}</p>
                <p className="text-xs text-slate-500">{area.severity} · {band.label.toLowerCase()} risk</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${toneClass}`}>{area.networkType}</span>
                <RiskScoreBadge score={score} compact />
              </div>
            </div>

            <p className="mt-2 text-xs leading-snug text-slate-600">{area.futureStress}</p>
            <div className="mt-2 space-y-1.5">
              {area.missing.map(item => (
                <p key={item} className="future-schedule-reason">{item}</p>
              ))}
            </div>
            <p className="mt-2 border-t border-white/80 pt-2 text-[11px] leading-snug text-slate-500">{area.requiredUpgrade}</p>
          </button>
            )
          })()
        ))}
      </div>
    </div>
  )
}

function ParkingColumn({ onSelect }) {
  return (
    <div className="future-schedule-column">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Parking / Charging Areas</p>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{FUTURE_PARKING_AREAS.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {FUTURE_PARKING_AREAS.map(area => (
          <button
            type="button"
            key={area.id}
            onClick={() => onSelect(area)}
            className="future-schedule-card text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{area.label}</p>
                <p className="text-xs text-slate-500">{area.area} · {area.bays}</p>
              </div>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{area.priority}</span>
            </div>
            <p className="mt-2 text-xs leading-snug text-slate-600">{area.reason}</p>
            <div className="mt-2 space-y-1.5">
              {area.missing.map(item => (
                <p key={item} className="future-schedule-reason">{item}</p>
              ))}
            </div>
            <p className="mt-2 border-t border-white/80 pt-2 text-[11px] leading-snug text-slate-500">{area.gridTie}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function NowFutureIssueSummary({
  selectedNetworkArea,
  setSelectedNetworkArea,
  setShowGridStress,
  selectedPlanGap,
  setSelectedPlanGap,
  setActiveLayers,
  selectedScope,
  futureOptions,
}) {
  const networkIssues = GRID_STRESS_AREAS.map(area => ({
    id: area.id,
    title: area.label,
    group: 'Power lines',
    tag: formatRiskTag(area, selectedScope, futureOptions, area.networkType),
    now: area.existingLine,
    future: area.futureStress,
    councilPower: getNetworkCouncilPowerIssue(area),
    selected: selectedNetworkArea?.id === area.id,
    onSelect: () => {
      setSelectedNetworkArea(area)
      setShowGridStress(true)
    },
  }))

  const parkingIssues = FUTURE_PARKING_AREAS.map(area => {
    const linkedStressArea = getStressAreaForParking(area)

    return {
      id: area.id,
      title: area.label,
      group: 'Parking / charging',
      tag: area.bays,
      now: getParkingCurrentCondition(area),
      future: area.reason,
      councilPower: getParkingCouncilPowerIssue(area),
      selected: linkedStressArea ? selectedNetworkArea?.id === linkedStressArea.id : false,
      onSelect: () => {
        if (linkedStressArea) {
          setSelectedNetworkArea(linkedStressArea)
          setShowGridStress(true)
        }
      },
    }
  })

  const planningIssues = FUTURE_PLAN_GAPS.map(gap => ({
    id: gap.id,
    title: gap.label,
    group: 'Planning controls',
    tag: gap.relatedLayers.join(' + '),
    now: gap.currentPlanGap,
    future: gap.futurePressure,
    councilPower: gap.councilPowerIssue,
    selected: selectedPlanGap?.id === gap.id,
    onSelect: () => {
      setSelectedPlanGap(gap)
      setActiveLayers(layers => Array.from(new Set([...layers, ...gap.relatedLayers])))
    },
  }))

  return (
    <section className="map-interface-shell overflow-hidden rounded-lg">
      <div className="map-interface-head flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Now Vs Future Planning Problems</p>
          <p className="text-xs text-slate-500">Brief comparison of what exists today and why each mapped issue becomes a future planning problem.</p>
        </div>
        <span className="rounded bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {networkIssues.length + parkingIssues.length + planningIssues.length} mapped issues
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-3">
        <IssueSummaryColumn title="Power Line Issues" items={networkIssues} />
        <IssueSummaryColumn title="Parking And Charging Issues" items={parkingIssues} />
        <IssueSummaryColumn title="Planning Control Issues" items={planningIssues} />
      </div>
    </section>
  )
}

function IssueSummaryColumn({ title, items }) {
  return (
    <div className="issue-summary-column">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <span className="rounded bg-cyan-100 px-2 py-0.5 text-[11px] font-bold text-cyan-700">{items.length}</span>
      </div>

      <div className="mt-3 space-y-2">
        {items.map(item => (
          <button
            type="button"
            key={item.id}
            onClick={item.onSelect}
            className={`issue-summary-card text-left ${item.selected ? 'issue-summary-card-selected' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-slate-900">{item.title}</p>
                <p className="text-[11px] text-slate-500">{item.group}</p>
              </div>
              <span className="issue-summary-pill">{item.tag}</span>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2">
              <div className="issue-summary-block">
                <p className="issue-summary-label">Now</p>
                <p>{item.now}</p>
              </div>
              <div className="issue-summary-block issue-summary-block-future">
                <p className="issue-summary-label">Future Problem</p>
                <p>{item.future}</p>
              </div>
              {item.councilPower && (
                <div className="issue-summary-block issue-summary-block-opinion">
                  <p className="issue-summary-label">Council Vs Power System</p>
                  <p>{item.councilPower}</p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function StatePowerLawComparison({
  selectedNetworkArea,
  setSelectedNetworkArea,
  setShowGridStress,
  selectedPlanGap,
  setSelectedPlanGap,
  setActiveLayers,
  selectedScope,
  futureOptions,
}) {
  const [selectedComparisonId, setSelectedComparisonId] = useState('network:stress-spit-junction-lv-hv')
  const comparisonItems = buildStatePowerLawComparisons({
    selectedNetworkArea,
    setSelectedNetworkArea,
    setShowGridStress,
    selectedPlanGap,
    setSelectedPlanGap,
    setActiveLayers,
    selectedScope,
    futureOptions,
  })
  const selectedItem = comparisonItems.find(item => item.id === selectedComparisonId) || comparisonItems[0]

  function selectItem(item) {
    setSelectedComparisonId(item.id)
    item.onSelect()
  }

  return (
    <section className="map-interface-shell overflow-hidden rounded-lg">
      <div className="map-interface-head flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">State Plan Vs Law Capacity Vs Powerlines</p>
          <p className="text-xs text-slate-500">Working comparison of state housing direction, current LEP capacity, powerline readiness, and overlooked delivery actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATE_PLANNING_SOURCE_LINKS.map(source => (
            <a
              key={source.href}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {source.label} <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(260px,0.38fr)_minmax(0,0.62fr)]">
        <div className="state-comparison-list">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mapped Issues</p>
            <span className="rounded bg-cyan-100 px-2 py-0.5 text-[11px] font-bold text-cyan-700">{comparisonItems.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {comparisonItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item)}
                className={`state-comparison-row ${selectedItem?.id === item.id ? 'state-comparison-row-selected' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="block text-[11px] text-slate-500">{item.group} · {item.place}</span>
                </span>
                <span className="state-comparison-type">{item.type}</span>
              </button>
            ))}
          </div>
        </div>

        <ComparisonDetail item={selectedItem} />
      </div>
    </section>
  )
}

function ComparisonDetail({ item }) {
  if (!item) {
    return (
      <div className="state-comparison-detail">
        <p className="text-sm font-semibold text-slate-900">Select an issue</p>
        <p className="mt-1 text-xs text-slate-500">Choose a mapped issue to compare state planning, law capacity, power readiness, and overlooked work.</p>
      </div>
    )
  }

  return (
    <article className="state-comparison-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          <p className="text-xs text-slate-500">{item.group} · {item.place}</p>
        </div>
        <span className="state-comparison-type state-comparison-type-strong">{item.type}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ComparisonBlock title="State Government Plan" body={item.statePlan} tone="state" />
        <ComparisonBlock title="Planning / LEP Capacity" body={item.lawCapacity} tone="law" />
        <ComparisonBlock title="Powerline Readiness" body={item.powerlineCapacity} tone="power" />
        <ComparisonBlock title="Overlooked To Meet Goals" body={item.overlooked} tone="action" />
      </div>

      <p className="mt-3 rounded border border-cyan-200/80 bg-cyan-50/60 px-3 py-2 text-[11px] leading-snug text-slate-500">
        Working assessment: use this to flag coordination gaps. It does not replace a site-specific planning certificate, network capacity assessment, or official utility connection study.
      </p>
    </article>
  )
}

function ComparisonBlock({ title, body, tone }) {
  return (
    <div className={`state-comparison-block state-comparison-block-${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-1 text-xs leading-snug text-slate-600">{body}</p>
    </div>
  )
}

const STATE_PLANNING_SOURCE_LINKS = [
  {
    label: 'Mosman target',
    href: 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/housing-targets/mosman-councils-housing-snapshot',
  },
  {
    label: 'Low/mid-rise',
    href: 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy',
  },
  {
    label: 'TOD program',
    href: 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/transport-oriented-development-program',
  },
]

function buildStatePowerLawComparisons({
  selectedNetworkArea,
  setSelectedNetworkArea,
  setShowGridStress,
  selectedPlanGap,
  setSelectedPlanGap,
  setActiveLayers,
  selectedScope,
  futureOptions,
}) {
  const networkItems = GRID_STRESS_AREAS.map(area => ({
    id: `network:${area.id}`,
    title: area.label,
    group: 'Power line issue',
    place: area.networkType,
    type: formatRiskTag(area, selectedScope, futureOptions),
    statePlan: getStateDirectionForNetwork(area),
    lawCapacity: getLawCapacityForNetwork(area),
    powerlineCapacity: `${area.existingLine} Current scenario risk is ${formatRiskTag(area, selectedScope, futureOptions)} because ${area.futureStress.toLowerCase()}`,
    overlooked: `${area.requiredUpgrade} Also overlooked: ${(area.missing || []).join('; ')}.`,
    selected: selectedNetworkArea?.id === area.id,
    onSelect: () => {
      setSelectedNetworkArea(area)
      setShowGridStress(true)
    },
  }))

  const parkingItems = FUTURE_PARKING_AREAS.map(area => {
    const linkedStressArea = getStressAreaForParking(area)
    const riskText = linkedStressArea
      ? `${linkedStressArea.label} is the linked network proxy at ${formatRiskTag(linkedStressArea, selectedScope, futureOptions)}. ${linkedStressArea.futureStress}`
      : 'No single linked feeder has been assigned yet; a parking-to-feeder study is still needed.'

    return {
      id: `parking:${area.id}`,
      title: area.label,
      group: 'Parking and charging issue',
      place: area.area,
      type: area.priority,
      statePlan: 'State housing growth increases the number of EV-capable households near centres and services, so parking policy has to become charging infrastructure policy.',
      lawCapacity: 'Current planning controls can manage parking supply and built form, but they do not by themselves reserve enough EV-ready bays, charger load controls, or transformer access.',
      powerlineCapacity: riskText,
      overlooked: `${area.gridTie} Also overlooked: ${area.missing.join('; ')}.`,
      selected: linkedStressArea ? selectedNetworkArea?.id === linkedStressArea.id : false,
      onSelect: () => {
        if (linkedStressArea) {
          setSelectedNetworkArea(linkedStressArea)
          setShowGridStress(true)
        }
      },
    }
  })

  const planningItems = FUTURE_PLAN_GAPS.map(gap => ({
    id: `planning:${gap.id}`,
    title: gap.label,
    group: 'Planning control issue',
    place: gap.category,
    type: gap.relatedLayers.join(' + '),
    statePlan: getStateDirectionForPlanGap(gap),
    lawCapacity: `Current planning capacity is mainly expressed through ${gap.relatedLayers.join(', ')} controls. ${gap.currentPlanGap}`,
    powerlineCapacity: getPowerlineReadinessForPlanGap(gap, selectedScope, futureOptions),
    overlooked: `${gap.requiredAction} Also overlooked: ${gap.missing.join('; ')}.`,
    selected: selectedPlanGap?.id === gap.id,
    onSelect: () => {
      setSelectedPlanGap(gap)
      setActiveLayers(layers => Array.from(new Set([...layers, ...gap.relatedLayers])))
    },
  }))

  return [...networkItems, ...parkingItems, ...planningItems]
}

function getStateDirectionForNetwork(area) {
  if (area.id.includes('spit')) {
    return 'State housing direction puts more homes near centres and services. For Spit Junction, that means centre uplift can arrive before 11 kV switching, transformer space, and LV distributor capacity are ready.'
  }
  if (area.id.includes('military')) {
    return 'State well-located housing policy points pressure toward corridors like Military Road, but the growth outcome depends on whether narrow LV streets can accept charging, solar export, and service upgrades.'
  }
  if (area.id.includes('village')) {
    return 'State housing diversity goals support more smaller homes and renewal, while Mosman Village needs heritage-sensitive electrical upgrades before that renewal can carry full EV and solar load.'
  }
  if (area.id.includes('balmoral')) {
    return 'State housing and visitor demand pressure still reaches the foreshore, but scenic and environmental constraints make visible power infrastructure harder to place.'
  }
  return 'State housing growth increases electrical demand and two-way energy flows, so mapped power constraints need to be tested before dwelling capacity is treated as deliverable.'
}

function getLawCapacityForNetwork(area) {
  if (area.networkType.includes('11 kV')) {
    return 'The LEP layers can show where height, FSR, and land use may allow uplift, but they do not reserve 11 kV feeder routes, switching sites, or transformer easements.'
  }
  if (area.id.includes('balmoral')) {
    return 'Foreshore, scenic, and environmental controls protect the area, but current controls do not fully answer where LV voltage equipment, chargers, and service routes can go.'
  }
  if (area.id.includes('village')) {
    return 'Heritage and built-form controls limit visible change; the legal capacity for infill only becomes practical if electrical plant and strata service upgrades are planned discreetly.'
  }
  return 'The current LEP can permit modest dwelling or mixed-use change in places, but LV capacity, phase balance, and charger controls are not directly solved by those planning permissions.'
}

function getStateDirectionForPlanGap(gap) {
  if (gap.id === 'gap-housing-capacity') {
    return 'NSW has set housing targets and low/mid-rise reforms to lift well-located housing supply; Mosman’s target and centre/corridor capacity need to be tested against infrastructure delivery.'
  }
  if (gap.id === 'gap-heritage-infill') {
    return 'State policy seeks more housing diversity, but local heritage areas need a clearer pathway for carefully located infill rather than blanket pressure or one-off rezonings.'
  }
  if (gap.id === 'gap-foreshore-climate') {
    return 'State growth expectations assume constraints can be managed, but foreshore climate, scenic, excavation, and visitor infrastructure constraints need a combined test.'
  }
  if (gap.id === 'gap-active-transport') {
    return 'State well-located housing relies on walking, cycling, and transit access; corridors need crossing, kerb, and service capacity before extra density is comfortable.'
  }
  if (gap.id === 'gap-open-space-heat') {
    return 'More housing has to be matched with liveability, shade, canopy, and heat resilience, especially where chargers and hardstand areas compete for street space.'
  }
  if (gap.id === 'gap-community-facilities') {
    return 'State housing delivery expects supporting schools, health, care, and community services, but those sites and floorspace triggers need to be reserved early.'
  }
  if (gap.id === 'gap-waste-loading') {
    return 'State-led uplift can increase mixed-use activity, deliveries, and servicing loads; local controls need to prove back-of-house capacity before extra height or FSR is released.'
  }
  if (gap.id === 'gap-water-stormwater') {
    return 'State housing growth still has to pass environmental and stormwater constraints; basements, conduits, substations, and charger works make this more complex.'
  }
  if (gap.id === 'gap-emergency-resilience') {
    return 'A larger, older, more electrified population needs emergency access, backup power, cooling, and communications resilience alongside new dwellings.'
  }
  return 'State housing direction increases pressure for growth, so local capacity needs to be tested across infrastructure, environment, services, and power.'
}

function getPowerlineReadinessForPlanGap(gap, selectedScope, futureOptions) {
  const linkedArea = getStressAreaForPlanGap(gap)
  if (!linkedArea) {
    return 'No single LV/HV area dominates this issue; a feeder-by-feeder load study is needed before the planning capacity can be treated as deliverable.'
  }

  return `${linkedArea.label} is the closest mapped power constraint at ${formatRiskTag(linkedArea, selectedScope, futureOptions)}. ${linkedArea.futureStress}`
}

function formatRiskTag(area, selectedScope, futureOptions, prefix = '') {
  const score = getNetworkRiskScore(area, selectedScope, futureOptions)
  const band = getRiskBand(score)
  const label = `${band.label} ${score}/100`
  return prefix ? `${prefix} · ${label}` : label
}

function getStressAreaForPlanGap(gap) {
  if (['gap-housing-capacity', 'gap-active-transport', 'gap-community-facilities', 'gap-waste-loading'].includes(gap.id)) {
    return GRID_STRESS_AREAS.find(area => area.id === 'stress-spit-junction-lv-hv')
  }
  if (gap.id === 'gap-heritage-infill') {
    return GRID_STRESS_AREAS.find(area => area.id === 'stress-mosman-village-lv')
  }
  if (['gap-foreshore-climate', 'gap-water-stormwater', 'gap-emergency-resilience'].includes(gap.id)) {
    return GRID_STRESS_AREAS.find(area => area.id === 'stress-balmoral-foreshore-lv')
  }
  if (gap.id === 'gap-open-space-heat') {
    return GRID_STRESS_AREAS.find(area => area.id === 'stress-military-west-lv')
  }
  return null
}

function getNetworkCouncilPowerIssue(area) {
  if (area.networkType.includes('11 kV')) {
    return 'Planning opinion: centre/corridor uplift can be supported in principle, but the existing feeder and transformer system needs earlier 11 kV switching, protection, and substation capacity than the land-use maps show.'
  }
  if (area.id.includes('balmoral')) {
    return 'Planning opinion: Council’s foreshore and scenic objectives limit visible infrastructure, while the LV system still needs voltage support and controlled charger locations to handle visitor and household EV load.'
  }
  if (area.id.includes('village')) {
    return 'Planning opinion: heritage-sensitive renewal is possible, but the present LV network and older strata services need discreet transformer, service, and managed-charging upgrades first.'
  }
  return 'Planning opinion: Council can encourage growth and EV readiness, but the current LV streets need reconductoring, phase balancing, and charger controls before heavy household EV adoption is reliable.'
}

function getParkingCouncilPowerIssue(area) {
  if (area.id.includes('spit')) {
    return 'Planning opinion: more centre activity and apartment uplift should move charging into basements, but that only works if redevelopment also delivers transformer easements and managed building loads.'
  }
  if (area.id.includes('military')) {
    return 'Planning opinion: Council may prefer less kerb conflict on Military Road, yet homes without off-street parking will push charging demand onto LV streets unless shared off-street charging is required.'
  }
  if (area.id.includes('village')) {
    return 'Planning opinion: village character can be protected, but EV charging needs strata governance and hidden electrical capacity rather than ad hoc chargers on constrained heritage streets.'
  }
  if (area.id.includes('balmoral')) {
    return 'Planning opinion: foreshore amenity argues against visible charger clutter, while seasonal visitor demand still needs controlled off-street charging and LV support away from the most sensitive edge.'
  }
  return 'Planning opinion: parking policy and power planning have to be linked, because charger locations determine which LV feeders and transformers become overloaded first.'
}

function getParkingCurrentCondition(area) {
  if (area.id.includes('spit')) {
    return 'Existing centre parking is split across basements, retail turnover, strata spaces, and kerbside bays without a coordinated EV-ready load plan.'
  }
  if (area.id.includes('military')) {
    return 'Many corridor homes and shopfronts have limited off-street parking, so the kerb already carries parking, deliveries, buses, and access needs.'
  }
  if (area.id.includes('village')) {
    return 'Older strata sites and heritage streets have limited visible infrastructure space and inconsistent building-level charging readiness.'
  }
  if (area.id.includes('balmoral')) {
    return 'Foreshore parking is visitor-heavy, seasonal, visually sensitive, and difficult to service with extra electrical equipment.'
  }
  return 'Current parking is not consistently EV-ready and has limited spare space for chargers, transformers, and managed visitor charging.'
}

function FuturePlanGapSchedule({ selectedGap, setSelectedGap, setActiveLayers }) {
  function activateGap(gap) {
    setSelectedGap(gap)
    setActiveLayers(layers => Array.from(new Set([...layers, ...gap.relatedLayers])))
  }

  return (
    <section className="map-interface-shell overflow-hidden rounded-lg">
      <div className="map-interface-head flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Other 20-30 Year Plan Issues Not Yet Met</p>
          <p className="text-xs text-slate-500">Clickable list of non-grid, non-parking gaps that need controls or delivery triggers beyond the current map set.</p>
        </div>
        <span className="rounded bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {FUTURE_PLAN_GAPS.length} other issues
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="future-gap-list">
          {FUTURE_PLAN_GAPS.map(gap => (
            <button
              type="button"
              key={gap.id}
              onClick={() => activateGap(gap)}
              className={`future-gap-row ${selectedGap?.id === gap.id ? 'future-gap-row-selected' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{gap.label}</span>
                <span className="block text-xs text-slate-500">{gap.category} · {gap.severity} · {gap.horizon}</span>
              </span>
              <span className="flex flex-shrink-0 gap-1">
                {gap.relatedLayers.map(layer => (
                  <span key={layer} className="future-layer-chip">{layer}</span>
                ))}
              </span>
            </button>
          ))}
        </div>

        <PlanGapDetail gap={selectedGap} />
      </div>
    </section>
  )
}

function PlanGapDetail({ gap }) {
  if (!gap) {
    return (
      <div className="future-gap-detail">
        <p className="text-sm font-semibold text-slate-900">Select an issue</p>
        <p className="mt-1 text-xs text-slate-500">Click an issue to see what the current and future plans are missing.</p>
      </div>
    )
  }

  return (
    <article className="future-gap-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{gap.label}</p>
          <p className="text-xs text-slate-500">{gap.category} · {gap.severity} · {gap.horizon}</p>
        </div>
        <div className="flex gap-1">
          {gap.relatedLayers.map(layer => (
            <span key={layer} className="future-layer-chip future-layer-chip-strong">{layer}</span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="future-gap-block">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Existing Plan Gap</p>
          <p className="mt-1 text-xs leading-snug text-slate-600">{gap.currentPlanGap}</p>
        </div>
        <div className="future-gap-block">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Future Pressure</p>
          <p className="mt-1 text-xs leading-snug text-slate-600">{gap.futurePressure}</p>
        </div>
        <div className="future-gap-block future-gap-block-opinion">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Council Vs Power System</p>
          <p className="mt-1 text-xs leading-snug text-slate-600">{gap.councilPowerIssue}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {gap.missing.map(item => (
          <p key={item} className="future-schedule-reason">{item}</p>
        ))}
      </div>

      <p className="mt-3 border-t border-white/80 pt-3 text-xs leading-snug text-slate-600">{gap.requiredAction}</p>
    </article>
  )
}

function FutureDeliveryRoadmap({ selectedGap, setSelectedGap, setActiveLayers }) {
  const phases = ['0-10 years', '10-20 years', '20-30 years']

  function activateRoadmapItem(item) {
    const linkedGap = FUTURE_PLAN_GAPS.find(gap => gap.id === item.linkedGapId)
    if (linkedGap) setSelectedGap(linkedGap)

    setActiveLayers(layers => {
      const gapLayers = linkedGap?.relatedLayers || []
      return Array.from(new Set([...layers, ...item.layerCodes, ...gapLayers]))
    })
  }

  return (
    <section className="map-interface-shell overflow-hidden rounded-lg">
      <div className="map-interface-head flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">20-30 Year Delivery Roadmap</p>
          <p className="text-xs text-slate-500">Clickable actions sequenced by decade and linked back to the unmet issue and official map layers.</p>
        </div>
        <span className="rounded bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {FUTURE_DELIVERY_ROADMAP.length} delivery actions
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-3">
        {phases.map(phase => (
          <RoadmapPhase
            key={phase}
            phase={phase}
            items={FUTURE_DELIVERY_ROADMAP.filter(item => item.phase === phase)}
            selectedGapId={selectedGap?.id}
            onSelect={activateRoadmapItem}
          />
        ))}
      </div>
    </section>
  )
}

function RoadmapPhase({ phase, items, selectedGapId, onSelect }) {
  return (
    <div className="future-roadmap-phase">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{phase}</p>
          <p className="text-[11px] text-slate-500">{phase === '0-10 years' ? 'Foundation controls' : phase === '10-20 years' ? 'Infrastructure delivery' : 'Mature network adaptation'}</p>
        </div>
        <span className="rounded bg-cyan-100 px-2 py-0.5 text-[11px] font-bold text-cyan-700">{items.length}</span>
      </div>

      <div className="mt-3 space-y-2">
        {items.map(item => {
          const linkedGap = FUTURE_PLAN_GAPS.find(gap => gap.id === item.linkedGapId)
          const selected = item.linkedGapId === selectedGapId

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onSelect(item)}
              className={`future-roadmap-card text-left ${selected ? 'future-roadmap-card-selected' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.deliveryType}</p>
                </div>
                <span className={`future-priority-chip ${getPriorityClass(item.priority)}`}>{item.priority}</span>
              </div>

              <p className="mt-2 text-xs leading-snug text-slate-600">{item.action}</p>

              <div className="mt-2 flex flex-wrap gap-1">
                {item.layerCodes.map(layer => (
                  <span key={layer} className="future-layer-chip future-layer-chip-strong">{layer}</span>
                ))}
              </div>

              {linkedGap && (
                <p className="mt-2 text-[11px] font-semibold text-slate-500">Linked issue: {linkedGap.label}</p>
              )}

              <div className="mt-2 space-y-1">
                {item.dependencies.map(dependency => (
                  <p key={dependency} className="future-roadmap-dependency">{dependency}</p>
                ))}
              </div>

              <p className="mt-2 border-t border-white/80 pt-2 text-[11px] leading-snug text-slate-500">{item.outcome}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getPriorityClass(priority) {
  if (priority === 'Critical') return 'future-priority-critical'
  if (priority === 'High') return 'future-priority-high'
  if (priority === 'Medium-high') return 'future-priority-medium'
  return 'future-priority-standard'
}

function InfluencePanel() {
  return (
    <section className="map-interface-shell overflow-hidden rounded-lg">
      <div className="map-interface-head px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Most Influenced Areas And Missing Inputs</p>
        <p className="text-xs text-slate-500">These are the places where density, EV charging, power demand, parking, heritage, and public domain constraints overlap most strongly.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {IMPACT_AREAS.map(area => (
          <article key={area.id} className="holo-list-item p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{area.label}</p>
                <p className="text-xs text-slate-500">{area.severity}</p>
              </div>
              <span className="rounded px-2 py-0.5 text-xs font-bold text-slate-900" style={{ backgroundColor: area.border }}>
                {area.score}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {area.missing.map(item => (
                <p key={item} className="rounded border border-white bg-white/80 px-2 py-1 text-xs text-slate-600">{item}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function FutureGridPanel({
  selectedScope,
  futureScope,
  setFutureScope,
  futureOptions,
  toggleFutureOption,
  scenario,
  showGridStress,
  setShowGridStress,
  selectedNetworkArea,
  setSelectedNetworkArea,
}) {
  const visibleUpgrades = GRID_UPGRADES.filter(upgrade => {
    if (upgrade.id === 'wireless' && !futureOptions.wirelessCharging) return false
    if (upgrade.stage === 'Required baseline') return futureOptions.showRequired
    if (upgrade.stage !== 'Required baseline') return futureOptions.showUpgraded
    return true
  })

  return (
    <aside className="map-interface-shell overflow-hidden rounded-lg">
      <div className="map-interface-head px-4 py-3">
        <div className="flex items-center gap-2">
          <Car size={16} className="text-mosman-pink" />
          <p className="text-sm font-semibold text-slate-900">25-30 Year EV / V2G / Solar Scenario</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Growth scope</span>
          <select
            value={futureScope}
            onChange={event => setFutureScope(event.target.value)}
            className="mt-2 w-full rounded-lg border border-mosman-line bg-white px-3 py-2 text-sm text-slate-800 focus:border-mosman-teal focus:outline-none"
          >
            {FUTURE_SCOPES.map(scope => (
              <option key={scope.id} value={scope.id}>{scope.label}</option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-mosman-line bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">{selectedScope.population.toLocaleString()} people</p>
          <p className="text-xs text-slate-500">{selectedScope.households.toLocaleString()} households · {selectedScope.dwellings.toLocaleString()} dwellings</p>
          <p className="mt-2 text-xs text-slate-500">{selectedScope.note}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ScenarioMetric icon={Car} label="EVs" value={scenario.evCount.toLocaleString()} />
          <ScenarioMetric icon={PlugZap} label="Peak load" value={`${scenario.peakMw} MW`} />
          <ScenarioMetric icon={BatteryCharging} label="V2G export" value={`${scenario.v2gMw} MW`} muted={!futureOptions.v2g} />
          <ScenarioMetric icon={Sun} label="Solar" value={`${scenario.solarMw} MW`} muted={!futureOptions.solar} />
        </div>

        <div className="space-y-2">
          <ToggleRow label="Managed charging" checked={futureOptions.managedCharging} onChange={() => toggleFutureOption('managedCharging')} />
          <ToggleRow label="Vehicle-to-grid" checked={futureOptions.v2g} onChange={() => toggleFutureOption('v2g')} />
          <ToggleRow label="Rooftop solar export" checked={futureOptions.solar} onChange={() => toggleFutureOption('solar')} />
          <ToggleRow label="Wireless charging option" checked={futureOptions.wirelessCharging} onChange={() => toggleFutureOption('wirelessCharging')} />
          <ToggleRow label="Off-street parking requirement" checked={futureOptions.offStreetParking} onChange={() => toggleFutureOption('offStreetParking')} />
          <ToggleRow label="Future LV/HV inadequacy overlay" checked={showGridStress} onChange={() => setShowGridStress(value => !value)} />
          <ToggleRow label="Base requirements" checked={futureOptions.showRequired} onChange={() => toggleFutureOption('showRequired')} />
          <ToggleRow label="Upgraded infrastructure" checked={futureOptions.showUpgraded} onChange={() => toggleFutureOption('showUpgraded')} />
        </div>

        <div className="holo-info-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected Inadequate Area</p>
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${showGridStress ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
              {showGridStress ? 'Visible' : 'Hidden'}
            </span>
          </div>
          <div className="mt-2 space-y-2">
            <SelectedNetworkArea area={selectedNetworkArea} selectedScope={selectedScope} futureOptions={futureOptions} />
            <NetworkRatingGuide />
            <div className="grid grid-cols-1 gap-1.5">
              {GRID_STRESS_AREAS.map(area => {
                const score = getNetworkRiskScore(area, selectedScope, futureOptions)

                return (
                  <button
                    type="button"
                    key={area.id}
                    onClick={() => setSelectedNetworkArea(area)}
                    className={`holo-list-item flex items-center justify-between gap-2 px-3 py-2 text-left ${selectedNetworkArea?.id === area.id ? 'holo-list-item-selected' : ''}`}
                  >
                    <span>
                      <span className="block text-xs font-semibold text-slate-900">{area.label}</span>
                      <span className="block text-[11px] text-slate-500">{area.networkType}</span>
                    </span>
                    <RiskScoreBadge score={score} compact />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {futureOptions.offStreetParking && (
          <div className="holo-info-panel p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Off-street charging target</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{scenario.offStreetBays.toLocaleString()} bays</p>
            <p className="text-xs text-slate-500">EV-ready private, strata, visitor, and shared parking spaces at {Math.round(FUTURE_ASSUMPTIONS.offStreetTarget * 100)}% of households.</p>
          </div>
        )}

        <div className="space-y-2">
          {visibleUpgrades.map(upgrade => (
            <div key={upgrade.id} className="holo-list-item px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{upgrade.layer}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{upgrade.stage}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{upgrade.need}</p>
              <p className="mt-1 text-xs text-slate-400">{upgrade.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function ScenarioMetric({ icon: Icon, label, value, muted }) {
  return (
    <div className={`holo-list-item p-3 ${muted ? 'opacity-55' : ''}`}>
      <Icon size={15} className="mb-1 text-mosman-teal" />
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="holo-list-item flex cursor-pointer items-center justify-between gap-3 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <Switch checked={checked} />
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  )
}

function MapRow({ map, onView, onMarkup, hasMarkup, historical }) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 transition-colors group ${historical ? 'opacity-60' : ''}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${map.isCurrent ? 'bg-mosman-teal' : 'bg-slate-300'}`} />
      <button onClick={() => onView(map)} className="flex-1 text-left text-slate-700 text-sm group-hover:text-slate-900">
        {map.label}
      </button>
      {hasMarkup && (
        <span className="text-xs bg-mosman-pink/10 text-mosman-pink border border-mosman-pink/30 px-1.5 py-0.5 rounded font-medium">marked up</span>
      )}
      <span className="text-xs text-slate-400 font-mono">{map.date.replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1')}</span>
      <button onClick={() => onMarkup(map)} title="Open markup tool"
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-mosman-pink hover:bg-pink-50 transition-all">
        <Pencil size={13} />
      </button>
    </div>
  )
}

function calculateFutureScenario(scope, options) {
  const evCount = Math.round(scope.households * FUTURE_ASSUMPTIONS.evPerHousehold)
  const peakKw = options.managedCharging
    ? evCount * FUTURE_ASSUMPTIONS.managedKwPerEv * FUTURE_ASSUMPTIONS.managedCoincidence
    : evCount * FUTURE_ASSUMPTIONS.unmanagedKwPerEv * FUTURE_ASSUMPTIONS.unmanagedCoincidence
  const v2gKw = options.v2g
    ? evCount * FUTURE_ASSUMPTIONS.v2gKwPerEv * FUTURE_ASSUMPTIONS.v2gParticipation
    : 0
  const solarKw = options.solar
    ? scope.dwellings * FUTURE_ASSUMPTIONS.solarKwPerDwelling * FUTURE_ASSUMPTIONS.solarAdoption
    : 0

  return {
    evCount,
    peakMw: (peakKw / 1000).toFixed(1),
    v2gMw: (v2gKw / 1000).toFixed(1),
    solarMw: (solarKw / 1000).toFixed(1),
    offStreetBays: Math.round(scope.households * FUTURE_ASSUMPTIONS.offStreetTarget),
  }
}
