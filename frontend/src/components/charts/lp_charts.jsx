// ============================================================
// lp_charts.jsx
// All logic for Linear Programming charts
// Exports: buildLinearProgrammingOption(spec, theme, themeTextColor)
// Handles: single LP + dual (min/max) LP
// ✅ Mobile responsive + No overlap
// ============================================================

import { buildLinearProgrammingMinMaxOption } from "./lp_min_max_charts"

const CHART_COLORS = ['#7C3AED', '#2DD4BF', '#EC4899', '#8C52FF', '#F59E0B', '#10B981']

// ------------------------------------------------------------
// ✅ NEW: MOBILE DETECTION
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
// ✅ SMART LABEL POSITION — Auto-fit + No overlap
// ------------------------------------------------------------
function getSmartLabelPosition(point, x_max, y_max, index = 0, allPoints = []) {
  const [x, y] = point
  const xRatio = x / x_max
  const yRatio = y / y_max

  // ✅ SPECIAL CASE: Same Y=0 pe multiple points — alternate
  if (Math.abs(y) < 0.5) {
    // Check karo kitne points y=0 pe hain
    const yZeroPoints = allPoints.filter(p => Math.abs(p[1]) < 0.5)
    const currentIndex = yZeroPoints.findIndex(p => 
      Math.abs(p[0] - x) < 0.1
    )
    
    // Alternate top/bottom
    if (currentIndex % 2 === 0) {
      return { position: 'bottom', offset: [0, 18] }
    } else {
      return { position: 'top', offset: [0, -18] }
    }
  }

  // Corner detection — chart boundaries ke andar rakho
  if (xRatio > 0.75 && yRatio > 0.75) {
    return { position: 'left', offset: [-20, -10] }
  }
  if (xRatio > 0.75 && yRatio < 0.25) {
    return { position: 'left', offset: [-20, 10] }
  }
  if (xRatio < 0.25 && yRatio > 0.75) {
    return { position: 'right', offset: [20, -10] }
  }
  if (xRatio < 0.25 && yRatio < 0.25) {
    return { position: 'right', offset: [20, 10] }
  }
  // Edge cases — single axis
  if (xRatio > 0.75) {
    return { position: 'left', offset: [-18, 0] }
  }
  if (xRatio < 0.15) {
    return { position: 'right', offset: [18, 0] }
  }
  if (yRatio > 0.75) {
    return { position: 'bottom', offset: [0, 18] }
  }
  if (yRatio < 0.15) {
    return { position: 'top', offset: [0, -18] }
  }

  // Default — alternate based on index
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
export function buildLinearProgrammingOption(spec, theme, themeTextColor) {

  // ✅ STEP 1: Check for dual (min + max) mode FIRST
  if (spec.type === 'linear_programming_dual') {
    return buildLinearProgrammingMinMaxOption(spec, theme, themeTextColor)
  }

  // ✅ STEP 2: Single mode (min OR max)
  const { constraints, feasible_region, corner_points, optimal_point, objective, bounds, is_unbounded } = spec
  const { x_min, x_max, y_min, y_max } = bounds

  const xScale = getNiceAxisScale(x_max)
  const yScale = getNiceAxisScale(y_max)

  // ✅ MOBILE DETECTION
  const isMobile = isMobileView()

  // ------------------------------------------------------------
  // CONSTRAINT LINES — ✅ Labels REMOVED
  // ------------------------------------------------------------
  const constraintSeries = constraints.map((con, i) => {
    const [a, b] = con.coeffs
    const c = con.rhs

    const visibleLine = clipLineToBounds(a, b, c, xScale.max, yScale.max)
    const cleanLabel = cleanEquation([a, b], c, con.op)

    return {
      name: cleanLabel,
      type: 'line',
      data: visibleLine,
      showSymbol: false,
      itemStyle: {
        color: CHART_COLORS[i % CHART_COLORS.length]
      },
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
  // X-INTERCEPTS
  // ------------------------------------------------------------
  const interceptSeries = [{
    name: 'X-intercepts',
    type: 'scatter',
    data: constraints
      .map(con => {
        const [a, b] = con.coeffs
        const c = con.rhs
        if (Math.abs(b) < 1e-9 || Math.abs(a) < 1e-9) return null
        const x_int = c / a
        if (x_int < 0 || x_int > xScale.max) return null

        const isFeasible = constraints.every(c2 => {
          const [a2, b2] = c2.coeffs
          const rhs2 = c2.rhs
          const val = a2 * x_int + 0
          if (c2.op === '<=' && val > rhs2 + 0.01) return false
          if (c2.op === '>=' && val < rhs2 - 0.01) return false
          return true
        })

        return isFeasible ? null : [x_int, 0]
      })
      .filter(Boolean),
    symbolSize: isMobile ? 6 : 8,   // ✅ Mobile adaptive
    itemStyle: {
      color: '#94A3B8',
      borderColor: '#FFFFFF',
      borderWidth: 1.5
    },
    label: {
      show: true,
      position: 'bottom',
      offset: [0, isMobile ? 8 : 10],   // ✅ Mobile adaptive
      formatter: (params) => `(${Math.round(params.value[0])}, 0)`,
      color: '#94A3B8',
      fontSize: isMobile ? 9 : 11,   // ✅ Mobile adaptive
      fontWeight: 'bold',
      backgroundColor: theme === 'dark'
        ? 'rgba(15, 6, 32, 0.85)'
        : 'rgba(255, 255, 255, 0.9)',
      padding: isMobile ? [1, 4] : [2, 6],
      borderRadius: 4
    },
    z: 4
  }]

  // ------------------------------------------------------------
  // CORNER POINTS — ✅ SMART POSITION + Mobile Adaptive
  // ------------------------------------------------------------
  const cornerSeries = corner_points?.length ? [{
    name: 'Corner Points',
    type: 'scatter',
    data: corner_points
      .filter((p, i, arr) =>
        arr.findIndex(q => Math.abs(q.x - p.x) < 0.1 && Math.abs(q.y - p.y) < 0.1) === i
      )
      .map((p, i) => {
        const isOptimal = optimal_point &&
          Math.abs(p.x - optimal_point.x) < 0.5 &&
          Math.abs(p.y - optimal_point.y) < 0.5

        // ✅ SMART POSITION — allPoints pass karo
        const { position, offset } = getSmartLabelPosition(
          [p.x, p.y],
          xScale.max,
          yScale.max,
          i,
          corner_points.map(pt => [pt.x, pt.y])   // ✅ allPoints
        )

        return {
          value: [p.x, p.y],
          label: {
            show: !isOptimal,
            position,
            offset: isMobile
              ? [offset[0] * 0.7, offset[1] * 0.7]   // ✅ Mobile me chhota offset
              : offset,
            formatter: `(${Math.round(p.x)}, ${Math.round(p.y)})`,
            color: '#FBBF24',
            fontSize: isMobile ? 9 : 11,   // ✅ Mobile adaptive
            fontWeight: 'bold',
            backgroundColor: 'rgba(15, 6, 32, 0.9)',
            padding: isMobile ? [2, 5] : [3, 7],
            borderRadius: 5,
            borderColor: '#FBBF24',
            borderWidth: 1
          }
        }
      }),
    symbolSize: isMobile ? 8 : 12,   // ✅ Mobile adaptive
    itemStyle: {
      color: '#FBBF24',
      borderColor: '#FFFFFF',
      borderWidth: 2,
      shadowBlur: 15,
      shadowColor: 'rgba(251, 191, 36, 0.9)'
    },
    z: 5
  }] : []

  // ------------------------------------------------------------
  // OPTIMAL POINT — ✅ SMART POSITION + Mobile Adaptive
  // ------------------------------------------------------------
  const optimalSeries = optimal_point ? [{
    name: 'Optimal Point',
    type: 'scatter',
    data: [[optimal_point.x, optimal_point.y]],
    symbolSize: isMobile ? 16 : 22,   // ✅ Mobile adaptive
    symbol: 'pin',
    itemStyle: {
      color: is_unbounded ? '#F59E0B' : '#EF4444',
      borderColor: '#FFFFFF',
      borderWidth: 3,
      shadowBlur: 25,
      shadowColor: is_unbounded ? 'rgba(245, 158, 11, 1)' : 'rgba(239, 68, 68, 1)'
    },
    label: {
      show: true,
      // ✅ SMART POSITION
      ...getSmartLabelPosition(
        [optimal_point.x, optimal_point.y],
        xScale.max,
        yScale.max,
        0,
        corner_points?.map(pt => [pt.x, pt.y]) || []
      ),
      formatter: `${is_unbounded ? 'Best Corner' : (objective.type === 'minimize' ? 'Minimum' : 'Maximum')}\n(${Math.round(optimal_point.x)}, ${Math.round(optimal_point.y)})\nZ = ${Math.round(optimal_point.z)}`,
      color: '#FFFFFF',
      fontSize: isMobile ? 9 : 11,   // ✅ Mobile adaptive
      fontWeight: 'bold',
      lineHeight: isMobile ? 12 : 15,
      backgroundColor: is_unbounded
        ? 'rgba(245, 158, 11, 0.95)'
        : 'rgba(239, 68, 68, 0.95)',
      padding: isMobile ? [3, 6] : [4, 8],
      borderRadius: 8,
      borderColor: '#FFFFFF',
      borderWidth: 2,
      shadowBlur: 20,
      shadowColor: is_unbounded
        ? 'rgba(245, 158, 11, 0.8)'
        : 'rgba(239, 68, 68, 0.8)'
    },
    labelLine: { show: false },
    z: 10
  }] : []

  // ------------------------------------------------------------
  // LEGEND DATA
  // ------------------------------------------------------------
  const legendData = constraints.map((c, i) => ({
    name: cleanEquation(c.coeffs, c.rhs, c.op),
    itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
    textStyle: { color: theme === 'dark' ? '#C4B5FD' : '#7C3AED' }
  }))

  // ------------------------------------------------------------
  // ✅ DYNAMIC LEGEND POSITION
  // ------------------------------------------------------------
  const constraintCount = constraints.length
  const legendConfig = constraintCount > 4
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
      extraCssText: 'backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(124, 58, 237, 0.4); border-radius: 8px;',
      valueFormatter: (value) => typeof value === 'number' ? value.toFixed(2) : value,
      
      // ✅ ADVANCED: Smart quadrant-based position
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
        fontSize: isMobile ? 10 : 12,   // ✅ Mobile adaptive
        fontWeight: 'bold',
        borderRadius: 6,
        padding: isMobile ? [4, 8] : [6, 10],
        shadowBlur: 15,
        shadowColor: 'rgba(124, 58, 237, 0.8)'
      }
    },
    legend: {
      ...legendConfig,
      textStyle: {
        color: theme === 'dark' ? '#C4B5FD' : '#7C3AED',
        fontSize: isMobile ? 10 : 13,   // ✅ Mobile adaptive
        fontWeight: 'bold'
      },
      itemGap: isMobile ? 10 : 20,        // ✅ Mobile adaptive
      itemWidth: isMobile ? 15 : 25,      // ✅ Mobile adaptive
      itemHeight: isMobile ? 10 : 14,     // ✅ Mobile adaptive
      icon: 'roundRect',
      data: legendData
    },
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    // ✅ DYNAMIC GRID — Mobile responsive
    grid: {
      left: isMobile ? '15%' : '12%',
      right: isMobile ? '12%' : '18%',
      top: isMobile ? '12%' : (constraintCount > 4 ? '15%' : '18%'),
      bottom: isMobile ? '22%' : (constraintCount > 4 ? '8%' : '15%'),
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'x',
      nameTextStyle: { 
        color: themeTextColor, 
        fontSize: isMobile ? 10 : 12,   // ✅ Mobile adaptive
        fontWeight: 'bold' 
      },
      axisLabel: {
        color: themeTextColor,
        fontSize: isMobile ? 9 : 11,   // ✅ Mobile adaptive
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
        fontSize: isMobile ? 10 : 12,   // ✅ Mobile adaptive
        fontWeight: 'bold' 
      },
      axisLabel: {
        color: themeTextColor,
        fontSize: isMobile ? 9 : 11,   // ✅ Mobile adaptive
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
      ...interceptSeries,
      ...cornerSeries,
      ...optimalSeries
    ]
  }
}