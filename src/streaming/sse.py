import json

from pydantic import BaseModel


def format_sse(event: BaseModel) -> str:
    """
    Formata um modelo Pydantic em uma string padrão Server-Sent Events.
    O formato nativo é:
    data: {"type": "...", ...}

    A quebra de linha dupla `\n\n` é exigida pelo protocolo SSE para delimitar mensagens.
    """
    data_str = event.model_dump_json()
    return f"data: {data_str}\n\n"


def format_raw_sse(data: dict) -> str:
    """
    Formata um dicionário arbitrário em SSE. Útil para eventos simples.
    """
    data_str = json.dumps(data)
    return f"data: {data_str}\n\n"
