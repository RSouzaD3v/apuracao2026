"use client"

/* eslint-disable @next/next/no-img-element -- imagens externas carregadas direto da fonte (TSE, Wikimedia), sem passar pelo otimizador */
import { useState } from "react"
import { Building2, Flag } from "lucide-react"
import { cn } from "@/lib/utils"

/** Imagem externa que troca para o fallback se a URL não existir ou não carregar. */
function ImagemExterna({ src, alt, className, fallback }: { src: string | null | undefined; alt: string; className?: string; fallback: React.ReactNode }) {
  const [erro, setErro] = useState(false)
  if (!src || erro) return <>{fallback}</>
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setErro(true)} className={className} />
}

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()

/** Foto do candidato (TSE). Fallback: iniciais na cor do candidato. */
export function FotoCandidato({ src, nome, cor, className }: { src: string | null; nome: string; cor: string; className?: string }) {
  const base = cn("size-12 shrink-0 rounded-full border-2 object-cover object-top", className)
  return (
    <ImagemExterna
      src={src}
      alt={`Foto de ${nome}`}
      className={base}
      fallback={
        <span className={cn(base, "inline-flex items-center justify-center text-sm font-semibold text-white")} style={{ background: cor, borderColor: cor }}>
          {iniciais(nome)}
        </span>
      }
    />
  )
}

/** Bandeira de estado ou cidade. Fallback: retângulo com ícone de bandeira. */
export function Bandeira({ src, nome, className }: { src: string | null | undefined; nome: string; className?: string }) {
  const base = cn("h-4 w-6 shrink-0 rounded-[2px] border object-cover", className)
  return (
    <ImagemExterna
      src={src}
      alt={`Bandeira de ${nome}`}
      className={base}
      fallback={
        <span className={cn(base, "inline-flex items-center justify-center bg-muted text-muted-foreground")}>
          <Flag className="size-2.5" />
        </span>
      }
    />
  )
}

/** Foto de capa da cidade (Wikimedia Commons). Fallback: faixa neutra com ícone. */
export function FotoCidade({ src, nome, className }: { src: string | null; nome: string; className?: string }) {
  const base = cn("h-40 w-full rounded-xl border object-cover md:h-56", className)
  return (
    <ImagemExterna
      src={src}
      alt={`Foto de ${nome}`}
      className={base}
      fallback={
        <div className={cn(base, "flex items-center justify-center bg-gradient-to-br from-muted to-background text-muted-foreground")}>
          <Building2 className="size-10 opacity-40" />
        </div>
      }
    />
  )
}
