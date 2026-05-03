"""
test_api.py
===========
Testes de integração e smoke tests da FastAPI.

Usa o TestClient do Starlette (incluído no FastAPI) com httpx como backend.
O servidor NÃO é iniciado — os testes correm em processo, sem necessidade
de subir o uvicorn, o que os torna rápidos e reproduzíveis em CI/CD.

Nota: Para que estes testes passem, os artefactos treinados devem existir:
  - models/preprocessor.joblib
  - models/aether_mlp_v1.pth

Se os artefactos não existirem, os testes de predição são marcados como
xfail (esperado falhar) para não bloquear o CI antes do primeiro treino.
"""

import os

import pytest
from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)

# Header de autenticação para os testes.
# Em CI a API_KEY não é definida → bypass ativo → qualquer valor aceito.
# Em local com API_KEY definida → usa o valor real.
_TEST_HEADERS = {"access_token": os.getenv("API_KEY", "test-key")}

# ---------------------------------------------------------------------------
# Payload de referência — primeira linha do WDBC (sabidamente Maligno)
# ---------------------------------------------------------------------------

MALIGNANT_SAMPLE = {
    "radius_mean": 17.99,
    "texture_mean": 10.38,
    "perimeter_mean": 122.8,
    "area_mean": 1001.0,
    "smoothness_mean": 0.1184,
    "compactness_mean": 0.2776,
    "concavity_mean": 0.3001,
    "concave_points_mean": 0.1471,
    "symmetry_mean": 0.2419,
    "fractal_dimension_mean": 0.07871,
    "radius_se": 1.095,
    "texture_se": 0.9053,
    "perimeter_se": 8.589,
    "area_se": 153.4,
    "smoothness_se": 0.006399,
    "compactness_se": 0.04904,
    "concavity_se": 0.05373,
    "concave_points_se": 0.01587,
    "symmetry_se": 0.03003,
    "fractal_dimension_se": 0.006193,
    "radius_worst": 25.38,
    "texture_worst": 17.33,
    "perimeter_worst": 184.6,
    "area_worst": 2019.0,
    "smoothness_worst": 0.1622,
    "compactness_worst": 0.6656,
    "concavity_worst": 0.7119,
    "concave_points_worst": 0.2654,
    "symmetry_worst": 0.4601,
    "fractal_dimension_worst": 0.1189,
}

BENIGN_SAMPLE = {
    "radius_mean": 13.54,
    "texture_mean": 14.36,
    "perimeter_mean": 87.46,
    "area_mean": 566.3,
    "smoothness_mean": 0.09779,
    "compactness_mean": 0.08129,
    "concavity_mean": 0.06664,
    "concave_points_mean": 0.04781,
    "symmetry_mean": 0.1885,
    "fractal_dimension_mean": 0.05766,
    "radius_se": 0.2699,
    "texture_se": 0.7886,
    "perimeter_se": 2.058,
    "area_se": 23.56,
    "smoothness_se": 0.008462,
    "compactness_se": 0.0146,
    "concavity_se": 0.02387,
    "concave_points_se": 0.01315,
    "symmetry_se": 0.0198,
    "fractal_dimension_se": 0.0023,
    "radius_worst": 15.11,
    "texture_worst": 19.26,
    "perimeter_worst": 99.7,
    "area_worst": 711.2,
    "smoothness_worst": 0.144,
    "compactness_worst": 0.1773,
    "concavity_worst": 0.239,
    "concave_points_worst": 0.1288,
    "symmetry_worst": 0.2977,
    "fractal_dimension_worst": 0.07259,
}

# ---------------------------------------------------------------------------
# Helper para verificar se os artefactos de treino existem
# ---------------------------------------------------------------------------


def _models_exist() -> bool:
    from pathlib import Path

    return (
        Path("models/preprocessor.joblib").exists()
        and Path("models/aether_mlp_v1.pth").exists()
    )


needs_model = pytest.mark.xfail(
    not _models_exist(),
    reason="Artefactos de treino ausentes — execute `make train` primeiro.",
    strict=False,
)


# ---------------------------------------------------------------------------
# 1. Health Check
# ---------------------------------------------------------------------------


def test_health_check() -> None:
    """A rota /health deve retornar 200 e status 'online'."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "online"
    assert "model" in body


# ---------------------------------------------------------------------------
# 2. Testes de Predição (requerem modelo treinado)
# ---------------------------------------------------------------------------


@needs_model
def test_predict_malignant_sample() -> None:
    """Um sample sabidamente maligno deve retornar prediction=1."""
    response = client.post("/predict", json=MALIGNANT_SAMPLE, headers=_TEST_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert "prediction" in body
    assert "probability" in body
    assert "label" in body
    assert "confidence" in body
    assert body["prediction"] == 1, (
        f"Esperado Maligno (1), obtido {body['prediction']} "
        f"com probabilidade {body['probability']}"
    )


@needs_model
def test_predict_benign_sample() -> None:
    """Um sample sabidamente benigno deve retornar prediction=0."""
    response = client.post("/predict", json=BENIGN_SAMPLE, headers=_TEST_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] == 0, (
        f"Esperado Benigno (0), obtido {body['prediction']} "
        f"com probabilidade {body['probability']}"
    )


@needs_model
def test_predict_probability_in_range() -> None:
    """A probabilidade retornada deve estar sempre entre 0 e 1."""
    response = client.post("/predict", json=MALIGNANT_SAMPLE, headers=_TEST_HEADERS)
    assert response.status_code == 200
    prob = response.json()["probability"]
    assert 0.0 <= prob <= 1.0, f"Probabilidade fora do intervalo [0,1]: {prob}"


@needs_model
def test_predict_response_has_all_fields() -> None:
    """A resposta deve incluir todos os campos do schema PredictResponse."""
    response = client.post("/predict", json=MALIGNANT_SAMPLE, headers=_TEST_HEADERS)
    assert response.status_code == 200
    body = response.json()
    required_fields = {"prediction", "label", "probability", "confidence", "status"}
    assert required_fields.issubset(body.keys()), (
        f"Campos ausentes: {required_fields - body.keys()}"
    )


# ---------------------------------------------------------------------------
# 3. Smoke Tests — validação Pydantic (não precisam do modelo)
# ---------------------------------------------------------------------------


def test_predict_invalid_type_returns_422() -> None:
    """Enviar string onde é esperado float deve retornar 422 (Unprocessable Entity)."""
    payload = {"radius_mean": "muito_grande"}
    response = client.post("/predict", json=payload, headers=_TEST_HEADERS)
    assert response.status_code == 422


def test_predict_missing_features_returns_422() -> None:
    """Payload com apenas algumas features (incompleto) deve retornar 422."""
    partial_payload = {
        "radius_mean": 17.99,
        "texture_mean": 10.38,
        # As outras 28 features estão faltando
    }
    response = client.post("/predict", json=partial_payload, headers=_TEST_HEADERS)
    assert response.status_code == 422


def test_predict_empty_payload_returns_422() -> None:
    """Payload vazio deve ser rejeitado com 422."""
    response = client.post("/predict", json={}, headers=_TEST_HEADERS)
    assert response.status_code == 422


def test_predict_negative_radius_returns_422() -> None:
    """Raio negativo (fisicamente impossível) deve ser rejeitado pelo Pydantic."""
    bad_payload = {**MALIGNANT_SAMPLE, "radius_mean": -5.0}
    response = client.post("/predict", json=bad_payload, headers=_TEST_HEADERS)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 4. Segurança — API Key
# ---------------------------------------------------------------------------


def test_predict_invalid_api_key_returns_403(monkeypatch: pytest.MonkeyPatch) -> None:
    """Com API_KEY definida, chave errada deve retornar 403."""
    monkeypatch.setenv("API_KEY", "chave-correta")
    import importlib

    import src.main as main_module

    importlib.reload(main_module)
    patched_client = TestClient(main_module.app)
    response = patched_client.post(
        "/predict",
        json=MALIGNANT_SAMPLE,
        headers={"access_token": "chave-errada"},
    )
    assert response.status_code == 403
    assert "Acesso negado" in response.json()["detail"]


def test_predict_forbidden_without_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sem o header access_token, a API deve retornar 403 quando API_KEY está configurada."""
    import importlib
    import os
    from unittest.mock import patch

    import src.main as main_module

    with patch.dict(os.environ, {"API_KEY": "chave_secreta"}):
        importlib.reload(main_module)
        secured_client = TestClient(main_module.app)

        # Requisição sem o header access_token
        response = secured_client.post("/predict", json=MALIGNANT_SAMPLE)

    assert response.status_code == 403
    assert response.json()["detail"] == "Acesso negado: API Key inválida"
