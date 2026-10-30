import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DuelBar, Kpi, NivelBadge, PageHeader } from "@/components/shared"
import { ViradaChart } from "@/components/charts/virada-chart"
import { getConferencia, getResumo, getUfs, UF_NOMES } from "@/lib/data"
import { fotoCandidato, getBandeirasUF } from "@/lib/imagens"
import { Bandeira, FotoCandidato } from "@/components/imagem"
import { SeloBrasil } from "@/components/bandeira-brasil"
import { FLAVIO, LULA, NIVEL_COR } from "@/lib/colors"
import { fmt, pct, pp, signed } from "@/lib/format"
import { stats } from "@/lib/stats"

export default async function Home() {
  const [r, c, ufs, bandeiras] = await Promise.all([getResumo(), getConferencia(), getUfs(), getBandeirasUF()])
  const lula1 = r.t1.candidatos.find((x) => x.numero === "13")!.votos
  const flavio1 = r.t1.candidatos.find((x) => x.numero === "22")!.votos
  const sqLula = r.t1.candidatos.find((x) => x.numero === "13")?.sq
  const sqFlavio = r.t1.candidatos.find((x) => x.numero === "22")?.sq
  const okChecks = c.checks.filter((x) => x.nivel === "ok").length
  const d = r.decomposicao
  const transf = c.modelo.coef.filter((x) => ["Caiado", "Augusto Cury", "Renan Santos", "Demais candidatos"].includes(x.nome))
  const sec = stats.secoes

  return (
    <div className="space-y-8">
      <SeloBrasil texto="Brasil · Eleição presidencial 2026" className="-mb-4" />
      <PageHeader title="Eleição presidencial 2026: o que os dados oficiais mostram">
        Comparação do 1º turno (4/out) com o 2º turno (25/out), cidade por cidade, a partir dos arquivos publicados pelo TSE.
        Cada número aqui pode ser refeito a partir da fonte original. Os indicadores dizem onde vale olhar, sem tirar conclusão por você.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resultado do 2º turno</CardTitle>
            <CardDescription>100% das seções totalizadas · {r.fonte.atualizadoT2}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FotoCandidato src={fotoCandidato(sqLula)} nome="Lula" cor={LULA} className="size-14" />
                  <div>
                    <div className="font-semibold" style={{ color: LULA }}>Lula</div>
                    <div className="text-xs text-muted-foreground">PT · 13</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="font-semibold" style={{ color: FLAVIO }}>Flávio Bolsonaro</div>
                    <div className="text-xs text-muted-foreground">PL · 22</div>
                  </div>
                  <FotoCandidato src={fotoCandidato(sqFlavio)} nome="Flávio Bolsonaro" cor={FLAVIO} className="size-14" />
                </div>
              </div>
              <DuelBar lula={r.t2.lula} flavio={r.t2.flavio} />
            </div>
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">1º turno</span>
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium">Comparando só Lula × Flávio</span>
              </div>
              <DuelBar lula={lula1} flavio={flavio1} />
              <div className="rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground [&_b]:text-foreground">
                <b>Para não confundir:</b> a barra acima conta <b>apenas os votos dados aos dois finalistas</b> ({pct(lula1 / (lula1 + flavio1), 2)} ×{" "}
                {pct(flavio1 / (lula1 + flavio1), 2)}), para comparar com o 2º turno. O <b>resultado oficial do 1º turno</b> conta todos os {r.t1.candidatos.length} candidatos: Flávio{" "}
                <b style={{ color: FLAVIO }}>{pct(flavio1 / r.t1.validos, 2)}</b>, Lula <b style={{ color: LULA }}>{pct(lula1 / r.t1.validos, 2)}</b> e os outros{" "}
                {r.t1.candidatos.length - 2} candidatos somados <b>{pct(1 - (lula1 + flavio1) / r.t1.validos, 2)}</b> dos votos válidos.
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Kpi label="Diferença final" value={fmt(r.margem)} sub="votos a favor de Lula" color={LULA} />
          <Kpi label="Comparecimento" value={pct(r.t2.comparecimento / r.t2.aptos)} sub={`1º turno: ${pct(r.t1.comparecimento / r.t1.aptos)} · ${signed(r.t2.comparecimento - r.t1.comparecimento)} eleitores`} />
          <Kpi
            label="Boletins de urna somados"
            value={fmt(sec.boletins.t2)}
            sub={
              <>
                um por seção que votou, somados um a um ({fmt(sec.boletinsBrasil.t2)} no Brasil e {fmt(sec.boletinsExterior.t2)} no exterior).{" "}
                <Link href="/metodologia#secoes" className="underline">
                  Por que o TSE fala em {fmt(sec.instaladas)} seções instaladas e {fmt(sec.previstas)} previstas?
                </Link>
              </>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conferência em resumo</CardTitle>
            <CardDescription>Checagens nacionais e por cidade, com critérios fixos e iguais para os dois candidatos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums">{okChecks}</span>
              <span className="text-muted-foreground">de {c.checks.length} checagens nacionais verificadas</span>
            </div>
            <div className="space-y-2">
              {c.checks.slice(0, 6).map((x) => (
                <div key={x.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">{x.titulo}</span>
                  <NivelBadge nivel={x.nivel} className="shrink-0" />
                </div>
              ))}
            </div>
            {/* em tela estreita, uma linha por nível (número + selo lado a lado), para o selo não ser cortado */}
            <div className="grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-3 sm:text-center">
              {(["ok", "atencao", "fora"] as const).map((n) => (
                <Link
                  key={n}
                  href={`/cidades?nivel=${n}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted sm:block"
                >
                  <div>
                    <div className="text-2xl font-semibold tabular-nums" style={{ color: NIVEL_COR[n] }}>
                      {fmt(stats.localidades.niveis[n])}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">localidades</div>
                  </div>
                  <NivelBadge nivel={n} className="shrink-0 sm:mt-2" />
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {fmt(stats.localidades.total)} localidades: {fmt(stats.localidades.municipios)} municípios e {fmt(stats.localidades.exterior)} cidades do exterior.
            </p>
            <Link href="/conferencia" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
              Ver todas as checagens <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>De onde vieram os votos novos</CardTitle>
            <CardDescription>Do 1º para o 2º turno, em votos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ViradaChart
              data={[
                { nome: "Lula", t1: lula1, ganho: d.ganhoLula, cor: LULA },
                { nome: "Flávio", t1: flavio1, ganho: d.ganhoFlavio, cor: FLAVIO },
              ]}
            />
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Votos de outros candidatos no 1º turno</div>
                <div className="font-semibold tabular-nums">{fmt(d.outros1)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Brancos e nulos a menos</div>
                <div className="font-semibold tabular-nums">{fmt(d.brancosNulos1 - d.brancosNulos2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Eleitores a mais votando</div>
                <div className="font-semibold tabular-nums">{fmt(d.comp2 - d.comp1)}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Lula ganhou {fmt(d.ganhoLula)} votos e Flávio {fmt(d.ganhoFlavio)}. Para virar, Lula precisou de cerca de{" "}
              {pct(d.ganhoLula / (d.ganhoLula + d.ganhoFlavio))} dos votos que mudaram de mãos. Estimativa, a partir das diferenças entre cidades, da parte de cada eleitorado do 1º turno que foi para Lula:{" "}
              {transf.map((t, i) => (
                <span key={t.nome}>
                  {t.nome} {pct(Math.max(0, Math.min(1, t.coef)), 0)}
                  {i < transf.length - 1 ? ", " : "."}
                </span>
              ))}{" "}
              <Link href="/metodologia#modelo" className="underline">Como isso é calculado</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por estado</CardTitle>
          <CardDescription>Percentual de Lula entre os votos dados aos dois finalistas, 1º e 2º turno</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Lula 1º t.</TableHead>
                <TableHead className="text-right">Lula 2º t.</TableHead>
                <TableHead className="text-right">Variação da fatia</TableHead>
                <TableHead className="hidden w-48 md:table-cell">2º turno</TableHead>
                <TableHead className="text-right">Vencedor</TableHead>
                <TableHead className="text-right">Cidades em atenção / fora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ufs
                .filter((u) => u.uf !== "ZZ")
                .concat(ufs.filter((u) => u.uf === "ZZ"))
                .map((u) => {
                  const a = u.t1.lula / (u.t1.lula + u.t1.flavio)
                  const b = u.t2.lula / (u.t2.lula + u.t2.flavio)
                  return (
                    <TableRow key={u.uf}>
                      <TableCell>
                        <Link href={`/cidades?uf=${u.uf}`} className="inline-flex items-center gap-2 hover:underline">
                          <Bandeira src={bandeiras[u.uf]} nome={UF_NOMES[u.uf]} />
                          {UF_NOMES[u.uf]}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{pct(a)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(b)}</TableCell>
                      <TableCell className="text-right tabular-nums" style={{ color: b - a > 0 ? LULA : FLAVIO }}>
                        {pp(b - a)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <DuelBar lula={u.t2.lula} flavio={u.t2.flavio} showLabels={false} />
                      </TableCell>
                      <TableCell className="text-right font-medium" style={{ color: b > 0.5 ? LULA : FLAVIO }}>
                        {b > 0.5 ? "Lula" : "Flávio"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {u.atencao} / {u.fora}
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            “Variação da fatia” = % de Lula entre os dois finalistas no 2º turno − % de Lula entre os dois finalistas no 1º turno. Como o 1º turno tinha outros candidatos, os dois crescem em
            votos; o número mostra quem cresceu mais. É a mesma conta do mapa (“Quem cresceu”) e da tabela de cidades.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
