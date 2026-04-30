import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Map, Lightbulb, FileEdit, ClipboardList, LayoutDashboard, Menu, X, BookOpen } from 'lucide-react'
import { useState } from 'react'
import Dashboard from './components/Dashboard'
import MapViewer from './components/MapViewer'
import SuggestionForm from './components/SuggestionForm'
import SuggestionList from './components/SuggestionList'
import MapChangeForm from './components/MapChangeForm'
import SessionLog from './components/SessionLog'
import ReferenceLibrary from './components/ReferenceLibrary'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/maps', icon: Map, label: 'LEP Maps' },
  { to: '/references', icon: BookOpen, label: 'References' },
  { to: '/suggestions', icon: Lightbulb, label: 'Suggestions' },
  { to: '/new', icon: FileEdit, label: 'New Suggestion' },
  { to: '/map-change', icon: FileEdit, label: 'Map Change' },
  { to: '/log', icon: ClipboardList, label: 'Session Log' },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-mosman-card border-b border-mosman-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-3 h-6 bg-mosman-pink rounded-sm rotate-12 inline-block" />
              <span className="w-3 h-6 bg-mosman-teal rounded-sm rotate-12 inline-block" />
              <span className="w-3 h-6 bg-mosman-pink rounded-sm rotate-12 inline-block" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">Mosman Planning</h1>
              <p className="text-xs text-slate-400">Intelligence System</p>
            </div>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className="hidden md:flex gap-1">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-mosman-pink text-white'
                      : 'text-slate-400 hover:text-white hover:bg-mosman-border'
                  }`
                }>
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-mosman-border px-4 py-2 flex flex-col gap-1">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded text-sm ${
                    isActive ? 'bg-mosman-pink text-white' : 'text-slate-400'
                  }`
                }>
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/maps" element={<MapViewer />} />
          <Route path="/suggestions" element={<SuggestionList />} />
          <Route path="/new" element={<SuggestionForm />} />
          <Route path="/new/:id" element={<SuggestionForm />} />
          <Route path="/map-change" element={<MapChangeForm />} />
          <Route path="/references" element={<ReferenceLibrary />} />
          <Route path="/log" element={<SessionLog />} />
        </Routes>
      </main>

      <footer className="border-t border-mosman-border text-center py-3 text-xs text-slate-600">
        Mosman Planning Intelligence System — LEP 2012 Reference
      </footer>
    </div>
  )
}
