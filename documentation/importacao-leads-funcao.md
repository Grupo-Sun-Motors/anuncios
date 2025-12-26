# Documentação: Importação de Leads em Massa (RPC)

Esta documentação descreve como utilizar a função RPC do Supabase `importar_leads_em_massa` para integração com o Front-End.

## Visão Geral

A função permite a importação de múltiplos leads de uma vez, associando-os automaticamente à **Conta de Anúncio** correta com base na **Marca** e **Plataforma** fornecidas.

Ela também gerencia a associação (e criação, se permitido) de formulários.

## Assinatura da Função

```sql
importar_leads_em_massa(
  p_marca_id UUID,
  p_plataforma_id UUID,
  p_dados_leads JSONB
)
```

## Parâmetros

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `p_marca_id` | `UUID` | ID da Marca selecionada. |
| `p_plataforma_id` | `UUID` | ID da Plataforma selecionada (Meta, Google, etc.). |
| `p_dados_leads` | `JSONB` | Array de objetos contendo os dados dos leads. |

## Estrutura do JSON (`p_dados_leads`)

Cada objeto no array deve seguir esta estrutura:

```json
[
  {
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "51999999999",
    "whatsapp": "51999999999",
    "nome_formulario": "Cadastro Site - Promoção",
    "fonte": "Facebook",
    "canal": "Social",
    "estagio": "Em análise",
    "proprietario": "Maria (Vendas)",
    "rotulos": "Interessado, Urgente",
    "telefone_secundario": ""
  },
  ...
]
```

### Campos Importantes

*   **`nome_formulario` (Obrigatório):** A função usa este campo para:
    1.  Buscar um formulário existente com este nome vinculado à conta da marca/plataforma.
    2.  Se não encontrar e o usuário tiver permissão, **cria um novo formulário**.
    3.  *Nota:* Se o usuário não tiver permissão de criação (RLS), a importação falhará com erro `42501` se o formulário não existir.
*   **`telefone`:** Recomenda-se enviar apenas números (a função pode fazer limpeza básica, mas o ideal é sanitizar no front).

## Como chamar no Front-End (JavaScript/Supabase SDK)

```javascript
import { supabase } from './client.js';

export async function importarLeads(marcaId, plataformaId, leadsArray) {
    const { data, error } = await supabase.rpc('importar_leads_em_massa', {
        p_marca_id: marcaId,
        p_plataforma_id: plataformaId,
        p_dados_leads: leadsArray
    });

    if (error) {
        console.error('Erro na importação:', error);
        // Tratamento de erro comum: Conta não vinculada
        if (error.message.includes('Conta não localizada')) {
            alert('Não existe conta de anúncio vinculada para esta Marca e Plataforma.');
        }
        throw error;
    }

    return data; // Retorna log de processamento
}
```

## Fluxo de Execução no Banco de Dados

1.  A função busca na view `relatorio_completo_marcas` uma conta de anúncio que corresponda ao `p_marca_id` e `p_plataforma_id`.
2.  Se não encontrar, retorna erro.
3.  Para cada lead no array:
    *   Verifica/Cria o Formulário na conta encontrada.
    *   Insere o Lead na tabela `leads`.
4.  Retorna um resumo da operação.
