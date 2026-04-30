import { useState } from 'react'
import { ExternalLink, X, Search, BookOpen } from 'lucide-react'
import { REFERENCE_DOCS, DOC_CATEGORIES } from '../data/referenceDocs'

export default function ReferenceLibrary() {
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')

  const filtered = REFERENCE_DOCS.filter(doc => {
    const matchesCat = activeCategory === 'ALL' || doc.category === activeCategory
    const q = query.toLowerCase()
    const matchesQuery = !q || doc.title.toLowerCase().includes(q) ||
      (doc.code || '').toLowerCase().includes(q) ||
      (doc.relevance || '').toLowerCase().includes(q)
    return matchesCat && matchesQuery
  })

  const grouped = Object.keys(DOC_CATEGORIES).reduce((acc, cat) => {
    const docs = filtered.filter(d => d.category === cat)
    if (docs.length) acc[cat] = docs
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Reference Library</h2>
          <p className="text-slate-400 text-sm">{REFERENCE_DOCS.length} documents — Standard Drawings, DCPs, Policies, Plans of Management</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="w-full bg-mosman-dark border border-mosman-border rounded-lg pl-9 pr-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-mosman-teal"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeCategory === 'ALL' ? 'bg-slate-500 text-white' : 'bg-mosman-dark border border-mosman-border text-slate-400 hover:text-white'}`}>
          All ({REFERENCE_DOCS.length})
        </button>
        {Object.entries(DOC_CATEGORIES).map(([key, cat]) => {
          const count = REFERENCE_DOCS.filter(d => d.category === key).length
          return (
            <button key={key}
              onClick={() => setActiveCategory(activeCategory === key ? 'ALL' : key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeCategory === key ? `${cat.color} text-white` : 'bg-mosman-dark border border-mosman-border text-slate-400 hover:text-white'}`}>
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Document groups */}
      {Object.entries(grouped).map(([catKey, docs]) => {
        const cat = DOC_CATEGORIES[catKey]
        return (
          <div key={catKey} className="bg-mosman-card border border-mosman-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-mosman-border flex items-center gap-3">
              <span className={`${cat.color} text-white text-xs font-bold px-2 py-1 rounded`}>{docs.length}</span>
              <div>
                <p className="text-white font-semibold text-sm">{cat.label}</p>
                <p className="text-slate-500 text-xs">{cat.desc}</p>
              </div>
            </div>
            <div className="divide-y divide-mosman-border">
              {docs.map(doc => (
                <button key={doc.id} onClick={() => setSelected(doc)}
                  className="w-full text-left px-4 py-3 hover:bg-mosman-border transition-colors flex items-start gap-3 group">
                  <BookOpen size={14} className="text-slate-500 flex-shrink-0 mt-0.5 group-hover:text-mosman-teal transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {doc.code && (
                        <span className={`${cat.color} text-white text-xs font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0`}>
                          {doc.code}
                        </span>
                      )}
                      <span className="text-slate-200 text-sm font-medium">{doc.title}</span>
                      {doc.date && <span className="text-xs text-slate-600">{doc.date}</span>}
                      {doc.rev && <span className="text-xs text-slate-600 font-mono">{doc.rev}</span>}
                    </div>
                    {doc.relevance && (
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{doc.relevance}</p>
                    )}
                  </div>
                  <ExternalLink size={12} className="text-slate-600 flex-shrink-0 mt-0.5 group-hover:text-mosman-teal transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="bg-mosman-card border border-mosman-border rounded-xl p-10 text-center">
          <p className="text-slate-400">No documents match "{query}"</p>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="bg-mosman-card border-b border-mosman-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selected.code && (
                <span className={`${DOC_CATEGORIES[selected.category]?.color} text-white text-xs font-mono font-bold px-2 py-1 rounded`}>
                  {selected.code}
                </span>
              )}
              <div>
                <p className="text-white font-semibold">{selected.title}</p>
                {selected.relevance && (
                  <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">{selected.relevance}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href={`/docs/${selected.file}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-mosman-teal hover:underline">
                <ExternalLink size={12} /> New tab
              </a>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>
          <iframe
            src={`/docs/${selected.file}`}
            className="flex-1 w-full"
            title={selected.title}
          />
        </div>
      )}
    </div>
  )
}
