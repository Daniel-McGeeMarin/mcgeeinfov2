import { useEffect, useMemo, useRef, useState } from 'react'
import { Mafs, Coordinates, Plot, Point } from 'mafs'
import { compile } from 'mathjs'
import 'mafs/core.css'
import { MODEL_COLORS } from './useFitSession'

function buildFn(expr) {
  if (!expr || !expr.trim()) return null
  try {
    const compiled = compile(expr)
    return (x) => {
      try {
        const v = compiled.evaluate({ x })
        return typeof v === 'number' && isFinite(v) ? v : NaN
      } catch {
        return NaN
      }
    }
  } catch {
    return null
  }
}

function niceLines(domain) {
  const range = Math.abs(domain[1] - domain[0])
  if (!range) return 1
  const rough = range / 6
  const mag = 10 ** Math.floor(Math.log10(rough))
  const norm = rough / mag
  if (norm < 1.5) return mag
  if (norm < 3) return 2 * mag
  if (norm < 7) return 5 * mag
  return 10 * mag
}

function fmtTick(n) {
  return String(Math.round(n * 1e9) / 1e9)
}

export default function Graph({ trainPoints, testPoints, models, xDomain, yDomain, boldMode, theme }) {
  const containerRef = useRef(null)
  const [height, setHeight] = useState(400)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const h = el.getBoundingClientRect().height
    if (h > 0) setHeight(h)
    const ro = new ResizeObserver(entries => {
      const next = entries[0].contentRect.height
      if (next > 0) setHeight(next)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fns = useMemo(() => {
    const out = {}
    for (const [type, m] of Object.entries(models)) {
      if (m.visible) out[type] = buildFn(m.expr)
    }
    return out
  }, [models])

  const viewBox = xDomain && yDomain ? { x: xDomain, y: yDomain } : undefined
  const xLines = xDomain ? niceLines(xDomain) : 1
  const yLines = yDomain ? niceLines(yDomain) : 1
  const ptR = boldMode ? 7 : 4
  const strokeW = boldMode ? 4 : 2
  const isDark = theme !== 'light'

  return (
    <div ref={containerRef} className="w-full h-full" data-mf-theme={isDark ? 'dark' : 'light'}>
      <Mafs
        viewBox={viewBox}
        preserveAspectRatio={false}
        height={height}
        pan
        zoom={{ min: 0.3, max: 20 }}
      >
        <Coordinates.Cartesian
          subdivisions={false}
          xAxis={{ lines: xLines, labels: fmtTick }}
          yAxis={{ lines: yLines, labels: fmtTick }}
        />

        {trainPoints.map((p, i) => (
          <Point
            key={`tr-${i}`}
            x={p.x}
            y={p.y}
            color={isDark ? '#ffffff' : '#171717'}
            svgCircleProps={{ r: ptR }}
          />
        ))}

        {testPoints?.map((p, i) => (
          <Point
            key={`te-${i}`}
            x={p.x}
            y={p.y}
            color="#facc15"
            svgCircleProps={{ r: ptR }}
          />
        ))}

        {Object.entries(fns).map(([type, fn]) =>
          fn ? (
            <Plot.OfX
              key={type}
              y={fn}
              color={MODEL_COLORS[type]}
              weight={strokeW}
            />
          ) : null
        )}
      </Mafs>
    </div>
  )
}
