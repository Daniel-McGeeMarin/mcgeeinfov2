import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Portfolio from './pages/Portfolio'
import About from './pages/About'
import Resume from './pages/Resume'
import PokerTable from './pages/PokerTable'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Portfolio />} />
        <Route path="/about" element={<About />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/apps/poker" element={<PokerTable />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <Sidebar />
        <main className="pt-14 lg:pt-0 lg:pl-64">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}
