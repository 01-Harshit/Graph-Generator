// ============================================================
// lp_min_max_charts.jsx
// Renders LP with BOTH minimize AND maximize solutions
// Min/Max labels hidden on graph, shown in table
// Corner points labels stay visible
// ============================================================

const CHART_COLORS = ['#7C3AED', '#2DD4BF', '#EC4899', '#8C52FF', '#F59E0B', '#10B981']

// ------------------------------------------------------------
// MOBILE DETECTION
// ------------------------------------------------------------
function isMobileView() {
  return typeof window !== 'undefined' && window.innerWidth < 640
}

// ------------------------------------------------------------
// SMART AXIS SCALE
// ------------------------------------------------------------
function getNiceAxisScale(maxValue) {
  if (!maxValue || maxValue <= 0) return { max: 10, interval: 1 }
  if (maxValue <= 10)   return { max: Math.ceil(maxValue),              interval: 1 }
  if (maxValue <= 20)   return { max: Math.ceil(maxValue / 2) * 2,      interval: 2 }
  if (maxValue <= 50)   return { max: Math.ceil(maxValue / 5) * 5,      interval: 5 }
  if (maxValue <= 100)  return { max: Math.ceil(maxValue / 10) * 10,    interval: 10 }
  if (maxValue <= 200)  return { max: Math.ceil(maxValue / 20) * 20,    interval: 20 }
  if (maxValue <= 500)  return { max: Math.ceil(maxValue / 50) * 50,    interval: 50 }
  if (maxValue <= 1000) return { max: Math.ceil(maxValue / 100) * 100,  interval: 100 }
  return { max: Math.ceil(maxValue / 500) * 500, interval: 500 }
}

// ------------------------------------------------------------
// CLEAN EQUATION
// ------------------------------------------------------------
function cleanEquation(coeffs, rhs, op = '=') {
  const [a, b] = coeffs
  const parts = []
  if (a !== 0) {
    if (a === 1) parts.push('x')
    else if (a === -1) parts.push('-x')
    else parts.push(`${a}x`)
  }
  if (b !== 0) {
    if (b === 1) parts.push(parts.length ? '+ y' : 'y')
    else if (b === -1) parts.push(parts.length ? '- y' : '-y')
    else parts.push(parts.length ? `+ ${b}y` : `${b}y`)
  }
  const symbol = op === '<=' ? '≤' : op === '>=' ? '≥' : '='
  return `${parts.join(' ')} ${symbol} ${rhs}`
}

// ------------------------------------------------------------
// CLIP LINE TO BOUNDS
// ------------------------------------------------------------
function clipLineToBounds(a, b, c, x_max, y_max) {
  const points = []
  if (Math.abs(b) > 1e-9) {
    const y = c / b
    if (y >= -0.01 && y <= y_max + 0.01) points.push([0, y])
  }
  if (Math.abs(a) > 1e-9) {
    const x = c / a
    if (x >= -0.01 && x <= x_max + 0.01) points.push([x, 0])
  }
  if (Math.abs(b) > 1e-9) {
    const y = (c - a * x_max) / b
    if (y >= -0.01 && y <= y_max + 0.01) points.push([x_max, y])
  }
  if (Math.abs(a) > 1e-9) {
    const x = (c - b * y_max) / a
    if (x >= -0.01 && x <= x_max + 0.01) points.push([x, y_max])
  }
  const unique = []
  for (const p of points) {
    const isDup = unique.some(q => Math.abs(q[0] - p[0]) < 0.05 && Math.abs(q[1] - p[1]) < 0.05)
    if (!isDup) unique.push(p)
  }
  return unique.length >= 2 ? [unique[0], unique[unique.length - 1]] : []
}

// ------------------------------------------------------------
// SMART LABEL POSITION (for corner points)
// ------------------------------------------------------------
function getSmartLabelPosition(point, x_max, y_max, index = 0, allPoints = []) {
  const [x, y] = point
  const xRatio = x / x_max
  const yRatio = y / y_max

  // Same Y=0 pe multiple points — alternate
  if (Math.abs(y) < 0.5) {
    const yZeroPoints = allPoints.filter(p => Math.abs(p[1]) < 0.5)
    const currentIndex = yZeroPoints.findIndex(p => Math.abs(p[0] - x) < 0.1)
    if (currentIndex % 2 === 0) {
      return { position: 'bottom', offset: [0, 18] }
    } else {
      return { position: 'top', offset: [0, -18] }
    }
  }

  // Corner detection
  if (xRatio > 0.75 && yRatio > 0.75) return { position: 'left', offset: [-20, -10] }
  if (xRatio > 0.75 && yRatio < 0.25) return { position: 'left', offset: [-20, 10] }
  if (xRatio < 0.25 && yRatio > 0.75) return { position: 'right', offset: [20, -10] }
  if (xRatio < 0.25 && yRatio < 0.25) return { position: 'right', offset: [20, 10] }
  if (xRatio > 0.75) return { position: 'left', offset: [-18, 0] }
  if (xRatio < 0.15) return { position: 'right', offset: [18, 0] }
  if (yRatio > 0.75) return { position: 'bottom', offset: [0, 18] }
  if (yRatio < 0.15) return { position: 'top', offset: [0, -18] }

  const alternatives = [
    { position: 'top',    offset: [0, -15] },
    { position: 'right',  offset: [15, 0] },
    { position: 'bottom', offset: [0, 15] },
    { position: 'left',   offset: [-15, 0] },
  ]
  return alternatives[index % alternatives.length]
}

// ============================================================
// MAIN EXPORT
// ============================================================
export function buildLinearProgrammingMinMaxOption(spec, theme, themeTextColor) {
  if (!spec) return {}

  const constraints = spec.constraints || []
  const feasible_region = spec.feasible_region || { points: [] }
  const corner_points = spec.corner_points || []
  const bounds = spec.bounds || { x_min: 0, x_max: 100, y_min: 0, y_max: 100 }
  const minimize = spec.minimize || {}
  const maximize = spec.maximize || {}

  const x_max = bounds.x_max || 100
  const y_max = bounds.y_max || 100

  const xScale = getNiceAxisScale(x_max)
  const yScale = getNiceAxisScale(y_max)

  const isMobile = isMobileView()

  const minOK = !!(minimize && !minimize.error && minimize.optimal_point)
  const maxOK = !!(maximize && !maximize.error && maximize.optimal_point)

  const minPoint = minOK ? minimize.optimal_point : null
  const maxPoint = maxOK ? maximize.optimal_point : null

  // ------------------------------------------------------------
  // CONSTRAINT LINES
  // ------------------------------------------------------------
  const constraintSeries = constraints.map((con, i) => {
    const [a, b] = con.coeffs || [0, 0]
    const c = con.rhs || 0
    const visibleLine = clipLineToBounds(a, b, c, xScale.max, yScale.max)
    const cleanLabel = cleanEquation([a, b], c, con.op)
    return {
      name: cleanLabel,
      type: 'line',
      data: visibleLine,
      showSymbol: false,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      lineStyle: {
        color: CHART_COLORS[i % CHART_COLORS.length],
        width: 2,
        type: 'solid',
        shadowBlur: 10,
        shadowColor: CHART_COLORS[i % CHART_COLORS.length]
      },
      z: 3
    }
  })

  // ------------------------------------------------------------
  // FEASIBLE REGION
  // ------------------------------------------------------------
  const feasibleSeries = feasible_region?.points?.length ? [{
    name: 'Feasible Region',
    type: 'line',
    data: feasible_region.points,
    showSymbol: false,
    lineStyle: { width: 0 },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 1, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(34, 197, 94, 0.35)' },
          { offset: 1, color: 'rgba(74, 222, 128, 0.45)' }
        ]
      }
    },
    silent: true,
    tooltip: { show: false },
    z: 1
  }] : []

  // ------------------------------------------------------------
  // CORNER POINTS — Labels visible
  // ------------------------------------------------------------
  const allCornerPoints = corner_points.map(p => [p.x, p.y])

  const cornerSeries = corner_points?.length ? [{
    name: 'Corner Points',
    type: 'scatter',
    data: corner_points
      .filter((p, i, arr) =>
        arr.findIndex(q => Math.abs(q.x - p.x) < 0.1 && Math.abs(q.y - p.y) < 0.1) === i
      )
      .map((p, i) => {
        const { position, offset } = getSmartLabelPosition(
          [p.x, p.y],
          xScale.max,
          yScale.max,
          i,
          allCornerPoints
        )

        return {
          value: [p.x, p.y],
          label: {
            show: true,
            position,
            offset: isMobile ? [offset[0] * 0.7, offset[1] * 0.7] : offset,
            formatter: `(${Math.round(p.x)}, ${Math.round(p.y)})`,
            color: '#FBBF24',
            fontSize: isMobile ? 9 : 10,
            fontWeight: 'bold',
            backgroundColor: 'rgba(15, 6, 32, 0.9)',
            padding: isMobile ? [2, 4] : [2, 5],
            borderRadius: 4,
            borderColor: '#FBBF24',
            borderWidth: 1
          }
        }
      }),
    symbolSize: isMobile ? 8 : 10,
    itemStyle: {
      color: '#FBBF24',
      borderColor: '#FFFFFF',
      borderWidth: 2,
      shadowBlur: 10,
      shadowColor: 'rgba(251, 191, 36, 0.9)'
    },
    z: 5
  }] : []

  // ------------------------------------------------------------
  // MIN POINT (Green pin) — Label HIDDEN
  // ------------------------------------------------------------
  const minSeries = minOK ? [{
    name: 'Minimum',
    type: 'scatter',
    data: [[minimize.optimal_point.x, minimize.optimal_point.y]],
    symbolSize: isMobile ? 18 : 22,
    symbol: 'pin',
    itemStyle: {
      color: '#10B981',
      borderColor: '#FFFFFF',
      borderWidth: 3,
      shadowBlur: 25,
      shadowColor: 'rgba(16, 185, 129, 1)'
    },
    label: {
      show: false,          // ✅ HIDDEN
    },
    labelLine: { show: false },
    z: 10
  }] : []

  // ------------------------------------------------------------
  // MAX POINT (Red pin) — Label HIDDEN
  // ------------------------------------------------------------
  const maxSeries = maxOK ? [{
    name: 'Maximum',
    type: 'scatter',
    data: [[maximize.optimal_point.x, maximize.optimal_point.y]],
    symbolSize: isMobile ? 18 : 22,
    symbol: 'pin',
    itemStyle: {
      color: '#EF4444',
      borderColor: '#FFFFFF',
      borderWidth: 3,
      shadowBlur: 25,
      shadowColor: 'rgba(239, 68, 68, 1)'
    },
    label: {
      show: false,          // ✅ HIDDEN
    },
    labelLine: { show: false },
    z: 10
  }] : []

  // ------------------------------------------------------------
  // LEGEND DATA
  // ------------------------------------------------------------
  const legendData = [
    ...constraints.map((c, i) => ({
      name: cleanEquation(c.coeffs, c.rhs, c.op),
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      textStyle: { color: theme === 'dark' ? '#C4B5FD' : '#7C3AED' }
    })),
    ...(minOK ? [{
      name: 'Minimum',
      itemStyle: { color: '#10B981' },
      textStyle: { color: theme === 'dark' ? '#6EE7B7' : '#047857' }
    }] : []),
    ...(maxOK ? [{
      name: 'Maximum',
      itemStyle: { color: '#EF4444' },
      textStyle: { color: theme === 'dark' ? '#FCA5A5' : '#B91C1C' }
    }] : [])
  ]

  const totalLegendItems = legendData.length
  const legendConfig = totalLegendItems > 5
    ? { top: 0, orient: 'horizontal' }
    : { bottom: 0, orient: 'horizontal' }

  // ------------------------------------------------------------
  // RETURN
  // ------------------------------------------------------------
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 6, 32, 0.95)',
      borderColor: 'rgba(124, 58, 237, 0.6)',
      borderWidth: 1,
      textStyle: { color: '#FFFFFF', fontSize: 12 },
      extraCssText: 'backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(124, 58, 237, 0.4); border-radius: 8px; pointer-events: none;',
      valueFormatter: (value) => typeof value === 'number' ? value.toFixed(2) : value,
      confine: true,
      position: function (point, params, dom, rect, size) {
        const [x, y] = point
        const [chartWidth, chartHeight] = size.viewSize
        const [tooltipWidth, tooltipHeight] = size.contentSize
        const OFFSET = 15
        
        const isRight = x > chartWidth / 2
        const isBottom = y > chartHeight / 2
        
        let posX, posY
        
        if (isRight && isBottom) {
          posX = x - tooltipWidth - OFFSET
          posY = y - tooltipHeight - OFFSET
        } else if (isRight && !isBottom) {
          posX = x - tooltipWidth - OFFSET
          posY = y + OFFSET
        } else if (!isRight && isBottom) {
          posX = x + OFFSET
          posY = y - tooltipHeight - OFFSET
        } else {
          posX = x + OFFSET
          posY = y + OFFSET
        }
        
        if (posX < 0) posX = OFFSET
        if (posX + tooltipWidth > chartWidth) posX = chartWidth - tooltipWidth - OFFSET
        if (posY < 0) posY = OFFSET
        if (posY + tooltipHeight > chartHeight) posY = chartHeight - tooltipHeight - OFFSET
        
        return [posX, posY]
      }
    },
    axisPointer: {
      lineStyle: {
        color: '#8C52FF', width: 3, type: 'solid',
        shadowBlur: 12, shadowColor: 'rgba(140, 82, 255, 1)'
      },
      label: {
        show: true,
        backgroundColor: '#7C3AED',
        color: '#FFFFFF',
        fontSize: isMobile ? 10 : 12,
        fontWeight: 'bold',
        borderRadius: 6,
        padding: isMobile ? [4, 8] : [6, 10]
      }
    },
    legend: {
      ...legendConfig,
      textStyle: {
        color: theme === 'dark' ? '#C4B5FD' : '#7C3AED',
        fontSize: isMobile ? 10 : 12,
        fontWeight: 'bold'
      },
      itemGap: isMobile ? 10 : 15,
      itemWidth: isMobile ? 15 : 25,
      itemHeight: isMobile ? 10 : 14,
      icon: 'roundRect',
      data: legendData
    },
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    grid: {
      left: isMobile ? '15%' : '12%',
      right: isMobile ? '12%' : '18%',
      top: isMobile ? '14%' : '18%',
      bottom: isMobile ? '24%' : '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'x',
      nameTextStyle: { 
        color: themeTextColor, 
        fontSize: isMobile ? 10 : 12, 
        fontWeight: 'bold' 
      },
      axisLabel: {
        color: themeTextColor,
        fontSize: isMobile ? 9 : 11,
        formatter: (value) => Math.round(value)
      },
      splitLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.15)', type: 'dashed' } },
      min: 0,
      max: xScale.max,
      interval: xScale.interval
    },
    yAxis: {
      type: 'value',
      name: 'y',
      nameTextStyle: { 
        color: themeTextColor, 
        fontSize: isMobile ? 10 : 12, 
        fontWeight: 'bold' 
      },
      axisLabel: {
        color: themeTextColor,
        fontSize: isMobile ? 9 : 11,
        formatter: (value) => Math.round(value)
      },
      splitLine: { lineStyle: { color: 'rgba(167, 139, 250, 0.15)', type: 'dashed' } },
      min: 0,
      max: yScale.max,
      interval: yScale.interval
    },
    series: [
      ...feasibleSeries,
      ...constraintSeries,
      ...cornerSeries,
      ...minSeries,
      ...maxSeries
    ]
  }
}