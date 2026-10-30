import "server-only"
import { cacheLife } from "next/cache"

/**
 * Imagens buscadas direto da fonte, sem copiar arquivos para o projeto:
 * - fotos dos candidatos: sistema de divulgação do TSE (mesma origem dos resultados);
 * - bandeiras de estados e cidades e foto da cidade: Wikidata / Wikimedia Commons.
 * Só as URLs ficam em cache. Se a fonte falhar, as funções devolvem vazio e a tela usa o fallback.
 */

const TSE_FOTOS = "https://resultados.tse.jus.br/oficial/ele2026/6258/fotos/br"
const SPARQL = "https://query.wikidata.org/sparql"

export const fotoCandidato = (sq?: string) => (sq ? `${TSE_FOTOS}/${sq}.jpeg` : null)

/** Commons entrega a imagem já redimensionada pelo parâmetro width (e converte SVG em PNG). */
const commons = (url: string, largura: number) => `${url.replace(/^http:/, "https:")}?width=${largura}`

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  try {
    const res = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": "apuracao-2026/1.0 (projeto de pesquisa)" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    return (await res.json()).results.bindings
  } catch {
    return []
  }
}

/** Bandeira de cada UF, pela sigla (ex.: "SP"). */
export async function getBandeirasUF(): Promise<Record<string, string>> {
  "use cache"
  cacheLife("weeks")
  const rows = await sparql(`SELECT ?iso ?flag WHERE { ?it wdt:P300 ?iso . FILTER(STRSTARTS(?iso, "BR-")) ?it wdt:P41 ?flag . }`)
  return Object.fromEntries(rows.map((r) => [r.iso.value.slice(3), commons(r.flag.value, 64)]))
}

export type ImagensCidade = { foto: string | null; bandeira: string | null; brasao: string | null }

/** Foto, bandeira e brasão do município, pelo código IBGE (7 dígitos). */
export async function getImagensCidade(ibge: string): Promise<ImagensCidade> {
  "use cache"
  cacheLife("weeks")
  const vazio = { foto: null, bandeira: null, brasao: null }
  if (!/^\d{7}$/.test(ibge)) return vazio
  const rows = await sparql(
    `SELECT ?img ?flag ?coa WHERE { ?it wdt:P1585 "${ibge}" . OPTIONAL { ?it wdt:P18 ?img } OPTIONAL { ?it wdt:P41 ?flag } OPTIONAL { ?it wdt:P94 ?coa } } LIMIT 1`,
  )
  const r = rows[0]
  if (!r) return vazio
  return {
    foto: r.img ? commons(r.img.value, 1200) : null,
    bandeira: r.flag ? commons(r.flag.value, 160) : null,
    brasao: r.coa ? commons(r.coa.value, 160) : null,
  }
}
