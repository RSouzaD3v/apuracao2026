"""Regras compartilhadas por todo o pipeline. Cada conceito é definido uma vez só, aqui.

Seção tardia (2º turno: "prorrogada"): seção no Brasil (o exterior vota no horário local e fica de fora)
cujo encerramento, convertido para a hora de Brasília, foi ESTRITAMENTE DEPOIS de 17:10:00, com
precisão de segundos. Uma seção que encerrou às 17:10:00 em ponto não é tardia; às 17:10:01 é.

Faixas das seções tardias (por hora de encerramento, Brasília):
  "17" = de 17:10:01 a 17:59:59 · "18" = de 18:00:00 a 18:59:59 · "19" = 19:00:00 em diante
"""

DIA = {1: "2026-10-04", 2: "2026-10-25"}
TARDIA_CORTE = "17:10:00"
TARDIA_ROTULO = TARDIA_CORTE[:5]  # "17:10", usado nos textos
FAIXAS_TARDIAS = ("17", "18", "19")
FAIXA_ROTULO = {"17": f"depois de {TARDIA_ROTULO} até 17:59", "18": "18:00 a 18:59", "19": "19:00 em diante"}


def tardia_sql(turno, enc="encerramento_brt", uf="uf"):
    """Expressão SQL (DuckDB) booleana: a seção é tardia? Única definição usada no pipeline.
    Seção sem hora de encerramento no boletim conta como não tardia: o coalesce evita que um NULL a tire
    das duas contas ao mesmo tempo (nem tardia, nem "resto"). Hoje isso só ocorre no exterior."""
    return f"coalesce({uf} <> 'ZZ' AND {enc} > TIMESTAMP '{DIA[turno]} {TARDIA_CORTE}', false)"


def faixa_tardia_sql(turno, enc="encerramento_brt", uf="uf"):
    """Faixa de horário de uma seção tardia ('17', '18' ou '19'); NULL se não for tardia."""
    return (f"CASE WHEN NOT {tardia_sql(turno, enc, uf)} THEN NULL "
            f"WHEN {enc} < TIMESTAMP '{DIA[turno]} 18:00:00' THEN '17' "
            f"WHEN {enc} < TIMESTAMP '{DIA[turno]} 19:00:00' THEN '18' ELSE '19' END")
