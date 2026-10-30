import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { stats, TARDIA } from "@/lib/stats"
import { fmt } from "@/lib/format"

const hh = (h: string) => h.replace(":", "h")
const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))

/** Checagens oficiais da Justiça Eleitoral e comparação dos nossos números com os do TSE (páginas Horário e Análise). */
export function RespostasTSE() {
  const v = stats.votosApos17h
  const t2 = stats.tardias.t2
  const dados = stats.lideranca.dados
  const tse = stats.lideranca.tse
  const viradaFlavio = dados.find((l) => l.lider === "flavio")
  const viradaLula = dados.findLast((l) => l.lider === "lula")
  const difs = [viradaFlavio && min(tse.flavio) - min(viradaFlavio.h), viradaLula && min(tse.lula) - min(viradaLula.h)].filter((x): x is number => x != null)
  const [dMin, dMax] = [Math.min(...difs), Math.max(...difs)]
  return (
    <Card>
      <CardHeader>
        <CardTitle>O que o TSE já respondeu</CardTitle>
        <CardDescription>Checagens oficiais sobre as mesmas dúvidas, e como os números deste site se comparam aos divulgados pelo TSE.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {stats.checagensTSE.map((c) => (
            <li key={c.url}>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 font-medium underline-offset-2 hover:underline">
                <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                {c.titulo}
              </a>
              <div className="pl-5 text-xs text-muted-foreground">{c.orgao}</div>
            </li>
          ))}
        </ul>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead className="text-right">TSE</TableHead>
                <TableHead className="text-right">Este site</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="whitespace-normal">Votos registrados depois das 17h</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(v.votosApos17h)}</TableCell>
                <TableCell className="text-right whitespace-normal text-muted-foreground">
                  usamos o número do TSE; o teto pelos boletins é {fmt(t2.comp)} eleitores nas {fmt(t2.secoes)} seções que fecharam depois das {TARDIA}
                </TableCell>
              </TableRow>
              {viradaFlavio && (
                <TableRow>
                  <TableCell className="whitespace-normal">Flávio passa à frente na apuração</TableCell>
                  <TableCell className="text-right tabular-nums">{hh(tse.flavio)}</TableCell>
                  <TableCell className="text-right tabular-nums">{hh(viradaFlavio.h)}</TableCell>
                </TableRow>
              )}
              {viradaLula && (
                <TableRow>
                  <TableCell className="whitespace-normal">Lula volta à frente</TableCell>
                  <TableCell className="text-right tabular-nums">{hh(tse.lula)}</TableCell>
                  <TableCell className="text-right tabular-nums">{hh(viradaLula.h)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          A curva deste site usa a hora em que cada boletim <b>chegou</b> ao TSE (campo DT_BU_RECEBIDO, cortada no minuto). O horário do TSE é o da totalização e divulgação, que vem logo
          depois do recebimento. Por isso os nossos horários ficam {dMin === dMax ? dMin : `de ${dMin} a ${dMax}`} minuto(s) antes; a ordem dos acontecimentos é a mesma. Os votos depois das 17h só podem ser contados um a um com os logs
          das urnas; o boletim traz só a hora em que a seção fechou.
        </p>
      </CardContent>
    </Card>
  )
}
