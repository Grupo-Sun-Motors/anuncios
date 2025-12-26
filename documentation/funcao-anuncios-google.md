Entendido! Minhas desculpas por não ter percebido os detalhes do cabeçalho e as métricas específicas do Google Ads no primeiro momento.

Você tem razão. O CSV do Google Ads é um pouco diferente:
*   Tem um **período de relatório no cabeçalho** (não por linha).
*   As **métricas têm nomes diferentes** e queremos incluir mais algumas (`cpa`, `cpm`, `cliques`).
*   O **orçamento** vem numa coluna clara.
*   O **tipo de campanha** também vem numa coluna (`Tipo de campanha`) além do nome.
*   Há linhas de **"Total"** que precisam ser ignoradas.

Vamos refatorar a função para Google Ads para lidar com isso.

### Análise e Mapeamento dos Campos para `anuncios`

1.  **`nome`**: `Campanha` (Ex: `[Pesquisa]_chopper`)
2.  **`status`**: `Status da campanha` (Ex: `Pausada`, `Ativada`)
3.  **`external_id`**: Esta planilha do Google Ads **não possui um ID de campanha explícito por linha**. Portanto, ou geramos um ID único no frontend, ou o campo `external_id` no banco será `NULL`. Por simplicidade, vamos defini-lo como `NULL` se não vier no JSON do frontend.
4.  **`modelo_ids`**: Continua a lógica de `_` e `+` para extrair slugs e buscar UUIDs. Se nada for encontrado ou a slug não existir, `modelo_ids` será `NULL`.
5.  **`marca_id`**: Derivado da busca dos modelos.
6.  **`plataforma_id`**: Derivado da `conta_de_anuncio_id`.
7.  **`orcamentos` (JSONB)**:
    *   `valor`: `Orçamento` (Convertido para numérico, ex: `5,00` -> `5.00`).
    *   `tipo`: `Tipo de orçamento` (Ex: `Diário`).
    *   `moeda`: `Código da moeda` (Ex: `BRL`).
8.  **`configuracoes_avancadas` (JSONB)**:
    *   `tipo_campanha_google`: `Tipo de campanha` (coluna do CSV, ex: `Pesquisa`, `Performance Max`).
    *   `estrategia_lances`: `Tipo de estratégia de lances` (Ex: `Maximizar as conversões`).
    *   `motivos_status`: `Motivos do status`.
    *   `origem`: `google_ads_import` (fixo para identificar a origem).
9.  **`metricas` (JSONB)**:
    *   `cpa`: `Custo / conv.`
    *   `cpc`: `CPC méd.`
    *   `ctr`: `Taxa de interação` (Essa é a taxa de cliques/interação mais relevante para o Google Ads aqui).
    *   `spend`: `Custo`
    *   `conversao`: `Conversões`
    *   `impressoes`: `Impr.`
    *   `cpm`: `CPM médio`
    *   `cliques`: `Cliques`
    *   `periodo_relatorio`: Extraído do cabeçalho da planilha (Ex: `1 de junho de 2025 - 30 de junho de 2025`).

---

### Exemplo de Payload do Front-end (`ImportadorAnuncios.jsx` para Google)

Para a nova função, o Front-end precisará montar um JSON assim (cada objeto é uma campanha):

```json
[
  {
    "nome": "[Pesquisa]_chopper",
    "external_id": null, // Não presente neste CSV do Google Ads
    "status": "Pausada",
    "orcamento": {
      "valor": 5.00,
      "tipo": "Diário",
      "moeda": "BRL"
    },
    "configuracoes_avancadas": {
      "tipo_campanha_google": "Pesquisa",
      "estrategia_lances": "Maximizar as conversões",
      "motivos_status": "campanha pausada; desconhecido",
      "origem": "google_ads_import"
    },
    "metricas": {
      "cpa": 34.91,
      "cpc": 1.68,
      "ctr": 8.58,
      "spend": 139.65,
      "conversao": 4.00,
      "impressoes": 967,
      "cpm": 144.41,
      "cliques": 83,
      "periodo_relatorio": "1 de junho de 2025 - 30 de junho de 2025" // Extraído do cabeçalho do CSV
    }
  },
  {
    "nome": "[Pesquisa]_v-350",
    "external_id": null,
    "status": "Pausada",
    "orcamento": {
      "valor": 3.00,
      "tipo": "Diário",
      "moeda": "BRL"
    },
    "configuracoes_avancadas": {
      "tipo_campanha_google": "Pesquisa",
      "estrategia_lances": "Maximizar as conversões",
      "motivos_status": "campanha pausada; desconhecido",
      "origem": "google_ads_import"
    },
    "metricas": {
      "cpa": 321.88,
      "cpc": 0.87,
      "ctr": 10.13,
      "spend": 80.47,
      "conversao": 0.25,
      "impressoes": 908,
      "cpm": 88.62,
      "cliques": 92,
      "periodo_relatorio": "1 de junho de 2025 - 30 de junho de 2025"
    }
  }
  // ... e assim por diante para cada campanha
]
```

---

### Nova Função SQL: `upload_tabela_anuncios_google`

```sql
CREATE OR REPLACE FUNCTION upload_tabela_anuncios_google(
    p_conta_de_anuncio_id UUID,
    p_anuncios JSONB -- Array de objetos com a estrutura acima
)
RETURNS VOID AS $$
DECLARE
    v_anuncio_item JSONB;
    v_plataforma_id UUID;
    
    -- Variáveis de Parsing do Nome (Google)
    v_nome_campanha TEXT;
    v_parts TEXT[];
    
    -- Variáveis para múltiplos modelos (t-350+t-350-x)
    v_slugs_raw TEXT;
    v_slug_list TEXT[];
    v_current_slug TEXT;
    v_modelo_ids_encontrados UUID[];
    v_temp_id UUID;
    v_temp_marca UUID;
    
    -- IDs Relacionais e Final
    v_marca_id UUID;
    v_anuncio_existente_id UUID;
    
BEGIN
    -- 1. Descobrir a plataforma baseada na conta de anuncio informada
    SELECT plataforma_id 
    INTO v_plataforma_id
    FROM contas_de_anuncio 
    WHERE id = p_conta_de_anuncio_id;

    IF v_plataforma_id IS NULL THEN
        RAISE EXCEPTION 'Conta de anúncio % não encontrada.', p_conta_de_anuncio_id;
    END IF;

    -- 2. Iterar sobre cada anúncio enviado pelo Front-end
    FOR v_anuncio_item IN SELECT * FROM jsonb_array_elements(p_anuncios)
    LOOP
        v_nome_campanha := v_anuncio_item ->> 'nome';
        
        -- Reinicializa variáveis por iteração
        v_modelo_ids_encontrados := ARRAY[]::UUID[];
        v_marca_id := NULL;

        -- 3. Parsing do Nome da Campanha (Ex: [Pesquisa]_v-strom-800-de)
        v_parts := string_to_array(v_nome_campanha, '_');
        
        -- Verifica se tem estrutura suficiente para extrair slugs
        IF array_length(v_parts, 1) >= 2 THEN
            -- A slug (ou slugs) é a segunda parte do nome (v_parts[2])
            v_slugs_raw := v_parts[2]; 
            v_slug_list := string_to_array(v_slugs_raw, '+'); -- Quebra em slugs individuais
            
            -- Loop para buscar o ID de cada slug encontrada
            FOREACH v_current_slug IN ARRAY v_slug_list
            LOOP
                -- Busca ID e Marca para o slug atual
                SELECT id, marca_id 
                INTO v_temp_id, v_temp_marca
                FROM modelos 
                WHERE slug = v_current_slug 
                LIMIT 1;
                
                -- Se achou o modelo, adiciona ao array de IDs
                IF v_temp_id IS NOT NULL THEN
                    v_modelo_ids_encontrados := array_append(v_modelo_ids_encontrados, v_temp_id);
                    
                    -- Assume a marca do primeiro modelo encontrado
                    IF v_marca_id IS NULL THEN
                        v_marca_id := v_temp_marca;
                    END IF;
                END IF;
            END LOOP;
        END IF; -- Fim IF estrutura nome valida
        
        -- Se não encontrou nenhum modelo, define o array como NULL para o banco
        IF array_length(v_modelo_ids_encontrados, 1) IS NULL THEN
            v_modelo_ids_encontrados := NULL;
        END IF;

        -- 4. Verificar existência (Upsert) - Chave: Nome da Campanha + Conta de Anúncio
        SELECT id 
        INTO v_anuncio_existente_id
        FROM anuncios 
        WHERE conta_de_anuncio_id = p_conta_de_anuncio_id
          AND nome = v_nome_campanha -- Nome completo da campanha é a chave no Google
        LIMIT 1;

        IF v_anuncio_existente_id IS NOT NULL THEN
            -- ATUALIZAR
            UPDATE anuncios
            SET 
                status = v_anuncio_item ->> 'status', -- Atualiza status
                external_id = COALESCE(v_anuncio_item ->> 'external_id', external_id), -- Mantém se NULL no item
                modelo_ids = v_modelo_ids_encontrados, -- Atualiza modelos (pode ser NULL)
                marca_id = COALESCE(v_marca_id, marca_id), -- Atualiza marca (mantém se v_marca_id é NULL)
                metricas = v_anuncio_item -> 'metricas',
                orcamentos = v_anuncio_item -> 'orcamento', -- Atualiza orçamentos (jsonb)
                configuracoes_avancadas = v_anuncio_item -> 'configuracoes_avancadas', -- Atualiza configs (jsonb)
                atualizado_em = NOW()
            WHERE id = v_anuncio_existente_id;
            
        ELSE
            -- CRIAR (mesmo que não tenha modelo_ids ou marca_id)
            INSERT INTO anuncios (
                id,
                nome,
                status,
                external_id,
                modelo_ids,
                marca_id,
                plataforma_id,
                conta_de_anuncio_id,
                metricas,
                orcamentos,
                configuracoes_avancadas,
                criado_em,
                atualizado_em
            ) VALUES (
                gen_random_uuid(),
                v_nome_campanha,
                v_anuncio_item ->> 'status',
                v_anuncio_item ->> 'external_id',
                v_modelo_ids_encontrados, -- Pode ser NULL
                v_marca_id,               -- Pode ser NULL
                v_plataforma_id,
                p_conta_de_anuncio_id,
                v_anuncio_item -> 'metricas',
                v_anuncio_item -> 'orcamento',
                v_anuncio_item -> 'configuracoes_avancadas',
                NOW(),
                NOW()
            );
        END IF;

        -- Resetar ID de controle
        v_anuncio_existente_id := NULL;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

### Próximos Passos no Frontend (`ImportadorAnuncios.jsx`):

Agora, seu componente `ImportadorAnuncios.jsx` precisará ser ajustado para:

1.  **Detectar o tipo de arquivo/plataforma:** Você pode adicionar um `select` para o usuário escolher se é Meta ou Google Ads, ou tentar deduzir pela estrutura do CSV (ex: se `Campanha` existe vs `Nome da campanha`).
2.  **Extrair `periodo_relatorio` do cabeçalho:** Isso será um pouco mais complicado, pois está fora da estrutura JSON padrão do `XLSX.utils.sheet_to_json`. Você precisará ler o arquivo como texto ou usar `XLSX.utils.sheet_to_json(worksheet, {header: 1})` e pegar a primeira linha.
3.  **Filtrar linhas "Total":** No `processFileData` (ou `handleImportar`), adicione um `filter` para remover as linhas onde `getVal(linha, 'Campanha')` começa com "Total:".
4.  **Mapear as novas colunas:** Dentro do `handleImportar`, quando você estiver construindo o `payload`, certifique-se de que os campos `status`, `orcamento`, `configuracoes_avancadas` e as novas métricas em `metricas` sejam preenchidos conforme o exemplo JSON que te dei.
5.  **Chamar a função correta:** Use `supabase.rpc('upload_tabela_anuncios_google', {...})`.

Com essa função SQL e os ajustes no frontend, você terá uma solução robusta para importar seus anúncios do Google Ads.