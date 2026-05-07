"""
test_research.py
================
Testes unitários do serviço de busca de evidências científicas v2.0.

Cobre: PubMed (via Entrez), Cochrane (via PubMed filtro), Semantic Scholar,
e o sistema de caching com diskcache.

Usa mocking para evitar chamadas reais às APIs externas.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from Bio import Entrez

from src.services.research import (
    _cache,
    _search_cochrane,
    _search_pubmed,
    _search_semantic_scholar,
    fetch_scientific_evidence,
)

# ---------------------------------------------------------------------------
# Fixtures / Helpers
# ---------------------------------------------------------------------------

_SAMPLE_PAPERS = [
    {
        "title": "Tumor size as a predictor of breast cancer",
        "url": "https://pubmed.ncbi.nlm.nih.gov/12345/",
        "year": 2023,
        "tldr": {"text": "Tumor size is a key predictor."},
        "source": "Semantic Scholar",
    },
    {
        "title": "Morphometric analysis of breast lesions",
        "url": "https://pubmed.ncbi.nlm.nih.gov/67890/",
        "year": 2022,
        "tldr": None,
        "source": "Semantic Scholar",
    },
]

_PUBMED_ARTICLES = [
    {
        "title": "Breast cancer tumor size prognosis",
        "url": "https://pubmed.ncbi.nlm.nih.gov/11111/",
        "year": 2024,
        "abstract": "Study on tumor size.",
        "tldr": None,
        "source": "PubMed",
    },
]

_COCHRANE_ARTICLES = [
    {
        "title": "Cochrane review: tumor size in breast cancer",
        "url": "https://pubmed.ncbi.nlm.nih.gov/22222/",
        "year": 2023,
        "abstract": "Systematic review.",
        "tldr": None,
        "source": "Cochrane",
    },
]


def _mock_s2_response(data: list | None = None, status: int = 200) -> MagicMock:
    """Cria um mock de requests.Response para Semantic Scholar."""
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = {"data": data if data is not None else []}
    resp.raise_for_status.return_value = None
    return resp


# ---------------------------------------------------------------------------
# Setup — limpa o cache entre testes
# ---------------------------------------------------------------------------


def setup_function() -> None:
    """Limpa o cache do diskcache entre testes para isolamento."""
    _cache.clear()


# ---------------------------------------------------------------------------
# Testes — PubMed
# ---------------------------------------------------------------------------


@patch("Bio.Entrez", create=True)
def test_pubmed_returns_articles(mock_entrez: MagicMock) -> None:
    """Deve retornar artigos do PubMed quando a busca tem resultados."""
    # Mock do esearch
    mock_handle = MagicMock()
    mock_entrez.esearch.return_value = mock_handle
    mock_entrez.read.side_effect = [
        {"IdList": ["12345"]},  # esearch result
        {  # efetch result
            "PubmedArticle": [
                {
                    "MedlineCitation": {
                        "PMID": "12345",
                        "Article": {
                            "ArticleTitle": "Breast cancer tumor size study",
                            "Abstract": {"AbstractText": ["Tumor size is important."]},
                            "Journal": {"JournalIssue": {"PubDate": {"Year": "2024"}}},
                        },
                    }
                }
            ]
        },
    ]

    result = _search_pubmed("breast cancer tumor size", max_results=1)

    assert len(result) == 1
    assert result[0]["title"] == "Breast cancer tumor size study"
    assert result[0]["source"] == "PubMed"
    assert result[0]["url"].startswith("https://pubmed.ncbi.nlm.nih.gov/")


@patch("Bio.Entrez", create=True)
def test_pubmed_returns_empty_on_no_results(mock_entrez: MagicMock) -> None:
    """Deve retornar lista vazia quando PubMed não encontra resultados."""
    mock_handle = MagicMock()
    mock_entrez.esearch.return_value = mock_handle
    mock_entrez.read.return_value = {"IdList": []}

    result = _search_pubmed("nonexistent query xyz")

    assert result == []


@patch("Bio.Entrez", create=True)
def test_pubmed_handles_error_gracefully(mock_entrez: MagicMock) -> None:
    """Deve tratar erros do Entrez sem lançar exceção."""
    mock_entrez.esearch.side_effect = Exception("Network error")

    result = _search_pubmed("breast cancer")

    assert result == []


# ---------------------------------------------------------------------------
# Testes — Cochrane
# ---------------------------------------------------------------------------


@patch("src.services.research._search_pubmed")
def test_cochrane_calls_pubmed_with_journal_filter(mock_pubmed: MagicMock) -> None:
    """Deve chamar PubMed com filtro de journal Cochrane."""
    mock_pubmed.return_value = _COCHRANE_ARTICLES

    result = _search_cochrane("breast cancer tumor size")

    assert len(result) == 1
    mock_pubmed.assert_called_once_with(
        query="breast cancer tumor size",
        max_results=3,
        journal_filter="Cochrane Database Syst Rev",
    )


# ---------------------------------------------------------------------------
# Testes — Semantic Scholar
# ---------------------------------------------------------------------------


@patch("src.services.research.requests.get")
def test_semantic_scholar_returns_papers(mock_get: MagicMock) -> None:
    """Deve retornar papers do Semantic Scholar."""
    mock_get.return_value = _mock_s2_response(_SAMPLE_PAPERS)

    result = _search_semantic_scholar("breast cancer tumor size")

    assert len(result) == 2
    assert result[0]["title"] == "Tumor size as a predictor of breast cancer"
    assert result[0]["source"] == "Semantic Scholar"


@patch("src.services.research.requests.get")
def test_semantic_scholar_handles_timeout(mock_get: MagicMock) -> None:
    """Deve tratar timeout do Semantic Scholar sem lançar exceção."""
    import requests as req

    mock_get.side_effect = req.exceptions.Timeout("timeout")

    result = _search_semantic_scholar("breast cancer")

    assert result == []


@patch("src.services.research.requests.get")
def test_semantic_scholar_handles_connection_error(mock_get: MagicMock) -> None:
    """Deve tratar erro de conexão do Semantic Scholar sem lançar exceção."""
    import requests as req

    mock_get.side_effect = req.exceptions.ConnectionError("connection refused")

    result = _search_semantic_scholar("breast cancer")

    assert result == []


# ---------------------------------------------------------------------------
# Testes — fetch_scientific_evidence (integração multi-fonte)
# ---------------------------------------------------------------------------


@patch("src.services.research._search_semantic_scholar")
@patch("src.services.research._search_cochrane")
@patch("src.services.research._search_pubmed")
def test_fetch_evidence_multi_source(
    mock_pubmed: MagicMock,
    mock_cochrane: MagicMock,
    mock_s2: MagicMock,
) -> None:
    """Deve combinar resultados de PubMed, Cochrane e Semantic Scholar."""
    mock_pubmed.return_value = _PUBMED_ARTICLES
    mock_cochrane.return_value = _COCHRANE_ARTICLES
    mock_s2.return_value = []

    result = fetch_scientific_evidence("radius_mean")

    assert len(result) == 2
    sources = [r["source"] for r in result]
    assert "PubMed" in sources
    assert "Cochrane" in sources


@patch("src.services.research._search_semantic_scholar")
@patch("src.services.research._search_cochrane")
@patch("src.services.research._search_pubmed")
def test_fetch_evidence_deduplicates_urls(
    mock_pubmed: MagicMock,
    mock_cochrane: MagicMock,
    mock_s2: MagicMock,
) -> None:
    """Não deve duplicar artigos com a mesma URL."""
    same_url = "https://pubmed.ncbi.nlm.nih.gov/11111/"
    mock_pubmed.return_value = [{"title": "A", "url": same_url, "source": "PubMed"}]
    mock_cochrane.return_value = [{"title": "B", "url": same_url, "source": "Cochrane"}]
    mock_s2.return_value = []

    result = fetch_scientific_evidence("radius_mean")

    # Deve manter apenas o primeiro com essa URL
    assert len(result) == 1
    assert result[0]["source"] == "PubMed"


@patch("src.services.research._search_semantic_scholar")
@patch("src.services.research._search_cochrane")
@patch("src.services.research._search_pubmed")
def test_fetch_evidence_uses_cache(
    mock_pubmed: MagicMock,
    mock_cochrane: MagicMock,
    mock_s2: MagicMock,
) -> None:
    """Deve cachear resultados e não chamar APIs novamente."""
    mock_pubmed.return_value = _PUBMED_ARTICLES
    mock_cochrane.return_value = []
    mock_s2.return_value = []

    # Primeira chamada
    result1 = fetch_scientific_evidence("texture_mean")
    # Segunda chamada (deve usar cache)
    result2 = fetch_scientific_evidence("texture_mean")

    assert result1 == result2
    # APIs devem ser chamadas apenas UMA vez graças ao cache
    mock_pubmed.assert_called_once()
    mock_cochrane.assert_called_once()


@patch("src.services.research._search_semantic_scholar")
@patch("src.services.research._search_cochrane")
@patch("src.services.research._search_pubmed")
def test_fetch_evidence_falls_back_to_semantic_scholar(
    mock_pubmed: MagicMock,
    mock_cochrane: MagicMock,
    mock_s2: MagicMock,
) -> None:
    """Deve usar Semantic Scholar como fallback quando PubMed e Cochrane retornam vazio."""
    mock_pubmed.return_value = []
    mock_cochrane.return_value = []
    mock_s2.return_value = [
        {"title": "S2 paper", "url": "https://s2.com/1", "source": "Semantic Scholar"}
    ]

    result = fetch_scientific_evidence("radius_mean")

    assert len(result) == 1
    assert result[0]["source"] == "Semantic Scholar"


@patch("src.services.research._search_semantic_scholar")
@patch("src.services.research._search_cochrane")
@patch("src.services.research._search_pubmed")
def test_unknown_feature_uses_underscore_replacement(
    mock_pubmed: MagicMock,
    mock_cochrane: MagicMock,
    mock_s2: MagicMock,
) -> None:
    """Features desconhecidas devem ter underscores substituídos por espaços."""
    mock_pubmed.return_value = []
    mock_cochrane.return_value = []
    mock_s2.return_value = _SAMPLE_PAPERS

    fetch_scientific_evidence("custom_feature_name")

    # Verifica que a query contém "custom feature name"
    call_args = mock_s2.call_args
    assert "custom feature name" in call_args[0][0]
