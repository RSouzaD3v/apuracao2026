import { geoArea } from "d3-geo"
import type { Feature, Geometry, Position } from "geojson"

/** d3-geo espera anéis em sentido horário. Polígonos com orientação invertida
 * cobririam o globo inteiro (área > 2π); nesses casos invertemos os anéis. */
export function corrigirOrientacao<F extends Feature<Geometry>>(f: F): F {
  if (geoArea(f) <= 2 * Math.PI) return f
  const rev = (rings: Position[][]) => rings.map((r) => [...r].reverse())
  const g = f.geometry
  if (g.type === "Polygon") return { ...f, geometry: { ...g, coordinates: rev(g.coordinates) } }
  if (g.type === "MultiPolygon") return { ...f, geometry: { ...g, coordinates: g.coordinates.map(rev) } }
  return f
}
