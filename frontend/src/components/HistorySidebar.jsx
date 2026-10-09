  import { useState, useEffect } from 'react'
  import { getHistory, deleteGraph, touchGraph } from '../services/api'
  import { HistoryIcon, CloseIcon, TrashIcon, InboxIcon, ChartTypeIcon } from './Icons'

  // Symbol normalization
  const cleanDisplay = (text) => {
    if (!text) return ''
    return text
      .replace(/≤/g, '<=')
      .replace(/≥/g, '>=')
      .replace(/≠/g, '!=')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
  }

  function HistorySidebar({ 
    isOpen, onClose, onSelectGraph, onMouseEnter, onMouseLeave, refreshTrigger 
  }) {
    const [graphs, setGraphs] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    //  LIVE UPDATE — tick state
    const [tick, setTick] = useState(0)

    useEffect(() => {
      loadHistory()
    }, [refreshTrigger])

    // TIMER — har 30 second re-render
    useEffect(() => {
      const interval = setInterval(() => {
        setTick(t => t + 1)
      }, 30000)
      return () => clearInterval(interval)
    }, [])

    const loadHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getHistory(100, 0)
        setGraphs(data.items || [])
      } catch (err) {
        setError('Failed to load history')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    const handleDelete = async (e, id) => {
      e.stopPropagation()
      if (!confirm('Delete this chart?')) return
      try {
        await deleteGraph(id)
        setGraphs(prev => prev.filter(g => g.id !== id))
      } catch (err) {
        console.error('Delete failed:', err)
        alert('Failed to delete')
      }
    }
    // Handle graph click — reorder to top + load chart
    const handleGraphClick = async (graph) => {
      // 1. Parent ko notify — chart load ke liye
      onSelectGraph(graph)
      
      // 2. Backend call — timestamp update
      try {
        await touchGraph(graph.id)
        
        // 3. Local reorder — clicked item top pe
        setGraphs(prev => {
          const filtered = prev.filter(g => g.id !== graph.id)
          return [
            { ...graph, created_at: new Date().toISOString() },
            ...filtered
          ]
        })
      } catch (err) {
        console.error('Touch failed:', err)
        // Silently fail — user ko kuch nahi dikhana
      }
    }

    // COMPLETE formatTime — sab units
    const formatTime = (isoString) => {
      if (!isoString) return ''

      let normalized = isoString
      if (!normalized.endsWith('Z') && !normalized.includes('+')) {
        normalized += 'Z'   // Assume UTC
      }

      const date = new Date(normalized)
      const now = new Date()
      const diffMs = now - date

      if (diffMs < 0) return 'just now'

      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffMs / 60000)
      const diffHr  = Math.floor(diffMs / 3600000)
      const diffDay = Math.floor(diffMs / 86400000)
      const diffMo  = Math.floor(diffDay / 30)
      const diffYr  = Math.floor(diffDay / 365)

      if (diffSec < 5)   return 'just now'
      if (diffSec < 60)  return `${diffSec}s ago`
      if (diffMin < 60)  return `${diffMin}m ago`
      if (diffHr  < 24)  return `${diffHr}h ago`
      if (diffDay < 30)  return `${diffDay}d ago`
      if (diffMo  < 12)  return `${diffMo}mo ago`
      return `${diffYr}y ago`
    }

    return (
      <>
        {isOpen && (
          <div
            className="fixed top-16 inset-x-0 bottom-0 bg-black/50 z-30 lg:hidden"
            onClick={onClose}
          />
        )}

        <aside
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={`
            fixed top-16 left-0 bottom-0 w-72 z-40
            bg-[var(--bg-card)]
            border-r border-[var(--border)]
            shadow-2xl
            transform transition-all duration-300 ease-out
            dark:bg-gradient-to-b dark:from-purple-950/95 dark:to-[var(--bg-card)]
            ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
          `}
        >
          <div className="flex items-center justify-between px-4 py-3 
                          border-b border-purple-500/20
                          bg-purple-500/5 dark:bg-purple-500/10">
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  History
                </h2>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {graphs.length} chart{graphs.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-purple-500/10 
                        text-[var(--text-secondary)] transition-colors"
              aria-label="Close"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto h-[calc(100%-56px)]
                          [&::-webkit-scrollbar]:w-1.5
                          [&::-webkit-scrollbar-track]:bg-transparent
                          [&::-webkit-scrollbar-thumb]:bg-purple-500/30
                          [&::-webkit-scrollbar-thumb]:rounded-full">

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-purple-500 
                                border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30
                              text-red-500 rounded-lg">
                {error}
              </div>
            )}

            {!loading && !error && graphs.length === 0 && (
              <div className="text-center py-12 px-3">
                <InboxIcon className="w-12 h-12 mx-auto text-purple-400/60"/>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  No charts yet
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Generate your first chart
                </p>
              </div>
            )}

            {!loading && graphs.length > 0 && (
              <div className="space-y-2">
                {graphs.map((graph) => (
                  <div
                    key={graph.id}
                    onClick={() => handleGraphClick(graph)}
                    className="group relative p-3 rounded-lg 
                              bg-[var(--bg-secondary)] border border-[var(--border)]
                              hover:border-purple-500/50 hover:bg-purple-500/5
                              cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg 
                                      bg-purple-500/10 
                                      flex items-center justify-center">
                        <ChartTypeIcon 
                          type={graph.chart_type} 
                          className="w-4 h-4 text-purple-500 dark:text-purple-400" 
                        />
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)]
                                      line-clamp-2 leading-snug">
                          {cleanDisplay(graph.question)}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full
                                          bg-purple-500/15 
                                          text-purple-600 dark:text-purple-300
                                          font-bold uppercase">
                            {graph.chart_type || 'chart'}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {formatTime(graph.created_at)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(e, graph.id)}
                        className="opacity-0 group-hover:opacity-100
                                  p-1.5 rounded hover:bg-red-500/20
                                  text-red-400 transition-all"
                        aria-label="Delete">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </>
    )
  }

  export default HistorySidebar 