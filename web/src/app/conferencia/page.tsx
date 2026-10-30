import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckItem, NivelBadge, PageHeader } from "@/components/shared"
import { DigitosChart } from "@/components/charts/digitos-chart"
import { getConferencia, getMunicipios, getResumo } from "@/lib/data"
import { FLAVIO, LULA } from "@/lib/colors"
import { fmt, pct, pp } from "@/lib/format"
import type { MunRow } from "@/lib/types"

export const metadata = { title: "Conferência · Apuração 2026" }

function ListaDesvios({ titulo, cor, rows }: { titulo: string; cor: string; rows: MunRow[] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium" style={{ color: cor }}>
        {titulo}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cidade</TableHead>
            <TableHead className="text-right">Eleitores</TableHead>
            <TableHead className="text-right">Real − esperado</TableHead>
            <TableHead className="text-right">z</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.k}>
              <TableCell>
                <Link href={`/cidade/${m.k}`} className="hover:underline">
                  {m.n}
                </Link>{" "}
                <span className="text-xs text-muted-foreground">{m.uf}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmt(m.ap)}</TableCell>
              <TableCell className="text-right tabular-nums">{pp(m.res)}</TableCell>
              <TableCell className="text-right tabular-nums">{m.z?.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-right">
                <NivelBadge nivel={Math.abs(m.z ?? 0) >= 5 ? "fora" : "atencao"} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function ConferenciaPage() {
  const [c, r, muns] = await Promise.all([getConferencia(), getResumo(), getMunicipios()])
  const grupos = ["Integridade", "Horário", "Estatística"]
  const desv = muns.filter((m) => m.z != null && Math.abs(m.z) >= r.limiares.atencao)
  const proLula = desv.filter((m) => (m.z ?? 0) > 0).sort((a, b) => (b.z ?? 0) - (a.z ?? 0)).slice(0, 12)
  const proFlavio = desv.filter((m) => (m.z ?? 0) < 0).sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).slice(0, 12)
  const votosDesvLula = desv.filter((m) => (m.z ?? 0) > 0).reduce((s, m) => s + (m.res ?? 0) * (m.l2 + m.f2), 0)
  const votosDesvFlavio = desv.filter((m) => (m.z ?? 0) < 0).reduce((s, m) => s + (m.res ?? 0) * (m.l2 + m.f2), 0)

  return (
    <div className="space-y-8">
      <PageHeader title="Conferência">
        Cada checagem tem regra fixa e vale igual para os dois candidatos. <b>Verificado</b> quer dizer que o dado passou na regra.{" "}
        <b>Atenção</b> e <b>Fora do padrão</b> querem dizer que vale olhar de perto; não querem dizer fraude.
      </PageHeader>

      {grupos.map((g) => (
        <section key={g} className="space-y-3">
          <h2 className="text-lg font-semibold">{g}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {c.checks
              .filter((x) => x.grupo === g)
              .map((x) => (
                <CheckItem key={x.id} c={x} />
              ))}
          </div>
        </section>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Cidades com maior desvio em relação ao esperado</CardTitle>
          <CardDescription>
            O esperado vem de um modelo que usa só o 1º turno da própria cidade e o estado (R² = {pct(c.modelo.r2)}). Somando o efeito de todas as cidades em atenção ou fora do padrão, o
            saldo é de {fmt(Math.abs(votosDesvLula + votosDesvFlavio))} votos a favor de {votosDesvLula + votosDesvFlavio > 0 ? "Lula" : "Flávio"} ({fmt(votosDesvLula)} a favor de Lula e{" "}
            {fmt(Math.abs(votosDesvFlavio))} a favor de Flávio), contra uma diferença final de {fmt(r.margem)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <ListaDesvios titulo="Acima do esperado para Lula" cor={LULA} rows={proLula} />
          <ListaDesvios titulo="Acima do esperado para Flávio" cor={FLAVIO} rows={proFlavio} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Último dígito dos votos por seção</CardTitle>
            <CardDescription>Observado × esperado pela própria distribuição, 2º turno</CardDescription>
          </CardHeader>
          <CardContent>
            <DigitosChart lula={c.digitos.lula2} flavio={c.digitos.flavio2} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Modelo de transferência</CardTitle>
            <CardDescription>
              Quanto cada ponto percentual do 1º turno se converteu em voto de Lula no 2º turno, comparando as {fmt(c.modelo.n)} cidades. É uma estimativa agregada (inferência ecológica), não o
              voto de cada pessoa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variável do 1º turno</TableHead>
                  <TableHead className="text-right">Coeficiente</TableHead>
                  <TableHead>Leitura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.modelo.coef.map((x) => (
                  <TableRow key={x.nome}>
                    <TableCell>{x.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{x.coef.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {["Caiado", "Augusto Cury", "Renan Santos", "Demais candidatos"].includes(x.nome)
                        ? `~${pct(Math.max(0, Math.min(1, x.coef)), 0)} desses eleitores para Lula`
                        : x.nome === "Lula 1º turno"
                          ? "Lula manteve praticamente todo o seu eleitorado"
                          : "efeito de controle"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">A referência é o eleitorado de Flávio no 1º turno (fica com Flávio). O modelo também tem um efeito fixo por estado.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
