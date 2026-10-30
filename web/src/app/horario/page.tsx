import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckItem, DuelBar, Kpi, PageHeader } from "@/components/shared"
import { EncerramentoChart, TotalizacaoChart } from "@/components/charts/horario-charts"
import { getConferencia, getHorario, getResumo, getUfs, UF_NOMES } from "@/lib/data"
import { FLAVIO, LULA } from "@/lib/colors"
import { fmt, pct } from "@/lib/format"
import { stats, TARDIA } from "@/lib/stats"
import { RespostasTSE } from "@/components/respostas-tse"

export const metadata = { title: "Horário e apuração · Apuração 2026" }

export default async function HorarioPage() {
  const [h, r, ufs, c] = await Promise.all([getHorario(), getResumo(), getUfs(), getConferencia()])
  const t2 = stats.tardias.t2
  const t1 = stats.tardias.t1
  const checks = c.checks.filter((x) => x.grupo === "Horário")
  const ref = h.referenciaTSE

  return (
    <div className="space-y-6">
      <PageHeader title="Horário de votação e ordem da apuração">
        <p>
          No 2º turno, uma decisão do ministro Cristiano Zanin (STF), no fim da tarde de 25/10, permitiu estender a votação por até duas horas por causa de dificuldades de transporte, e o
          TSE suspendeu a totalização até as 19h. <b>As duas campanhas pediram a prorrogação</b>: a de Flávio Bolsonaro (PL), para municípios de SP, PR, MG, RS e SC, por causa de chuvas e
          alagamentos; a de Lula, para a Bahia (Salvador e região), por falta de ônibus. A extensão valeu só para as seções que ainda não tinham encerrado. Quem já estava na fila às 17h
          vota de qualquer jeito, pela regra normal, com ou sem prorrogação.
        </p>
        <p className="mt-2">
          Esta página separa duas perguntas diferentes: <b>quanto voto entrou depois das 17h</b> e <b>por que a liderança mudou durante a apuração</b>.
        </p>
        <p className="mt-2 text-xs">
          Fontes:{" "}
          {stats.fontesProrrogacao.map((f, i) => (
            <span key={f.url}>
              {i > 0 && " · "}
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                {f.nome}
              </a>
            </span>
          ))}
        </p>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label={`Seções após ${TARDIA}`} value={fmt(t2.secoes)} sub={`${pct(t2.secoes / t2.total, 2)} dos ${fmt(t2.total)} boletins do Brasil (sem exterior)`} />
        <Kpi label="Eleitores nessas seções" value={fmt(t2.comp)} sub="contando quem votou o dia todo" />
        <Kpi label="Votos depois das 17h (TSE)" value={fmt(ref.votosApos17h)} sub={`${fmt(ref.entre17e18)} até 18h · ${fmt(ref.entre18e19)} até 19h · ${fmt(ref.apos19)} depois`} />
        <Kpi label="Diferença final" value={fmt(r.margem)} sub={`${(r.margem / ref.votosApos17h).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} vezes os votos após 17h`} color={LULA} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {checks.map((x) => (
          <CheckItem key={x.id} c={x} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quem estava na frente em cada momento da apuração</CardTitle>
          <CardDescription>
            {h.lideranca.map((l, i) => (
              <span key={l.h}>
                {i > 0 && " → "}
                <b style={{ color: l.lider === "lula" ? LULA : FLAVIO }}>{l.lider === "lula" ? "Lula" : "Flávio"}</b> desde {l.h} ({pct(l.pctSecoes)} apurado)
              </span>
            ))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TotalizacaoChart data={h.totalizacao} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horário de encerramento das seções</CardTitle>
            <CardDescription>
              Hora do boletim convertida para Brasília (cada estado no seu fuso; exterior fora). 1º turno: {fmt(t1.secoes)} seções depois das {TARDIA}. 2º turno: {fmt(t2.secoes)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EncerramentoChart data={h.histograma} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>A primeira parcial (antes da suspensão)</CardTitle>
            <CardDescription>
              {fmt(h.primeiraParcial.porUf.reduce((s, x) => s + x.secoes, 0))} boletins recebidos antes das 19h. É o retrato que circulou “às 17h”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DuelBar lula={h.primeiraParcial.lula} flavio={h.primeiraParcial.flavio} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Boletins</TableHead>
                  <TableHead className="text-right">Lula</TableHead>
                  <TableHead className="text-right">Flávio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {h.primeiraParcial.porUf.slice(0, 8).map((u) => (
                  <TableRow key={u.uf}>
                    <TableCell>{UF_NOMES[u.uf]}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(u.secoes)}</TableCell>
                    <TableCell className="text-right tabular-nums" style={{ color: LULA }}>{pct(u.lula / (u.lula + u.flavio))}</TableCell>
                    <TableCell className="text-right tabular-nums" style={{ color: FLAVIO }}>{pct(u.flavio / (u.lula + u.flavio))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seções prorrogadas por estado (2º turno)</CardTitle>
          <CardDescription>Comparecimento total dessas seções e como votaram. Quem votou de manhã também está contado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Seções após {TARDIA} (1º t.)</TableHead>
                <TableHead className="text-right">Seções após {TARDIA} (2º t.)</TableHead>
                <TableHead className="text-right">Eleitores</TableHead>
                <TableHead className="text-right">Lula</TableHead>
                <TableHead className="text-right">Flávio</TableHead>
                <TableHead className="text-right">Lula no estado todo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ufs
                .filter((u) => u.uf !== "ZZ")
                .sort((a, b) => b.tardias2 - a.tardias2)
                .map((u) => (
                  <TableRow key={u.uf}>
                    <TableCell>{UF_NOMES[u.uf]}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{fmt(u.tardias1)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{fmt(u.tardias2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(u.compTardias2)}</TableCell>
                    <TableCell className="text-right tabular-nums" style={{ color: LULA }}>
                      {u.lulaTardias2 + u.flavioTardias2 ? pct(u.lulaTardias2 / (u.lulaTardias2 + u.flavioTardias2)) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums" style={{ color: FLAVIO }}>
                      {u.lulaTardias2 + u.flavioTardias2 ? pct(u.flavioTardias2 / (u.lulaTardias2 + u.flavioTardias2)) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{pct(u.t2.lula / (u.t2.lula + u.t2.flavio))}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            O número de votos registrados depois das 17h ({fmt(ref.votosApos17h)}) é o divulgado pelo TSE a partir dos logs das urnas (
            <a className="underline" href={ref.fonte} target="_blank" rel="noreferrer">
              notícia do TSE
            </a>
            ,{" "}
            <a className="underline" href={ref.fonteImprensa} target="_blank" rel="noreferrer">
              reportagem
            </a>
            ). Os boletins mostram o horário em que a seção fechou, não o horário de cada voto, por isso os
            números deste app são um teto. Contar voto a voto exige os logs das urnas (cerca de 25 GB só para SP), o que está descrito como próximo passo na metodologia.
          </p>
        </CardContent>
      </Card>

      <RespostasTSE />
    </div>
  )
}
