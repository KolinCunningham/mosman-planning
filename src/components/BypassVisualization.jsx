import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { OSM_BUILDINGS } from '../data/osmBuildings'

const FLOORS_PER_METRE = 3.3
const ROAD_WIDTH_M = 20
const BYPASS_HEIGHT_M = 8.5
const BYPASS_DECK_THICKNESS = 1.2

// Calibrated to follow actual Military Road (Cremorne → Mosman → Spit Junction)
const BYPASS_ROUTE_COORDS = [
  [151.215448, -33.829864],
  [151.218448, -33.83013],
  [151.22069,  -33.830856],
  [151.22326,  -33.831311],
  [151.226815, -33.830175],
  [151.228346, -33.829085],
  [151.230643, -33.827904],
  [151.235292, -33.824496],
  [151.240596, -33.824405],
  [151.24344,  -33.82277],
  [151.244059, -33.819983],
  [151.243414, -33.816001],
  [151.24452,  -33.812708],
]

const BYPASS_START = BYPASS_ROUTE_COORDS[0]
const BYPASS_END   = BYPASS_ROUTE_COORDS[BYPASS_ROUTE_COORDS.length - 1]

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
    },
  },
  layers: [
    {
      id: 'carto-base',
      type: 'raster',
      source: 'carto',
      paint: {
        'raster-saturation': -0.3,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.92,
      },
    },
  ],
}

function corridorPolygon(coords, halfWidthM = 11) {
  const LAT_M = 111000
  const LNG_M = 92600
  const left = []
  const right = []
  for (let i = 0; i < coords.length; i++) {
    const prev = coords[i - 1] || coords[i]
    const next = coords[i + 1] || coords[i]
    const dx = (next[0] - prev[0]) * LNG_M
    const dy = (next[1] - prev[1]) * LAT_M
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const px = (-dy / len) * halfWidthM / LNG_M
    const py = (dx / len) * halfWidthM / LAT_M
    left.push([coords[i][0] + px, coords[i][1] + py])
    right.push([coords[i][0] - px, coords[i][1] - py])
  }
  return [...left, ...right.reverse(), left[0]]
}

// Heights gradient west→east matching masterplan storey bands:
//
// Option 1 (Low & Wide, 3-20F, page 23):
//   Most of area = 3-4F (light blue) → corridor = 5-8F (blue)
//   → Spit Junction node = 9-15F (green) → peak = 16-20F (yellow)
//
// Option 2 (High & Narrow, 3-28F, page 25):
//   Cremorne = 3-4F (light blue) → corridor = 5-8F (blue)
//   → mid = 9-15F (green) → near Spit = 16-20F (yellow)
//   → approaching = 21-25F (orange) → Spit Junction peak = 26-28F (red)
//
// Multiplier targets a ~6.4m (2-storey) base building.
// 1F ≈ 3.3m. 4F = 13.2m → ×2.1. 8F = 26.4m → ×4.1. 15F = 49.5m → ×7.7. 20F = 66m → ×10.3. 28F = 92.4m → ×14.4
function buildingHeightExpr(showOption1, showOption2) {
  if (showOption2) {
    // Option 2: yellow (16-20F) is DOMINANT throughout the whole corridor (page 25)
    // — not a gradual ramp from blue. Green/yellow from the western entry, orange/red
    // only concentrated at Spit Junction.
    return ['*', ['get', 'height'],
      ['interpolate', ['linear'], ['get', 'centroid_lng'],
        151.215, 5.0,   // ~10F — green (entering at Cremorne — corridor already tall)
        151.222, 8.0,   // ~16F — yellow (established corridor body)
        151.230, 9.0,   // ~18F — yellow (Military Rd central)
        151.237, 11.0,  // ~22F — orange (approaching Spit Junction)
        151.241, 13.0,  // ~26F — orange/red (near junction)
        151.244, 14.5,  // ~28F — red (Spit Junction peak)
      ]
    ]
  }
  if (showOption1) {
    return ['*', ['get', 'height'],
      ['interpolate', ['linear'], ['get', 'centroid_lng'],
        151.215, 1.8,   // 3-4F — light blue (broad outer area)
        151.224, 2.0,   // 4F — light blue (still outer area)
        151.230, 2.8,   // 5-6F — blue (Military Rd corridor)
        151.236, 4.5,   // 8-9F — blue/green (approaching node)
        151.240, 6.5,   // 12-13F — green (Spit Junction approach)
        151.244, 9.5,   // 18-20F — yellow (Spit Junction peak)
      ]
    ]
  }
  return ['get', 'height']
}

function buildingColorExpr(showOption1, showOption2) {
  if (showOption2) {
    // Option 2 colours (page 25): yellow is the DOMINANT corridor colour.
    // Green at western entry, yellow through most of the route,
    // orange/red only at Spit Junction. Matches the large yellow area on page 25.
    return [
      'interpolate', ['linear'], ['get', 'centroid_lng'],
      151.215, '#22c55e',  // green — ~10F entering at Cremorne
      151.222, '#eab308',  // yellow — 16-20F (dominant throughout corridor)
      151.233, '#eab308',  // yellow — maintain through Military Rd central
      151.238, '#f97316',  // orange — 21-25F approaching Spit Junction
      151.242, '#ef4444',  // red — 26-28F Spit Junction peak
    ]
  }
  if (showOption1) {
    // Option 1 masterplan colours (page 23 key):
    // light blue=3-4F (dominant, outer area), blue=5-8F (corridor), green=9-15F, yellow=16-20F peak
    // Blue dominates until very close to Spit Junction
    return [
      'interpolate', ['linear'], ['get', 'centroid_lng'],
      151.215, '#bfdbfe',  // light blue — 3-4F (most of the broad area)
      151.226, '#60a5fa',  // medium blue — 5-6F (Military Rd corridor)
      151.232, '#3b82f6',  // blue — 7-8F (corridor)
      151.238, '#22c55e',  // green — 9-15F (near Spit Junction)
      151.242, '#eab308',  // yellow — 16-20F (Spit Junction peak only)
    ]
  }
  return '#64748b'
}

function optionBuildingFilter(showOption2, routeCoords) {
  if (showOption2) {
    // Option 2 = High & Narrow: tight corridor (~300m each side of Military/Spit Rd)
    // Use centroid_lng/lat property comparisons — ['within'] is unreliable for
    // GeoJSON polygon features in MapLibre and returns nothing.
    const lngs = routeCoords.map(c => c[0])
    const lats = routeCoords.map(c => c[1])
    const pad = 0.003
    return ['all',
      ['>=', ['get', 'centroid_lng'], Math.min(...lngs) - pad],
      ['<=', ['get', 'centroid_lng'], Math.max(...lngs) + pad],
      ['>=', ['get', 'centroid_lat'], Math.min(...lats) - pad],
      ['<=', ['get', 'centroid_lat'], Math.max(...lats) + pad],
    ]
  }
  // Option 1 = Low & Wide (13% LGA): Military Rd corridor + surrounding blocks
  // Exclude scenic protection areas:
  //   - Cremorne Point / far-south residential (lat < -33.836)
  //   - Mosman Bay / Athol Wharf waterfront (lng > 151.234 AND lat < -33.824)
  return ['all',
    ['>=', ['get', 'centroid_lng'], 151.211],
    ['<=', ['get', 'centroid_lng'], 151.249],
    ['>=', ['get', 'centroid_lat'], -33.836],
    ['<=', ['get', 'centroid_lat'], -33.808],
    ['!', ['all',
      ['>', ['get', 'centroid_lng'], 151.234],
      ['<', ['get', 'centroid_lat'], -33.824],
    ]],
  ]
}

function updateRouteSources(map, coords) {
  const routeSrc = map.getSource('bypass-route')
  if (routeSrc) routeSrc.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } })
  const corridorSrc = map.getSource('bypass-corridor')
  if (corridorSrc) corridorSrc.setData({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [corridorPolygon(coords, 14)] } })
}

const BUILDING_LAYER_IDS = ['bypass-buildings-extrusion', 'bypass-buildings-fill', 'bypass-buildings-lines']

function BypassMap3D({ showOption1, showOption2, routeCalibrMode, routeCoords, onRouteChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)
  const routeMarkersRef = useRef([])
  const routeCoordsRef = useRef(null)

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    const map = mapRef.current
    map.setPaintProperty('bypass-buildings-extrusion', 'fill-extrusion-height', buildingHeightExpr(showOption1, showOption2))
    map.setPaintProperty('bypass-buildings-extrusion', 'fill-extrusion-color', buildingColorExpr(showOption1, showOption2))
    map.setPaintProperty('bypass-buildings-extrusion', 'fill-extrusion-opacity', showOption1 || showOption2 ? 0.72 : 0.3)
    const filter = optionBuildingFilter(showOption2, routeCoords || BYPASS_ROUTE_COORDS)
    BUILDING_LAYER_IDS.forEach(id => map.setFilter(id, filter))
  }, [showOption1, showOption2, routeCoords])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    if (routeCalibrMode) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 500 })
      const initCoords = (routeCoords || BYPASS_ROUTE_COORDS).map(c => [...c])
      routeCoordsRef.current = initCoords

      routeMarkersRef.current = initCoords.map((coord, index) => {
        const el = document.createElement('div')
        el.style.cssText = [
          'width:24px', 'height:24px', 'border-radius:50%',
          'background:#22d3ee', 'border:2px solid #0f172a',
          'cursor:grab', 'display:flex', 'align-items:center', 'justify-content:center',
          'font-size:9px', 'font-weight:800', 'color:#0f172a',
          'box-shadow:0 2px 8px rgba(0,0,0,0.5)', 'user-select:none',
        ].join(';')
        el.textContent = index + 1

        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(coord)
          .addTo(map)

        marker.on('drag', () => {
          const { lng, lat } = marker.getLngLat()
          routeCoordsRef.current[index] = [Number(lng.toFixed(6)), Number(lat.toFixed(6))]
          updateRouteSources(map, routeCoordsRef.current)
          onRouteChange?.(routeCoordsRef.current.map(c => [...c]))
        })

        return marker
      })
    } else {
      routeMarkersRef.current.forEach(m => m.remove())
      routeMarkersRef.current = []
      map.easeTo({ pitch: 52, bearing: -18, duration: 500 })
    }
  }, [routeCalibrMode])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [151.230, -33.822],
      zoom: 14.2,
      pitch: 52,
      bearing: -18,
      minZoom: 11,
      antialias: true,
    })

    mapRef.current = map

    // Fix grey tiles when container renders before map initialises
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      loadedRef.current = true

      // Fly to Military Road corridor at zoom where buildings are clearly visible
      map.flyTo({ center: [151.230, -33.822], zoom: 14.5, pitch: 52, bearing: -18, duration: 800 })

      map.addSource('bypass-osm-buildings', { type: 'geojson', data: OSM_BUILDINGS })

      map.addLayer({
        id: 'bypass-buildings-fill',
        type: 'fill',
        source: 'bypass-osm-buildings',
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.12 },
      })

      map.addLayer({
        id: 'bypass-buildings-lines',
        type: 'line',
        source: 'bypass-osm-buildings',
        paint: {
          'line-color': '#475569',
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 16, 1.1],
          'line-opacity': 0.4,
        },
      })

      map.addLayer({
        id: 'bypass-buildings-extrusion',
        type: 'fill-extrusion',
        source: 'bypass-osm-buildings',
        paint: {
          'fill-extrusion-color': buildingColorExpr(showOption1, showOption2),
          'fill-extrusion-height': buildingHeightExpr(showOption1, showOption2),
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': showOption1 || showOption2 ? 0.72 : 0.3,
          'fill-extrusion-vertical-gradient': true,
        },
      })

      // Ground shadow
      const corridorGeo = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [corridorPolygon(BYPASS_ROUTE_COORDS, 14)] },
      }
      map.addSource('bypass-corridor', { type: 'geojson', data: corridorGeo })

      map.addLayer({
        id: 'bypass-ground-shadow',
        type: 'fill',
        source: 'bypass-corridor',
        paint: { 'fill-color': '#0f172a', 'fill-opacity': 0.35 },
      })

      // Support columns
      map.addLayer({
        id: 'bypass-columns',
        type: 'fill-extrusion',
        source: 'bypass-corridor',
        paint: {
          'fill-extrusion-color': '#64748b',
          'fill-extrusion-height': 8.5,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.4,
          'fill-extrusion-vertical-gradient': true,
        },
      })

      // Elevated deck
      map.addLayer({
        id: 'bypass-deck',
        type: 'fill-extrusion',
        source: 'bypass-corridor',
        paint: {
          'fill-extrusion-color': '#ef4444',
          'fill-extrusion-height': 11,
          'fill-extrusion-base': 8.5,
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-vertical-gradient': false,
        },
      })

      // Route line glow
      map.addSource('bypass-route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: BYPASS_ROUTE_COORDS } },
      })

      map.addLayer({
        id: 'bypass-line-halo',
        type: 'line',
        source: 'bypass-route',
        paint: { 'line-color': '#ff6666', 'line-width': 28, 'line-opacity': 0.18, 'line-blur': 10 },
      })

      map.addLayer({
        id: 'bypass-line-mid',
        type: 'line',
        source: 'bypass-route',
        paint: { 'line-color': '#fca5a5', 'line-width': 6, 'line-opacity': 0.55, 'line-blur': 2 },
      })

      map.addLayer({
        id: 'bypass-line-centre',
        type: 'line',
        source: 'bypass-route',
        paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [3, 2] },
      })

      // Endpoint markers
      ;[
        { coord: BYPASS_START, label: 'Warringah Fwy' },
        { coord: BYPASS_END,   label: 'Spit Rd' },
      ].forEach(({ coord, label }) => {
        const el = document.createElement('div')
        el.style.cssText = [
          'width:34px', 'height:34px',
          'border:3px solid #ef4444', 'border-radius:50%',
          'background:rgba(239,68,68,0.22)',
          'box-shadow:0 0 16px rgba(239,68,68,0.6)',
        ].join(';')
        new maplibregl.Marker({ element: el })
          .setLngLat(coord)
          .setPopup(new maplibregl.Popup({ closeButton: false, offset: 20 })
            .setHTML(`<div style="font-size:11px;font-weight:700;color:#0f172a">${label}</div>`))
          .addTo(map)
      })

      // Apply initial building filter now that all layers exist
      const initFilter = optionBuildingFilter(showOption2, routeCoords || BYPASS_ROUTE_COORDS)
      BUILDING_LAYER_IDS.forEach(id => map.setFilter(id, initFilter))
    })

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  return (
    <div className="holo-map-shell relative overflow-hidden rounded-xl">
      <div ref={containerRef} className="w-full" style={{ height: '500px' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/50 to-transparent" />
      <div className="pointer-events-none holo-scanlines absolute inset-0" />
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 pointer-events-none">
        <p className="text-xs font-bold text-red-400 uppercase tracking-widest">
          {routeCalibrMode ? 'Calibration mode — drag numbered handles' : 'Overhead Bypass Route'}
        </p>
        <p className="text-xs text-slate-300 mt-0.5">Military Rd · Warringah Fwy → Spit Rd</p>
      </div>
      <div className="absolute bottom-10 left-3 flex flex-col gap-1.5 pointer-events-none">
        <LegendPill color="#ef4444" label="Elevated bypass deck (8.5–11m)" />
        {(showOption2 || showOption1) && (
          <LegendPill gradient="linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6)"
            label={showOption2
            ? 'Option 2 — High & Narrow · 9% LGA · 3–28F · red=Spit Junction peak'
            : 'Option 1 — Low & Wide · 13% LGA · 3–20F · yellow=Spit Junction peak'} />
        )}
      </div>
    </div>
  )
}

function LegendPill({ color, gradient, label }) {
  return (
    <div className="flex items-center gap-2 bg-slate-900/70 rounded px-2 py-1">
      <span className="w-4 h-2 rounded-sm flex-shrink-0"
        style={{ background: gradient || color }} />
      <span className="text-[10px] text-slate-200 font-semibold">{label}</span>
    </div>
  )
}

// ─── Street-level canvas ──────────────────────────────────────────────────────

const LEFT_BUILDINGS = [
  { label: 'Spit Junction Tower', floors: 28, widthM: 22, offsetM: 0 },
  { label: 'Mixed-Use Block',     floors: 18, widthM: 18, offsetM: 26 },
  { label: 'Residential',         floors: 12, widthM: 14, offsetM: 48 },
  { label: 'Residential',         floors: 8,  widthM: 16, offsetM: 66 },
  { label: 'Terrace Row',         floors: 4,  widthM: 30, offsetM: 86 },
  { label: 'Heritage',            floors: 3,  widthM: 12, offsetM: 120 },
  { label: 'Retail/Res',          floors: 6,  widthM: 18, offsetM: 136 },
  { label: 'Townhouse',           floors: 3,  widthM: 22, offsetM: 158 },
]

const RIGHT_BUILDINGS = [
  { label: 'Gateway Tower',   floors: 24, widthM: 20, offsetM: 0 },
  { label: 'Mixed-Use',       floors: 16, widthM: 16, offsetM: 24 },
  { label: 'Apartments',      floors: 14, widthM: 18, offsetM: 44 },
  { label: 'Medium Density',  floors: 10, widthM: 20, offsetM: 66 },
  { label: 'Retail Strip',    floors: 5,  widthM: 28, offsetM: 90 },
  { label: 'Residential',     floors: 7,  widthM: 14, offsetM: 122 },
  { label: 'Heritage Item',   floors: 2,  widthM: 10, offsetM: 140 },
  { label: 'Townhouse',       floors: 3,  widthM: 20, offsetM: 154 },
]

function drawScene(ctx, W, H, showBypass, showOption1, showOption2, animT) {
  ctx.clearRect(0, 0, W, H)

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62)
  sky.addColorStop(0, '#e0f2fe')
  sky.addColorStop(0.6, '#bae6fd')
  sky.addColorStop(1, '#f0f9ff')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  const vp = { x: W / 2, y: H * 0.42 }
  const groundY = H * 0.82
  const nearRoadHalfW = W * 0.36
  const farRoadHalfW = 18

  ctx.beginPath()
  ctx.moveTo(vp.x - farRoadHalfW, vp.y)
  ctx.lineTo(vp.x + farRoadHalfW, vp.y)
  ctx.lineTo(vp.x + nearRoadHalfW, groundY)
  ctx.lineTo(vp.x - nearRoadHalfW, groundY)
  ctx.closePath()
  const roadGrad = ctx.createLinearGradient(0, vp.y, 0, groundY)
  roadGrad.addColorStop(0, '#94a3b8')
  roadGrad.addColorStop(1, '#64748b')
  ctx.fillStyle = roadGrad
  ctx.fill()

  ctx.save()
  ctx.strokeStyle = '#fff'
  ctx.setLineDash([18, 14])
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(vp.x, vp.y + 1)
  ctx.lineTo(vp.x, groundY)
  ctx.stroke()
  ctx.restore()

  const fpW = 0.08
  ;[-1, 1].forEach(side => {
    const nearEdge = side * nearRoadHalfW
    const farEdge = side * farRoadHalfW
    const nearPath = side * (nearRoadHalfW + W * fpW)
    const farPath = side * (farRoadHalfW + 8)
    ctx.beginPath()
    ctx.moveTo(vp.x + farEdge, vp.y); ctx.lineTo(vp.x + farPath, vp.y)
    ctx.lineTo(vp.x + nearPath, groundY); ctx.lineTo(vp.x + nearEdge, groundY)
    ctx.closePath()
    const fpGrad = ctx.createLinearGradient(0, vp.y, 0, groundY)
    fpGrad.addColorStop(0, '#cbd5e1'); fpGrad.addColorStop(1, '#e2e8f0')
    ctx.fillStyle = fpGrad; ctx.fill()
  })

  const totalDepth = 200
  function proj(worldX, worldY, worldZ) {
    const t = worldZ / totalDepth
    const screenX = vp.x + worldX * (nearRoadHalfW + W * fpW) / ROAD_WIDTH_M * 2 * (1 - t) +
      worldX * farRoadHalfW / ROAD_WIDTH_M * 2 * t
    const baseY = groundY + (vp.y - groundY) * t
    const scaleY = (1 - t) + t * (farRoadHalfW / (nearRoadHalfW + W * fpW))
    const screenY = baseY - worldY * (groundY - vp.y) / 28 * scaleY * 2.1
    return { x: screenX, y: screenY }
  }

  // Option 2: max 28F (High & Narrow). Option 1: max 20F (Low & Wide). Baseline ~3F.
  const heightMult = showOption2 ? 1 : showOption1 ? 0.72 : 0.22

  const buildingSets = [
    { buildings: LEFT_BUILDINGS,  side: -1, setback: ROAD_WIDTH_M / 2 + 2 },
    { buildings: RIGHT_BUILDINGS, side:  1, setback: ROAD_WIDTH_M / 2 + 2 },
  ]

  buildingSets.forEach(({ buildings, side, setback }) => {
    buildings.forEach(b => {
      const floors = Math.max(2, Math.round(b.floors * heightMult))
      const heightM = floors * FLOORS_PER_METRE
      const z0 = b.offsetM; const z1 = b.offsetM + b.widthM
      const x0 = side * setback; const x1 = side * (setback + 12)

      const bl = proj(x0, 0, z0); const br = proj(x1, 0, z0)
      const tr = proj(x1, heightM, z0); const tl = proj(x0, heightM, z0)
      const brF = proj(x1, 0, z1); const trF = proj(x1, heightM, z1)
      const tlF = proj(x0, heightM, z1)

      const hue = 200 + floors * 3
      const sat = 30 + floors * 0.8
      const active = showOption2 || showOption1
      const light = active ? 52 - floors * 0.4 : 72

      ctx.beginPath()
      ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y)
      ctx.lineTo(tr.x, tr.y); ctx.lineTo(tl.x, tl.y)
      ctx.closePath()
      const faceGrad = ctx.createLinearGradient(0, tl.y, 0, bl.y)
      faceGrad.addColorStop(0, `hsl(${hue},${sat}%,${light - 6}%)`)
      faceGrad.addColorStop(1, `hsl(${hue},${sat - 10}%,${light + 8}%)`)
      ctx.fillStyle = faceGrad; ctx.fill()
      ctx.strokeStyle = `hsl(${hue},${sat}%,${light - 18}%)`
      ctx.lineWidth = 0.8; ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(br.x, br.y); ctx.lineTo(brF.x, brF.y)
      ctx.lineTo(trF.x, trF.y); ctx.lineTo(tr.x, tr.y)
      ctx.closePath()
      ctx.fillStyle = `hsl(${hue},${sat - 8}%,${light - 12}%)`
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y)
      ctx.lineTo(trF.x, trF.y); ctx.lineTo(tlF.x, tlF.y)
      ctx.closePath()
      ctx.fillStyle = `hsl(${hue},${sat - 5}%,${light + 2}%)`
      ctx.fill()

      if (floors > 3) {
        const winCols = Math.max(1, Math.floor(12 / 3.5))
        const winRows = Math.min(floors - 1, 8)
        for (let r = 0; r < winRows; r++) {
          for (let c = 0; c < winCols; c++) {
            const wx = side > 0
              ? br.x + (tl.x - bl.x) * ((c + 0.5) / winCols) * 0.6
              : bl.x + (tr.x - br.x) * ((c + 0.5) / winCols) * 0.6
            const wy = bl.y - (bl.y - tl.y) * ((r + 0.8) / (winRows + 1))
            const ws = Math.max(2, (br.y - tr.y) / winRows * 0.38)
            const isLit = Math.sin(c * 7 + r * 13 + floors) > 0.2
            ctx.fillStyle = isLit
              ? `rgba(255,245,200,${0.55 + 0.3 * Math.sin(animT * 0.9 + c + r)})`
              : 'rgba(100,130,160,0.55)'
            ctx.fillRect(wx - ws * 0.5, wy - ws * 0.7, ws, ws * 1.2)
          }
        }
      }

      if (floors >= 12 && active) {
        const labelP = proj(side * (setback + 6), heightM + 4, b.offsetM + b.widthM / 2)
        ctx.font = `bold ${Math.max(9, 11 - b.offsetM / 25)}px sans-serif`
        ctx.fillStyle = '#1e3a5f'; ctx.textAlign = 'center'
        ctx.fillText(`${floors}F`, labelP.x, labelP.y)
      }
    })
  })

  ;[-1, 1].forEach(side => {
    for (let z = 10; z < 180; z += 22) {
      const x = side * (ROAD_WIDTH_M / 2 + 5)
      const trunkBase = proj(x, 0, z); const trunkTop = proj(x, 5, z)
      const canopy = proj(x, 9, z)
      const scale = 1 - z / 280
      ctx.strokeStyle = '#6b4c26'; ctx.lineWidth = Math.max(1, 3 * scale)
      ctx.beginPath(); ctx.moveTo(trunkBase.x, trunkBase.y); ctx.lineTo(trunkTop.x, trunkTop.y); ctx.stroke()
      ctx.beginPath(); ctx.arc(canopy.x, canopy.y, Math.max(4, 22 * scale), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(34,197,94,${0.55 + scale * 0.3})`; ctx.fill()
    }
  })

  if (showBypass) {
    const deckW = ROAD_WIDTH_M * 0.72
    for (let z = 25; z < 180; z += 35) {
      ;[-1, 1].forEach(side => {
        const pierX = side * deckW * 0.44
        const base = proj(pierX, 0, z); const cap = proj(pierX, BYPASS_HEIGHT_M, z)
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = Math.max(2, 8 * (1 - z / 250))
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(cap.x, cap.y); ctx.stroke()
      })
      const leftCap = proj(-deckW * 0.44, BYPASS_HEIGHT_M, z)
      const rightCap = proj(deckW * 0.44, BYPASS_HEIGHT_M, z)
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = Math.max(3, 10 * (1 - z / 250))
      ctx.beginPath(); ctx.moveTo(leftCap.x, leftCap.y); ctx.lineTo(rightCap.x, rightCap.y); ctx.stroke()
    }

    const zSteps = 60
    for (let i = 0; i < zSteps; i++) {
      const z0 = (i / zSteps) * 190; const z1 = ((i + 1) / zSteps) * 190
      const deckH = BYPASS_HEIGHT_M; const deckBot = deckH - BYPASS_DECK_THICKNESS
      const ll = proj(-deckW / 2, deckH, z0); const lr = proj(deckW / 2, deckH, z0)
      const rl = proj(-deckW / 2, deckH, z1); const rr = proj(deckW / 2, deckH, z1)
      const t = i / zSteps
      ctx.beginPath()
      ctx.moveTo(ll.x, ll.y); ctx.lineTo(lr.x, lr.y); ctx.lineTo(rr.x, rr.y); ctx.lineTo(rl.x, rl.y)
      ctx.closePath(); ctx.fillStyle = `rgba(148,163,184,${0.82 - t * 0.25})`; ctx.fill()
      const llb = proj(-deckW / 2, deckBot, z0); const lrb = proj(deckW / 2, deckBot, z0)
      const rlb = proj(-deckW / 2, deckBot, z1); const rrb = proj(deckW / 2, deckBot, z1)
      ctx.beginPath()
      ctx.moveTo(llb.x, llb.y); ctx.lineTo(lrb.x, lrb.y); ctx.lineTo(rrb.x, rrb.y); ctx.lineTo(rlb.x, rlb.y)
      ctx.closePath(); ctx.fillStyle = `rgba(51,65,85,${0.6 - t * 0.2})`; ctx.fill()
    }

    for (let z = 8; z < 185; z += 20) {
      const near = proj(0, BYPASS_HEIGHT_M + 0.05, z); const far = proj(0, BYPASS_HEIGHT_M + 0.05, z + 10)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([0])
      ctx.beginPath(); ctx.moveTo(near.x, near.y); ctx.lineTo(far.x, far.y); ctx.stroke()
    }

    ;[-1, 1].forEach(side => {
      ctx.beginPath()
      const railH = BYPASS_HEIGHT_M + 1.1; let first = true
      for (let z = 0; z < 190; z += 5) {
        const p = proj(side * deckW / 2, railH, z)
        first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); first = false
      }
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke()
    })

    const labelPos = proj(0, BYPASS_HEIGHT_M + 3.5, 40)
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#1e40af'; ctx.textAlign = 'center'
    ctx.fillText('Military Rd Overhead Bypass', labelPos.x, labelPos.y)

    ctx.save(); ctx.globalAlpha = 0.22
    ctx.beginPath()
    const sl = proj(-deckW * 0.5, 0, 0); const sr = proj(deckW * 0.5, 0, 0)
    const slF = proj(-deckW * 0.5, 0, 190); const srF = proj(deckW * 0.5, 0, 190)
    ctx.moveTo(sl.x, sl.y); ctx.lineTo(sr.x, sr.y); ctx.lineTo(srF.x, srF.y); ctx.lineTo(slF.x, slF.y)
    ctx.closePath(); ctx.fillStyle = '#334155'; ctx.fill(); ctx.restore()
  }

  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(vp.x - nearRoadHalfW - 4, groundY - 4, 8, H - groundY + 8)
  ctx.fillRect(vp.x + nearRoadHalfW - 4, groundY - 4, 8, H - groundY + 8)
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BypassVisualization() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const [showBypass, setShowBypass] = useState(true)
  const [showOption1, setShowOption1] = useState(false)
  const [showOption2, setShowOption2] = useState(true)
  const [routeCalibrMode, setRouteCalibrMode] = useState(false)
  const [routeCoords, setRouteCoords] = useState(() => BYPASS_ROUTE_COORDS.map(c => [...c]))
  const animT = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resize() {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener('resize', resize)

    function loop() {
      animT.current += 0.012
      const ctx = canvas.getContext('2d')
      drawScene(ctx, canvas.offsetWidth, canvas.offsetHeight, showBypass, showOption1, showOption2, animT.current)
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize) }
  }, [showBypass, showOption1, showOption2])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Military Road Overhead Bypass</h2>
        <p className="text-sm text-slate-500 mt-1">
          Aerial 3D route map + street-level perspective — toggle Option 1 / Option 2 building heights
        </p>
      </div>

      {/* Shared toggles */}
      <div className="flex flex-wrap gap-2">
        <ToggleBtn active={showBypass} onClick={() => setShowBypass(v => !v)}
          colorOn="bg-slate-700 text-white" colorOff="bg-slate-100 text-slate-600">
          {showBypass ? 'Bypass ON' : 'Bypass OFF'}
        </ToggleBtn>
        <ToggleBtn active={showOption2} onClick={() => { setShowOption2(v => !v); setShowOption1(false) }}
          colorOn="bg-indigo-600 text-white" colorOff="bg-slate-100 text-slate-600">
          Option 2 — High &amp; Narrow
        </ToggleBtn>
        <ToggleBtn active={showOption1} onClick={() => { setShowOption1(v => !v); setShowOption2(false) }}
          colorOn="bg-teal-600 text-white" colorOff="bg-slate-100 text-slate-600">
          Option 1 — Low &amp; Wide
        </ToggleBtn>
        <ToggleBtn active={routeCalibrMode} onClick={() => setRouteCalibrMode(v => !v)}
          colorOn="bg-cyan-200 text-cyan-900" colorOff="bg-slate-100 text-slate-600">
          {routeCalibrMode ? 'Exit route calibration' : 'Calibrate route'}
        </ToggleBtn>
      </div>

      {/* Route calibration panel */}
      {routeCalibrMode && (
        <div className="bg-cyan-950 border border-cyan-500/30 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
              Drag the numbered handles to align the route to Military Road
            </p>
            <button
              type="button"
              onClick={() => {
                const text = JSON.stringify(routeCoords.map(c => [Number(c[0].toFixed(6)), Number(c[1].toFixed(6))]))
                navigator.clipboard.writeText(text)
              }}
              className="text-xs font-semibold bg-cyan-200 text-cyan-900 px-2.5 py-1 rounded hover:bg-white flex-shrink-0"
            >
              Copy coords
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-7">
            {routeCoords.map((coord, index) => (
              <div key={index} className="bg-cyan-900/50 rounded px-2 py-1.5">
                <p className="text-[10px] font-bold text-cyan-300 mb-0.5">#{index + 1}</p>
                <p className="text-[10px] text-white font-mono leading-tight">
                  {coord[0].toFixed(4)}<br />{coord[1].toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D aerial map */}
      <BypassMap3D
        showOption1={showOption1}
        showOption2={showOption2}
        routeCalibrMode={routeCalibrMode}
        routeCoords={routeCoords}
        onRouteChange={setRouteCoords}
      />

      {/* Street-level canvas */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Street-level view</p>
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-sky-100">
          <canvas ref={canvasRef} className="w-full" style={{ height: '520px', display: 'block' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {[
          { label: 'Bypass height', value: `${BYPASS_HEIGHT_M}m clearance` },
          { label: 'Option 2 max', value: '28 storeys · 9% LGA · 60ha' },
          { label: 'Option 1 max', value: '20 storeys · 13% LGA · 85ha' },
          { label: 'Corridor', value: 'Military / Spit Rd spine' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold">{label}</p>
            <p className="font-semibold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Note:</strong> Overhead bypass is a concept illustration only — not part of the Mosman Masterplan
        or any current Council proposal. Building heights on the aerial map are scaled from current OSM footprints
        to approximate Option 1 / Option 2 density scenarios.
      </div>
    </div>
  )
}

function ToggleBtn({ active, onClick, colorOn, colorOff, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${active ? colorOn : colorOff}`}
    >
      {children}
    </button>
  )
}
