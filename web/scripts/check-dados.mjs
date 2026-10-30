// Teste de consistência dos dados do site (npm run check-dados).
// Falha (exit 1) se o mesmo número aparecer diferente em dois arquivos/páginas, ou se as somas não fecharem.
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const DADOS = process.env.CHECK_DADOS_DIR ?? path.join(RAIZ, "public", "data")
const ler = (nome) => JSON.parse(readFileSync(path.join(DADOS, nome), "utf8"))

const stats = ler("stats.json")
const resumo = ler("resumo.json")
const horario = ler("horario.json")
const conf = ler("conferencia.json")
const analise = ler("analise.json")
const ufs = ler("ufs.json")
const muns = ler("municipios.json")
const det = readdirSync(path.join(DADOS, "mun")).map((f) => JSON.parse(readFileSync(path.join(DADOS, "mun", f), "utf8")))

let falhas = 0
let ok = 0
const fi = (n) => Math.round(n).toLocaleString("pt-BR")
function igual(nome, a, b) {
  if (JSON.stringify(a) === JSON.stringify(b)) ok++
  else {
    falhas++
    console.error(`FALHOU  ${nome}\n        ${JSON.stringify(a)}\n     ≠  ${JSON.stringify(b)}`)
  }
}
function contem(nome, texto, trecho) {
  if (texto.includes(trecho)) ok++
  else {
    falhas++
    console.error(`FALHOU  ${nome}: texto não contém "${trecho}"\n        ${texto.slice(0, 200)}`)
  }
}
const soma = (xs, f) => xs.reduce((s, x) => s + f(x), 0)
const tot = (xs) => ({ secoes: soma(xs, (x) => x.secoes), comp: soma(xs, (x) => x.comp), lula: soma(xs, (x) => x.lula), flavio: soma(xs, (x) => x.flavio) })
const pick = (t) => ({ secoes: t.secoes, comp: t.comp, lula: t.lula, flavio: t.flavio })

// ---------------------------------------------------------------- 1. seções tardias
for (const t of ["1", "2"]) {
  const s = stats.tardias[`t${t}`]
  igual(`tardias ${t}º turno: soma das faixas de horário = total de seções tardias`, tot(s.faixas), pick(s))
  igual(`tardias ${t}º turno: apos18 = faixas 18 + 19`, s.apos18, s.faixas[1].secoes + s.faixas[2].secoes)
  igual(`tardias ${t}º turno: horario.json = stats.json`, horario.tardias[t], s)
  igual(`tardias ${t}º turno: histograma (barras tardias) = total`, soma(horario.histograma, (b) => b[`t${t}Tardia`]), s.secoes)
  igual(`tardias ${t}º turno: soma das UFs = total`, soma(ufs, (u) => u[`tardias${t}`]), s.secoes)
}
const t2 = stats.tardias.t2
igual("tardias 2º turno: soma das UFs (eleitores, Lula, Flávio)", { comp: soma(ufs, (u) => u.compTardias2), lula: soma(ufs, (u) => u.lulaTardias2), flavio: soma(ufs, (u) => u.flavioTardias2) }, { comp: t2.comp, lula: t2.lula, flavio: t2.flavio })
igual("tardias 2º turno: soma das cidades (municipios.json)", { secoes: soma(muns, (m) => m.tr), comp: soma(muns, (m) => m.ctr) }, { secoes: t2.secoes, comp: t2.comp })
const listas = det.flatMap((d) => d.locais.flatMap((l) => l.tardias))
igual("tardias 2º turno: listas de seções por local (páginas de cidade) = total", tot(listas.map((x) => ({ secoes: 1, comp: x.c, lula: x.l, flavio: x.f }))), pick(t2))
igual(
  "tardias 2º turno: listas por local, separadas por faixa = faixas",
  t2.faixas.map((f) => tot(listas.filter((x) => x.fx === f.faixa).map((x) => ({ secoes: 1, comp: x.c, lula: x.l, flavio: x.f })))),
  t2.faixas.map(pick),
)
igual(
  "tardias 2º turno: cada cidade lista o mesmo número de seções do seu total",
  det.filter((d) => d.locais.reduce((s, l) => s + l.tardias.length, 0) !== d.municipio.bu.tardias2).map((d) => d.municipio.key),
  [],
)
igual("tardias: nenhuma no exterior", det.filter((d) => d.municipio.exterior).reduce((s, d) => s + d.municipio.bu.tardias2, 0), 0)
const cen = Object.fromEntries([...analise.prorrogacao, ...analise.anomalas].map((c) => [c.id, c]))
igual("cenário 'sem-tardias' = votos fora das seções tardias", [cen["sem-tardias"].lula, cen["sem-tardias"].flavio], [t2.lulaResto, t2.flavioResto])
igual("cenário 'tardias-so-lula' = total − Lula nas tardias", cen["tardias-so-lula"].lula, resumo.t2.lula - t2.lula)
contem("texto do cenário 'sem-tardias'", cen["sem-tardias"].premissa, `${fi(t2.secoes)} seções`)
const chk = Object.fromEntries(conf.checks.map((c) => [c.id, c]))
contem("texto da checagem 'impacto-tardias'", chk["impacto-tardias"].texto, `${fi(t2.secoes)} seções encerraram`)
contem("texto da checagem 'impacto-tardias' (eleitores)", chk["impacto-tardias"].texto, fi(t2.comp))
contem("texto da checagem 'base-1t'", chk["base-1t"].texto, `${fi(stats.tardias.t1.secoes)} seções`)
contem("texto da checagem 'base-1t' (depois das 18h)", chk["base-1t"].texto, `${fi(t2.apos18)} depois das 18h`)
contem("texto do veredito 'prorrogacao'", analise.veredito.find((v) => v.id === "prorrogacao").texto, fi(t2.lula))

// ---------------------------------------------------------------- 2. soma das cidades = total nacional
for (const t of ["1", "2"]) {
  const nac = t === "2" ? [resumo.t2.lula, resumo.t2.flavio] : ["13", "22"].map((n) => resumo.t1.candidatos.find((c) => c.numero === n).votos)
  igual(`${t}º turno: soma das cidades (Lula, Flávio) = total nacional`, [soma(muns, (m) => m[`l${t}`]), soma(muns, (m) => m[`f${t}`])], nac)
  igual(`${t}º turno: soma das UFs (Lula, Flávio) = total nacional`, [soma(ufs, (u) => u[`t${t}`].lula), soma(ufs, (u) => u[`t${t}`].flavio)], nac)
}
igual("margem = Lula − Flávio", resumo.margem, resumo.t2.lula - resumo.t2.flavio)
igual("análise usa a mesma margem", analise.margem, resumo.margem)

// ---------------------------------------------------------------- 3. total de boletins igual em todo lugar
const sec = stats.secoes
igual("boletins: stats = conferência (1º e 2º turno)", [sec.boletins.t1, sec.boletins.t2], [conf.incons["1"].secoes, conf.incons["2"].secoes])
igual("boletins: Brasil + exterior = total", sec.boletinsBrasil.t2 + sec.boletinsExterior.t2, sec.boletins.t2)
igual("boletins do Brasil: stats = base das seções tardias (horário)", [sec.boletinsBrasil.t1, sec.boletinsBrasil.t2], [horario.tardias["1"].total, horario.tardias["2"].total])
igual("boletins: soma das páginas de cidade = total", soma(det, (d) => d.municipio.bu.secoes2), sec.boletins.t2)
contem("texto da checagem 'soma-bu'", chk["soma-bu"].texto, `${fi(sec.boletins.t2)} boletins`)
igual("seções: instaladas + não instaladas = previstas", sec.instaladas + sec.naoInstaladas, sec.previstas)
igual("seções: instaladas − boletins = soma das localidades listadas sem boletim", sec.instaladas - sec.boletins.t2, soma(sec.semBoletim, (x) => x.instaladas - x.boletins))
igual("seções: localidades sem boletim não tiveram votantes", sec.semBoletim.filter((x) => x.comparecimento > 0).map((x) => x.key), [])
igual("curva da apuração termina em 100% dos boletins", horario.totalizacao.t2.at(-1).secoes, sec.boletins.t2)

// ---------------------------------------------------------------- 4. Verificado + Atenção + Fora do padrão = localidades
const nv = stats.localidades.niveis
igual("níveis: ok + atenção + fora = total de localidades", nv.ok + nv.atencao + nv.fora, stats.localidades.total)
igual("níveis: total de localidades = linhas de municipios.json", stats.localidades.total, muns.length)
igual("níveis: municípios + exterior = localidades", stats.localidades.municipios + stats.localidades.exterior, stats.localidades.total)
igual("níveis: contagem por cidade = stats", { ok: muns.filter((m) => m.nv === "ok").length, atencao: muns.filter((m) => m.nv === "atencao").length, fora: muns.filter((m) => m.nv === "fora").length }, nv)
igual("níveis: resumo.json = stats.json", resumo.contagemNiveis, nv)
igual("níveis: soma das UFs (atenção, fora)", [soma(ufs, (u) => u.atencao), soma(ufs, (u) => u.fora)], [nv.atencao, nv.fora])
igual("análise: cidades marcadas = atenção + fora", [analise.anomalasResumo.atencao, analise.anomalasResumo.fora], [nv.atencao, nv.fora])

// ---------------------------------------------------------------- 5. nenhum número digitado à mão nas páginas
const arquivos = []
const varrer = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== "ui") varrer(p)
    } else if (/\.(tsx|ts)$/.test(e.name)) arquivos.push(p)
  }
}
varrer(path.join(RAIZ, "src"))
const suspeitos = []
for (const p of arquivos) {
  readFileSync(p, "utf8")
    .split("\n")
    .forEach((linha, i) => {
      // números com separador de milhar (ex.: 13.356) ou o corte das tardias escrito à mão.
      // Não conta decimais (0.105) nem número de lei ("Lei 5.700/1971").
      const milhar = /(^|[^\w.#-])(?<!Lei )[1-9]\d{0,2}(\.\d{3})+(?![\w.])/
      if (milhar.test(linha) || /17h10|17:10/.test(linha)) suspeitos.push(`${path.relative(RAIZ, p)}:${i + 1}: ${linha.trim().slice(0, 120)}`)
    })
}
igual("páginas sem números digitados à mão", suspeitos, [])

console.log(`\n${ok} checagens ok, ${falhas} falha(s).`)
process.exit(falhas ? 1 : 0)
