"""
optimize.py
===========
Busca automatizada de hiperparâmetros usando Optuna.

Este script executa múltiplos experimentos (trials) para encontrar a
arquitectura de rede neural e os parâmetros de treino que maximizam
a métrica F1 (equilíbrio entre Precisão e Recall) para o diagnóstico.

Integração:
  - Optuna: Sampler TPESampler para busca eficiente.
  - MLflow: Cada "trial" é registado como uma run filha do experimento principal.
"""

import logging
from pathlib import Path

import mlflow
import optuna
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from src.models.mlp import MLP

# Configuração de logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s"
)
log = logging.getLogger(__name__)

RAW_DATA_PATH = Path("data/raw/data.csv")


def objective(trial, X_train, X_val, y_train, y_val):
    # 1. Definição do Espaço de Busca
    lr = trial.suggest_float("learning_rate", 1e-4, 1e-2, log=True)
    dropout = trial.suggest_float("dropout_rate", 0.1, 0.5)

    # Arquitectura dinâmica
    n_layers = trial.suggest_int("n_layers", 1, 3)
    hidden_dims = []
    for i in range(n_layers):
        hidden_dims.append(trial.suggest_int(f"n_units_l{i}", 16, 128))

    # 2. Pré-processamento (scaler por trial para evitar data leakage)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    train_tensor = torch.tensor(X_train_scaled, dtype=torch.float32)
    val_tensor = torch.tensor(X_val_scaled, dtype=torch.float32)
    target_train = torch.tensor(y_train.values, dtype=torch.float32).unsqueeze(1)

    # 3. Cálculo de Pesos para o Trial (MRM3)
    num_pos = y_train.sum()
    num_neg = len(y_train) - num_pos
    pos_weight = torch.tensor([num_neg / num_pos], dtype=torch.float32)

    # 4. Inicialização do Modelo
    model = MLP(input_shape=30, hidden_dims=hidden_dims, dropout_rate=dropout)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    # 5. Loop de Treino Curto (para rapidez na busca)
    model.train()
    for epoch in range(50):
        optimizer.zero_grad()
        outputs = model(train_tensor)
        loss = criterion(outputs, target_train)
        loss.backward()
        optimizer.step()

    # 6. Avaliação
    model.eval()
    with torch.no_grad():
        logits = model(val_tensor)
        probs = torch.sigmoid(logits).squeeze().numpy()
        preds = (probs >= 0.5).astype(int)
        score = f1_score(y_val, preds)

    return score

def run_optimization(n_trials=20):
    log.info("Iniciando optimização com Optuna (%d trials)...", n_trials)

    # Carrega dados UMA vez (evita re-leitura a cada trial)
    df = pd.read_csv(RAW_DATA_PATH)
    X = df.drop("target", axis=1)
    y = df["target"]
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    mlflow.set_tracking_uri("http://localhost:5000")
    mlflow.set_experiment("Aether_Oncology_Optimization")

    study = optuna.create_study(direction="maximize")

    with mlflow.start_run(run_name="optuna_study_main"):
        study.optimize(
            lambda trial: objective(trial, X_train, X_val, y_train, y_val),
            n_trials=n_trials,
        )

        log.info("Melhor F1: %.4f", study.best_value)
        log.info("Melhores Parâmetros: %s", study.best_params)

        # Loga os melhores resultados no MLflow
        mlflow.log_params(study.best_params)
        mlflow.log_metric("best_f1_score", study.best_value)

if __name__ == "__main__":
    run_optimization()
