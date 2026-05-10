import logging
from typing import Dict

logger = logging.getLogger(__name__)

class GreenAIMonitor:
    """
    Tracks and estimates carbon footprint and energy consumption of ML inference.
    Aligned with the Sustainability goals of FIAP Tech Challenge.
    """

    # Average gCO2 per kWh (Global average, can be refined per region)
    CARBON_INTENSITY = 475

    # Average power consumption of a cloud CPU instance (in Watts)
    # Ref: AWS m5.large average power
    AVG_CPU_POWER_W = 15

    def __init__(self):
        self.total_energy_kwh = 0.0
        self.total_co2_g = 0.0
        self.inference_count = 0

    def track_inference(self, duration_ms: float) -> Dict[str, float]:
        """
        Estimates energy and carbon footprint for a single inference.
        """
        # Convert ms to hours
        duration_h = duration_ms / (1000 * 3600)

        # Energy (kWh) = (Power in Watts * Time in hours) / 1000
        energy_kwh = (self.AVG_CPU_POWER_W * duration_h) / 1000

        # CO2 (grams) = Energy (kWh) * Carbon Intensity (gCO2/kWh)
        co2_g = energy_kwh * self.CARBON_INTENSITY

        # Cumulative metrics
        self.total_energy_kwh += energy_kwh
        self.total_co2_g += co2_g
        self.inference_count += 1

        return {
            "energy_kwh": float(energy_kwh),
            "co2_g": float(co2_g),
            "inference_time_ms": duration_ms
        }

    def get_sustainability_report(self) -> Dict[str, any]:
        """
        Returns the overall sustainability impact of the platform.
        """
        return {
            "total_inferences": self.inference_count,
            "total_energy_consumption_kwh": float(self.total_energy_kwh),
            "total_carbon_footprint_gco2": float(self.total_co2_g),
            "status": "Green AI Active"
        }
