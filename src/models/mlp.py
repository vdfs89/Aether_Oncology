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
        hidden_dims: list[int] | None = None,
        dropout_rate: float = 0.3,
    ) -> None:
        super().__init__()

        if hidden_dims is None:
            hidden_dims = [64, 32]

        layers = []
        prev_dim = input_shape

        for h_dim in hidden_dims:
            layers.append(nn.Linear(prev_dim, h_dim))
            layers.append(nn.BatchNorm1d(h_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout_rate))
            prev_dim = h_dim

        # --- Output (logit) ---
        layers.append(nn.Linear(prev_dim, 1))

        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # noqa: D102
        return self.net(x)
