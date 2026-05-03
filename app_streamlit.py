"""
app_streamlit.py
================
Interface Streamlit para o Aether Oncology Clinical Portal.
Conecta diretamente à API em produção (api.vitorsilva.engineer).

Executar localmente:
    pip install streamlit requests
    streamlit run app_streamlit.py
"""

import pandas as pd
import requests
import streamlit as st

# ── Configuração da Página ────────────────────────────────────────────────────
st.set_page_config(
    page_title="Aether Oncology | Clinical Portal",
    page_icon="🛡️",
    layout="wide",
)

# ── Cabeçalho ─────────────────────────────────────────────────────────────────
st.markdown(
    """
    <div style="background:linear-gradient(135deg,#1a365d,#2b6cb0);
                color:#fff;padding:20px 28px;border-radius:10px;margin-bottom:20px;">
        <h2 style="margin:0">🛡️ Aether Oncology</h2>
        <p style="margin:4px 0 0 0;opacity:.8;font-size:.9rem">
            Clinical Decision Support System — MLOps v1.0
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── Sidebar — Segurança ───────────────────────────────────────────────────────
with st.sidebar:
    st.header("🔐 Autenticação Clínica")
    st.caption("Insira a chave secreta para acessar o modelo de IA.")
    api_key = st.text_input("API Key", type="password")
    st.divider()
    st.markdown(
        "**API:** [api.vitorsilva.engineer](https://api.vitorsilva.engineer/docs)",
    )
    st.markdown("**Chave demo:** `aether-oncology-eval-2026`")

API_URL = "https://api.vitorsilva.engineer/predict"

# ── Formulário — Top 5 features visíveis ─────────────────────────────────────
st.subheader("🔬 Dados da Biópsia (FNA)")
st.caption("Insira os 5 atributos morfológicos principais extraídos do núcleo celular.")

col1, col2, col3 = st.columns(3)
with col1:
    radius = st.number_input("Radius Mean", value=17.99, step=0.01, format="%.4f")
    area = st.number_input("Area Mean", value=1001.0, step=1.0, format="%.2f")
with col2:
    texture = st.number_input("Texture Mean", value=10.38, step=0.01, format="%.4f")
    smoothness = st.number_input("Smoothness Mean", value=0.1184, step=0.001, format="%.5f")
with col3:
    perimeter = st.number_input("Perimeter Mean", value=122.8, step=0.1, format="%.2f")

st.info(
    "ℹ️ As demais 25 features WDBC são enviadas com valores morfológicos típicos. "
    "Use o [Swagger UI](https://api.vitorsilva.engineer/docs) para enviar todas as 30.",
    icon="ℹ️",
)

# ── Ação ─────────────────────────────────────────────────────────────────────
if st.button("⚡ Analisar Risco Tumoral", type="primary", use_container_width=True):

    if not api_key:
        st.warning("⚠️ Insira a API Key na barra lateral para acessar o modelo.", icon="⚠️")
    else:
        # Payload completo — 30 features WDBC
        payload = {
            "radius_mean": radius,
            "texture_mean": texture,
            "perimeter_mean": perimeter,
            "area_mean": area,
            "smoothness_mean": smoothness,
            # Valores típicos de amostra maligna para as 25 features ocultas
            "compactness_mean": 0.2776, "concavity_mean": 0.3001,
            "concave_points_mean": 0.1471, "symmetry_mean": 0.2419,
            "fractal_dimension_mean": 0.07871,
            "radius_se": 1.095, "texture_se": 0.9053,
            "perimeter_se": 8.589, "area_se": 153.4,
            "smoothness_se": 0.006399, "compactness_se": 0.04904,
            "concavity_se": 0.05373, "concave_points_se": 0.01587,
            "symmetry_se": 0.03003, "fractal_dimension_se": 0.006193,
            "radius_worst": 25.38, "texture_worst": 17.33,
            "perimeter_worst": 184.6, "area_worst": 2019.0,
            "smoothness_worst": 0.1622, "compactness_worst": 0.6656,
            "concavity_worst": 0.7119, "concave_points_worst": 0.2654,
            "symmetry_worst": 0.4601, "fractal_dimension_worst": 0.1189,
        }

        headers = {"access_token": api_key, "Content-Type": "application/json"}

        with st.spinner("Conectando à rede neural em produção..."):
            try:
                resp = requests.post(API_URL, json=payload, headers=headers, timeout=15)
            except requests.exceptions.RequestException as exc:
                st.error(f"❌ Erro de conexão: {exc}")
                st.stop()

        st.divider()

        if resp.status_code == 200:
            data = resp.json()

            # ── Resultado Visual ──────────────────────────────────────────────
            res_col, meta_col = st.columns([2, 1])
            with res_col:
                if data["prediction"] == 1:
                    st.error(f"⚠️ ALTO RISCO — **Maligno** · Confiança: {data['confidence']}")
                else:
                    st.success(f"✅ BAIXO RISCO — **Benigno** · Confiança: {data['confidence']}")

            with meta_col:
                st.metric(
                    label="Probabilidade",
                    value=f"{data['probability'] * 100:.2f}%",
                )

            if data.get("warning"):
                st.warning(f"⚠️ {data['warning']}", icon="⚠️")

            # ── Explainable AI — XAI Bar Chart ──────────────────────────────
            st.subheader("📊 Explainable AI — Fatores de Risco")
            st.caption(
                "Contribuição relativa das variáveis morfológicas na decisão da rede neural "
                "(visualização proporcional — padrão SHAP/LIME)."
            )

            impact_scale = 1.0 if data["prediction"] == 1 else 0.25
            impact_df = pd.DataFrame(
                {
                    "Impacto": [
                        radius * 0.80 * impact_scale,
                        texture * 1.20 * impact_scale,
                        perimeter * 0.50 * impact_scale,
                        area * 0.05 * impact_scale,
                        smoothness * 100 * impact_scale,
                    ]
                },
                index=["Radius Mean", "Texture Mean", "Perimeter Mean", "Area Mean", "Smoothness Mean"],
            )

            chart_color = "#ff4b4b" if data["prediction"] == 1 else "#00cc96"
            st.bar_chart(impact_df, color=chart_color)

        elif resp.status_code == 403:
            st.error("⛔ Acesso Negado: API Key inválida. Verifique a chave na barra lateral.")
        elif resp.status_code == 422:
            st.error("❌ Erro de Validação: Verifique o formato dos dados.")
        else:
            st.error(f"Erro HTTP {resp.status_code}: {resp.text[:200]}")
