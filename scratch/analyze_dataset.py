import pandas as pd
df = pd.read_csv("data/raw/oral_cancer_top30.csv")
df["high_risk"] = df["Diagnosis_Stage"].isin(["Moderate", "Late"]).astype(int)
country_incidence = df.groupby("Country")["high_risk"].mean().sort_values(ascending=False)
print("Incidence rate by country:")
print(country_incidence)
