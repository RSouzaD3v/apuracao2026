import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import { Nav, NavShell } from "@/components/nav"
import { AvisoPesquisa, FONTES, QuemFez } from "@/components/shared"
import { SeloBrasil } from "@/components/bandeira-brasil"
import "./globals.css"

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Apuração 2026 · Brasil · conferência independente",
  description:
    "Projeto de pesquisa e estudo com os dados públicos e oficiais do TSE do 1º e 2º turno da eleição presidencial de 2026. Não prova fraude nem atesta que o resultado está 100% certo.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-muted/30">
        <Suspense fallback={<NavShell path={null} />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
          <div className="mb-6">
            <AvisoPesquisa />
          </div>
          {children}
        </main>
        <footer className="border-t bg-background">
          <div className="mx-auto max-w-7xl space-y-2 px-4 py-4 text-xs text-muted-foreground md:px-6">
            <SeloBrasil texto="Feito no Brasil, com dados públicos brasileiros" />
            <p>
              Projeto independente de pesquisa e estudo, sem vínculo com o TSE, partidos ou candidatos. Todos os números vêm de dados públicos e oficiais do Tribunal Superior Eleitoral.
              Indicadores estatísticos apontam onde olhar: não são prova de irregularidade nem garantia de que tudo está correto.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <span>Fontes oficiais:</span>
              {FONTES.map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  {f.nome}
                </a>
              ))}
            </p>
            <QuemFez className="border-t pt-2" />
          </div>
        </footer>
      </body>
    </html>
  )
}
