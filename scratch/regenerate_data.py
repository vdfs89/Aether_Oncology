import pathlib

import pandas as pd
from sklearn.datasets import load_breast_cancer

pathlib.Path("data/raw").mkdir(parents=True, exist_ok=True)
data = load_breast_cancer()

def normalize(name: str) -> str:
    name = name.strip()
    if name.startswith("mean "): n = name[5:].strip()
    elif name.endswith(" error"): n = name[:-6].strip()
    elif name.startswith("worst "): n = name[6:].strip()
    else: n = name

    n = n.replace(" ", "_")

    if name.startswith("mean "): return n + "_mean"
    if name.endswith(" error"): return n + "_se"
    if name.startswith("worst "): return n + "_worst"
    return n

cols = [normalize(c) for c in data.feature_names]
df = pd.DataFrame(data.data, columns=cols)
df["target"] = 1 - data.target
df.to_csv("data/raw/data.csv", index=False)
print("Data regenerated with final naming convention.")
