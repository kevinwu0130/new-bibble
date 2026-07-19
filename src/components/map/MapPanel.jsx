import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getAnnotation, useReadingStore } from '../../store/readingStore'

const ROUTE_SOURCE_ID = 'route-line'
const ROUTE_CASING_ID = 'route-line-casing'
const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] }

// 免金鑰向量底圖（部署環境可載入；沙盒/離線時 fallback 為空底）
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// 主前/主後年代顯示
function formatYearRange([from, to]) {
  const era = (y) => (y < 0 ? `主前${-y}` : `主後${y}`)
  if (from === to) return `約${era(from)}年`
  const sameEra = (from < 0) === (to < 0)
  return `約${era(from)}–${sameEra ? Math.abs(to) : era(to)}年`
}

// 底圖地名在地化成中文（底圖資料有 name:zh 系列欄位時生效）
function localizeLabels(map) {
  try {
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue
      const tf = map.getLayoutProperty(layer.id, 'text-field')
      if (!tf) continue
      map.setLayoutProperty(layer.id, 'text-field', [
        'coalesce',
        ['get', 'name:zh-Hant'],
        ['get', 'name:zh'],
        ['get', 'name_zh'],
        ['get', 'name'],
      ])
    }
  } catch {
    // 底圖載入失敗時忽略
  }
}

function makeEntityMarker(name, onClick) {
  const el = document.createElement('div')
  el.className = 'bible-marker'
  const dot = document.createElement('span')
  dot.className = 'bible-marker-dot'
  const label = document.createElement('span')
  label.className = 'bible-marker-label'
  label.textContent = name
  el.append(dot, label)
  el.addEventListener('click', onClick)
  return el
}

function makeRouteDot(index) {
  const el = document.createElement('div')
  el.className = 'route-dot'
  el.textContent = String(index)
  return el
}

// 無地圖標註的章節：由 Workers AI 依章節內容產生插圖（部署到 Cloudflare 後生效）
function ChapterIllustration({ bookId, chapter }) {
  const src = `/api/illustration?book=${bookId}&chapter=${chapter}`
  const [status, setStatus] = useState('loading')

  useEffect(() => setStatus('loading'), [src])

  return (
    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center overflow-hidden">
      {status !== 'error' && (
        <img
          key={src}
          src={src}
          alt="AI 章節插圖"
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-700 ${
            status === 'ok' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      {status === 'loading' && (
        <span className="absolute text-gray-300 text-sm animate-pulse">
          AI 正在為本章繪製插圖…（首次生成約需 10 秒）
        </span>
      )}
      {status === 'error' && (
        <span className="absolute text-gray-400 text-sm px-6 text-center">
          本章尚無地圖標註，AI 插圖暫時無法載入
        </span>
      )}
      {status === 'ok' && (
        <span className="absolute bottom-2 right-2 text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded">
          AI 生成示意圖
        </span>
      )}
    </div>
  )
}

export default function MapPanel() {
  const activeBookId = useReadingStore((s) => s.activeBookId)
  const activeChapter = useReadingStore((s) => s.activeChapter)
  const activeEntityId = useReadingStore((s) => s.activeEntityId)
  const setActiveEntity = useReadingStore((s) => s.setActiveEntity)

  const anno = getAnnotation(activeBookId, activeChapter)

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const routeMarkersRef = useRef([])

  // 初始化地圖（僅一次）
  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [35, 32],
      zoom: 5,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => localizeLabels(map))
    mapRef.current = map
    return () => map.remove()
  }, [])

  // 章節切換：重繪標記 + 路線；無註解的章節清空地圖
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // DOM 標記與鏡頭移動不依賴底圖，底圖載入失敗也照常顯示
    const drawMarkers = () => {
      Object.values(markersRef.current).forEach((m) => m.remove())
      markersRef.current = {}
      routeMarkersRef.current.forEach((m) => m.remove())
      routeMarkersRef.current = []

      if (!anno) return

      // 實體標記：圓點 + 中文名稱標籤
      Object.entries(anno.entities).forEach(([entityId, entity]) => {
        if (entity.type === 'person') return // 人物不畫 pin，用地點代表位置
        const el = makeEntityMarker(entity.name, () => setActiveEntity(entityId))
        const marker = new maplibregl.Marker({ element: el, anchor: 'top', offset: [0, -9] })
          .setLngLat([entity.lng, entity.lat])
          .addTo(map)
        markersRef.current[entityId] = marker
      })

      // 路線途經點：編號小點 + 中文彈出說明
      anno.route.path.forEach((p, i) => {
        const el = makeRouteDot(i + 1)
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 10, closeButton: false }).setText(
              `${i + 1}. ${p.name}（第 ${p.verseAnchor} 節）`,
            ),
          )
          .addTo(map)
        routeMarkersRef.current.push(marker)
      })

      // 自動框住整條路線與所有地點
      try {
        const bounds = new maplibregl.LngLatBounds()
        anno.route.path.forEach((p) => bounds.extend([p.lng, p.lat]))
        Object.values(anno.entities).forEach((e) => {
          if (e.type !== 'person') bounds.extend([e.lng, e.lat])
        })
        map.fitBounds(bounds, { padding: { top: 90, bottom: 60, left: 60, right: 60 }, maxZoom: 10.5, duration: 1200 })
      } catch {
        map.flyTo({ center: anno.period.mapCenter, zoom: anno.period.mapZoom })
      }
    }

    // 路線圖層需要底圖 style 就緒
    const drawRouteLayers = () => {
      const routeSource = map.getSource(ROUTE_SOURCE_ID)

      if (!anno) {
        if (routeSource) routeSource.setData(EMPTY_GEOJSON)
        return
      }

      // 路線：白色描邊 + 靛藍虛線
      const routeGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: anno.route.path.map((p) => [p.lng, p.lat]),
        },
      }
      if (routeSource) {
        routeSource.setData(routeGeoJSON)
      } else {
        map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: routeGeoJSON })
        map.addLayer({
          id: ROUTE_CASING_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.85 },
        })
        map.addLayer({
          id: ROUTE_SOURCE_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round' },
          paint: { 'line-color': '#4f46e5', 'line-width': 3, 'line-dasharray': [2, 1.4] },
        })
      }
    }

    drawMarkers()
    if (map.isStyleLoaded()) {
      drawRouteLayers()
      return undefined
    }
    map.once('load', drawRouteLayers)
    return () => map.off('load', drawRouteLayers)
  }, [anno, setActiveEntity])

  // 高亮經文中的實體時：飛到該地點並強調該標記
  useEffect(() => {
    const map = mapRef.current
    if (!map || !anno || !activeEntityId) return
    const entity = anno.entities[activeEntityId]
    if (!entity) return

    map.flyTo({ center: [entity.lng, entity.lat], zoom: Math.max(anno.period.mapZoom, 7), speed: 1.2 })

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.getElement().classList.toggle('active', id === activeEntityId)
    })
  }, [activeEntityId, anno])

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      {anno && (
        <div className="absolute top-3 left-3 bg-white/92 backdrop-blur rounded-xl shadow-md px-3.5 py-2.5 max-w-[75%] pointer-events-none">
          <p className="text-xs font-bold text-indigo-700 leading-snug">{anno.route.label}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {anno.period.name} · {formatYearRange(anno.period.yearRange)}
          </p>
        </div>
      )}
      {!anno && activeBookId && <ChapterIllustration bookId={activeBookId} chapter={activeChapter} />}
    </div>
  )
}
