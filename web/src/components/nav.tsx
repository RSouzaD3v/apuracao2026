"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { BandeiraBrasil, FaixaBrasil } from "@/components/bandeira-brasil"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const LINKS = [
  { href: "/", label: "Visão geral" },
  { href: "/mapa", label: "Mapa" },
  { href: "/cidades", label: "Cidades" },
  { href: "/horario", label: "Horário e apuração" },
  { href: "/conferencia", label: "Conferência" },
  { href: "/analise", label: "Análise" },
  { href: "/metodologia", label: "Metodologia" },
]

const ehAtivo = (href: string, path: string | null) =>
  path != null && (href === "/" ? path === "/" : path.startsWith(href) || (href === "/cidades" && path.startsWith("/cidade/")))

export function Nav() {
  const path = usePathname()
  return <NavShell path={path} />
}

export function NavShell({ path }: { path: string | null }) {
  const [aberto, setAberto] = useState(false)
  const atual = LINKS.find((l) => ehAtivo(l.href, path))
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <FaixaBrasil />
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-3" aria-label="Apuração 2026, página inicial">
          <BandeiraBrasil className="h-6 drop-shadow-sm" titulo="" />
          <span className="leading-none">
            <span className="block font-semibold">Apuração 2026</span>
            <span className="block text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Brasil · Presidente</span>
          </span>
        </Link>

        {/* telas pequenas: botão com a página atual + menu lateral com todas as abas */}
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger
            className="ml-auto inline-flex min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium lg:hidden"
            aria-label="Abrir menu de páginas"
          >
            <span className="truncate">{atual?.label ?? "Menu"}</span>
            <Menu className="size-4 shrink-0" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <SheetTitle className="px-4 pt-4">Páginas</SheetTitle>
            <nav className="flex flex-col px-2 pb-4">
              {LINKS.map((l) => {
                const ativo = ehAtivo(l.href, path)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setAberto(false)}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "rounded-md border-l-2 px-3 py-2.5 text-sm",
                      ativo ? "border-foreground bg-muted font-medium text-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <nav className="-mb-px hidden gap-1 overflow-x-auto lg:flex">
          {LINKS.map((l) => {
            const ativo = ehAtivo(l.href, path)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 py-3.5 text-sm transition-colors",
                  ativo ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
