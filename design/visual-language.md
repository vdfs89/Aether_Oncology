# Visual Language

## 1. Visual Trust Layer
Qualquer imagem ou ativo visual no sistema deve transmitir **validação, rigor médico, método científico e solidez operacional**.

- **Evitar:** Estética cyberpunk agressiva, "AI Art Look", hologramas sci-fi genéricos, neon exagerado.
- **Atingir:** O refinamento da Bloomberg, a precisão da NVIDIA Clara e Tempus, e a clareza da Apple Health.

## 2. Dark Mode Enterprise
- O uso de temas escuros não visa estética "gamer", mas sim redução de fadiga visual em ambientes de imagem médica e foco radiológico.
- Contraste medido (textos off-white sobre fundos deep navy/charcoal) para garantir a conformidade com as exigências clínicas de leitura.
- Elementos "Glassmorphism" devem sugerir limpeza de lente ou painel de laboratório (blur no fundo).

## 3. Assets Strategy (High Fidelity)
Todos os assets visuais agora residem em `src/assets/clinical/` divididos por domínio (rag, dashboard, mlops, etc).
Devem ser carregados via `next/image` com `quality={95}` e `placeholder="blur"` para preservar a altíssima fidelidade sem perda de performance.
