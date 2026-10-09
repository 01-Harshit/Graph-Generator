// ============================================================
// App.jsx — With sidebar that shifts content
// ============================================================

import { useState, useRef, useEffect } from 'react'
import Navbar from './components/Navbar'
import HeroGraph from './components/HeroGraph'
import QuestionInput from './components/QuestionInput'
import ChartDisplay from './components/ChartDisplay'
import HistorySidebar from './components/HistorySidebar'
import { generateGraph } from './services/api'
import { HistoryIcon } from './components/Icons'

function App() {
  const [chartData, setChartData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const chartRef = useRef(null)
  const closeTimer = useRef(null)

  // ------------------------------------------------------------
  // GENERATE
  // ------------------------------------------------------------
  const handleGenerate = async (question) => {
    setIsLoading(true)
    setError(null)
    setChartData(null)

    try {
      const data = await generateGraph(question)
      setChartData(data)
      setHistoryRefresh(prev => prev + 1)
      
      setTimeout(() => {
        chartRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 300)
    } catch (err) {
      // User-friendly error messages
      const rawDetail = err.response?.data?.detail || err.message || ''
      
      let userMessage = 'Could not generate chart. Please try again.'
      
      if (rawDetail.includes('UNBOUNDED') || rawDetail.includes('unbounded')) {
        userMessage = 'This problem has infinite solutions — no single answer exists. Try adding more constraints to bound the region.'
      } else if (rawDetail.includes('INFEASIBLE') || rawDetail.includes('infeasible')) {
        userMessage = 'No solution exists for these constraints. Please check your question.'
      } else if (rawDetail.includes('valid JSON') || rawDetail.includes('json_validate')) {
        userMessage = 'The AI couldn\'t understand this question. Try rephrasing it more clearly.'
      } else if (rawDetail.includes('rate_limit') || rawDetail.includes('429') || rawDetail.includes('Too many')) {
        userMessage = 'Too many requests. Please wait 30 seconds and try again.'
      } else if (rawDetail.includes('Question cannot be empty')) {
        userMessage = 'Please type a question first.'
      } else if (rawDetail.length > 0 && rawDetail.length < 200) {
        userMessage = rawDetail
      }
      
      setError(userMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // ------------------------------------------------------------
  // SELECT FROM HISTORY
  // ------------------------------------------------------------
  const handleSelectGraph = (graph) => {
    setChartData(graph.chart_spec)
    setError(null)
    setIsSidebarOpen(false)

    // Add Recent search 
    const q = graph.question
    if (q) {
      const stored = localStorage.getItem('recentSearches')
      let recentSearches = []
      try {
        recentSearches = stored ? JSON.parse(stored) : []
      } catch (e) {
        recentSearches = []
      }
      
      // Add to top, remove duplicates, limit 5
      const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
      
      // Custom event — QuestionInput ko notify
      window.dispatchEvent(new CustomEvent('recentSearchesUpdated', { 
        detail: updated 
      }))
    }
    
    setTimeout(() => {
      chartRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  // ------------------------------------------------------------
  // LEFT EDGE HOVER
  // ------------------------------------------------------------
  const handleLeftEdgeEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setIsSidebarOpen(true)
  }

  const handleLeftEdgeLeave = () => {
    closeTimer.current = setTimeout(() => {
      setIsSidebarOpen(false)
    }, 500)
  }

  const handleSidebarEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const handleSidebarLeave = () => {
    closeTimer.current = setTimeout(() => {
      setIsSidebarOpen(false)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-500">
      <Navbar />

      {/* Hot zone (invisible) */}
      <div
        onMouseEnter={handleLeftEdgeEnter}
        className="fixed top-16 left-0 w-2 h-[calc(100%-4rem)] z-30"
      />

      {/* Vertical HISTORY tab hint */}
      <div
        onMouseEnter={handleLeftEdgeEnter}
        className={`
          fixed top-1/2 -translate-y-1/2 left-0 z-30
          transition-all duration-300
          ${isSidebarOpen ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        `}
      >
        <div className="
          bg-gradient-to-r from-purple-600 to-purple-700
          dark:from-purple-700 dark:to-purple-800
          text-white 
          px-1 py-4 
          rounded-r-xl 
          shadow-lg shadow-purple-500/30
          hover:px-2
          transition-all duration-200
          cursor-pointer
          flex flex-col items-center gap-2
        ">
          <HistoryIcon className="w-3.5 h-3.5" />
          <span className="text-[9px] font-bold tracking-widest [writing-mode:vertical-rl]">
            HISTORY
          </span>
        </div>
      </div>

      {/* Sidebar */}
      <HistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectGraph={handleSelectGraph}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        refreshTrigger={historyRefresh}
      />

      {/* MAIN CONTENT — Shifts right when sidebar opens */}
      <main 
        className={`
          pt-24 px-6 pb-20
          transition-all duration-300 ease-out
          ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}
        `}
      >
        <div className="max-w-4xl mx-auto text-center">
          <HeroGraph />

          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mt-8 mb-4">
            Turn Questions into{' '}
            <span className="bg-gradient-to-r from-purple-600 to-teal-500 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">
              Charts
            </span>
          </h1>

          <p className="text-base md:text-lg text-[var(--text-secondary)] mb-10">
            Ask anything. Get beautiful visualizations instantly.
          </p>

          <QuestionInput onSubmit={handleGenerate} isLoading={isLoading} />

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 
                            rounded-xl text-red-500 max-w-2xl mx-auto">
              {error}
            </div>
          )}

          <div ref={chartRef} className="scroll-mt-24">
            <ChartDisplay data={chartData} isLoading={isLoading} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App