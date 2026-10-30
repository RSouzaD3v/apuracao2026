"""Refaz todos os números do site a partir dos arquivos oficiais do TSE, com um comando:

    python pipeline/refazer.py            # baixa o que faltar, processa e confere
    python pipeline/refazer.py --sem-download

Etapas: 01 (resultado por município) → 00 (boletins de urna e locais, ~5 GB, precisa de bash e curl)
→ 02 (uma linha por seção) → 03 (checagens e arquivos do app) → 04 (cenários) → npm run check-dados.
Os arquivos brutos ficam em RAW_DIR (padrão: ../../raw, fora do repositório).
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web")
env = {**os.environ, "PYTHONUTF8": "1"}


def rodar(*cmd, cwd=HERE):
    print("\n$", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, env=env, check=True)


def main():
    py = sys.executable
    if "--sem-download" not in sys.argv:
        rodar(py, "01_fetch_divulgacao.py")
        bash = shutil.which("bash")
        if not bash:
            sys.exit("Precisa de bash e curl para 00_download_bu.sh (no Windows, use o Git Bash).")
        rodar(bash, "00_download_bu.sh")
    rodar(py, "02_process_bu.py")
    rodar(py, "03_build.py")
    rodar(py, "04_analise.py")
    npm = "npm.cmd" if os.name == "nt" else "npm"
    rodar(npm, "run", "check-dados", cwd=WEB)


if __name__ == "__main__":
    main()
