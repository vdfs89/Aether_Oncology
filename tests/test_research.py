"""
test_research.py
================
Testes unitários do serviço de busca de evidências científicas.

Usa mocking para evitar chamadas reais à API do Semantic Scholar.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from src.services.research import fetch_scientific_evidence

# ---------------------------------------------------------------------------
# Fixtures / Helpers
# ---------------------------------------------------------------------------

_SAMPLE_PAPERS = [
    {
        "title": "Tumor size as a predictor of breast cancer",
        "url": "https://example.com/1",
        "year": 2023,
        "tldr": {"text": "Tumor size is a key predictor."},
    },
    {
        "title": "Morphometric analysis of breast lesions",
        "url": "https://example.com/2",
        "year": 2022,
        "tldr": None,
    },
]


def _mock_response(data: list | None = None, status: int = 200) -> MagicMock:
    """Cria um mock de requests.Response."""
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = {"data": data if data is not None else []}
    resp.raise_for_status.return_value = None
    return resp


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


# Limpa o cache do lru_cache entre testes para isolamento
def setup_function() -> None:
    fetch_scientific_evidence.cache_clear()


@patch("src.services.research.requests.get")
def test_returns_papers_on_first_query(mock_get: MagicMock) -> None:
    """Deve retornar papers quando a primeira query retorna resultados."""
    mock_get.return_value = _mock_response(_SAMPLE_PAPERS)

    result = fetch_scientific_evidence("radius_mean")

    assert len(result) == 2
    assert result[0]["title"] == "Tumor size as a predictor of breast cancer"
    # TLDR deve ser normalizado de dict para string
    assert result[0]["tldr"] == "Tumor size is a key predictor."
    # TLDR None deve permanecer None
    assert result[1]["tldr"] is None
    mock_get.assert_called_once()


@patch("src.services.research.requests.get")
def test_falls_back_to_second_query(mock_get: MagicMock) -> None:
    """Deve tentar a segunda query se a primeira retornar vazio."""
    empty_resp = _mock_response([])
    ok_resp = _mock_response(_SAMPLE_PAPERS)
    mock_get.side_effect = [empty_resp, ok_resp]

    result = fetch_scientific_evidence("texture_mean")

    assert len(result) == 2
    assert mock_get.call_count == 2


@patch("src.services.research.requests.get")
def test_returns_empty_on_all_failed(mock_get: MagicMock) -> None:
    """Deve retornar lista vazia se todas as queries falharem."""
    mock_get.return_value = _mock_response([])

    result = fetch_scientific_evidence("unknown_feature")

    assert result == []
    assert mock_get.call_count == 3  # tentou todas as 3 queries


@patch("src.services.research.requests.get")
def test_handles_timeout_gracefully(mock_get: MagicMock) -> None:
    """Deve tratar timeout sem lançar exceção."""
    import requests as req

    mock_get.side_effect = req.exceptions.Timeout("timeout")

    result = fetch_scientific_evidence("area_mean")

    assert result == []


@patch("src.services.research.requests.get")
def test_handles_connection_error(mock_get: MagicMock) -> None:
    """Deve tratar erro de conexão sem lançar exceção."""
    import requests as req

    mock_get.side_effect = req.exceptions.ConnectionError("connection refused")

    result = fetch_scientific_evidence("concavity_mean")

    assert result == []


@patch("src.services.research.requests.get")
def test_caches_results(mock_get: MagicMock) -> None:
    """Deve cachear resultados para a mesma feature."""
    mock_get.return_value = _mock_response(_SAMPLE_PAPERS)

    # Primeira chamada
    result1 = fetch_scientific_evidence("radius_mean")
    # Segunda chamada (deve usar cache)
    result2 = fetch_scientific_evidence("radius_mean")

    assert result1 == result2
    # requests.get deve ser chamado apenas UMA vez graças ao cache
    mock_get.assert_called_once()


@patch("src.services.research.requests.get")
def test_unknown_feature_uses_underscore_replacement(mock_get: MagicMock) -> None:
    """Features desconhecidas devem ter underscores substituídos por espaços."""
    mock_get.return_value = _mock_response(_SAMPLE_PAPERS)

    fetch_scientific_evidence("custom_feature_name")

    # Verifica que a query contém "custom feature name"
    call_args = mock_get.call_args
    assert "custom feature name" in call_args[1]["params"]["query"]
