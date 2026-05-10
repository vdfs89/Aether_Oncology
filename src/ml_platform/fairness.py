import numpy as np
import pandas as pd
from sklearn.metrics import recall_score, precision_score
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class FairnessAuditor:
    """
    Audits clinical model predictions for bias across clinical subgroups.
    Ensures 'Equal Opportunity' in cancer detection.
    """
    
    def audit_recall_parity(self, 
                           y_true: np.ndarray, 
                           y_pred: np.ndarray, 
                           sensitive_feature: np.ndarray,
                           threshold: float = 0.1) -> Dict[str, Any]:
        """
        Checks if recall varies significantly across subgroups of a sensitive feature.
        """
        unique_groups = np.unique(sensitive_feature)
        group_metrics = {}
        
        for group in unique_groups:
            mask = (sensitive_feature == group)
            if np.sum(mask) == 0: continue
            
            rec = recall_score(y_true[mask], y_pred[mask], zero_division=0)
            group_metrics[str(group)] = rec
            
        # Calculate disparity
        rec_values = list(group_metrics.values())
        disparity = max(rec_values) - min(rec_values)
        
        is_fair = disparity <= threshold
        
        report = {
            "is_fair": bool(is_fair),
            "disparity_score": float(disparity),
            "group_metrics": group_metrics,
            "audit_type": "recall_parity"
        }
        
        if not is_fair:
            logger.warning(f"FAIRNESS ALERT: Recall disparity of {disparity:.2f} detected between subgroups!")
            
        return report

    def audit_by_feature_slice(self, 
                               df: pd.DataFrame, 
                               y_true_col: str, 
                               y_pred_col: str, 
                               slice_col: str) -> Dict[str, Any]:
        """
        Convenience method to audit a dataframe slice.
        Useful for auditing by tumor size (mean radius) bins.
        """
        return self.audit_recall_parity(
            df[y_true_col].values,
            df[y_pred_col].values,
            df[slice_col].values
        )
