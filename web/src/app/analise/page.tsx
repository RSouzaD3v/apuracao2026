import Link from "next/link"
import { Calculator, CircleAlert, CircleCheck, Sigma, TriangleAlert } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DuelBar, Kpi, PageHeader } from "@/components/shared"
import { getAnalise, UF_NOMES } from "@/lib/data"
import { getBandeirasUF } from "@/lib/imagens"
import { Bandeira } from "@/components/imagem"
import { FLAVIO, LULA, NIVEL_COR } from "@/lib/colors"
import { fmt, pct, pp } from "@/lib/format"
import { stats, TARDIA } from "@/lib/stats"
import { RespostasTSE } from "@/components/respostas-tse"
import type { Cenario, Veredito } from "@/lib/types"

export const metadata = { title: "Análise · Apuração 2026" }

const ICONE = { ok: CircleCheck, atencao: TriangleAlert, fora: CircleAlert }

const MOTIVO: Record<string, string> = {
  comp: "comparecimento variou diferente do estado",
  modelo: "voto em Lula longe do previsto pelo 1º turno",
  tardias: "seções tardias maiores que a diferença local",
}

/** Selo do veredito: separa o que é conta fechada do que é ausência de indício estatístico. */
function Selo({ nivel, tipo }: { nivel: Veredito["nivel"]; tipo: Veredito["tipo"] }) {
  const Icon = ICONE[nivel]
  const texto = nivel !== "ok" ? (nivel === "atencao" ? "Atenção" : "Fora do padrão") : tipo === "conta" ? "Verificado · conta fechada" : "Verificado · sem indício"
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color: NIVEL_COR[nivel], borderColor: `${NIVEL_COR[nivel]}55`, background: `${NIVEL_COR[nivel]}12` }}
    >
      <Icon className="size-3.5" />
      {texto}
    </span>
  )
}

function VereditoItem({ v }: { v: Veredito }) {
  const Icon = v.tipo === "conta" ? Calculator : Sigma
  return (
    <div className="flex gap-3 rounded-lg border bg-background p-4">
      <Icon className="mt-0.5 size-5 shrink-0" style={{ color: NIVEL_COR[v.nivel] }} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{v.titulo}</span>
          <Selo nivel={v.nivel} tipo={v.tipo} />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{v.texto}</p>
      </div>
    </div>
  )
}

/** Uma linha de cenário: pergunta, premissa, placar e quanto sobra da diferença real. */
function CenarioItem({ c, margemReal }: { c: Cenario; margemReal: number }) {
  const cor = c.vencedor === "lula" ? LULA : FLAVIO
  const sobra = c.margem / margemReal
  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="font-medium">{c.pergunta}</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{c.premissa}</p>
        </div>
        <Selo nivel={c.vencedor === "lula" ? "ok" : "fora"} tipo={c.tipo} />
      </div>
      <DuelBar lula={c.lula} flavio={c.flavio} />
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Diferença no cenário: <b style={{ color: cor }}>{fmt(Math.abs(c.margem))}</b> para {c.vencedor === "lula" ? "Lula" : "Flávio"}
          </span>
          <span className="tabular-nums">{pct(Math.max(0, sobra), 0)} da diferença real</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${Math.min(1, Math.abs(sobra)) * 100}%`, background: cor }} />
        </div>
      </div>
    </div>
  )
}

function Resposta({ pergunta, c }: { pergunta: string; c: Cenario }) {
  const lula = c.vencedor === "lula"
  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="text-sm text-muted-foreground">{pergunta}</div>
      <div className="mt-2 flex items-center gap-2 text-xl font-semibold">
        {lula ? <CircleCheck className="size-6" style={{ color: NIVEL_COR.ok }} /> : <CircleAlert className="size-6" style={{ color: NIVEL_COR.fora }} />}
        {lula ? "Sim, Lula ainda venceria" : "Não, o resultado viraria"}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        No cenário mais duro para Lula: <b style={{ color: lula ? LULA : FLAVIO }}>{pct(c.pl, 2)}</b> × {pct(1 - c.pl, 2)}, diferença de {fmt(Math.abs(c.margem))} votos.
      </div>
    </div>
  )
}

export default async function AnalisePage() {
  const [a, bandeiras] = await Promise.all([getAnalise(), getBandeirasUF()])
  const o = a.outras
  const r = a.anomalasResumo
  const piorProrrog = a.prorrogacao.reduce((x, y) => (y.margem < x.margem ? y : x))
  const piorAnom = a.anomalas.filter((c) => c.tipo === "conta").reduce((x, y) => (y.margem < x.margem ? y : x))
  const todosLula = [...a.prorrogacao, ...a.anomalas].every((c) => c.vencedor === "lula")
  const swMax = Math.max(...o.ufSwing.map((u) => u.sw))
  const tard = stats.tardias.t2

  return (
    <div className="space-y-8">
      <PageHeader title="Análise: e se?">
        Cada cenário tira ou troca votos de propósito, sempre contra o vencedor, para ver se o resultado aguenta. Os selos dizem o tipo de certeza:{" "}
        <b>conta fechada</b> é um limite aritmético feito com os números publicados pelo TSE (mostra se aquele caminho, sozinho, teria tamanho para mudar o
        vencedor); <b>sem indício</b> é um teste estatístico que não achou o padrão que uma fraude costuma deixar. Nenhum dos dois é prova definitiva: são exercícios de estudo.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Resposta pergunta="Contando só os votos até as 17h, Lula ainda venceria?" c={piorProrrog} />
        <Resposta pergunta="Somando as cidades em atenção e fora do padrão e tirando da conta, Lula ainda venceria?" c={piorAnom} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Diferença real" value={fmt(a.margem)} sub="Lula − Flávio, 2º turno" color={LULA} />
        <Kpi label="Cenários testados" value={a.prorrogacao.length + a.anomalas.length} sub={todosLula ? "Lula vence em todos" : "algum cenário vira"} />
        <Kpi label="Votos para virar" value={fmt(o.virar)} sub={`teriam que mudar de lado · ~${fmt(o.urnasEquiv)} urnas inteiras`} />
        <Kpi label="Votos após 17h (TSE)" value={fmt(a.tse.votosApos17h)} sub={`${pct(a.tse.votosApos17h / a.margem, 2)} da diferença final`} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Prorrogação: só os votos até as 17h</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          O boletim de urna traz a hora em que a seção fechou, não a de cada voto. Por isso há dois caminhos: usar o número oficial do TSE de quem votou depois das 17h, ou
          tratar todas as seções que fecharam tarde como suspeitas e cortar delas o máximo possível. Os cenários vão do mais realista ao mais absurdo.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {a.prorrogacao.map((c) => (
            <CenarioItem key={c.id} c={c} margemReal={a.margem} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Seções que fecharam depois das {TARDIA}, por horário</CardTitle>
            <CardDescription>
              Votos do dia inteiro nessas seções (a maioria dos eleitores votou antes das 17h). A partir das 19h estão as seções da prorrogação formal. Fonte: boletins de urna, por local de
              votação. Regra: {stats.tardias.regra}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Encerramento</TableHead>
                  <TableHead className="text-right">Seções</TableHead>
                  <TableHead className="text-right">Eleitores</TableHead>
                  <TableHead className="text-right">Lula</TableHead>
                  <TableHead className="text-right">Flávio</TableHead>
                  <TableHead className="text-right">% Lula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tard.faixas.map((f) => (
                  <TableRow key={f.faixa}>
                    <TableCell>{f.rotulo}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(f.secoes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(f.comp)}</TableCell>
                    <TableCell className="text-right tabular-nums" style={{ color: LULA }}>
                      {fmt(f.lula)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums" style={{ color: FLAVIO }}>
                      {fmt(f.flavio)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pct(f.lula / (f.lula + f.flavio))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(tard.secoes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(tard.comp)}</TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: LULA }}>
                    {fmt(tard.lula)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: FLAVIO }}>
                    {fmt(tard.flavio)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pct(tard.lula / (tard.lula + tard.flavio))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Cidades em atenção e fora do padrão, somadas</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          São {fmt(r.cidades)} cidades ({fmt(r.atencao)} em atenção e {fmt(r.fora)} fora do padrão), com {fmt(r.lula)} votos de Lula e {fmt(r.flavio)} de Flávio. Motivos:{" "}
          {Object.entries(r.motivos)
            .sort((x, y) => y[1] - x[1])
            .map(([k, n]) => `${fmt(n)} por ${MOTIVO[k] ?? k}`)
            .join("; ")}{" "}
          (uma cidade pode ter mais de um). Para virar a eleição só com essas cidades, <b>{pct(r.viradaFrac)}</b> de todos os votos de Lula nelas teriam que ser falsos e ir para
          Flávio.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {a.anomalas.map((c) => (
            <CenarioItem key={c.id} c={c} margemReal={a.margem} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Veredito por tema</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {a.veredito.map((v) => (
            <VereditoItem key={v.id} v={v} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lula, por UF: % entre os dois finalistas no 2º turno − % dos válidos no 1º turno</CardTitle>
            <CardDescription>
              Atenção: esta conta é diferente da “Variação da fatia” da Visão geral, que compara a fatia entre os dois finalistas nos dois turnos. Aqui o 1º turno conta todos os candidatos, então
              o número é maior: inclui os votos que Lula herdou dos outros candidatos. Todas as UFs andaram na mesma direção; nas cidades, a mediana foi de {pp(o.swingQuartis[2])}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {o.ufSwing.map((u) => (
              <div key={u.uf} className="flex items-center gap-2 text-xs">
                <Bandeira src={bandeiras[u.uf]} nome={UF_NOMES[u.uf] ?? u.uf} />
                <span className="w-7 shrink-0 font-medium">{u.uf === "ZZ" ? "Ext." : u.uf}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-sm bg-muted">
                  <div className="h-full rounded-sm" style={{ width: `${(Math.max(0, u.sw) / swMax) * 100}%`, background: LULA }} />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">{pp(u.sw)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locais com comparecimento e voto acima de 95%</CardTitle>
            <CardDescription>
              {fmt(o.digital.unanimes.length)} de {fmt(o.digital.locais)} locais de votação. Coluna “1º turno” é o % do mesmo candidato nos válidos do 1º turno, no mesmo local.{" "}
              {o.digital.semHistorico === 0 ? "Todos já eram quase unânimes antes." : `${o.digital.semHistorico} não eram: esses valem uma visita.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[28rem] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Compar.</TableHead>
                    <TableHead className="text-right">1º turno</TableHead>
                    <TableHead className="text-right">2º turno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.digital.unanimes.map((u) => (
                    <TableRow key={`${u.k}-${u.local}`}>
                      <TableCell className="max-w-56">
                        <div className="truncate" title={u.local}>
                          {u.local}
                        </div>
                        <Link href={`/cidade/${u.k}`} className="text-xs text-muted-foreground hover:underline">
                          {u.mun} · {u.uf}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{pct(u.c2, 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(u.p1, 0)}</TableCell>
                      <TableCell className="text-right tabular-nums" style={{ color: u.cand === "lula" ? LULA : FLAVIO }}>
                        {pct(u.p2, 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <RespostasTSE />

      <Card>
        <CardHeader>
          <CardTitle>O que esta análise não cobre</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {a.limites.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
