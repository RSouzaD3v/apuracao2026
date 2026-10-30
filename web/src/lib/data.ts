import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Analise, Conferencia, Horario, MunDetalhe, MunRow, Resumo, UfRow } from "./types"

const DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "data")

async function ler<T>(nome: string): Promise<T> {
  "use cache"
  return JSON.parse(await readFile(path.join(DIR, nome), "utf8")) as T
}

export const getResumo = () => ler<Resumo>("resumo.json")
export const getConferencia = () => ler<Conferencia>("conferencia.json")
export const getHorario = () => ler<Horario>("horario.json")
export const getUfs = () => ler<UfRow[]>("ufs.json")
export const getMunicipios = () => ler<MunRow[]>("municipios.json")
export const getAnalise = () => ler<Analise>("analise.json")

export async function getMunicipio(key: string): Promise<MunDetalhe | null> {
  "use cache"
  if (!/^[a-z]{2}\d{5}$/.test(key)) return null
  try {
    return await ler<MunDetalhe>(`mun/${key}.json`)
  } catch {
    return null
  }
}

export { UF_NOMES } from "./ufs"
