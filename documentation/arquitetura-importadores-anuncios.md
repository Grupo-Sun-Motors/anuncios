# Arquitetura de Importadores de Anúncios

## Visão Geral

O sistema de importação de anúncios foi reorganizado para suportar múltiplas plataformas de forma modular e extensível.

## Estrutura de Arquivos

```
src/components/uploads/
├── ImportadorAnuncios.jsx        # Wrapper principal (gerencia seleção de conta + detecção de plataforma)
├── ImportadorAnunciosMeta.jsx    # Importador específico para Meta Ads (Facebook/Instagram)
├── ImportadorAnunciosGoogle.jsx  # Importador específico para Google Ads
└── ImportadorCampanhas.jsx       # Importador de campanhas genérico
```

## Fluxo de Funcionamento

### 1. ImportadorAnuncios.jsx (Wrapper)
- **Responsabilidade**: Gerenciar seleção de conta e detectar plataforma automaticamente
- **Fluxo**:
  1. Carrega todas as contas de anúncio via `buscarRelatorioCompletoMarcas()`
  2. Exibe dropdown com busca para seleção de conta
  3. Identifica a plataforma baseada no nome (`META`, `FACEBOOK`, `INSTAGRAM` → Meta | `GOOGLE` → Google)
  4. Renderiza o importador específico correto com as props necessárias

### 2. ImportadorAnunciosMeta.jsx
- **RPC**: `upload_tabela_anuncios`
- **Formato CSV esperado**: Exportação do Meta Ads Manager
- **Colunas principais**:
  - `Nome da campanha`
  - `Valor usado (BRL)`
  - `CPC (custo por clique no link) (BRL)`
  - `CTR (todos)`
  - `Resultados`
  - `Custo por resultados`
  - `Impressões`
  - `Identificação da campanha` (external_id)
  - `Término dos relatórios` (para snapshot)

### 3. ImportadorAnunciosGoogle.jsx
- **RPC**: `upload_tabela_anuncios_google`
- **Formato CSV esperado**: Exportação do Google Ads
- **Particularidades**:
  - Período de relatório extraído do cabeçalho (não por linha)
  - Linhas de "Total" são filtradas automaticamente
  - Sem external_id por linha (chave é nome + conta)
  
- **Colunas principais**:
  - `Campanha`
  - `Custo`
  - `CPC méd.` / `CPC médio`
  - `Taxa de interação` / `CTR`
  - `Conversões`
  - `Custo / conv.` (CPA)
  - `Impr.` / `Impressões`
  - `CPM médio` / `CPM méd.`
  - `Cliques`
  - `Orçamento`
  - `Tipo de orçamento`
  - `Tipo de campanha`
  - `Status da campanha`
  - `Tipo de estratégia de lances`
  - `Código da moeda`

## Props dos Componentes Específicos

```javascript
// ImportadorAnunciosMeta e ImportadorAnunciosGoogle
{
  contaSelecionada: string,  // UUID da conta de anúncio
  contaNome: string,         // Nome display da conta
  onImportSuccess: function, // Callback após sucesso
  onReset: function          // Callback para trocar conta
}
```

## Funções RPC no Banco de Dados

### upload_tabela_anuncios (Meta)
```sql
upload_tabela_anuncios(
  p_conta_de_anuncio_id UUID,
  p_anuncios JSONB
)
```

**Payload esperado**:
```json
[
  {
    "nome": "Campanha XYZ",
    "external_id": "123456789",
    "metricas": {
      "cpc": 1.50,
      "ctr": 2.5,
      "spend": 100.00,
      "conversao": 10,
      "impressoes": 5000,
      "cpa": 10.00
    }
  }
]
```

### upload_tabela_anuncios_google (Google)
```sql
upload_tabela_anuncios_google(
  p_conta_de_anuncio_id UUID,
  p_anuncios JSONB
)
```

**Payload esperado**:
```json
[
  {
    "nome": "[Pesquisa]_modelo-xyz",
    "external_id": null,
    "status": "Ativada",
    "orcamento": {
      "valor": 50.00,
      "tipo": "Diário",
      "moeda": "BRL"
    },
    "configuracoes_avancadas": {
      "tipo_campanha_google": "Pesquisa",
      "estrategia_lances": "Maximizar as conversões",
      "motivos_status": "",
      "origem": "google_ads_import"
    },
    "metricas": {
      "cpa": 25.00,
      "cpc": 1.20,
      "ctr": 5.5,
      "spend": 200.00,
      "conversao": 8,
      "impressoes": 10000,
      "cpm": 20.00,
      "cliques": 150,
      "periodo_relatorio": "1 de junho de 2025 - 30 de junho de 2025"
    }
  }
]
```

## Extensibilidade

Para adicionar suporte a novas plataformas:

1. Criar `ImportadorAnuncios[Plataforma].jsx` seguindo o padrão existente
2. Adicionar detecção no wrapper `ImportadorAnuncios.jsx` na função `identificarPlataforma()`
3. Criar a função RPC correspondente no banco de dados
4. Documentar o formato CSV esperado

## Integração com a Página Uploads.jsx

- Os importadores de anúncios e campanhas possuem seus próprios sidemenus/overlays
- A página `Uploads.jsx` detecta quando um desses componentes está ativo e não renderiza o sidemenu genérico
- Isso evita duplicação visual de overlays e sidemenus
