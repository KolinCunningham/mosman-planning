import { Routes, Route, NavLink } from 'react-router-dom'
import { Map, LayoutDashboard, Menu, X, BookOpen, Zap, Building2, MessageSquare, ListChecks, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import Dashboard from './components/Dashboard'
import MapViewer from './components/MapViewer'
import ReferenceLibrary from './components/ReferenceLibrary'
import PowerlineData from './components/PowerlineData'
import BypassVisualization from './components/BypassVisualization'
import CouncilSubmission from './components/CouncilSubmission'
import SuggestionList from './components/SuggestionList'
import SuggestionForm from './components/SuggestionForm'
import MapChangeForm from './components/MapChangeForm'
import SessionLog from './components/SessionLog'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/suggestions', icon: ListChecks, label: 'Suggestions' },
  { to: '/maps', icon: Map, label: 'LEP Maps' },
  { to: '/bypass', icon: Building2, label: 'Bypass Viz' },
  { to: '/powerlines', icon: Zap, label: 'Powerlines' },
  { to: '/references', icon: BookOpen, label: 'References' },
  { to: '/log', icon: ClipboardList, label: 'Log' },
  { to: '/submission', icon: MessageSquare, label: 'Submission' },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-mosman-dark">
      <header className="bg-white border-b border-mosman-line sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/bokkas-logo.svg" alt="Bokkas" className="h-10 w-auto" />
          </div>
          <button className="md:hidden text-slate-500" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className="hidden md:flex gap-1">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-mosman-pink text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }>
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-mosman-line px-4 py-2 flex flex-col gap-1 bg-white">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded text-sm ${
                    isActive ? 'bg-mosman-pink text-white' : 'text-slate-600'
                  }`
                }>
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/suggestions" element={<SuggestionList />} />
          <Route path="/new" element={<SuggestionForm />} />
          <Route path="/new/:id" element={<SuggestionForm />} />
          <Route path="/map-change" element={<MapChangeForm />} />
          <Route path="/log" element={<SessionLog />} />
          <Route path="/maps" element={<MapViewer />} />
          <Route path="/powerlines" element={<PowerlineData />} />
          <Route path="/references" element={<ReferenceLibrary />} />
          <Route path="/bypass" element={<BypassVisualization />} />
          <Route path="/submission" element={<CouncilSubmission />} />
        </Routes>
      </main>

      <footer className="border-t border-mosman-line text-center py-3 text-xs text-slate-400 bg-white">
        Mosman Planning Intelligence System — LEP 2012 Reference
      </footer>
    </div>
  )
}
