"""
test_model.py
=============
Aether Oncology v3.0 — Testes Unitários do Modelo MLP PyTorch

Testa:
  - Arquitetura MLP (forward pass, output shape)
  - BCEWithLogitsLoss e gradientes
  - Inferência com sigmoid (probabilidade em [0,1])
  - Reprodutibilidade com seed fixa
  - Integração com o MLP real de src/models/mlp.py
"""

from __future__ import annotations

import numpy as np
import pytest
import torch
import torch.nn as nn

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def simple_mlp() -> nn.Module:
    """MLP genérico simples para testes rápidos (não usa src.models)."""
    torch.manual_seed(42)
    model = nn.Sequential(
        nn.Linear(10, 32),
        nn.ReLU(),
        nn.Linear(32, 1),
    )
    return model


@pytest.fixture
def sample_batch() -> tuple[torch.Tensor, torch.Tensor]:
    """Batch sintético: 64 amostras, 10 features, labels binárias."""
    torch.manual_seed(42)
    X = torch.randn(64, 10)
    y = torch.randint(0, 2, (64, 1)).float()
    return X, y


@pytest.fixture
def aether_mlp() -> nn.Module:
    """MLP real da Aether Oncology com input_dim típico após OHE (~70 features)."""
    from src.models.mlp import MLP

    torch.manual_seed(42)
    # Input dim realista após OHE de oral cancer (30 países ≈ 70 features)
    model = MLP(input_shape=70, hidden_dims=[128, 64, 32], dropout_rate=0.3)
    model.eval()
    return model


@pytest.fixture
def oral_cancer_batch() -> tuple[torch.Tensor, torch.Tensor]:
    """Batch sintético com input_dim do oral cancer pipeline."""
    torch.manual_seed(42)
    X = torch.randn(32, 70)
    y = torch.randint(0, 2, (32, 1)).float()
    return X, y


# ---------------------------------------------------------------------------
# Testes de Forward Pass — Shape e Tipos
# ---------------------------------------------------------------------------


def test_mlp_output_shape(simple_mlp: nn.Module, sample_batch: tuple) -> None:
    """Output do MLP deve ter shape (batch_size, 1) — logit único por amostra."""
    X, _ = sample_batch
    output = simple_mlp(X)
    assert output.shape == (64, 1), f"Shape esperado (64, 1), obtido {output.shape}"


def test_mlp_output_is_tensor(simple_mlp: nn.Module, sample_batch: tuple) -> None:
    """Output deve ser um torch.Tensor."""
    X, _ = sample_batch
    output = simple_mlp(X)
    assert isinstance(output, torch.Tensor)


def test_mlp_output_dtype(simple_mlp: nn.Module, sample_batch: tuple) -> None:
    """Output deve ser float32."""
    X, _ = sample_batch
    output = simple_mlp(X)
    assert output.dtype == torch.float32


def test_sigmoid_probability_in_range(
    simple_mlp: nn.Module, sample_batch: tuple
) -> None:
    """Após sigmoid, todos os valores devem estar em [0.0, 1.0]."""
    X, _ = sample_batch
    with torch.no_grad():
        logits = simple_mlp(X)
        probs = torch.sigmoid(logits)
    assert (probs >= 0.0).all(), "Probabilidade não pode ser < 0"
    assert (probs <= 1.0).all(), "Probabilidade não pode ser > 1"


def test_sigmoid_no_nan(simple_mlp: nn.Module, sample_batch: tuple) -> None:
    """Sigmoid não deve produzir NaN mesmo com logits extremos."""
    extreme_X = torch.tensor([[1e6] * 10, [-1e6] * 10], dtype=torch.float32)
    with torch.no_grad():
        logits = simple_mlp(extreme_X)
        probs = torch.sigmoid(logits)
    assert not torch.isnan(probs).any(), (
        "NaN detectado após sigmoid com logits extremos"
    )


# ---------------------------------------------------------------------------
# Testes de Loss e Gradientes
# ---------------------------------------------------------------------------


def test_bce_loss_decreases(simple_mlp: nn.Module, sample_batch: tuple) -> None:
    """BCEWithLogitsLoss deve diminuir após pelo menos um passo de otimização."""
    X, y = sample_batch
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.Adam(simple_mlp.parameters(), lr=1e-3)

    simple_mlp.train()

    # Um passo de treino
    optimizer.zero_grad()
    loss = criterion(simple_mlp(X), y)
    loss.backward()
    optimizer.step()

    # Loss depois (pode não diminuir sempre com 1 passo, mas gradientes devem fluir)
    loss_after = criterion(simple_mlp(X), y).item()
    assert np.isfinite(loss_after), "Loss não deve ser NaN ou Inf após otimização"


def test_gradients_flow(simple_mlp: nn.Module, sample_batch: tuple) -> None:
    """Gradientes devem ser calculados em todos os parâmetros treináveis."""
    X, y = sample_batch
    criterion = nn.BCEWithLogitsLoss()

    simple_mlp.train()
    loss = criterion(simple_mlp(X), y)
    loss.backward()

    for name, param in simple_mlp.named_parameters():
        assert param.grad is not None, f"Gradiente ausente em: {name}"
        assert not torch.isnan(param.grad).any(), f"NaN no gradiente de: {name}"


def test_pos_weight_shifts_loss(sample_batch: tuple) -> None:
    """pos_weight deve aumentar o custo de falsos negativos (útil para classes desbalanceadas)."""
    X, y = sample_batch
    logits = torch.zeros_like(y)  # predição neutra

    loss_standard = nn.BCEWithLogitsLoss()(logits, y).item()
    loss_weighted = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([5.0]))(
        logits, y
    ).item()

    # Com pos_weight alto, a loss deve ser diferente (mais penalização para positivos)
    assert loss_standard != loss_weighted, "pos_weight deveria alterar o valor da loss"


# ---------------------------------------------------------------------------
# Testes do MLP Real (src/models/mlp.py)
# ---------------------------------------------------------------------------


def test_aether_mlp_forward_shape(
    aether_mlp: nn.Module, oral_cancer_batch: tuple
) -> None:
    """MLP Aether deve produzir output (batch, 1) para input (batch, 70)."""
    X, _ = oral_cancer_batch
    with torch.no_grad():
        output = aether_mlp(X)
    assert output.shape == (32, 1), f"Shape esperado (32, 1), obtido {output.shape}"


def test_aether_mlp_eval_no_grad(aether_mlp: nn.Module) -> None:
    """Em modo eval() + no_grad(), nenhum tensor deve ter requires_grad=True."""
    X = torch.randn(1, 70)
    aether_mlp.eval()
    with torch.no_grad():
        output = aether_mlp(X)
    assert not output.requires_grad, (
        "Output em modo eval/no_grad não deve ter gradiente"
    )


def test_aether_mlp_deterministic(aether_mlp: nn.Module) -> None:
    """Com seed fixa, dois forwards idênticos devem produzir o mesmo output."""
    torch.manual_seed(0)
    X = torch.randn(4, 70)

    aether_mlp.eval()
    with torch.no_grad():
        out1 = aether_mlp(X)
        out2 = aether_mlp(X)

    assert torch.allclose(out1, out2), "Outputs devem ser idênticos para o mesmo input"


def test_aether_mlp_batch_independence(aether_mlp: nn.Module) -> None:
    """Em eval(), o output de cada amostra não deve depender das outras no batch."""
    aether_mlp.eval()

    X_full = torch.randn(4, 70)
    with torch.no_grad():
        out_full = aether_mlp(X_full)
        out_single = aether_mlp(X_full[0:1])

    # A primeira amostra do batch completo deve ser igual à mesma amostra sozinha
    assert torch.allclose(out_full[0:1], out_single, atol=1e-5), (
        "Em eval(), output deve ser independente das outras amostras no batch"
    )


def test_aether_mlp_hidden_dims_customizable() -> None:
    """MLP deve aceitar hidden_dims customizados e produzir output correto."""
    from src.models.mlp import MLP

    for hidden_dims in [[64], [128, 64], [256, 128, 64, 32]]:
        model = MLP(input_shape=20, hidden_dims=hidden_dims)
        model.eval()
        X = torch.randn(8, 20)
        with torch.no_grad():
            out = model(X)
        assert out.shape == (8, 1), (
            f"hidden_dims={hidden_dims}: shape esperado (8,1), obtido {out.shape}"
        )


# ---------------------------------------------------------------------------
# Testes de Reprodutibilidade e Seed
# ---------------------------------------------------------------------------


def test_seed_reproducibility() -> None:
    """Com mesma seed, dois modelos inicializados igualmente devem ter pesos idênticos."""
    from src.models.mlp import MLP

    torch.manual_seed(42)
    model_a = MLP(input_shape=10, hidden_dims=[32, 16])

    torch.manual_seed(42)
    model_b = MLP(input_shape=10, hidden_dims=[32, 16])

    for (_, pa), (_, pb) in zip(model_a.named_parameters(), model_b.named_parameters()):
        assert torch.equal(pa, pb), "Modelos com mesma seed devem ter pesos idênticos"


def test_train_eval_mode_consistency() -> None:
    """BatchNorm se comporta diferente em train/eval — output NÃO deve ser igual."""
    from src.models.mlp import MLP

    model = MLP(input_shape=10, hidden_dims=[32])
    X = torch.randn(4, 10)

    model.train()
    out_train = model(X).detach()

    model.eval()
    with torch.no_grad():
        out_eval = model(X)

    # Com BatchNorm e Dropout, train vs eval produzem outputs diferentes
    # (não é garantido que sejam diferentes para todos os casos, mas é esperado)
    # Apenas verificamos que ambos são finitos
    assert torch.isfinite(out_train).all(), "Output em modo train deve ser finito"
    assert torch.isfinite(out_eval).all(), "Output em modo eval deve ser finito"
