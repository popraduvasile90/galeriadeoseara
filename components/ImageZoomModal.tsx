'use client'

import { useState, useEffect, useRef } from 'react'

interface ImageZoomModalProps {
  imageUrl: string
  title: string
  onClose: () => void
}

export default function ImageZoomModal({ imageUrl, title, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null)
  const [initialScale, setInitialScale] = useState<number>(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Disable page scrolling when zoom viewer is active
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4))
  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.25, 1)
      if (newScale === 1) setPosition({ x: 0, y: 0 })
      return newScale
    })
  }
  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Wheel zoom with manual non-passive listener to prevent window scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        setScale(prev => Math.min(prev + 0.1, 4))
      } else {
        setScale(prev => {
          const newScale = Math.max(prev - 0.1, 1)
          if (newScale === 1) setPosition({ x: 0, y: 0 })
          return newScale
        })
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Helper to calculate distance between two touch points for pinch-to-zoom
  const getTouchDistance = (touches: React.TouchList) => {
    const t1 = touches[0]
    const t2 = touches[1]
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
  }

  // Mobile Touch Support (supports 1-finger panning and 2-finger pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches)
      setTouchStartDist(dist)
      setInitialScale(scale)
      setIsDragging(false)
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true)
      const touch = e.touches[0]
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist !== null) {
      const currentDist = getTouchDistance(e.touches)
      const ratio = currentDist / touchStartDist
      const newScale = Math.max(1, Math.min(initialScale * ratio, 4))
      setScale(newScale)
      if (newScale === 1) setPosition({ x: 0, y: 0 })
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setTouchStartDist(null)
  }

  return (
    <div className="fixed inset-0 bg-stone-950/98 z-[9999] flex flex-col justify-between select-none font-sans">
      {/* Header Info & Close Button */}
      <div className="w-full flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="text-white space-y-1 pr-12">
          <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
            Vizualizare Detaliată Lucrare
          </span>
          <h2 className="font-serif text-sm md:text-base font-bold uppercase tracking-wide truncate max-w-[200px] sm:max-w-md md:max-w-xl">
            {title}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="border border-white/30 bg-black/40 hover:bg-[#7a1c1c] text-white px-4 py-2.5 font-serif text-xs uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>Închide</span>
          <span className="text-sm font-bold">&times;</span>
        </button>
      </div>

      {/* Main Image viewport */}
      <div 
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center overflow-hidden cursor-move relative touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="transition-transform duration-75 ease-out select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
        >
          <img 
            src={imageUrl} 
            alt={title} 
            draggable={false}
            className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain shadow-2xl pointer-events-none" 
          />
        </div>
      </div>

      {/* Zoom Control Overlay at Bottom */}
      <div className="w-full bg-gradient-to-t from-black/80 to-transparent p-4 md:p-6 z-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 bg-stone-900/90 border border-stone-800 p-2 shadow-2xl">
          <button 
            onClick={handleZoomOut}
            disabled={scale === 1}
            className="w-10 h-10 flex items-center justify-center text-white border border-stone-700 bg-stone-850 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-850 transition cursor-pointer text-lg font-bold"
            title="Micșorează"
          >
            &minus;
          </button>
          
          <span className="text-white font-mono text-xs px-3 font-semibold min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button 
            onClick={handleZoomIn}
            disabled={scale === 4}
            className="w-10 h-10 flex items-center justify-center text-white border border-stone-700 bg-stone-850 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-850 transition cursor-pointer text-lg font-bold"
            title="Mărește"
          >
            &#43;
          </button>
        </div>

        <div className="text-[10px] text-stone-400 font-serif italic tracking-wide text-center">
          Trageți de imagine pentru pan • Rotiți rotița mouse-ului sau folosiți controlerele pentru zoom
        </div>
      </div>
    </div>
  )
}
