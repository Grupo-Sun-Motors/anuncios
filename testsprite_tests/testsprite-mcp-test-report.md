# TestSprite MCP Report

## Summary
- Total: 20 | Passed: 5 | Failed: 15
- Key blockers: login returning 400 for valid creds in browser (TC001) though manual Node login works; missing ADM credentials blocked RBAC tests; several UIs lack working buttons/inputs (campaign wizard, uploads, leads CSV, budgets, optimizations, media upload).

## Requirements & Tests

### R1 Autenticação e sessão
- TC001 User Authentication Success — **Failed**: Supabase `/auth/v1/token` 400 in browser; session não criada → não valida persistência.
- TC002 User Authentication Failure (cred errada) — **Passed**.
- TC003 Access protected routes sem login — **Passed** (redireciona).

### R2 RBAC (perfis/cargos)
- TC004 RBAC em rotas — **Failed**: sem credencial ADM válida para validar acesso.
- TC005 RBAC em elementos UI — **Failed**: login ADM/Gestor falhou (400), não validou elementos.

### R3 Wizard de Campanhas
- TC006 Fluxo normal — **Failed**: timeout 15min (login/bloqueio).
- TC007 Dados incompletos — **Failed**: login falhou (400), não acessou wizard.
- TC008 Persistência de dados — **Failed**: botão "Novo Anúncio" não abriu formulário.

### R4 Leads importação CSV
- TC009 Importação dados válidos — **Failed**: upload CSV não funciona/não dispara import.
- TC010 Importação dados inválidos — **Failed** (parcial): upload não realizado; precisa testar manualmente.

### R5 Dashboard e KPIs
- TC011 KPIs exibem corretamente — **Passed**.

### R6 Relatórios
- TC014 Filtros e agregação — **Passed**.
- TC015 Import Meta Ads CSV — **Failed**: opção de import não aparece após "Novo Anúncio".

### R7 Orçamento
- TC012 CRUD orçamento — **Failed**: botão "Adicionar Verba" não interage.

### R8 Otimizações
- TC013 Histórico/updates — **Failed**: "Nova Otimização" não abre formulário.

### R9 Mídias
- TC016 Upload/gestão mídia — **Failed**: form não tem input acessível; múltiplos GoTrueClient warnings.

### R10 UX: loading/erros/responsividade/CRUD
- TC018 Loading states & errors — **Failed (parcial)**: loaders ok em dashboard/leads; ausência de mensagens ao submeter dados inválidos no fluxo de campanha.
- TC019 Responsividade + persistência sidebar — **Failed**: login bloqueou.
- TC020 Atomic CRUD + notificações — **Failed**: não concluído (login bloqueou / sem passos adicionais).

### R11 API erro handling
- TC017 Erros Supabase uniformes — **Passed**.

## Key Gaps / Risks
- Login via UI retorna 400 para credencial válida (possível bloqueio na UI ou payload); impede maioria dos fluxos e RBAC; Node script funcionou, sugerindo problema na chamada do front (ex.: body, headers ou rate limit / chave).
- Falta credencial ADM confirmada para RBAC completo.
- Botões não funcionam: "Novo Anúncio" (wizard), "Adicionar Verba", "Nova Otimização", inputs de upload (mídia, leads, relatórios Meta).
- Uploads/CSV indisponíveis → bloqueia importações e validação de dados.
- GoTrueClient múltiplo em mídia sugere inicializações duplicadas (ver uso de clients nas páginas de mídia / anúncios).
- Mensagens de erro ausentes no fluxo de campanha ao submeter dados inválidos.

## Next Steps sugeridos
1) Revisar chamada de login na UI (payload para `supabase.auth.signInWithPassword`, headers, possíveis blockers de CSP/CORS) e retestar TC001/TC004/TC005/TC019/TC020.
2) Fornecer credencial ADM/Gestor válida para RBAC tests.
3) Corrigir ações bloqueadas: wizard (botão "Novo Anúncio"), budget ("Adicionar Verba"), otimização ("Nova Otimização"), mídia upload e leads CSV.
4) Expor inputs de upload de arquivos (mídia, leads, relatórios Meta) e garantir endpoints.
5) Ajustar mensagens de erro no fluxo de campanha para entradas inválidas.
6) Reexecutar suite Testsprite após correções.
