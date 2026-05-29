import pandera as pa
from pandera import Check, Column

training_raw_schema = pa.DataFrameSchema(
    columns={
        "ID": Column(int, nullable=False),
        "Country": Column(str, nullable=False),
        "Gender": Column(str, Check.isin(["Male", "Female"]), nullable=False),
        "Age": Column(int, Check.between(0, 120), nullable=False),
        "Tobacco_Use": Column(int, Check.isin([0, 1]), nullable=False),
        "Alcohol_Use": Column(int, Check.isin([0, 1]), nullable=False),
        "Socioeconomic_Status": Column(
            str, Check.isin(["High", "Middle", "Low"]), nullable=False
        ),
        "Diagnosis_Stage": Column(
            str, Check.isin(["Early", "Moderate", "Late"]), nullable=False
        ),
        "Treatment_Type": Column(
            str,
            Check.isin(
                ["Radiotherapy", "Combination", "Chemotherapy", "Palliative", "Surgery"]
            ),
            nullable=True,
        ),
        "Survival_Rate": Column(float, Check.between(0.0, 1.0), nullable=True),
        "HPV_Related": Column(int, Check.isin([0, 1]), nullable=False),
    },
    strict=False,
    coerce=True,
)
