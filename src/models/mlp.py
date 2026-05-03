"""
mlp.py
======
Definição da arquitectura TumorMLP.

Mantida em src/models/ e separada do train.py e do predictor.py para que
ambos possam importar a mesma classe sem duplicação de código — garantindo
que os pesos salvos sejam sempre compatíveis com o modelo carregado na API.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class MLP(nn.Module):
    """
    Multilayer Perceptron para classificação binária de tumores (WDBC).

    Arquitectura:
        Input(input_shape) → Linear → BatchNorm → ReLU → Dropout
                           → Linear → BatchNorm → ReLU → Dropout
                           → Linear(1)   ← logit (sem Sigmoid)

    Notes:
        O output é um logit bruto. Use BCEWithLogitsLoss no treino e
        torch.sigmoid() na inferência para obter a probabilidade.
        Isso é numericamente mais estável do que aplicar Sigmoid dentro
        do modelo e usar BCELoss.

    Args:
        input_shape: Número de features de entrada. Default = 30 (WDBC).
        hidden_dim: Número de neurónios nas camadas ocultas. Default = 64.
        dropout_rate: Taxa de dropout aplicada após cada camada oculta.
    """

    def __init__(
        self,
        input_shape: int = 30,
        hidden_dim: int = 64,
        dropout_rate: float = 0.3,
    ) -> None:
        super().__init__()

        self.net = nn.Sequential(
            # --- Camada 1 ---
            nn.Linear(input_shape, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout_rate),

            # --- Camada 2 ---
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout_rate),

            # --- Output (logit) ---
            nn.Linear(hidden_dim // 2, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # noqa: D102
        return self.net(x)
