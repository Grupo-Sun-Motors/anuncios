# Documentação: Fluxo de Importação para GitHub (TopStack Analytics)

## 1. Visão Geral
O sistema TopStack utiliza uma **Supabase Edge Function** (`upload-to-github`) para enviar arquivos CSV diretamente para o repositório de dados da organização. Isso permite manter um histórico versionado e centralizado de todas as cargas de dados brutos.

## 2. Repositório de Destino
Os arquivos são enviados para:
*   **GitHub Token:** Configurado nas secrets do Supabase (`GITHUB_TOKEN`).
*   **Organização:** `Grupo-SUN-MOTORS-RS`
*   **Repositório:** `topstack-analytics`

## 3. Estrutura de Pastas (Critical)
Para manter a organização e permitir que scripts de análise (como Python/Pandas) consumam os dados corretamente, é **obrigatório** seguir a estrutura de pastas abaixo. A aplicação Front-end deve selecionar o caminho correto baseada na plataforma selecionada pelo usuário.

### Estrutura do Repositório:
```text
topstack-analytics/
├── planilhas/
│   ├── google/      <-- Destino para relatórios do Google Ads
│   └── meta/        <-- Destino para relatórios do Facebook/Meta Ads
```

### Regras de Roteamento:
Ao enviar um arquivo, o Front-end deve definir o parâmetro `repoPath` conforme a origem:

| Plataforma | Caminho no Repositório (`repoPath`) |
| :--- | :--- |
| **Google Ads** | `planilhas/google` |
| **Meta Ads** | `planilhas/meta` |

## 4. Integração Técnica (Edge Function)

### Assinatura da Função
A função espera receber um JSON no corpo da requisição (POST) com os seguintes campos:

```typescript
{
  "fileName": string,       // Ex: "relatorio_google_dez25.csv"
  "contentBase64": string,  // Conteúdo do arquivo encodado em Base64
  "repoPath": string        // OBRIGATÓRIO: "planilhas/google" ou "planilhas/meta"
}
```

### Exemplo de Chamada (JavaScript/Supabase Client)
```javascript
const { data, error } = await supabase.functions.invoke('upload-to-github', {
  body: { 
    fileName: 'anuncios_meta_natal.csv', 
    contentBase64: fileBase64String, // String pura base64 (sem data:text/csv;base64,)
    repoPath: 'planilhas/meta'       // <-- Define o destino correto
  },
})
```

## 5. Prevenção de Erros
*   **Nomes de Arquivo:** Evitar caracteres especiais e espaços nos nomes dos arquivos enviados. Sugestão: `YYYY-MM-DD_plataforma_nome-original.csv`.
*   **Conflitos:** A função atual usa o método `PUT`. Se um arquivo com o **mesmo nome** já existir na pasta destino, ele será **sobrescrito**. Se a intenção for manter histórico, garantir que o `fileName` seja único (ex: adicionar timestamp).
