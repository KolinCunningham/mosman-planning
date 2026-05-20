import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  FUTURE_DEVELOPMENT_ZONES,
  GEO_PLANNING_LAYERS,
  GEO_ROUTES,
  getProjectedGridStressScore,
  GRID_STRESS_AREAS,
  GRID_STRESS_LINES,
  GRID_UPGRADE_LINES,
  IMPACT_AREAS,
  MOSMAN_MAP,
  OFFICIAL_LEP_RASTER_OVERLAYS,
  OFFICIAL_LEP_SHEET_002_COORDS,
  POWER_DEMAND_NODES,
} from '../data/planningOverlays'
import { OSM_BUILDINGS } from '../data/osmBuildings'

const EMPTY = { type: 'FeatureCollection', features: [] }

const BASE_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-base',
      type: 'raster',
      source: 'carto',
      paint: {
        'raster-saturation': -0.25,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.95,
      },
    },
  ],
}

export default function Mosman3DMap({
  activeLayers,
  selectedScope,
  futureOptions,
  scenario,
  showGridStress = true,
  onNetworkAreaSelect,
  calibrationMode = false,
  calibCoords,
  onCalibratedCoords,
  layerOpacity = 75,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)
  const selectRef = useRef(onNetworkAreaSelect)
  const calibMarkersRef = useRef([])
  const calibCoordsRef = useRef(null)

  const data = useMemo(() => ({
    boundary: boundaryCollection(),
    routes: routeCollection(),
    planning: planningCollection(activeLayers),
    impacts: EMPTY,
    stressAreas: gridStressAreaCollection(showGridStress, selectedScope, futureOptions),
    stressLines: gridStressLineCollection(showGridStress, selectedScope, futureOptions),
    structures: structureCollection(selectedScope),
    decks: hologramDeckCollection(selectedScope),
    zoneGlow: futureZoneGlowCollection(selectedScope),
    power: showGridStress ? powerCollection(selectedScope, futureOptions, scenario) : EMPTY,
    upgrades: upgradeCollection(futureOptions),
  }), [activeLayers, selectedScope, futureOptions, scenario, showGridStress])

  useEffect(() => {
    selectRef.current = onNetworkAreaSelect
  }, [onNetworkAreaSelect])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    if (calibrationMode) {
      const initCoords = (calibCoords || OFFICIAL_LEP_SHEET_002_COORDS).map(c => [...c])
      calibCoordsRef.current = initCoords
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 })

      const LABELS = ['NW', 'NE', 'SE', 'SW']
      calibMarkersRef.current = initCoords.map((coord, index) => {
        const el = document.createElement('div')
        el.style.cssText = [
          'background:#f0abfc', 'color:#0f172a', 'font-size:11px', 'font-weight:700',
          'padding:3px 8px', 'border-radius:4px', 'border:2px solid #0f172a',
          'cursor:grab', 'user-select:none', 'white-space:nowrap',
          'box-shadow:0 2px 8px rgba(0,0,0,0.55)', 'font-family:monospace',
        ].join(';')
        el.textContent = LABELS[index]

        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(coord)
          .addTo(map)

        marker.on('drag', () => {
          const { lng, lat } = marker.getLngLat()
          calibCoordsRef.current[index] = [Number(lng.toFixed(6)), Number(lat.toFixed(6))]
          updateCalibrationSources(map, calibCoordsRef.current)
          onCalibratedCoords?.(calibCoordsRef.current.map(c => [...c]))
        })

        return marker
      })
    } else {
      calibMarkersRef.current.forEach(m => m.remove())
      calibMarkersRef.current = []
      map.easeTo({ pitch: 66, bearing: -28, duration: 600 })
    }
  }, [calibrationMode])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: MOSMAN_MAP.center,
      zoom: 14.15,
      minZoom: 11,
      pitch: 66,
      bearing: -28,
      maxBounds: MOSMAN_MAP.bounds,
      antialias: true,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      loadedRef.current = true
      addPlanningSources(map)
      addPlanningLayers(map)
      addStressInteractions(map, selectRef)
      updateMapSources(map, data)
      updateOfficialMapSheets(map, activeLayers, layerOpacity)
    })

    return () => {
      loadedRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    updateMapSources(mapRef.current, data)
    updateOfficialMapSheets(mapRef.current, activeLayers, layerOpacity)
  }, [data, layerOpacity])

  function flyToDensity() {
    mapRef.current?.flyTo({
      center: [151.245, -33.824],
      zoom: 15.85,
      pitch: 74,
      bearing: -32,
      duration: 900,
    })
  }

  function resetView() {
    mapRef.current?.flyTo({
      center: MOSMAN_MAP.center,
      zoom: 14.15,
      pitch: 66,
      bearing: -28,
      duration: 900,
    })
  }

  return (
    <div className="holo-map-shell relative overflow-hidden">
      <div ref={containerRef} className="h-[540px] min-h-[420px] w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/45 to-transparent" />
      <div className="pointer-events-none holo-scanlines absolute inset-0" />
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button
          type="button"
          onClick={flyToDensity}
          className="holo-map-button holo-map-button-primary"
        >
          Zoom Density
        </button>
        <button
          type="button"
          onClick={resetView}
          className="holo-map-button holo-map-button-secondary"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function addPlanningSources(map) {
  map.addSource('existing-buildings', { type: 'geojson', data: OSM_BUILDINGS })
  OFFICIAL_LEP_RASTER_OVERLAYS.forEach(sheet => {
    map.addSource(`official-lep-${sheet.code.toLowerCase()}`, {
      type: 'image',
      url: sheet.url,
      coordinates: OFFICIAL_LEP_SHEET_002_COORDS,
    })
  })
  map.addSource('mosman-boundary', { type: 'geojson', data: EMPTY })
  map.addSource('mosman-routes', { type: 'geojson', data: EMPTY })
  map.addSource('planning-overlays', { type: 'geojson', data: EMPTY })
  map.addSource('impact-areas', { type: 'geojson', data: EMPTY })
  map.addSource('grid-stress-areas', { type: 'geojson', data: EMPTY })
  map.addSource('grid-stress-lines', { type: 'geojson', data: EMPTY })
  map.addSource('future-zone-glow', { type: 'geojson', data: EMPTY })
  map.addSource('future-structures', { type: 'geojson', data: EMPTY })
  map.addSource('future-structure-decks', { type: 'geojson', data: EMPTY })
  map.addSource('power-demand', { type: 'geojson', data: EMPTY })
  map.addSource('grid-upgrades', { type: 'geojson', data: EMPTY })
}

function addPlanningLayers(map) {
  OFFICIAL_LEP_RASTER_OVERLAYS.forEach(sheet => {
    map.addLayer({
      id: `official-lep-${sheet.code.toLowerCase()}`,
      type: 'raster',
      source: `official-lep-${sheet.code.toLowerCase()}`,
      paint: {
        'raster-opacity': 0,
        'raster-fade-duration': 150,
      },
    })
  })

  map.addLayer({
    id: 'mosman-boundary-fill',
    type: 'fill',
    source: 'mosman-boundary',
    paint: {
      'fill-color': '#e0f2fe',
      'fill-opacity': 0.14,
    },
  })

  map.addLayer({
    id: 'mosman-boundary-line',
    type: 'line',
    source: 'mosman-boundary',
    paint: {
      'line-color': '#0f172a',
      'line-width': 2,
      'line-opacity': 0.72,
    },
  })

  map.addLayer({
    id: 'planning-overlays-fill',
    type: 'fill',
    source: 'planning-overlays',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0,
    },
  })

  map.addLayer({
    id: 'planning-overlays-paper-edge',
    type: 'line',
    source: 'planning-overlays',
    paint: {
      'line-color': '#fff7ad',
      'line-width': 10,
      'line-opacity': 0,
      'line-blur': 1.5,
    },
  })

  map.addLayer({
    id: 'planning-overlays-line',
    type: 'line',
    source: 'planning-overlays',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-opacity': 0,
    },
  })

  map.addLayer({
    id: 'impact-areas-paper-buffer',
    type: 'line',
    source: 'impact-areas',
    paint: {
      'line-color': ['get', 'border'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 12, 16, 22],
      'line-opacity': 0.5,
      'line-blur': 2,
    },
  })

  map.addLayer({
    id: 'impact-areas-fill',
    type: 'fill',
    source: 'impact-areas',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.25,
    },
  })

  map.addLayer({
    id: 'impact-areas-line',
    type: 'line',
    source: 'impact-areas',
    paint: {
      'line-color': '#ec4899',
      'line-width': 2,
      'line-dasharray': [2, 1],
      'line-opacity': 0.86,
    },
  })

  map.addLayer({
    id: 'mosman-routes',
    type: 'line',
    source: 'mosman-routes',
    paint: {
      'line-color': '#334155',
      'line-width': 3,
      'line-opacity': 0,
    },
  })

  map.addLayer({
    id: 'grid-upgrades',
    type: 'line',
    source: 'grid-upgrades',
    paint: {
      'line-color': ['match', ['get', 'type'], 'hv', '#f43f5e', '#14b8a6'],
      'line-width': ['match', ['get', 'type'], 'hv', 4, 3],
      'line-dasharray': ['match', ['get', 'type'], 'hv', ['literal', [1.5, 1]], ['literal', [0.5, 1.2]]],
      'line-opacity': 0,
    },
  })

  map.addLayer({
    id: 'grid-stress-areas-halo',
    type: 'line',
    source: 'grid-stress-areas',
    paint: {
      'line-color': ['get', 'halo'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 18],
      'line-opacity': 0.34,
      'line-blur': 3,
    },
  })

  map.addLayer({
    id: 'grid-stress-areas-fill',
    type: 'fill',
    source: 'grid-stress-areas',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': ['interpolate', ['linear'], ['get', 'score'], 70, 0.22, 96, 0.4],
    },
  })

  map.addLayer({
    id: 'grid-stress-areas-line',
    type: 'line',
    source: 'grid-stress-areas',
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 2, 16, 4],
      'line-opacity': 0.94,
      'line-dasharray': [2, 0.9],
      'line-blur': 0.2,
    },
  })

  map.addLayer({
    id: 'grid-stress-lines-glow',
    type: 'line',
    source: 'grid-stress-lines',
    paint: {
      'line-color': ['match', ['get', 'type'], 'hv', '#fb7185', '#2dd4bf'],
      'line-width': ['match', ['get', 'type'], 'hv', 12, 9],
      'line-opacity': 0.32,
      'line-blur': 4,
    },
  })

  map.addLayer({
    id: 'grid-stress-lines-core',
    type: 'line',
    source: 'grid-stress-lines',
    paint: {
      'line-color': ['match', ['get', 'type'], 'hv', '#ffe4e6', '#ccfbf1'],
      'line-width': ['match', ['get', 'type'], 'hv', 3.5, 2.5],
      'line-opacity': 0.95,
      'line-dasharray': ['match', ['get', 'type'], 'hv', ['literal', [1.2, 0.7]], ['literal', [0.4, 0.8]]],
    },
  })

  map.addLayer({
    id: 'existing-buildings',
    type: 'fill-extrusion',
    source: 'existing-buildings',
    minzoom: 13,
    paint: {
      'fill-extrusion-color': '#64748b',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.18,
      'fill-extrusion-vertical-gradient': true,
    },
  })

  map.addLayer({
    id: 'existing-building-plan-fill',
    type: 'fill',
    source: 'existing-buildings',
    minzoom: 13,
    paint: {
      'fill-color': '#ffffff',
      'fill-opacity': 0.16,
    },
  })

  map.addLayer({
    id: 'existing-building-plan-lines',
    type: 'line',
    source: 'existing-buildings',
    minzoom: 13,
    paint: {
      'line-color': '#475569',
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.45, 16, 1.2],
      'line-opacity': 0.52,
    },
  })

  map.addLayer({
    id: 'future-zone-glow',
    type: 'fill',
    source: 'future-zone-glow',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0,
    },
  })

  map.addLayer({
    id: 'future-structures',
    type: 'fill-extrusion',
    source: 'future-structures',
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-opacity': 0.58,
      'fill-extrusion-vertical-gradient': true,
    },
  })

  map.addLayer({
    id: 'future-structure-decks',
    type: 'fill-extrusion',
    source: 'future-structure-decks',
    paint: {
      'fill-extrusion-color': ['get', 'deckColor'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-opacity': 0.88,
      'fill-extrusion-vertical-gradient': false,
    },
  })

  map.addLayer({
    id: 'future-structure-neon-edges',
    type: 'line',
    source: 'future-structures',
    paint: {
      'line-color': ['get', 'edgeColor'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 16, 2.4],
      'line-opacity': 0.95,
      'line-blur': 0.3,
    },
  })

  map.addLayer({
    id: 'power-demand-circles',
    type: 'circle',
    source: 'power-demand',
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['get', 'mw'], 0, 7, 5, 14, 15, 28],
      'circle-opacity': 0.62,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })

  map.addLayer({
    id: 'power-demand-labels',
    type: 'symbol',
    source: 'power-demand',
    layout: {
      'text-field': ['concat', ['get', 'label'], '\n', ['to-string', ['get', 'mw']], ' MW'],
      'text-size': 10,
      'text-offset': [0, 1.7],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': '#0f172a',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.2,
    },
  })

  map.addLayer({
    id: 'impact-area-labels',
    type: 'symbol',
    source: 'impact-areas',
    layout: {
      'text-field': ['concat', ['get', 'label'], '\n', ['get', 'severity']],
      'text-size': 11,
      'text-anchor': 'center',
      'text-padding': 4,
    },
    paint: {
      'text-color': '#831843',
      'text-halo-color': '#fff7ed',
      'text-halo-width': 1.5,
    },
  })

  map.addLayer({
    id: 'grid-stress-labels',
    type: 'symbol',
    source: 'grid-stress-areas',
    layout: {
      'text-field': ['concat', ['get', 'riskBand'], '\n', ['get', 'networkType'], '\n', ['get', 'score'], '/100'],
      'text-size': 10,
      'text-anchor': 'center',
      'text-padding': 4,
    },
    paint: {
      'text-color': '#7f1d1d',
      'text-halo-color': '#fff7ed',
      'text-halo-width': 1.7,
    },
  })
}

function addStressInteractions(map, selectRef) {
  const clickableLayers = ['grid-stress-areas-fill', 'grid-stress-areas-line', 'grid-stress-lines-core']
  const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
  const clearPointer = () => { map.getCanvas().style.cursor = '' }
  const handleClick = event => {
    const feature = event.features?.[0]
    if (!feature) return

    const area = normaliseStressFeature(feature.properties)
    selectRef.current?.(area)

    new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      className: 'holo-popup',
      maxWidth: '320px',
    })
      .setLngLat(event.lngLat)
      .setHTML(stressPopupHtml(area))
      .addTo(map)
  }

  clickableLayers.forEach(layer => {
    map.on('click', layer, handleClick)
    map.on('mouseenter', layer, setPointer)
    map.on('mouseleave', layer, clearPointer)
  })
}

function updateMapSources(map, data) {
  setSourceData(map, 'mosman-boundary', data.boundary)
  setSourceData(map, 'mosman-routes', data.routes)
  setSourceData(map, 'planning-overlays', data.planning)
  setSourceData(map, 'impact-areas', data.impacts)
  setSourceData(map, 'grid-stress-areas', data.stressAreas)
  setSourceData(map, 'grid-stress-lines', data.stressLines)
  setSourceData(map, 'future-zone-glow', data.zoneGlow)
  setSourceData(map, 'future-structures', data.structures)
  setSourceData(map, 'future-structure-decks', data.decks)
  setSourceData(map, 'power-demand', data.power)
  setSourceData(map, 'grid-upgrades', data.upgrades)
}

function updateOfficialMapSheets(map, activeLayers, layerOpacity = 75) {
  const scale = layerOpacity / 100
  OFFICIAL_LEP_RASTER_OVERLAYS.forEach(sheet => {
    const layerId = `official-lep-${sheet.code.toLowerCase()}`
    if (!map.getLayer(layerId)) return
    map.setPaintProperty(layerId, 'raster-opacity', activeLayers.includes(sheet.code) ? sheet.opacity * scale : 0)
  })
}

function updateCalibrationSources(map, coords) {
  OFFICIAL_LEP_RASTER_OVERLAYS.forEach(sheet => {
    const src = map.getSource(`official-lep-${sheet.code.toLowerCase()}`)
    if (src) src.setCoordinates(coords)
  })
}

function setSourceData(map, sourceId, sourceData) {
  const source = map.getSource(sourceId)
  if (source) source.setData(sourceData)
}

function boundaryCollection() {
  return featureCollection([
    {
      type: 'Feature',
      properties: { label: 'Mosman LGA' },
      geometry: { type: 'Polygon', coordinates: [MOSMAN_MAP.boundary] },
    },
  ])
}

function routeCollection() {
  return featureCollection(
    GEO_ROUTES.map(route => ({
      type: 'Feature',
      properties: { label: route.label },
      geometry: { type: 'LineString', coordinates: route.coords },
    }))
  )
}

function planningCollection(activeLayers) {
  const features = GEO_PLANNING_LAYERS
    .filter(layer => activeLayers.includes(layer.code))
    .flatMap(layer =>
      layer.polygons.map(polygon => ({
        type: 'Feature',
        properties: {
          code: layer.code,
          label: polygon.label,
          color: layer.color,
        },
        geometry: { type: 'Polygon', coordinates: [polygon.coords] },
      }))
    )

  return featureCollection(features)
}

function impactCollection() {
  return featureCollection(
    IMPACT_AREAS.map(area => ({
      type: 'Feature',
      properties: {
        label: area.label,
        severity: area.severity,
        score: area.score,
        color: area.color,
        border: area.border,
      },
      geometry: { type: 'Polygon', coordinates: [area.coords] },
    }))
  )
}

function gridStressAreaCollection(showGridStress, scope, options) {
  if (!showGridStress) return EMPTY

  return featureCollection(
    GRID_STRESS_AREAS.map(area => {
      const stressScore = getProjectedGridStressScore(area.score, scope, options)
      const stressLine = GRID_STRESS_LINES.find(line => line.areaId === area.id)
      const corridor = lineCorridorPolygon(
        stressLine?.coords?.length ? stressLine.coords : area.coords,
        area.corridorHalfWidthM || (area.networkType?.includes('11 kV') ? 95 : 75)
      )

      return {
        type: 'Feature',
        properties: stressProperties(area, stressScore),
        geometry: { type: 'Polygon', coordinates: [corridor] },
      }
    })
  )
}

function lineCorridorPolygon(coords, halfWidthM = 75) {
  if (!Array.isArray(coords) || coords.length < 2) return coords || []

  const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
  const latM = 111000
  const lngM = 111320 * Math.cos((avgLat * Math.PI) / 180)
  const left = []
  const right = []

  coords.forEach((coord, index) => {
    const prev = coords[index - 1] || coord
    const next = coords[index + 1] || coord
    const dx = (next[0] - prev[0]) * lngM
    const dy = (next[1] - prev[1]) * latM
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const perpX = (-dy / len) * halfWidthM / lngM
    const perpY = (dx / len) * halfWidthM / latM

    left.push([
      Number((coord[0] + perpX).toFixed(6)),
      Number((coord[1] + perpY).toFixed(6)),
    ])
    right.push([
      Number((coord[0] - perpX).toFixed(6)),
      Number((coord[1] - perpY).toFixed(6)),
    ])
  })

  return [...left, ...right.reverse(), left[0]]
}

function gridStressLineCollection(showGridStress, scope, options) {
  if (!showGridStress) return EMPTY

  return featureCollection(
    GRID_STRESS_LINES.map(line => {
      const area = GRID_STRESS_AREAS.find(candidate => candidate.id === line.areaId)
      const stressScore = getProjectedGridStressScore(area?.score || 70, scope, options)

      return {
        type: 'Feature',
        properties: {
          ...stressProperties(area, stressScore),
          id: line.areaId,
          lineId: line.id,
          lineLabel: line.label,
          label: area?.label || line.label,
          type: line.type,
        },
        geometry: { type: 'LineString', coordinates: line.coords },
      }
    })
  )
}

function stressProperties(area, stressScore) {
  return {
    id: area?.id || 'unknown-stress-area',
    label: area?.label || 'Network stress area',
    networkType: area?.networkType || 'LV/HV',
    severity: area?.severity || 'Future network stress',
    riskBand: stressRiskBand(stressScore),
    baseScore: area?.score || stressScore,
    score: stressScore,
    color: area?.color || '#fb7185',
    halo: area?.halo || '#fef08a',
    existingLine: area?.existingLine || '',
    futureStress: area?.futureStress || '',
    missing: (area?.missing || []).join('||'),
    requiredUpgrade: area?.requiredUpgrade || '',
    type: area?.networkType?.includes('11 kV') ? 'hv' : 'lv',
  }
}

function normaliseStressFeature(properties = {}) {
  return {
    id: properties.id,
    label: properties.label,
    networkType: properties.networkType,
    severity: properties.severity,
    riskBand: properties.riskBand || stressRiskBand(Number(properties.score || 0)),
    baseScore: Number(properties.baseScore || properties.score || 0),
    score: Number(properties.score || 0),
    color: properties.color,
    existingLine: properties.existingLine,
    futureStress: properties.futureStress,
    missing: String(properties.missing || '').split('||').filter(Boolean),
    requiredUpgrade: properties.requiredUpgrade,
  }
}

function stressPopupHtml(area) {
  const missing = area.missing.slice(0, 3)
    .map(item => `<li>${escapeHtml(item)}</li>`)
    .join('')

  return `
    <div class="holo-popup-card">
      <p class="holo-popup-kicker">${escapeHtml(area.networkType)} inadequacy</p>
      <h3>${escapeHtml(area.label)}</h3>
      <p class="holo-popup-score">${escapeHtml(area.riskBand)} · ${escapeHtml(area.severity)} · ${area.score}/100</p>
      <p>${escapeHtml(area.futureStress)}</p>
      <ul>${missing}</ul>
      <p class="holo-popup-upgrade">${escapeHtml(area.requiredUpgrade)}</p>
    </div>
  `
}

function stressRiskBand(score) {
  if (score >= 90) return 'Critical'
  if (score >= 80) return 'High'
  if (score >= 70) return 'Constrained'
  return 'Monitor'
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function structureCollection(scope) {
  return featureCollection(hologramBuildings(scope))
}

function hologramBuildings(scope) {
  const zoneBuckets = new Map(FUTURE_DEVELOPMENT_ZONES.map(zone => [zone.id, []]))

  for (const building of OSM_BUILDINGS.features) {
    const centroid = polygonCentroid(building.geometry.coordinates[0])
    const zone = FUTURE_DEVELOPMENT_ZONES.find(candidate => pointInPolygon(centroid, candidate.coords))
    if (!zone) continue

    const currentHeight = building.properties.height || 6
    const targetHeight = valueForScope(scope.id, zone.baselineHeight, zone.moderateHeight, zone.highHeight)
    const idSeed = Number(String(building.properties.id).slice(-4)) || 1
    const variation = 0.72 + ((idSeed % 9) * 0.055)
    const height = Math.max(currentHeight + 10, currentHeight + (targetHeight * variation * 1.35))
    const footprintRank = polygonAreaRank(building.geometry.coordinates[0])
    const bucket = zoneBuckets.get(zone.id)

    bucket.push({
      type: 'Feature',
      properties: {
        label: zone.label,
        sourceBuildingId: building.properties.id,
        height: Number(height.toFixed(1)),
        base: Number(currentHeight.toFixed(1)),
        currentHeight,
        footprintRank,
        color: hologramColor(zone.color, 0),
        edgeColor: hologramColor(zone.color, 1),
      },
      geometry: building.geometry,
    })
  }

  return Array.from(zoneBuckets.entries()).flatMap(([zoneId, buildings]) => {
    const zone = FUTURE_DEVELOPMENT_ZONES.find(candidate => candidate.id === zoneId)
    const targetCount = valueForScope(
      scope.id,
      Math.max(10, Math.round(buildings.length * 0.34)),
      Math.max(24, Math.round(buildings.length * 0.86)),
      buildings.length
    )

    return buildings
      .sort((a, b) => b.properties.footprintRank - a.properties.footprintRank)
      .slice(0, targetCount)
      .map((building, index) => ({
        ...building,
        properties: {
          ...building.properties,
          color: hologramColor(zone?.color || '#22d3ee', index),
          edgeColor: index % 3 === 0 ? '#f0abfc' : '#67e8f9',
        },
      }))
  })
}

function hologramDeckCollection(scope) {
  const deckFeatures = hologramBuildings(scope)
    .filter((feature, index) => feature.properties.height > 20 && index % 2 === 0)
    .flatMap(feature => {
      const height = feature.properties.height
      const ring = feature.geometry.coordinates[0]
      const centroid = polygonCentroid(ring)
      const compactRing = scaleRing(ring, centroid, 0.72)
      const deckCount = Math.min(5, Math.max(2, Math.round(height / 18)))
      const roofBase = feature.properties.currentHeight || 0
      const interval = (height - roofBase) / (deckCount + 1)

      return Array.from({ length: deckCount }, (_, index) => {
        const base = roofBase + interval * (index + 1)
        return {
          type: 'Feature',
          properties: {
            sourceBuildingId: feature.properties.sourceBuildingId,
            base: Number(base.toFixed(1)),
            height: Number((base + 1.4).toFixed(1)),
            deckColor: index % 2 === 0 ? '#f9a8d4' : '#67e8f9',
          },
          geometry: { type: 'Polygon', coordinates: [compactRing] },
        }
      })
    })

  return featureCollection(deckFeatures)
}

function futureZoneGlowCollection(scope) {
  return featureCollection(
    FUTURE_DEVELOPMENT_ZONES.map(zone => ({
      type: 'Feature',
      properties: {
        label: zone.label,
        height: valueForScope(scope.id, zone.baselineHeight, zone.moderateHeight, zone.highHeight),
        color: zone.color,
      },
      geometry: { type: 'Polygon', coordinates: [zone.coords] },
    }))
  )
}

function polygonCentroid(ring) {
  const unique = ring.slice(0, -1)
  const sum = unique.reduce((acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat], [0, 0])
  return [sum[0] / unique.length, sum[1] / unique.length]
}

function pointInPolygon(point, ring) {
  const [x, y] = point
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi)
    if (intersects) inside = !inside
  }

  return inside
}

function polygonAreaRank(ring) {
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area)
}

function scaleRing(ring, [centerLng, centerLat], scale) {
  return ring.map(([lng, lat]) => [
    Number((centerLng + (lng - centerLng) * scale).toFixed(6)),
    Number((centerLat + (lat - centerLat) * scale).toFixed(6)),
  ])
}

function hologramColor(baseColor, index) {
  const palette = ['#22d3ee', '#a78bfa', '#f472b6', '#38bdf8', '#e879f9']
  if (index % 4 === 0) return palette[index % palette.length]
  return baseColor
}

function powerCollection(scope, options) {
  return featureCollection(
    POWER_DEMAND_NODES.map(node => {
      const baseMw = valueForScope(scope.id, node.moderateMw * 0.35, node.moderateMw, node.highMw)
      const managedFactor = options.managedCharging ? 0.68 : 1
      const v2gFactor = options.v2g ? 0.82 : 1
      const solarFactor = options.solar ? 0.9 : 1
      const mw = Number((baseMw * managedFactor * v2gFactor * solarFactor).toFixed(1))

      return {
        type: 'Feature',
        properties: {
          label: node.label,
          mw,
          upgrade: node.upgrade,
          color: mw > 8 ? '#f43f5e' : '#22d3ee',
        },
        geometry: { type: 'Point', coordinates: node.coords },
      }
    })
  )
}

function upgradeCollection(options) {
  const lines = GRID_UPGRADE_LINES.filter(line => {
    if (line.type === 'lv') return options.showUpgraded
    if (line.type === 'hv') return options.showRequired || options.showUpgraded
    return true
  })

  return featureCollection(
    lines.map(line => ({
      type: 'Feature',
      properties: {
        label: line.label,
        type: line.type,
      },
      geometry: { type: 'LineString', coordinates: line.coords },
    }))
  )
}

function valueForScope(scopeId, baseline, moderate, high) {
  if (scopeId === 'high-uplift') return high
  if (scopeId === 'baseline-2041') return baseline
  return moderate
}

function featureCollection(features) {
  return { type: 'FeatureCollection', features }
}
