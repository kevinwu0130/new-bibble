import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getAnnotation, useReadingStore } from '../../store/readingStore'

const ROUTE_SOURCE_ID = 'route-line'
const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] }

export default function MapPanel() {
  const activeBookId = useReadingStore((s) => s.activeBookId)
  const activeChapter = useReadingStore((s) => s.activeChapter)
  const activeEntityId = useReadingStore((s) => s.activeEntityId)
  const setActiveEntity = useReadingStore((s) => s.setActiveEntity)

  const anno = getAnnotation(activeBookId, activeChapter)

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})

  // 初始化地圖（僅一次）
  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [35, 32],
      zoom: 5,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map
    return () => map.remove()
  }, [])

  // 章節切換：重繪 Pin + 路線；無註解的章節清空地圖
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const drawChapter = () => {
      // 清除舊 marker
      Object.values(markersRef.current).forEach((m) => m.remove())
      markersRef.current = {}

      const routeSource = map.getSource(ROUTE_SOURCE_ID)

      if (!anno) {
        if (routeSource) routeSource.setData(EMPTY_GEOJSON)
        return
      }

      // 畫實體 Pin
      Object.entries(anno.entities).forEach(([entityId, entity]) => {
        if (entity.type === 'person') return // 人物不重複畫 pin，用地點代表位置
        const el = document.createElement('div')
        el.className = 'map-pin'
        el.style.cssText =
          'width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);cursor:pointer;'
        el.addEventListener('click', () => setActiveEntity(entityId))

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([entity.lng, entity.lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText(entity.name))
          .addTo(map)
        markersRef.current[entityId] = marker
      })

      // 畫路線
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
          id: ROUTE_SOURCE_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          paint: { 'line-color': '#4f46e5', 'line-width': 3, 'line-dasharray': [2, 1] },
        })
      }

      map.flyTo({ center: anno.period.mapCenter, zoom: anno.period.mapZoom })
    }

    if (map.isStyleLoaded()) drawChapter()
    else map.once('load', drawChapter)
  }, [anno, setActiveEntity])

  // 高亮經文中的實體時：飛到該地點並放大該 marker
  useEffect(() => {
    const map = mapRef.current
    if (!map || !anno || !activeEntityId) return
    const entity = anno.entities[activeEntityId]
    if (!entity) return

    map.flyTo({ center: [entity.lng, entity.lat], zoom: Math.max(anno.period.mapZoom, 7), speed: 1.2 })

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement()
      el.style.width = id === activeEntityId ? '20px' : '14px'
      el.style.height = id === activeEntityId ? '20px' : '14px'
      el.style.background = id === activeEntityId ? '#f59e0b' : '#dc2626'
    })
  }, [activeEntityId, anno])

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      {!anno && (
        <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
          <span className="bg-white/90 text-gray-500 text-xs px-3 py-1.5 rounded-full shadow">
            本章尚無地圖標註 — 試試「地圖章節」快速連結
          </span>
        </div>
      )}
    </div>
  )
}
