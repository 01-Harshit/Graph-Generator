// ============================================================
// ChartDisplay.jsx — Renders all chart types via ECharts
// Chart types: bar, line, pie, scatter, area
// Linear Programming is imported from ./charts/lp_charts
// ============================================================

import { useState, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { DownloadIcon, ChartBarIcon, WarningIcon } from './Icons'
import { buildLinearProgrammingOption } from './charts/lp_charts'

function ChartDisplay({ data, isLoading }) {
  const [theme, setTheme] = useState('light')
  const chartRef = useRef(null)

  // ------------------------------------------------------------
  // DOWNLOAD CHART — Save as PNG
  // ------------------------------------------------------------
  const handleDownload = () => {
    if (!chartRef.current || !data) return

    try {
      const echartsInstance = chartRef.current.getEchartsInstance()

      const dataURL = echartsInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: theme === 'dark' ? '#0F0620' : '#F8F7FC',
      })

      const link = document.createElement('a')

      const title = data.title || 'chart'
      const sanitizedTitle = title
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .slice(0, 50)
        .toLowerCase()

      const timestamp = new Date().toISOString().slice(0, 10)
      link.download = `${sanitizedTitle}_${timestamp}.png`
      link.href = dataURL

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download chart')
    }
  }

  // ------------------------------------------------------------
  // THEME TRACKING
  // ------------------------------------------------------------
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }
    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  // ------------------------------------------------------------
  // THEME COLORS
  // ------------------------------------------------------------
  const themeTextColor = theme === 'dark' ? '#F8F7FC' : '#1A0B2E'
  const themeMutedColor = theme === 'dark' ? '#A78BFA' : '#6B5B95'

  // ------------------------------------------------------------
  // LOADING STATE
  // ------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-12 p-12 
                      bg-[var(--bg-card)] 
                      border border-[var(--border)] 
                      rounded-2xl text-center">
        <div className="inline-block w-10 h-10 border-4 
                        border-[var(--accent-primary)] 
                        border-t-transparent rounded-full 
                        animate-spin"></div>
        <p className="mt-4 text-[var(--text-secondary)]">
          Generating your chart...
        </p>
      </div>
    )
  }

  if (!data) return null

  // ============================================================
  // BUILD CHART OPTION
  // ============================================================
  const buildChartOption = (spec) => {
    // Safety check
    if (!spec) return {}

    if (spec.type === 'linear_programming') {
      if (!spec.constraints || !spec.bounds || !spec.objective) {
        console.warn('Incomplete LP data:', spec)
        return {
          title: {
            text: 'Incomplete chart data',
            left: 'center',
            top: 'center',
            textStyle: { color: '#ef4444', fontSize: 14 },
          },
        }
      }
    }

    const { chart_type, x_axis, y_axis, series } = spec

    const common = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: chart_type === 'pie' ? 'item' : 'axis',
        backgroundColor: 'rgba(15, 6, 32, 0.95)',
        borderColor: 'rgba(124, 58, 237, 0.6)',
        borderWidth: 1,
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        extraCssText:
          'backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(124, 58, 237, 0.4); border-radius: 8px;',
        valueFormatter: (value) => {
          if (typeof value === 'number') return value.toFixed(2)
          return value
        },
      },
      axisPointer: {
        lineStyle: {
          color: '#8C52FF',
          width: 3,
          type: 'solid',
          shadowBlur: 12,
          shadowColor: 'rgba(140, 82, 255, 1)',
        },
        crossStyle: {
          color: '#8C52FF',
          width: 3,
          type: 'solid',
          shadowBlur: 12,
          shadowColor: 'rgba(140, 82, 255, 1)',
        },
        label: {
          show: true,
          backgroundColor: '#7C3AED',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 'bold',
          borderRadius: 6,
          padding: [6, 10],
          shadowBlur: 15,
          shadowColor: 'rgba(124, 58, 237, 0.8)',
        },
      },
      legend: {
        bottom: 0,
        textStyle: {
          color: theme === 'dark' ? '#C4B5FD' : '#7C3AED',
          fontSize: 13,
          fontWeight: 'bold',
        },
        itemGap: 20,
        icon: 'roundRect',
      },
      animationDuration: 1200,
      animationEasing: 'cubicOut',
    }

    // ============================================================
    // LINEAR PROGRAMMING
    // ============================================================
    if (spec.type === 'linear_programming'|| spec.type === 'linear_programming_dual' ) {
      return buildLinearProgrammingOption(spec, theme, themeTextColor)
    } 

    // ============================================================
    // BAR CHART
    // ============================================================
    if (chart_type === 'bar') {
      return {
        ...common,
        grid: { left: '10%', right: '5%', top: '15%', bottom: '18%', containLabel: true },
        xAxis: {
          type: 'category',
          data: x_axis?.data || [],
          axisLabel: {
            color: themeTextColor,
            fontSize: 13,
            fontWeight: 'bold',
            margin: 12,
          },
          axisLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.3)' } },
        },
        yAxis: {
          type: 'value',
          name: y_axis?.label || '',
          nameTextStyle: { color: themeMutedColor, fontSize: 11 },
          axisLabel: { color: themeTextColor, fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.2)', type: 'dashed' } },
        },
        series: (series || []).map((s, i) => ({
          name: s.name || `Series ${i + 1}`,
          type: 'bar',
          data: s.data || [],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#A78BFA' },
                { offset: 0.5, color: '#8C52FF' },
                { offset: 1, color: '#582C83' },
              ],
            },
            borderRadius: [10, 10, 0, 0],
            shadowBlur: 25,
            shadowColor: 'rgba(140, 82, 255, 0.9)',
            shadowOffsetY: -3,
            borderColor: 'rgba(196, 181, 253, 0.4)',
            borderWidth: 1,
          },
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            color: themeTextColor,
            fontSize: 14,
            fontWeight: 'bold',
            formatter: '{c}',
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 35,
              shadowColor: 'rgba(140, 82, 255, 1)',
            },
          },
        })),
      }
    }

    // ============================================================
    // LINE CHART
    // ============================================================
    if (chart_type === 'line') {
      const isMath = data.is_math === true
      const dataCount = (series?.[0]?.data || []).length

      return {
        ...common,
        grid: { left: '10%', right: '6%', top: '15%', bottom: '18%', containLabel: true },
        xAxis: {
          type: 'category',
          data: x_axis?.data || [],
          axisLabel: {
            color: themeTextColor,
            fontSize: 10,
            fontWeight: 'bold',
            interval: isMath ? Math.floor(dataCount / 8) : 'auto',
            hideOverlap: true,
          },
          axisLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.3)' } },
        },
        yAxis: {
          type: 'value',
          name: y_axis?.label || '',
          nameTextStyle: { color: themeMutedColor, fontSize: 11 },
          axisLabel: { color: themeTextColor, fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.2)', type: 'dashed' } },
        },
        series: (series || []).map((s, i) => {
          const totalPoints = s.data?.length || 0
          const labelInterval = isMath ? Math.max(1, Math.floor(totalPoints / 5)) : 1

          return {
            name: s.name || `Series ${i + 1}`,
            type: 'line',
            data: s.data || [],
            smooth: !isMath,
            symbol: 'circle',
            symbolSize: isMath ? 5 : 9,
            lineStyle: {
              color: isMath ? '#A78BFA' : '#5EEAD4',
              width: isMath ? 2.5 : 4,
              shadowBlur: isMath ? 15 : 25,
              shadowColor: isMath ? 'rgba(140, 82, 255, 0.8)' : 'rgba(45, 212, 191, 1)',
            },
            itemStyle: {
              color: isMath ? '#A78BFA' : '#5EEAD4',
              shadowBlur: isMath ? 10 : 20,
              shadowColor: isMath ? 'rgba(140, 82, 255, 0.8)' : 'rgba(45, 212, 191, 1)',
              borderColor: '#FFFFFF',
              borderWidth: isMath ? 1 : 2,
            },
            label: {
              show: true,
              position: 'top',
              distance: 8,
              color: themeTextColor,
              fontSize: isMath ? 11 : 12,
              fontWeight: 'bold',
              formatter: (params) => {
                if (isMath) {
                  if (params.dataIndex % labelInterval !== 0) return ''
                  const val = params.value
                  if (val === null || val === undefined || isNaN(val)) return ''
                  return typeof val === 'number' ? val.toFixed(2) : val
                }
                const val = params.value
                if (typeof val === 'number') return val.toFixed(2)
                return val
              },
            },
            emphasis: {
              label: {
                show: true,
                formatter: (params) => {
                  const val = params.value
                  return typeof val === 'number' ? val.toFixed(2) : val
                },
              },
              itemStyle: {
                shadowBlur: 35,
                shadowColor: isMath ? 'rgba(140, 82, 255, 1)' : 'rgba(45, 212, 191, 1)',
              },
            },
          }
        }),
      }
    }

    // ============================================================
    // PIE CHART
    // ============================================================
    if (chart_type === 'pie') {
      const pieData = (series?.[0]?.data || []).map((val, i) => ({
        value: val,
        name: x_axis?.data?.[i] || `Item ${i + 1}`,
      }))

      return {
        ...common,
        tooltip: { ...common.tooltip, trigger: 'item' },
        series: [
          {
            name: series?.[0]?.name || 'Data',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            data: pieData,
            itemStyle: {
              borderRadius: 10,
              borderColor: theme === 'dark' ? '#1A0B2E' : '#FFFFFF',
              borderWidth: 2,
              shadowBlur: 30,
              shadowColor: 'rgba(140, 82, 255, 0.8)',
            },
            label: {
              color: themeTextColor,
              fontSize: 13,
              fontWeight: 'bold',
              formatter: '{b}\n{c}',
            },
            color: ['#7C3AED', '#2DD4BF', '#EC4899', '#8C52FF', '#582C83'],
            emphasis: {
              itemStyle: {
                shadowBlur: 40,
                shadowColor: 'rgba(140, 82, 255, 1)',
              },
            },
          },
        ],
      }
    }

    // ============================================================
    // SCATTER CHART
    // ============================================================
    if (chart_type === 'scatter') {
      return {
        ...common,
        grid: { left: '10%', right: '5%', top: '15%', bottom: '18%', containLabel: true },
        xAxis: {
          type: 'value',
          name: x_axis?.label || '',
          nameTextStyle: { color: themeMutedColor, fontSize: 11 },
          axisLabel: { color: themeTextColor, fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.2)', type: 'dashed' } },
        },
        yAxis: {
          type: 'value',
          name: y_axis?.label || '',
          nameTextStyle: { color: themeMutedColor, fontSize: 11 },
          axisLabel: { color: themeTextColor, fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.2)', type: 'dashed' } },
        },
        series: (series || []).map((s, i) => ({
          name: s.name || `Series ${i + 1}`,
          type: 'scatter',
          data: s.data || [],
          symbolSize: 16,
          itemStyle: {
            color: '#A78BFA',
            opacity: 1,
            shadowBlur: 20,
            shadowColor: 'rgba(140, 82, 255, 1)',
            borderColor: '#C4B5FD',
            borderWidth: 1.5,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 35,
              shadowColor: 'rgba(140, 82, 255, 1)',
            },
          },
        })),
      }
    }

    // ============================================================
    // AREA CHART
    // ============================================================
    if (chart_type === 'area') {
      return {
        ...common,
        grid: { left: '10%', right: '5%', top: '15%', bottom: '18%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: x_axis?.data || [],
          axisLabel: {
            color: themeTextColor,
            fontSize: 12,
            fontWeight: 'bold',
          },
          axisLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.3)' } },
        },
        yAxis: {
          type: 'value',
          name: y_axis?.label || '',
          nameTextStyle: { color: themeMutedColor, fontSize: 11 },
          axisLabel: { color: themeTextColor, fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.2)', type: 'dashed' } },
        },
        series: (series || []).map((s, i) => ({
          name: s.name || `Series ${i + 1}`,
          type: 'line',
          data: s.data || [],
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: {
            color: '#5EEAD4',
            width: 3,
            shadowBlur: 20,
            shadowColor: 'rgba(45, 212, 191, 1)',
          },
          itemStyle: {
            color: '#5EEAD4',
            shadowBlur: 15,
            shadowColor: 'rgba(45, 212, 191, 1)',
            borderColor: '#FFFFFF',
            borderWidth: 1.5,
          },
          label: {
            show: true,
            position: 'top',
            color: themeTextColor,
            fontSize: 11,
            fontWeight: 'bold',
            formatter: '{c}',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(140, 82, 255, 0.8)' },
                { offset: 0.5, color: 'rgba(124, 58, 237, 0.3)' },
                { offset: 1, color: 'rgba(45, 212, 191, 0.05)' },
              ],
            },
            shadowBlur: 40,
            shadowColor: 'rgba(140, 82, 255, 0.6)',
          },
        })),
      }
    }

    return common
  }

  const chartOption = buildChartOption(data)

  const isLPWithTable = (
    (data.type === 'linear_programming' && data.corner_points?.length > 0) ||
    (data.type === 'linear_programming_dual' && data.corner_points?.length > 0)
  )
  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="w-full max-w-4xl mx-auto mt-12 px-4">
      <div className="relative p-6 lg:p-8
                      bg-[var(--bg-card)] 
                      border border-[var(--border)] 
                      rounded-2xl 
                      shadow-2xl
                      dark:shadow-[0_0_60px_rgba(124,58,237,0.4),0_0_120px_rgba(45,212,191,0.15)]
                      dark:border-purple-500/50
                      dark:bg-gradient-to-br dark:from-purple-950/40 dark:via-[var(--bg-card)] dark:to-purple-900/20
                      transition-all duration-500">

        {/* UNBOUNDED WARNING BANNER */}
        {data.is_unbounded && (
          <div className="mb-6 p-4 rounded-xl 
                          bg-amber-500/10 dark:bg-amber-500/15
                          border border-amber-500/40 dark:border-amber-400/60
                          flex items-start gap-3
                          shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <WarningIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tracking-wide">
                Unbounded Linear Programming Problem
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                The feasible region extends infinitely. The actual optimum does <b>NOT exist</b> — the best corner point is shown for reference only.
              </p>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">
              {data.title || 'Generated Chart'}
            </h2>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-3 py-1 text-xs font-bold tracking-wider
                               bg-purple-500/10 dark:bg-purple-500/20
                               text-purple-600 dark:text-purple-300
                               border border-purple-500/30 dark:border-purple-400/50
                               rounded-full
                               shadow-[0_0_12px_rgba(124,58,237,0.3)]
                               dark:shadow-[0_0_20px_rgba(140,82,255,0.5)]
                               transition-all">
                {data.chart_type?.toUpperCase()}
              </span>

              <span className="px-3 py-1 text-xs font-bold tracking-wider
                               bg-teal-500/10 dark:bg-teal-500/20
                               text-teal-600 dark:text-teal-300
                               border border-teal-500/30 dark:border-teal-400/50
                               rounded-full
                               shadow-[0_0_12px_rgba(45,212,191,0.3)]
                               dark:shadow-[0_0_20px_rgba(45,212,191,0.5)]
                               transition-all">
                CONFIDENCE: {Math.round((data.confidence || 0) * 100)}%
              </span>

              {data.is_unbounded && (
                <span className="px-3 py-1 text-xs font-bold tracking-wider
                  bg-amber-500/15 dark:bg-amber-500/25
                  text-amber-600 dark:text-amber-400
                  border border-amber-500/40 dark:border-amber-400/60
                  rounded-full
                  shadow-[0_0_12px_rgba(245,158,11,0.4)]
                  dark:shadow-[0_0_20px_rgba(245,158,11,0.6)]
                  transition-all
                  animate-pulse
                  flex items-center gap-1.5">
                  <WarningIcon className="w-3.5 h-3.5" />
                  UNBOUNDED
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="p-2 rounded-lg 
                       hover:bg-purple-500/15 
                       hover:text-purple-500
                       text-[var(--text-secondary)]
                       transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download chart as PNG"
            aria-label="Download chart"
          >
            <DownloadIcon className="w-5 h-5" />
          </button>
        </div>

        {/* CHART CONTAINER */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 
                        relative overflow-hidden
                        dark:bg-gradient-to-br dark:from-purple-950/60 dark:via-indigo-950/40 dark:to-purple-900/30
                        dark:shadow-[inset_0_0_60px_rgba(124,58,237,0.2)]
                        transition-all duration-500">

          <div className="absolute top-0 right-0 w-64 h-64 
                          bg-purple-600/20 blur-3xl rounded-full 
                          hidden dark:block pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 
                          bg-teal-500/15 blur-3xl rounded-full 
                          hidden dark:block pointer-events-none"></div>

          <ReactECharts
            ref={chartRef}
            key={`${theme}-${data?.id || data?.title || 'chart'}-${data?.type || 'unknown'}`}
            option={chartOption}
            style={{ height: '350px', width: '100%' }}
            opts={{ 
              renderer: 'canvas',
              notMerge: true,
              lazyUpdate: false
            }}
          />
        </div>

        {/* FLOATING POPUP TABLE — Only for LP with corner points */}
        {isLPWithTable && (
          <div className={`
                          lg:absolute lg:right-6 lg:w-72 lg:z-20
                          mt-6 lg:mt-0
                          w-full
                          animate-[popupSlideIn_0.6s_ease-out_0.3s_both]
                          ${data.is_unbounded ? 'lg:top-64' : 'lg:top-28'}
                        `}>
            <div className="
                            overflow-hidden rounded-2xl
                            border-2 border-purple-500/40 dark:border-purple-400/60
                            bg-[var(--bg-card)]
                            shadow-2xl
                            dark:shadow-[0_0_50px_rgba(140,82,255,0.6)]
                            backdrop-blur-lg
                            dark:bg-gradient-to-br dark:from-purple-950/70 dark:via-[var(--bg-card)] dark:to-purple-900/40
                            transition-all duration-500">

              {/* Decorative bar */}
              <div className="px-3 py-2 
                              bg-purple-500/15 dark:bg-purple-500/25
                              border-b border-purple-500/30 dark:border-purple-400/40
                              flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400/70"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-400/70"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400/70"></div>
                </div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300 tracking-wider">
                  ANALYSIS
                </span>
              </div>

              {/* Table Title */}
              <div className="px-3 py-2 
                              bg-purple-500/5 dark:bg-purple-500/10
                              border-b border-purple-500/20">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] tracking-wide flex items-center gap-1.5">
                    <ChartBarIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                    <span>Corner Points</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">
                      ({data.objective.type === 'minimize' ? 'Smallest' : 'Largest'} Z is optimal)
                    </span>
                  </h3>

                  {data.type !== 'linear_programming_dual' && data.optimal_point && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold
                                    ${data.is_unbounded
                                      ? 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400'
                                      : 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                                    }`}>
                      {data.is_unbounded
                        ? `Best: Z = ${Math.round(data.optimal_point.z)}`
                        : `${data.objective.type === 'minimize' ? 'Min' : 'Max'} Z = ${Math.round(data.optimal_point.z)}`
                      }
                    </span>
                  )}

                  {/* Dual mode: Show both Min and Max values */}
                  {data.type === 'linear_programming_dual' && (
                    <div className="flex gap-1">
                      {data.minimize && !data.minimize.error && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold
                                        bg-emerald-500/20 dark:bg-emerald-500/25
                                        text-emerald-600 dark:text-emerald-400">
                          Min: {Math.round(data.minimize.optimal_point.z)}
                        </span>
                      )}
                      {data.maximize && !data.maximize.error && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold
                                        bg-red-500/20 dark:bg-red-500/25
                                        text-red-600 dark:text-red-400">
                          Max: {Math.round(data.maximize.optimal_point.z)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Table Body */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10">
                    <th className="px-2.5 py-1.5 text-center font-bold
                                   text-amber-500 dark:text-amber-400 
                                   text-[10px] tracking-wide">
                      (x, y)
                    </th>
                    <th className="px-2.5 py-1.5 text-center font-bold 
                                   text-amber-500 dark:text-amber-400
                                   text-[10px] tracking-wide">
                      Z
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.corner_points
                    .map(p => {
                      const computedZ = p.z !== undefined && p.z !== null
                        ? p.z
                        : (data.objective?.coeffs?.[0] || 1) * p.x + (data.objective?.coeffs?.[1] || 1) * p.y
                      return { ...p, computedZ }
                    })
                    .sort((a, b) => {
                      const minZ = data.minimize?.optimal_point?.z
                      const maxZ = data.maximize?.optimal_point?.z
                      if (minZ !== undefined && maxZ !== undefined) {
                        // Dual mode — sort by Z ascending
                        return a.computedZ - b.computedZ
                      }
                      if (data.objective?.type === 'minimize') return a.computedZ - b.computedZ
                      return b.computedZ - a.computedZ
                    })
                    .map((p, i) => {
                      // Check MIN point
                      const minPoint = data.minimize?.optimal_point
                      const isMin = minPoint &&
                        Math.abs(p.x - minPoint.x) < 0.5 &&
                        Math.abs(p.y - minPoint.y) < 0.5

                      // Check MAX point
                      const maxPoint = data.maximize?.optimal_point
                      const isMax = maxPoint &&
                        Math.abs(p.x - maxPoint.x) < 0.5 &&
                        Math.abs(p.y - maxPoint.y) < 0.5

                      // Single LP mode fallback
                      const singleOpt = data.optimal_point
                      const isSingle = singleOpt && !isMin && !isMax &&
                        Math.abs(p.x - singleOpt.x) < 0.5 &&
                        Math.abs(p.y - singleOpt.y) < 0.5

                      let rowClass = 'border-b border-purple-500/10 transition-colors hover:bg-purple-500/5'
                      let xColor = 'text-[var(--text-primary)]'
                      let zColor = 'text-[var(--text-primary)]'
                      let badges = []

                      if (isMin && isMax) {
                        rowClass = 'border-b border-purple-500/10 bg-purple-500/20 dark:bg-purple-500/25'
                        xColor = 'text-purple-600 dark:text-purple-300 font-bold'
                        zColor = 'text-purple-600 dark:text-purple-300 font-bold'
                        badges = ['MIN', 'MAX']
                      } else if (isMin || isSingle) {
                        rowClass = 'border-b border-purple-500/10 bg-emerald-500/15 dark:bg-emerald-500/20'
                        xColor = 'text-emerald-600 dark:text-emerald-400 font-bold'
                        zColor = 'text-emerald-600 dark:text-emerald-400 font-bold'
                        badges = ['MIN']
                      } else if (isMax) {
                        rowClass = 'border-b border-purple-500/10 bg-red-500/15 dark:bg-red-500/20'
                        xColor = 'text-red-600 dark:text-red-400 font-bold'
                        zColor = 'text-red-600 dark:text-red-400 font-bold'
                        badges = ['MAX']
                      }

                      return (
                        <tr
                          key={i}
                          className={rowClass}
                          style={{
                            animation: `popupSlideIn 0.4s ease-out ${0.4 + i * 0.08}s both`,
                          }}
                        >
                          <td className={`px-2.5 py-1.5 font-mono text-[11px] text-center ${xColor}`}>
                            ({Math.round(p.x)}, {Math.round(p.y)})
                          </td>
                          <td className={`px-2.5 py-1.5 text-center font-bold text-[11px] ${zColor}`}>
                            {Math.round(p.computedZ)}
                            {badges.map((badge, bIdx) => (
                              <span
                                key={bIdx}
                                className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold
                                  ${badge === 'MIN' && badges.length === 1
                                    ? 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                                    : badge === 'MAX' && badges.length === 1
                                    ? 'bg-red-500/25 text-red-600 dark:text-red-400'
                                    : badge === 'MIN'
                                    ? 'bg-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-red-500/30 text-red-700 dark:text-red-300'
                                  }`}
                              >
                                {badge}
                              </span>
                            ))}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChartDisplay