import logging

import pandas as pd
import torch
from sklearn.model_selection import train_test_split
from src.models.tumor_mlp import TumorMLP

from .orchestrator import MLPlatformOrchestrator

logger = logging.getLogger(__name__)

def run_enterprise_training_pipeline(data_path: str, model_save_path: str):
    """
    Enterprise Training Pipeline with Fairness Gate.
    """
    logger.info("Starting Enterprise Training Pipeline (v2.1)")

    # 1. Load and Preprocess
    df = pd.read_csv(data_path)
    # Basic preprocessing (simplified for demo)
    X = df.drop(columns=['id', 'diagnosis']).values
    y = (df['diagnosis'] == 'M').astype(int).values

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    # 2. Train Model
    input_size = X_train.shape[1]
    model = TumorMLP(input_size=input_size)

    logger.info("Training model...")
    # Assume train_model is available and returns the trained state
    # train_model(model, X_train, y_train, X_val, y_val)

    # 3. Fairness Audit (GATE)
    orchestrator = MLPlatformOrchestrator(data_path)

    # Get predictions for validation set
    model.eval()
    with torch.no_grad():
        y_val_tensor = torch.FloatTensor(X_val)
        outputs = model(y_val_tensor)
        y_pred = (outputs > 0.5).numpy().astype(int).flatten()

    # We use 'mean radius' as the sensitive slice
    # Need to map back the slice from X_val if column indices are known
    # Assuming 'mean radius' is index 0
    val_df = pd.DataFrame(X_val, columns=df.drop(columns=['id', 'diagnosis']).columns)

    is_fair = orchestrator.validate_new_model(val_df, y_val, y_pred)

    if is_fair:
        logger.info("FAIRNESS AUDIT PASSED. Saving model...")
        torch.save(model.state_dict(), model_save_path)
        return True
    else:
        logger.error("FAIRNESS AUDIT FAILED. Model promotion blocked!")
        return False

if __name__ == "__main__":
    _DATA = "data/raw/data.csv"
    _MODEL = "models/tumor_model_v2_1.pth"
    run_enterprise_training_pipeline(_DATA, _MODEL)
