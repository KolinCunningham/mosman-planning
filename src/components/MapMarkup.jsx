import { useRef, useState, useEffect, useCallback } from 'react'
import { Pen, Square, Type, Eraser, Trash2, Download, Save, ChevronLeft, RotateCcw } from 'lucide-react'
import { useStorage } from '../hooks/useStorage'

const COLORS = [
  { label: 'Red — Remove / Flag', value: '#ef4444', bg: 'bg-red-500' },
  { label: 'Green — Proposed Add', value: '#22c55e', bg: 'bg-green-500' },
  { label: 'Yellow — Highlight', value: '#eab308', bg: 'bg-yellow-400' },
  { label: 'Blue — Note', value: '#3b82f6', bg: 'bg-blue-500' },
  { label: 'Purple — Heritage', value: '#a855f7', bg: 'bg-purple-500' },
  { label: 'Black', value: '#1e293b', bg: 'bg-slate-800' },
]

const TOOLS = [
  { id: 'pen', icon: Pen, label: 'Freehand' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'text', icon: Type, label: 'Text Label' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
]

export default function MapMarkup({ map, onClose }) {
  const canvasRef = useRef(null)
  const [markups, setMarkups] = useStorage(`markup_${map.id}`, [])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#ef4444')
  const [lineWidth, setLineWidth] = useState(3)
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [currentPath, setCurrentPath] = useState([])
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState(null)
  const [saved, setSaved] = useState(false)
  const [undoStack, setUndoStack] = useState([])

  // Redraw all markups on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const mark of markups) {
      ctx.strokeStyle = mark.color
      ctx.fillStyle = mark.color
      ctx.lineWidth = mark.lineWidth || 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (mark.type === 'pen') {
        if (mark.points.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(mark.points[0].x, mark.points[0].y)
        for (const p of mark.points.slice(1)) ctx.lineTo(p.x, p.y)
        ctx.stroke()
      } else if (mark.type === 'rect') {
        ctx.beginPath()
        ctx.strokeRect(mark.x, mark.y, mark.w, mark.h)
      } else if (mark.type === 'text') {
        ctx.font = `bold ${mark.fontSize || 16}px sans-serif`
        ctx.fillText(mark.text, mark.x, mark.y)
      }
    }
  }, [markups])

  useEffect(() => { redraw() }, [redraw])

  function getPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  function onMouseDown(e) {
    if (tool === 'text') {
      const pos = getPos(e)
      setTextPos(pos)
      return
    }
    setDrawing(true)
    const pos = getPos(e)
    setStartPos(pos)
    if (tool === 'pen' || tool === 'eraser') setCurrentPath([pos])
  }

  function onMouseMove(e) {
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)

    if (tool === 'pen') {
      const newPath = [...currentPath, pos]
      setCurrentPath(newPath)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      if (newPath.length > 1) {
        ctx.moveTo(newPath[newPath.length - 2].x, newPath[newPath.length - 2].y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    } else if (tool === 'eraser') {
      const newPath = [...currentPath, pos]
      setCurrentPath(newPath)
      ctx.strokeStyle = 'rgba(255,255,255,1)'
      ctx.lineWidth = lineWidth * 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      if (newPath.length > 1) {
        ctx.moveTo(newPath[newPath.length - 2].x, newPath[newPath.length - 2].y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    } else if (tool === 'rect' && startPos) {
      redraw()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y)
    }
  }

  function onMouseUp(e) {
    if (!drawing && tool !== 'text') return
    const pos = getPos(e)

    if (tool === 'pen' && currentPath.length > 1) {
      const newMark = { type: 'pen', points: currentPath, color, lineWidth, id: Date.now() }
      setMarkups(m => [...m, newMark])
      setUndoStack(u => [...u, markups])
    } else if (tool === 'eraser' && currentPath.length > 1) {
      // For eraser just clear visual — rebuild markups minus erased areas (simplified: add eraser path)
      const newMark = { type: 'eraser', points: currentPath, lineWidth: lineWidth * 6, id: Date.now() }
      setMarkups(m => [...m, newMark])
    } else if (tool === 'rect' && startPos) {
      const newMark = { type: 'rect', x: startPos.x, y: startPos.y, w: pos.x - startPos.x, h: pos.y - startPos.y, color, lineWidth, id: Date.now() }
      setMarkups(m => [...m, newMark])
      setUndoStack(u => [...u, markups])
    }

    setDrawing(false)
    setCurrentPath([])
    setStartPos(null)
  }

  function addText() {
    if (!textInput.trim() || !textPos) return
    const newMark = { type: 'text', text: textInput, x: textPos.x, y: textPos.y, color, fontSize: lineWidth * 5 + 10, id: Date.now() }
    setMarkups(m => [...m, newMark])
    setUndoStack(u => [...u, markups])
    setTextInput('')
    setTextPos(null)
  }

  function undo() {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setMarkups(prev)
    setUndoStack(u => u.slice(0, -1))
  }

  function clearAll() {
    if (!confirm('Clear all markup on this map?')) return
    setUndoStack(u => [...u, markups])
    setMarkups([])
  }

  function saveMarkup() {
    // already auto-saved via useStorage, just show feedback
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function exportImage() {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `${map.id}_markup.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Redraw eraser marks properly
  const redrawWithEraser = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const mark of markups) {
      if (mark.type === 'eraser') {
        ctx.strokeStyle = 'rgba(255,255,255,1)'
        ctx.lineWidth = mark.lineWidth
        ctx.lineCap = 'round'
        ctx.beginPath()
        if (mark.points?.length > 1) {
          ctx.moveTo(mark.points[0].x, mark.points[0].y)
          for (const p of mark.points.slice(1)) ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }
        continue
      }
      ctx.strokeStyle = mark.color
      ctx.fillStyle = mark.color
      ctx.lineWidth = mark.lineWidth || 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (mark.type === 'pen') {
        if (mark.points.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(mark.points[0].x, mark.points[0].y)
        for (const p of mark.points.slice(1)) ctx.lineTo(p.x, p.y)
        ctx.stroke()
      } else if (mark.type === 'rect') {
        ctx.beginPath()
        ctx.strokeRect(mark.x, mark.y, mark.w, mark.h)
      } else if (mark.type === 'text') {
        ctx.font = `bold ${mark.fontSize || 16}px sans-serif`
        ctx.fillText(mark.text, mark.x, mark.y)
      }
    }
  }, [markups])

  useEffect(() => { redrawWithEraser() }, [redrawWithEraser])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-mosman-line px-4 py-2 flex items-center gap-4 flex-wrap shadow-sm">
        <button onClick={onClose} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm font-medium">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="h-5 w-px bg-slate-200" />
        <p className="text-slate-700 text-sm font-semibold truncate max-w-xs">{map.label} — Markup</p>

        <div className="h-5 w-px bg-slate-200" />

        {/* Tools */}
        <div className="flex gap-1">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
              className={`p-2 rounded transition-colors ${tool === t.id ? 'bg-mosman-pink text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <t.icon size={16} />
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Colors */}
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
              className={`w-6 h-6 rounded-full transition-all ${c.bg} ${color === c.value ? 'ring-2 ring-offset-1 ring-slate-600 scale-125' : 'opacity-70 hover:opacity-100'}`} />
          ))}
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Line width */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Size</span>
          <input type="range" min={1} max={12} value={lineWidth}
            onChange={e => setLineWidth(Number(e.target.value))}
            className="w-20 accent-mosman-pink" />
          <span className="text-xs text-slate-500 w-4">{lineWidth}</span>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Actions */}
        <div className="flex gap-1">
          <button onClick={undo} title="Undo" className="p-2 rounded text-slate-600 hover:bg-slate-100 transition-colors" disabled={undoStack.length === 0}>
            <RotateCcw size={15} />
          </button>
          <button onClick={clearAll} title="Clear all" className="p-2 rounded text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
          <button onClick={saveMarkup} title="Save markup"
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${saved ? 'bg-green-100 text-green-700' : 'bg-mosman-teal text-white hover:opacity-90'}`}>
            <Save size={13} /> {saved ? 'Saved!' : 'Save'}
          </button>
          <button onClick={exportImage} title="Export as PNG"
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors">
            <Download size={13} /> Export
          </button>
        </div>

        {markups.length > 0 && (
          <span className="text-xs text-slate-400">{markups.length} mark{markups.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Text input when text tool active */}
      {tool === 'text' && textPos && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-yellow-700 font-medium">Add text label:</span>
          <input
            autoFocus
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addText()}
            placeholder="Type label and press Enter…"
            className="flex-1 bg-white border border-yellow-300 rounded px-3 py-1 text-sm text-slate-900 focus:outline-none focus:border-yellow-500"
          />
          <button onClick={addText} className="bg-mosman-pink text-white px-3 py-1 rounded text-sm">Add</button>
          <button onClick={() => { setTextPos(null); setTextInput('') }} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
        </div>
      )}

      {tool === 'text' && !textPos && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-700 font-medium">
          Click anywhere on the map to place a text label
        </div>
      )}

      {/* PDF + Canvas layer */}
      <div className="flex-1 relative overflow-hidden">
        <iframe
          src={map.url}
          className="absolute inset-0 w-full h-full"
          title={map.filename}
        />
        <canvas
          ref={canvasRef}
          width={1200}
          height={1600}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'crosshair' : 'crosshair', background: 'transparent' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { if (drawing) onMouseUp({ clientX: 0, clientY: 0 }) }}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
      </div>

      {/* Legend */}
      <div className="bg-white border-t border-mosman-line px-4 py-2 flex gap-4 text-xs text-slate-500 flex-wrap">
        {COLORS.map(c => (
          <span key={c.value} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${c.bg}`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
