import { PageHeader } from "@/components/shared"
import { BrazilMap } from "@/components/map/brazil-map"

export const metadata = { title: "Mapa · Apuração 2026" }

export default function MapaPage() {
  return (
    <div>
      <PageHeader title="Mapa por município">
        Escolha o que colorir: resultado de cada turno, quem cresceu mais entre os turnos, desvio em relação ao esperado, seções prorrogadas ou o resultado da conferência.
      </PageHeader>
      <BrazilMap />
    </div>
  )
}
