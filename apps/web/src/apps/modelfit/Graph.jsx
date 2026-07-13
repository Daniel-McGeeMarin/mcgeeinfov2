import { useMemo } from 'react'
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

export default function Graph({ trainPoints, testPoints, models, xDomain, yDomain }) {
  const fns = useMemo(() => {
    const out = {}
    for (const [type, m] of Object.entries(models)) {
      if (m.visible) out[type] = buildFn(m.expr)
    }
    return out
  }, [models])

  const viewBox = xDomain && yDomain
    ? { x: xDomain, y: yDomain }
    : undefined

  return (
    <div
      className="w-full h-full"
      style={{
        '--mafs-bg': '#09090b',
        '--mafs-fg': '#52525b',
        '--grid-line-subdivision-color': 'rgba(255,255,255,0.03)',
        '--grid-line-color': 'rgba(255,255,255,0.08)',
      }}
    >
      <Mafs
        viewBox={viewBox}
        preserveAspectRatio={false}
        pan
        zoom={{ min: 0.3, max: 20 }}
      >
        <Coordinates.Cartesian subdivisions={4} />

        {trainPoints.map((p, i) => (
          <Point key={`tr-${i}`} x={p.x} y={p.y} color="#ffffff" />
        ))}

        {testPoints?.map((p, i) => (
          <Point key={`te-${i}`} x={p.x} y={p.y} color="#facc15" />
        ))}

        {Object.entries(fns).map(([type, fn]) =>
          fn ? (
            <Plot.OfX
              key={type}
              y={fn}
              color={MODEL_COLORS[type]}
              weight={2.5}
            />
          ) : null
        )}
      </Mafs>
    </div>
  )
}
