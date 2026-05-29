# INFRAESTRUTURA DE AUDITORIA E SEGURANÇA (AETHER ONCOLOGY)

## Componentes do Pipeline de Execução
1. **Contexto Estático (`knowledge-graph.json`):** Gerado via ferramentas de AST parsing para expor nós de dependência arquitetural diretamente às LLMs em chats de escopo limpo, reduzindo o overhead de tokens de entrada.
2. **Sandbox Runtime (`ai-jail`):** Camada conceitual de segurança que intercepta chamadas de ferramentas e códigos gerados em tempo de execução, forçando o isolamento de subprocessos dentro da API FastAPI para mitigar riscos de efeitos colaterais biomédicos ou de sistema.
3. **Métrica de Burn Rate (`ai-usagebar`):** Monitoramento contínuo das janelas de contexto e consumo de tokens dos modelos executores (Groq/Gemini) e validadores (OpenAI Judge Layer) para prevenir estouros de orçamento da aplicação.
