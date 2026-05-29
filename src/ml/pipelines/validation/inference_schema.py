import pandera as pa
from pandera import Check, Column

inference_schema = pa.DataFrameSchema(
    columns={
        "Country": Column(str, nullable=False),
        "Gender": Column(str, Check.isin(["Male", "Female"]), nullable=False),
        "Age": Column(int, Check.between(0, 120), nullable=False),
        "Tobacco_Use": Column(str, Check.isin(["Yes", "No"]), nullable=False),
        "Alcohol_Use": Column(str, Check.isin(["Yes", "No"]), nullable=False),
        "Socioeconomic_Status": Column(
            str, Check.isin(["High", "Middle", "Low"]), nullable=False
        ),
        "Treatment_Type": Column(
            str,
            Check.isin(
                [
                    "Radiotherapy",
                    "Combination",
                    "Chemotherapy",
                    "Palliative",
                    "Surgery",
                    "Unknown",
                ]
            ),
            nullable=True,
        ),
        "Survival_Rate": Column(float, Check.between(0.0, 1.0), nullable=True),
    },
    strict=False,
    coerce=True,
)
