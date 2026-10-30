const nf = new Intl.NumberFormat("pt-BR")

export const fmt = (n: number | null | undefined) => (n == null ? "—" : nf.format(Math.round(n)))

export const pct = (x: number | null | undefined, d = 1) =>
  x == null ? "—" : `${(x * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`

export const pp = (x: number | null | undefined, d = 1) =>
  x == null ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })} p.p.`

export const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${nf.format(Math.abs(Math.round(n)))}`

export const compact = (n: number) =>
  Math.abs(n) >= 1e6
    ? `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`
    : Math.abs(n) >= 1e3
      ? `${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
      : nf.format(n)
