import { useState, useEffect } from 'react'
import { SparklesIcon } from './Icons'

function QuestionInput({ onSubmit, isLoading }) {
  const [question, setQuestion] = useState('')
  const [recentSearches, setRecentSearches] = useState([])

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse recent searches')
      }
    }
  }, [])
  // ✅ Listen for external updates (from history click)
  useEffect(() => {
    const handleUpdate = (e) => {
      setRecentSearches(e.detail)
    }
    
    window.addEventListener('recentSearchesUpdated', handleUpdate)
    
    return () => {
      window.removeEventListener('recentSearchesUpdated', handleUpdate)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (question.trim() && !isLoading) {
      const q = question.trim()
      onSubmit(q)

      // Save to recent searches
      const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
  }

  const handleRecentClick = (q) => {
    setQuestion(q)
    if (!isLoading) {
      onSubmit(q)
      // Move to top
      const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
  }

  const clearRecent = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  const exampleQuestions = [
    "Compare revenue of Tata, Adani, and Reliance in 2024",
    "Show monthly iPhone sales in 2024",
    "Market share of Android vs iOS in India"
  ]

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center gap-2 p-2 
                        bg-[var(--bg-card)] 
                        border-2 border-[var(--border)] 
                        focus-within:border-[var(--accent-primary)] 
                        rounded-2xl 
                        transition-all duration-300
                        shadow-md">
          
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about data..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-transparent 
                       text-[var(--text-primary)] 
                       placeholder-[var(--text-muted)]
                       outline-none text-base
                       disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="flex items-center gap-2 px-5 py-3 
                       bg-gradient-to-r from-purple-600 to-purple-800 
                       hover:from-purple-700 hover:to-purple-900
                       text-white font-semibold rounded-xl
                       transition-all duration-300
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-md hover:shadow-lg"
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isLoading ? 'Generating...' : 'Generate'}
            </span>
          </button>
        </div>
      </form>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="mt-4 w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Recent
            </span>
            <button
              onClick={clearRecent}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((q, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(q)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs 
                           bg-[var(--bg-card)] 
                           border border-[var(--border)] 
                           text-[var(--text-secondary)]
                           hover:border-[var(--accent-primary)] 
                           hover:text-[var(--accent-primary)]
                           rounded-full transition-all duration-200
                           disabled:opacity-40
                           max-w-xs truncate"
              >
                🕐 {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Example Questions */}
      {recentSearches.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-[var(--text-muted)] w-full mb-1">Try these:</span>
          {exampleQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => setQuestion(q)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs 
                         bg-[var(--bg-card)] 
                         border border-[var(--border)] 
                         text-[var(--text-secondary)]
                         hover:border-[var(--accent-primary)] 
                         hover:text-[var(--accent-primary)]
                         rounded-full transition-all duration-200
                         disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default QuestionInput