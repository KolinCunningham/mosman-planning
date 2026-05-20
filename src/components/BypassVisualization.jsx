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

const STOREY_BANDS = {
  '3-4':  { storeys: 4,  color: '#bfdbfe', use: 'Residential dwellings', shape: 'Low slab / townhouse' },
  '5-8':  { storeys: 8,  color: '#5b8def', use: 'Residential apartments', shape: 'Mid-rise slab' },
  '9-15': { storeys: 12, color: '#60c7b2', use: 'Mixed-use / shops', shape: 'Podium block' },
  '16-20': { storeys: 18, color: '#facc15', use: 'Commercial centre / large mixed-use', shape: 'Tall podium tower' },
  '21-25': { storeys: 22, color: '#fb923c', use: 'Large mixed-use buildings', shape: 'Gateway tower' },
  '26-28': { storeys: 28, color: '#ef4444', use: 'Major centre peak buildings', shape: 'Peak tower' },
}

// Western Mosman LGA edge sampled from the OSM administrative boundary.
// This keeps the masterplan height overlay out of Cremorne / Neutral Bay.
const MOSMAN_WEST_EDGE_BY_LAT = [
  [-33.8375, 151.22839],
  [-33.8360, 151.22871],
  [-33.8345, 151.22902],
  [-33.8330, 151.22932],
  [-33.8315, 151.22965],
  [-33.8300, 151.22996],
  [-33.8285, 151.23028],
  [-33.8270, 151.23105],
  [-33.8255, 151.23135],
  [-33.8240, 151.23164],
  [-33.8225, 151.23194],
  [-33.8210, 151.23225],
  [-33.8195, 151.23267],
]

function mosmanWestEdgeLng(lat) {
  const edge = MOSMAN_WEST_EDGE_BY_LAT
  if (lat <= edge[0][0]) return edge[0][1]
  if (lat >= edge[edge.length - 1][0]) return edge[edge.length - 1][1]

  for (let i = 0; i < edge.length - 1; i++) {
    const [latA, lngA] = edge[i]
    const [latB, lngB] = edge[i + 1]
    if (lat >= latA && lat <= latB) {
      const t = (lat - latA) / (latB - latA)
      return lngA + (lngB - lngA) * t
    }
  }
  return edge[edge.length - 1][1]
}

function insideMosmanMasterplanEdge(lng, lat) {
  return lng >= mosmanWestEdgeLng(lat)
}

function clampToMosmanMasterplanEdge([lng, lat]) {
  return [Math.max(lng, mosmanWestEdgeLng(lat)), lat]
}

// Approximate masterplan polygons digitised from booklet pages 23 and 25.
// They intentionally follow the mapped area-of-change shapes rather than broad
// rectangular longitude/latitude bands.
const MASTERPLAN_ZONES = [
  // Option 1 - Low and wide: 13% LGA, 3-20 storeys.
  {
    option: 'option1',
    id: 'o1-spit-junction-peak',
    label: 'Option 1 Spit Junction peak',
    band: '16-20',
    polygon: [
      [151.2359, -33.8249],
      [151.2409, -33.8257],
      [151.2444, -33.8235],
      [151.2437, -33.8205],
      [151.2392, -33.8200],
      [151.2363, -33.8222],
      [151.2359, -33.8249],
    ],
  },
  {
    option: 'option1',
    id: 'o1-spit-road-mixed-use',
    label: 'Option 1 Spit Road mixed-use spine',
    band: '9-15',
    polygon: [
      [151.2422, -33.8245],
      [151.2446, -33.8237],
      [151.24455, -33.81495],
      [151.2432, -33.81495],
      [151.24275, -33.8171],
      [151.2422, -33.8245],
    ],
  },
  {
    option: 'option1',
    id: 'o1-military-centre-mixed-use',
    label: 'Option 1 Military Road centre spine',
    band: '9-15',
    polygon: [
      [151.2164, -33.8319],
      [151.2257, -33.8313],
      [151.2354, -33.8272],
      [151.2394, -33.8243],
      [151.2367, -33.8219],
      [151.2257, -33.8257],
      [151.2162, -33.8288],
      [151.2164, -33.8319],
    ],
  },
  {
    option: 'option1',
    id: 'o1-military-mid-rise',
    label: 'Option 1 Military Road mid-rise transition',
    band: '5-8',
    polygon: [
      [151.2140, -33.8358],
      [151.2252, -33.8351],
      [151.2388, -33.8307],
      [151.2462, -33.8271],
      [151.2442, -33.8233],
      [151.2353, -33.8250],
      [151.2251, -33.8277],
      [151.2147, -33.8295],
      [151.2140, -33.8358],
    ],
  },
  {
    option: 'option1',
    id: 'o1-low-wide-residential',
    label: 'Option 1 broader residential change area',
    band: '3-4',
    polygon: [
      [151.2127, -33.8411],
      [151.2230, -33.8394],
      [151.2328, -33.8348],
      [151.2462, -33.8316],
      [151.2470, -33.8254],
      [151.2385, -33.8227],
      [151.2260, -33.8257],
      [151.2150, -33.8281],
      [151.2129, -33.8328],
      [151.2127, -33.8411],
    ],
  },

  // Option 2 - High and narrow: 9% LGA, 3-28 storeys.
  {
    option: 'option2',
    id: 'o2-spit-junction-peak',
    label: 'Option 2 Spit Junction 26-28 storey peak',
    band: '26-28',
    polygon: [
      [151.2373, -33.8241],
      [151.2419, -33.8248],
      [151.2445, -33.8225],
      [151.2423, -33.8199],
      [151.2384, -33.8205],
      [151.2368, -33.8226],
      [151.2373, -33.8241],
    ],
  },
  {
    option: 'option2',
    id: 'o2-centre-gateway',
    label: 'Option 2 21-25 storey gateway',
    band: '21-25',
    polygon: [
      [151.2319, -33.8272],
      [151.2376, -33.8271],
      [151.2403, -33.8245],
      [151.2370, -33.8219],
      [151.2306, -33.8242],
      [151.2319, -33.8272],
    ],
  },
  {
    option: 'option2',
    id: 'o2-activity-core',
    label: 'Option 2 16-20 storey activity core',
    band: '16-20',
    polygon: [
      [151.2314, -33.8287],
      [151.2361, -33.8277],
      [151.2410, -33.8242],
      [151.2379, -33.8224],
      [151.2328, -33.8241],
      [151.2311, -33.8266],
      [151.2314, -33.8287],
    ],
  },
  {
    option: 'option2',
    id: 'o2-spit-road-spine',
    label: 'Option 2 9-15 storey Spit Road spine',
    band: '9-15',
    polygon: [
      [151.24245, -33.82425],
      [151.24435, -33.82365],
      [151.24445, -33.8150],
      [151.2433, -33.8150],
      [151.24295, -33.8172],
      [151.24245, -33.82425],
    ],
  },
  {
    option: 'option2',
    id: 'o2-military-shoulders',
    label: 'Option 2 5-8 storey corridor shoulders',
    band: '5-8',
    polygon: [
      [151.2145, -33.8344],
      [151.2264, -33.8329],
      [151.2383, -33.8280],
      [151.2414, -33.8241],
      [151.2373, -33.8217],
      [151.2255, -33.8246],
      [151.2148, -33.8280],
      [151.2145, -33.8344],
    ],
  },
  {
    option: 'option2',
    id: 'o2-low-rise-edges',
    label: 'Option 2 3-4 storey narrow edge',
    band: '3-4',
    polygon: [
      [151.2128, -33.8396],
      [151.2192, -33.8363],
      [151.2295, -33.8322],
      [151.2416, -33.8272],
      [151.2461, -33.8241],
      [151.2449, -33.8210],
      [151.2375, -33.8213],
      [151.2258, -33.8240],
      [151.2137, -33.8277],
      [151.2128, -33.8396],
    ],
  },
]

function zoneMeta(zone) {
  return STOREY_BANDS[zone.band]
}

function pointInPolygon(point, polygon) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

function masterplanZoneFor(option, lng, lat) {
  if (!insideMosmanMasterplanEdge(lng, lat)) return null
  return MASTERPLAN_ZONES.find(zone =>
    zone.option === option && pointInPolygon([lng, lat], zone.polygon)
  )
}

function withMasterplanAttributes(collection) {
  return {
    ...collection,
    features: collection.features.map(feature => {
      const lng = feature.properties.centroid_lng
      const lat = feature.properties.centroid_lat
      const option1Zone = masterplanZoneFor('option1', lng, lat)
      const option2Zone = masterplanZoneFor('option2', lng, lat)
      const option1Meta = option1Zone ? zoneMeta(option1Zone) : null
      const option2Meta = option2Zone ? zoneMeta(option2Zone) : null

      return {
        ...feature,
        properties: {
          ...feature.properties,
          option1Zone: option1Zone?.id || '',
          option1Label: option1Zone?.label || '',
          option1Band: option1Zone?.band || '',
          option1Storeys: option1Meta?.storeys || 0,
          option1Color: option1Meta?.color || '#64748b',
          option1Use: option1Meta?.use || 'Existing building',
          option1Shape: option1Meta?.shape || 'Current footprint',
          option2Zone: option2Zone?.id || '',
          option2Label: option2Zone?.label || '',
          option2Band: option2Zone?.band || '',
          option2Storeys: option2Meta?.storeys || 0,
          option2Color: option2Meta?.color || '#64748b',
          option2Use: option2Meta?.use || 'Existing building',
          option2Shape: option2Meta?.shape || 'Current footprint',
        },
      }
    }),
  }
}

const MASTERPLAN_BUILDINGS = withMasterplanAttributes(OSM_BUILDINGS)

function masterplanZoneCollection() {
  return {
    type: 'FeatureCollection',
    features: MASTERPLAN_ZONES.map(zone => {
      const meta = zoneMeta(zone)
      const displayPolygon = zone.polygon.map(clampToMosmanMasterplanEdge)
      return {
        type: 'Feature',
        properties: {
          option: zone.option,
          id: zone.id,
          label: zone.label,
          band: zone.band,
          storeys: meta.storeys,
          color: meta.color,
          use: meta.use,
          shape: meta.shape,
        },
        geometry: { type: 'Polygon', coordinates: [[...displayPolygon, displayPolygon[0]]] },
      }
    }),
  }
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
    return ['*', ['get', 'option2Storeys'], FLOORS_PER_METRE]
  }
  if (showOption1) {
    return ['*', ['get', 'option1Storeys'], FLOORS_PER_METRE]
  }
  return ['get', 'height']
}

function buildingColorExpr(showOption1, showOption2) {
  if (showOption2) {
    return ['get', 'option2Color']
  }
  if (showOption1) {
    return ['get', 'option1Color']
  }
  return '#64748b'
}

function optionBuildingFilter(showOption1, showOption2) {
  if (showOption2) return ['>', ['get', 'option2Storeys'], 0]
  if (showOption1) return ['>', ['get', 'option1Storeys'], 0]
  return null
}

function optionZoneFilter(showOption1, showOption2) {
  if (showOption2) return ['==', ['get', 'option'], 'option2']
  if (showOption1) return ['==', ['get', 'option'], 'option1']
  return ['==', ['get', 'option'], 'none']
}

function setLayerFilter(map, layerId, filter) {
  if (!map.getLayer(layerId)) return
  map.setFilter(layerId, filter || null)
}

function updateRouteSources(map, coords) {
  const routeSrc = map.getSource('bypass-route')
  if (routeSrc) routeSrc.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } })
  const corridorSrc = map.getSource('bypass-corridor')
  if (corridorSrc) corridorSrc.setData({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [corridorPolygon(coords, 14)] } })
}

const BUILDING_LAYER_IDS = ['bypass-buildings-extrusion', 'bypass-buildings-fill', 'bypass-buildings-lines']
const PLAN_ZONE_LAYER_IDS = ['masterplan-zone-fill', 'masterplan-zone-line']
const BYPASS_LAYER_IDS = [
  'bypass-ground-shadow',
  'bypass-columns',
  'bypass-deck',
  'bypass-line-halo',
  'bypass-line-mid',
  'bypass-line-centre',
]

function setLayerVisibility(map, layerId, visible) {
  if (!map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

function BypassMap3D({ showBypass, showOption1, showOption2, routeCalibrMode, routeCoords, onRouteChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const loadedRef = useRef(false)
  const routeMarkersRef = useRef([])
  const endpointMarkersRef = useRef([])
  const routeCoordsRef = useRef(null)
  const [legendOpen, setLegendOpen] = useState(true)

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    const map = mapRef.current
    map.setPaintProperty('bypass-buildings-extrusion', 'fill-extrusion-height', buildingHeightExpr(showOption1, showOption2))
    map.setPaintProperty('bypass-buildings-extrusion', 'fill-extrusion-color', buildingColorExpr(showOption1, showOption2))
    map.setPaintProperty('bypass-buildings-extrusion', 'fill-extrusion-opacity', showOption1 || showOption2 ? 0.72 : 0.3)
    const buildingFilter = optionBuildingFilter(showOption1, showOption2)
    const zoneFilter = optionZoneFilter(showOption1, showOption2)
    BUILDING_LAYER_IDS.forEach(id => setLayerFilter(map, id, buildingFilter))
    PLAN_ZONE_LAYER_IDS.forEach(id => setLayerFilter(map, id, zoneFilter))
  }, [showOption1, showOption2])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return

    if (routeCalibrMode && showBypass) {
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
  }, [routeCalibrMode, showBypass])

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    const map = mapRef.current
    BYPASS_LAYER_IDS.forEach(id => setLayerVisibility(map, id, showBypass))
    endpointMarkersRef.current.forEach(marker => {
      marker.getElement().style.display = showBypass ? '' : 'none'
    })
  }, [showBypass])

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

      map.addSource('masterplan-zones', { type: 'geojson', data: masterplanZoneCollection() })

      map.addLayer({
        id: 'masterplan-zone-fill',
        type: 'fill',
        source: 'masterplan-zones',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.18,
        },
        filter: optionZoneFilter(showOption1, showOption2),
      })

      map.addLayer({
        id: 'masterplan-zone-line',
        type: 'line',
        source: 'masterplan-zones',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.2, 16, 2.8],
          'line-opacity': 0.74,
          'line-dasharray': [2, 1.4],
        },
        filter: optionZoneFilter(showOption1, showOption2),
      })

      map.addSource('bypass-osm-buildings', { type: 'geojson', data: MASTERPLAN_BUILDINGS })

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
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coord)
          .setPopup(new maplibregl.Popup({ closeButton: false, offset: 20 })
            .setHTML(`<div style="font-size:11px;font-weight:700;color:#0f172a">${label}</div>`))
          .addTo(map)
        endpointMarkersRef.current.push(marker)
      })

      // Apply initial building filter now that all layers exist
      const initBuildingFilter = optionBuildingFilter(showOption1, showOption2)
      const initZoneFilter = optionZoneFilter(showOption1, showOption2)
      BUILDING_LAYER_IDS.forEach(id => setLayerFilter(map, id, initBuildingFilter))
      PLAN_ZONE_LAYER_IDS.forEach(id => setLayerFilter(map, id, initZoneFilter))
      BYPASS_LAYER_IDS.forEach(id => setLayerVisibility(map, id, showBypass))
      endpointMarkersRef.current.forEach(marker => {
        marker.getElement().style.display = showBypass ? '' : 'none'
      })
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
      {showBypass && (
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 pointer-events-none">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest">
            {routeCalibrMode ? 'Calibration mode — drag numbered handles' : 'Overhead Bypass Route'}
          </p>
          <p className="text-xs text-slate-300 mt-0.5">Military Rd · Warringah Fwy → Spit Rd</p>
        </div>
      )}
      <div className="absolute bottom-10 left-3 flex max-w-[min(740px,calc(100%-1.5rem))] flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setLegendOpen(open => !open)}
          className="pointer-events-auto w-fit rounded bg-slate-900/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-100 backdrop-blur-sm"
        >
          {legendOpen ? 'Hide legend' : 'Show legend'}
        </button>
        {legendOpen && (
          <div className="pointer-events-none flex flex-col gap-1.5">
            {showBypass && <LegendPill color="#ef4444" label="Elevated bypass deck (8.5–11m)" />}
            {(showOption2 || showOption1) && (
              <>
                <LegendPill gradient="linear-gradient(90deg,#bfdbfe,#5b8def,#60c7b2,#facc15,#fb923c,#ef4444)"
                label={showOption2
                  ? 'Option 2 — High & Narrow · booklet p25 · 3–28F'
                  : 'Option 1 — Low & Wide · booklet p23 · 3–20F'} />
                <LegendPill color="rgba(191,219,254,0.7)" label="Blue tint = lower-storey masterplan edge, clipped to Mosman LGA" />
                <LegendPill color="rgba(96,199,178,0.7)" label="Teal tint = 9–15 storey mixed-use / shops spine, clipped before foreshore" />
                <LegendPill color="rgba(91,141,239,0.7)" label="Dark blue tint = 5–8 storey apartment shoulder" />
                {showOption2 && <LegendPill color="rgba(250,204,21,0.75)" label="Yellow tint = 16–20 storey activity core" />}
                {showOption2 && <LegendPill color="rgba(251,146,60,0.75)" label="Orange tint = 21–25 storey gateway" />}
                <LegendPill color="rgba(239,68,68,0.75)" label={showOption2 ? 'Red tint = 26–28 storey Spit Junction peak' : 'Red/yellow tint = highest Option 1 centre peak'} />
              </>
            )}
          </div>
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

const GOOGLE_STREET_VIEW_POINTS = [
  {
    id: 'military-west',
    label: 'Military Road west',
    position: { lat: -33.82765, lng: 151.23125 },
    pov: { heading: 71, pitch: 2 },
  },
  {
    id: 'mosman-centre',
    label: 'Mosman centre',
    position: { lat: -33.82455, lng: 151.24062 },
    pov: { heading: 83, pitch: 3 },
  },
  {
    id: 'spit-junction',
    label: 'Spit Junction',
    position: { lat: -33.81995, lng: 151.24398 },
    pov: { heading: 14, pitch: 4 },
  },
]

let googleMapsLoaderPromise

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser runtime required'))
  if (window.google?.maps?.StreetViewPanorama) return Promise.resolve(window.google.maps)
  if (googleMapsLoaderPromise) return googleMapsLoaderPromise

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps-loader="mosman-bypass"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&auth_referrer_policy=origin`
    script.async = true
    script.defer = true
    script.dataset.googleMapsLoader = 'mosman-bypass'
    script.onload = () => resolve(window.google.maps)
    script.onerror = () => reject(new Error('Google Maps script failed to load'))
    document.head.appendChild(script)
  })

  return googleMapsLoaderPromise
}

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

function GooglePhotoRealBypassView({ showBypass, showOption1, showOption2 }) {
  const panoContainerRef = useRef(null)
  const panoRef = useRef(null)
  const [viewId, setViewId] = useState(GOOGLE_STREET_VIEW_POINTS[1].id)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  const selectedView = GOOGLE_STREET_VIEW_POINTS.find(point => point.id === viewId) || GOOGLE_STREET_VIEW_POINTS[1]

  useEffect(() => {
    if (!apiKey) {
      setStatus('missing-key')
      setMessage('Add VITE_GOOGLE_MAPS_API_KEY to enable live Google Street View imagery.')
      return
    }
    if (!panoContainerRef.current) return

    let cancelled = false
    setStatus('loading')
    setMessage('Loading Google Street View...')

    loadGoogleMaps(apiKey)
      .then(maps => {
        if (cancelled) return

        const service = new maps.StreetViewService()
        const applyPanorama = (data, streetViewStatus) => {
          if (cancelled) return
          if (streetViewStatus !== maps.StreetViewStatus.OK || !data?.location?.pano) {
            setStatus('no-panorama')
            setMessage('Google Street View did not return imagery for this Military Road point.')
            return
          }

          if (!panoRef.current) {
            panoRef.current = new maps.StreetViewPanorama(panoContainerRef.current, {
              addressControl: false,
              clickToGo: true,
              disableDefaultUI: false,
              fullscreenControl: true,
              linksControl: true,
              motionTracking: false,
              motionTrackingControl: false,
              panControl: true,
              pov: selectedView.pov,
              showRoadLabels: true,
              visible: true,
              zoom: 0,
            })
          }

          panoRef.current.setPano(data.location.pano)
          panoRef.current.setPov(selectedView.pov)
          panoRef.current.setZoom(0)
          setStatus('ready')
          setMessage('')
        }

        service.getPanorama(
          {
            location: selectedView.position,
            radius: 95,
            source: maps.StreetViewSource.OUTDOOR,
          },
          applyPanorama
        )
      })
      .catch(error => {
        if (cancelled) return
        setStatus('error')
        setMessage(error.message || 'Google Maps could not be loaded.')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, selectedView])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Photoreal Military Road view</p>
          <p className="mt-1 text-xs text-slate-500">
            Google Street View base with the same bypass and future-building scenario overlays.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GOOGLE_STREET_VIEW_POINTS.map(point => (
            <button
              key={point.id}
              type="button"
              onClick={() => setViewId(point.id)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                point.id === selectedView.id
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {point.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-lg">
        {apiKey ? (
          <div ref={panoContainerRef} className="h-[460px] w-full" />
        ) : (
          <PhotoRealFallback showBypass={showBypass} showOption1={showOption1} showOption2={showOption2} />
        )}

        {apiKey && status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 px-6 text-center backdrop-blur-sm">
            <p className="max-w-md text-sm font-semibold text-white">{message}</p>
          </div>
        )}

        <BypassPhotoOverlay
          showBypass={showBypass}
          showOption1={showOption1}
          showOption2={showOption2}
          muted={status !== 'ready' && !!apiKey}
        />

        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-slate-950/70 px-3 py-2 text-white backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200">
            {apiKey && status === 'ready' ? 'Google Street View' : 'Concept fallback'}
          </p>
          <p className="mt-0.5 text-xs font-semibold">{selectedView.label}</p>
        </div>
      </div>
    </div>
  )
}

function PhotoRealFallback({ showBypass, showOption1, showOption2 }) {
  const active = showOption1 || showOption2
  return (
    <div className="relative h-[460px] overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-slate-300 to-slate-700" />
      <div className="absolute inset-x-0 top-[36%] h-[26%] bg-gradient-to-b from-slate-500/30 to-transparent blur-xl" />
      <div className="absolute bottom-0 left-1/2 h-[62%] w-[74%] -translate-x-1/2 bg-gradient-to-t from-slate-700 via-slate-500 to-slate-400"
        style={{ clipPath: 'polygon(35% 0, 65% 0, 100% 100%, 0 100%)' }} />
      <div className="absolute bottom-0 left-1/2 h-[62%] w-[2px] -translate-x-1/2 bg-white/70" />
      <div className="absolute bottom-[9%] left-[8%] right-[8%] h-[7%] bg-slate-300/55 blur-sm" />
      {active && (
        <>
          <div className="absolute bottom-[23%] left-[6%] h-[40%] w-[12%] bg-slate-700/75 shadow-2xl" />
          <div className="absolute bottom-[21%] left-[20%] h-[52%] w-[10%] bg-slate-800/75 shadow-2xl" />
          <div className="absolute bottom-[24%] right-[8%] h-[58%] w-[12%] bg-slate-800/75 shadow-2xl" />
          <div className="absolute bottom-[22%] right-[24%] h-[38%] w-[11%] bg-slate-700/75 shadow-2xl" />
        </>
      )}
      {showBypass && (
        <div className="absolute left-[4%] right-[4%] top-[33%] h-[18%] rounded-full bg-red-400/25 blur-md" />
      )}
    </div>
  )
}

function BypassPhotoOverlay({ showBypass, showOption1, showOption2, muted }) {
  const active = showOption1 || showOption2
  const towerScale = showOption2 ? 1 : showOption1 ? 0.72 : 0.28
  const buildingOpacity = muted ? 0.32 : 0.62

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/20" />

      {active && (
        <>
          <FutureBuildingSilhouette side="left" x={5} width={8} height={42 * towerScale} tone="from-sky-300/70 to-cyan-700/60" opacity={buildingOpacity} label={showOption2 ? '18F' : '12F'} />
          <FutureBuildingSilhouette side="left" x={16} width={10} height={64 * towerScale} tone="from-indigo-300/70 to-blue-900/65" opacity={buildingOpacity} label={showOption2 ? '24F' : '16F'} />
          <FutureBuildingSilhouette side="left" x={29} width={8} height={50 * towerScale} tone="from-teal-200/70 to-teal-800/65" opacity={buildingOpacity} label={showOption2 ? '20F' : '14F'} />
          <FutureBuildingSilhouette side="right" x={6} width={10} height={76 * towerScale} tone="from-rose-300/75 to-red-900/70" opacity={buildingOpacity} label={showOption2 ? '28F' : '20F'} />
          <FutureBuildingSilhouette side="right" x={20} width={9} height={58 * towerScale} tone="from-amber-200/75 to-orange-800/70" opacity={buildingOpacity} label={showOption2 ? '22F' : '16F'} />
          <FutureBuildingSilhouette side="right" x={33} width={8} height={44 * towerScale} tone="from-cyan-200/70 to-slate-800/65" opacity={buildingOpacity} label={showOption2 ? '15F' : '10F'} />
        </>
      )}

      {showBypass && (
        <>
          <div className="absolute left-[3%] right-[3%] top-[31%] h-[18%] rounded-[45%] bg-red-500/25 blur-xl" />
          <div
            className="absolute left-[2%] right-[2%] top-[35%] h-[15%] border-y border-red-200/70 bg-gradient-to-r from-red-600/75 via-red-300/82 to-red-600/75 shadow-[0_0_28px_rgba(239,68,68,0.65)]"
            style={{ clipPath: 'polygon(0 34%, 14% 21%, 30% 28%, 47% 46%, 63% 42%, 81% 27%, 100% 36%, 100% 66%, 81% 56%, 63% 72%, 47% 76%, 30% 55%, 14% 52%, 0 66%)' }}
          />
          <div
            className="absolute left-[4%] right-[4%] top-[45%] h-[9%] bg-slate-900/70"
            style={{ clipPath: 'polygon(0 20%, 14% 0, 30% 13%, 47% 45%, 63% 38%, 81% 5%, 100% 20%, 100% 72%, 81% 58%, 63% 90%, 47% 95%, 30% 58%, 14% 55%, 0 78%)' }}
          />
          <div className="absolute left-[16%] top-[49%] h-[28%] w-[1.1%] rounded bg-slate-300/70 shadow-lg" />
          <div className="absolute left-[47%] top-[51%] h-[23%] w-[1.1%] rounded bg-slate-300/70 shadow-lg" />
          <div className="absolute right-[17%] top-[48%] h-[29%] w-[1.1%] rounded bg-slate-300/70 shadow-lg" />
        </>
      )}
    </div>
  )
}

function FutureBuildingSilhouette({ side, x, width, height, tone, opacity, label }) {
  const style = {
    bottom: '20%',
    height: `${height}%`,
    opacity,
    width: `${width}%`,
    [side]: `${x}%`,
  }

  return (
    <div
      className={`absolute rounded-t-sm bg-gradient-to-b ${tone} shadow-[0_0_24px_rgba(14,165,233,0.35)] ring-1 ring-white/20`}
      style={style}
    >
      <div className="absolute inset-x-[18%] top-[12%] grid grid-cols-2 gap-1">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} className="h-1 rounded-sm bg-white/45" />
        ))}
      </div>
      <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {label}
      </span>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BypassVisualization() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const [showBypass, setShowBypass] = useState(true)
  const [showOption1, setShowOption1] = useState(false)
  const [showOption2, setShowOption2] = useState(true)
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
      </div>

      {/* 3D aerial map */}
      <BypassMap3D
        showBypass={showBypass}
        showOption1={showOption1}
        showOption2={showOption2}
        routeCalibrMode={false}
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

      <GooglePhotoRealBypassView
        showBypass={showBypass}
        showOption1={showOption1}
        showOption2={showOption2}
      />

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
        or any current Council proposal. Future building footprints are current OSM buildings clipped into
        approximate masterplan areas from the booklet maps and the Mosman LGA edge, then assigned the matching
        Option 1 / Option 2 storey bands.
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
