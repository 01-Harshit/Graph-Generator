import { useState, useEffect } from 'react'
import { ChartBarIcon, SunIcon, MoonIcon } from './Icons'

function Navbar() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md 
                    bg-white/70 dark:bg-[#0F0620]/70 
                    border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo (History button hata diya) */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg 
                          bg-gradient-to-br from-purple-600 to-purple-800 
                          flex items-center justify-center shadow-md">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              Graph Generator
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              AI-Powered Charts
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative w-14 h-8 rounded-full 
                     bg-gray-200 dark:bg-purple-900/50 
                     transition-colors duration-300"
          aria-label="Toggle theme"
        >
          <div
            className={`absolute top-1 w-6 h-6 rounded-full 
                        bg-white dark:bg-purple-600 
                        shadow-md transition-transform duration-300 
                        flex items-center justify-center 
                        ${isDark ? 'translate-x-7' : 'translate-x-1'}`}
          >
            {isDark ? (
              <MoonIcon className="w-4 h-4 text-yellow-300" />
            ) : (
              <SunIcon className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        </button>

      </div>
    </nav>
  )
}

export default Navbar