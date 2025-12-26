# Sun Motors - Documentação de Serviços API

## Índice

1. [Visão Geral](#visão-geral)
2. [Cliente Supabase](#cliente-supabase)
3. [Serviços Disponíveis](#serviços-disponíveis)
4. [Tratamento de Erros](#tratamento-de-erros)
5. [Padrões de Uso](#padrões-de-uso)

---

## Visão Geral

A camada de serviços do Sun Motors utiliza o Supabase como BaaS (Backend as a Service). Todos os serviços estão localizados em `src/services-apis/supabase/` e seguem padrões consistentes de implementação.

### Estrutura de Arquivos

```
src/services-apis/supabase/
├── client.js                    # Cliente principal autenticado
├── mediaClient.js               # Cliente para storage público
├── anunciosService.js           # CRUD de anúncios
├── audienciasService.js         # Gestão de audiências
├── campanhasService.js          # CRUD de campanhas
├── configService.js             # Configurações (marcas, plataformas)
├── contasDeAnuncioService.js    # Contas de anúncio
├── criativosService.js          # Gestão de criativos
├── formulariosService.js        # Formulários de leads
├── gruposDeAnunciosService.js   # Grupos de anúncios
├── historicoOtimizacoesService.js # Histórico de otimizações
├── leadsService.js              # Gestão de leads
├── modelosService.js            # Modelos de veículos
├── orcamentoService.js          # Orçamentos
├── perfilUsuarioService.js      # Perfis de usuário
├── publicoPersonalizadoService.js # Públicos personalizados
├── relatorioAnunciosService.js  # Relatórios de anúncios
└── relatoriosService.js         # Relatórios gerais
```

---

## Cliente Supabase

### `client.js` - Cliente Principal

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://[project-ref].supabase.co';
const supabaseKey = '[anon-key]';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,      // Sessão persistida em localStorage
        autoRefreshToken: true,    // Refresh automático de tokens
        detectSessionInUrl: true,  // Detectar OAuth callbacks
    },
});

// Disponível globalmente para código legado
if (typeof window !== 'undefined') {
    window.__supabaseClient = supabase;
    window.getSupabaseClient = () => supabase;
}
```

### `mediaClient.js` - Cliente de Mídia (Público)

Usado para operações de storage que não requerem autenticação.

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://[project-ref].supabase.co';
const supabaseKey = '[anon-key]';

export const mediaClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
```

---

## Serviços Disponíveis

### 1. `campanhasService.js`

Gerencia operações CRUD para campanhas publicitárias.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarTodasCampanhas` | - | `Promise<Array>` | Lista todas as campanhas com relacionamentos |
| `criarCampanha` | `campanha: Object` | `Promise<Object>` | Cria nova campanha |
| `atualizarCampanha` | `id: string, dados: Object` | `Promise<Object>` | Atualiza campanha existente |
| `deletarCampanha` | `id: string` | `Promise<void>` | Remove campanha |

#### Exemplo de Uso

```javascript
import { buscarTodasCampanhas, criarCampanha } from './campanhasService';

// Buscar todas
const campanhas = await buscarTodasCampanhas();

// Criar nova
const novaCampanha = await criarCampanha({
    nome: 'Campanha Kia 2025',
    marca_id: 'uuid-da-marca',
    conta_de_anuncio_id: 'uuid-da-conta',
    status: 'Ativa',
    objetivo: 'Leads',
    orcamento: { tipo: 'diario', valor: 1000 },
    data_inicio: new Date().toISOString()
});
```

---

### 2. `leadsService.js`

Gerencia leads e integrações com formulários.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarTodosLeads` | - | `Promise<Array>` | Lista todos os leads |
| `buscarLeadsPorFiltro` | `filtros: Object` | `Promise<Array>` | Busca com filtros |
| `criarLead` | `lead: Object` | `Promise<Object>` | Cria novo lead |
| `atualizarLead` | `id: string, dados: Object` | `Promise<Object>` | Atualiza lead |
| `deletarLead` | `id: string` | `Promise<void>` | Remove lead |
| `importarLeads` | `leads: Array` | `Promise<Array>` | Importação em lote |

#### Estrutura do Lead

```javascript
{
    nome: 'Nome do Lead',
    email: 'email@exemplo.com',
    telefone: '11999999999',
    telefone_secundario: '11888888888',
    whatsapp: '11999999999',
    fonte: 'Facebook',
    nome_formulario: 'Form LP Kia',
    canal: 'Meta Ads',
    estagio: 'Novo',
    proprietario: 'Vendedor 1',
    rotulos: 'Hot Lead',
    formulario_id: 'uuid',
    conta_de_anuncio_id: 'uuid'
}
```

---

### 3. `anunciosService.js`

Gerencia anúncios individuais.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarTodosAnuncios` | - | `Promise<Array>` | Lista todos os anúncios |
| `buscarAnuncioPorId` | `id: string` | `Promise<Object>` | Busca por ID |
| `criarAnuncio` | `anuncio: Object` | `Promise<Object>` | Cria novo anúncio |
| `atualizarAnuncio` | `id: string, dados: Object` | `Promise<Object>` | Atualiza anúncio |
| `deletarAnuncio` | `id: string` | `Promise<void>` | Remove anúncio |

#### Estrutura do Anúncio

```javascript
{
    nome: 'Anúncio Kia Sportage',
    status: 'Ativo',
    external_id: '123456789',
    copy: {
        texto_principal: 'Conheça o novo Kia Sportage...',
        titulo: 'Kia Sportage 2025',
        descricao: 'Design revolucionário...'
    },
    preview_midia: 'https://url-da-imagem.jpg',
    preview_link: 'https://link-destino.com',
    modelo_ids: ['uuid-modelo-1', 'uuid-modelo-2'],
    marca_id: 'uuid',
    plataforma_id: 'uuid',
    conta_de_anuncio_id: 'uuid',
    campanha_id: 'uuid',
    grupo_de_anuncio_id: 'uuid',
    metricas: { impressoes: 0, cliques: 0 },
    orcamentos: { tipo: 'diario', valor: 100 }
}
```

---

### 4. `orcamentoService.js`

Gerencia orçamentos mensais e detalhados.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarOrcamentosMensais` | `marca_id?: string` | `Promise<Array>` | Lista orçamentos mensais |
| `buscarOrcamentosDetalhados` | `orcamento_mensal_id: string` | `Promise<Array>` | Detalhes de orçamento |
| `criarOrcamentoMensal` | `orcamento: Object` | `Promise<Object>` | Cria orçamento mensal |
| `criarOrcamentoDetalhado` | `detalhado: Object` | `Promise<Object>` | Cria detalhe |
| `atualizarOrcamentoMensal` | `id: string, dados: Object` | `Promise<Object>` | Atualiza mensal |
| `atualizarOrcamentoDetalhado` | `id: string, dados: Object` | `Promise<Object>` | Atualiza detalhe |
| `deletarOrcamentoMensal` | `id: string` | `Promise<void>` | Remove mensal |

#### Estrutura Orçamento Mensal

```javascript
{
    marca_id: 'uuid',
    mes: 12,
    ano: 2025,
    meta_investimento_total: 50000,
    meta_investimento_google: 25000,
    meta_investimento_meta: 25000
}
```

#### Estrutura Orçamento Detalhado

```javascript
{
    orcamento_mensal_id: 'uuid',
    modelo_id: 'uuid',
    conta_de_anuncio_id: 'uuid',
    ativo: true,
    orcamento_diario_planejado: 333.33,
    orcamento_total_planejado: 10000,
    resultados_planejados: 100,
    observacoes: 'Foco em awareness'
}
```

---

### 5. `historicoOtimizacoesService.js`

Registra e consulta histórico de otimizações.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarTodoHistorico` | - | `Promise<Array>` | Lista todo histórico |
| `buscarHistoricoPorFiltro` | `filtros: Object` | `Promise<Array>` | Busca com filtros |
| `criarOtimizacao` | `otimizacao: Object` | `Promise<Object>` | Registra otimização |
| `atualizarOtimizacao` | `id: string, dados: Object` | `Promise<Object>` | Atualiza registro |
| `deletarOtimizacao` | `id: string` | `Promise<void>` | Remove registro |

#### Estrutura da Otimização

```javascript
{
    descricao: 'Ajuste de público-alvo',
    status: 'Implementada',
    tipo_alteracao: 'Público',
    hipotese: 'Aumentar conversão em 20%',
    responsavel: 'Analista 1',
    data_alteracao: '2025-12-11T00:00:00Z',
    plataforma_id: 'uuid',
    marca_id: 'uuid',
    conta_de_anuncio_id: 'uuid',
    campanha_id: 'uuid',
    grupo_de_anuncio_id: 'uuid',
    criativo_id: 'uuid'
}
```

---

### 6. `perfilUsuarioService.js`

Gerencia perfis de usuário e RBAC.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarPerfilUsuario` | `userId: string` | `Promise<Object>` | Busca perfil por ID |
| `buscarTodosPerfis` | - | `Promise<Array>` | Lista todos os perfis |
| `criarPerfilUsuario` | `perfil: Object` | `Promise<Object>` | Cria perfil |
| `atualizarPerfilUsuario` | `id: string, dados: Object` | `Promise<Object>` | Atualiza perfil |
| `atualizarCargoUsuario` | `id: string, cargo: string` | `Promise<Object>` | Atualiza cargo (RBAC) |
| `deletarPerfilUsuario` | `id: string` | `Promise<void>` | Remove perfil |

#### Estrutura do Perfil

```javascript
{
    id: 'auth.uid',           // ID do Supabase Auth
    nome: 'Nome Completo',
    email: 'email@exemplo.com',
    avatar_url: 'https://url-avatar.jpg',
    telefone: '11999999999',
    cargo: 'ADM'              // ADM, Sócios, Gestores, Marketing
}
```

---

### 7. `configService.js`

Gerencia configurações do sistema: marcas, plataformas, contas.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarMarcas` | - | `Promise<Array>` | Lista todas as marcas |
| `buscarPlataformas` | - | `Promise<Array>` | Lista plataformas |
| `buscarContasDeAnuncio` | - | `Promise<Array>` | Lista contas de anúncio |
| `buscarContasPorMarca` | `marca_id: string` | `Promise<Array>` | Contas por marca |
| `criarMarca` | `marca: Object` | `Promise<Object>` | Cria nova marca |
| `atualizarMarca` | `id: string, dados: Object` | `Promise<Object>` | Atualiza marca |

---

### 8. `modelosService.js`

Gerencia modelos de veículos por marca.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarTodosModelos` | - | `Promise<Array>` | Lista todos os modelos |
| `buscarModelosPorMarca` | `marca_id: string` | `Promise<Array>` | Modelos por marca |
| `criarModelo` | `modelo: Object` | `Promise<Object>` | Cria novo modelo |
| `atualizarModelo` | `id: string, dados: Object` | `Promise<Object>` | Atualiza modelo |
| `deletarModelo` | `id: string` | `Promise<void>` | Remove modelo |

#### Estrutura do Modelo

```javascript
{
    marca_id: 'uuid',
    nome: 'Sportage',
    segmento: 'SUV',
    status: 'Ativo',
    preco: 199900,
    slug: 'sportage-2025',
    descricao: {
        resumo: 'SUV premium...',
        caracteristicas: ['Motor 2.0', 'Câmbio automático']
    }
}
```

---

### 9. `gruposDeAnunciosService.js`

Gerencia grupos de anúncios dentro de campanhas.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarGruposPorCampanha` | `campanha_id: string` | `Promise<Array>` | Grupos da campanha |
| `criarGrupoDeAnuncios` | `grupo: Object` | `Promise<Object>` | Cria grupo |
| `atualizarGrupoDeAnuncios` | `id: string, dados: Object` | `Promise<Object>` | Atualiza grupo |
| `deletarGrupoDeAnuncios` | `id: string` | `Promise<void>` | Remove grupo |

---

### 10. `criativosService.js`

Gerencia criativos (peças publicitárias).

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarCriativosPorGrupo` | `grupo_id: string` | `Promise<Array>` | Criativos do grupo |
| `criarCriativo` | `criativo: Object` | `Promise<Object>` | Cria criativo |
| `atualizarCriativo` | `id: string, dados: Object` | `Promise<Object>` | Atualiza criativo |
| `deletarCriativo` | `id: string` | `Promise<void>` | Remove criativo |

#### Estrutura do Criativo

```javascript
{
    grupo_de_anuncio_id: 'uuid',
    campanha_id: 'uuid',
    modelo_id: 'uuid',
    nome: 'Criativo Carrosel Sportage',
    tipo: 'Carrosel',
    status: 'Ativo',
    external_id: '123456',
    urls_criativo: [
        'https://imagem1.jpg',
        'https://imagem2.jpg'
    ],
    textos_principais: ['Texto 1', 'Texto 2'],
    titulos: ['Título 1', 'Título 2'],
    descricoes: ['Descrição 1'],
    chamada_para_acao: 'Saiba Mais',
    extensoes_de_anuncio: {
        sitelinks: [],
        callouts: []
    }
}
```

---

### 11. `publicoPersonalizadoService.js`

Gerencia públicos personalizados para segmentação.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarTodosPublicos` | - | `Promise<Array>` | Lista públicos |
| `buscarPublicosPorPlataforma` | `plataforma_id: string` | `Promise<Array>` | Por plataforma |
| `criarPublico` | `publico: Object` | `Promise<Object>` | Cria público |
| `atualizarPublico` | `id: string, dados: Object` | `Promise<Object>` | Atualiza |
| `deletarPublico` | `id: string` | `Promise<void>` | Remove |

---

### 12. `audienciasService.js`

Gerencia audiências por modelo de veículo.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarAudiencias` | - | `Promise<Array>` | Lista audiências |
| `buscarAudienciasPorModelo` | `modelo_id: string` | `Promise<Array>` | Por modelo |
| `criarAudiencia` | `audiencia: Object` | `Promise<Object>` | Cria audiência |
| `atualizarAudiencia` | `id: string, dados: Object` | `Promise<Object>` | Atualiza |
| `deletarAudiencia` | `id: string` | `Promise<void>` | Remove |

---

### 13. `relatorioAnunciosService.js`

Gerencia métricas e relatórios de anúncios.

#### Funções Exportadas

| Função | Parâmetros | Retorno | Descrição |
|--------|------------|---------|-----------|
| `buscarRelatorios` | `filtros?: Object` | `Promise<Array>` | Lista relatórios |
| `buscarRelatorioPorAnuncio` | `anuncio_id: string` | `Promise<Array>` | Por anúncio |
| `importarRelatorioCSV` | `dados: Array` | `Promise<Array>` | Importação CSV |
| `criarRelatorio` | `relatorio: Object` | `Promise<Object>` | Cria registro |
| `atualizarRelatorio` | `id: string, dados: Object` | `Promise<Object>` | Atualiza |

#### Estrutura do Relatório

```javascript
{
    anuncio_id: 'uuid',
    marca_id: 'uuid',
    plataforma_id: 'uuid',
    conta_de_anuncio_id: 'uuid',
    modelo_id: 'uuid',
    data_inicio: '2025-12-01',
    data_fim: '2025-12-07',
    spend: 1500.00,
    cpc: 2.50,
    ctr: 1.85,
    conversao: 45
}
```

---

## Tratamento de Erros

### Padrão de Erro

Todos os serviços seguem o padrão de tratamento de erros do Supabase:

```javascript
export const exemploFuncao = async (params) => {
    try {
        const { data, error } = await supabase
            .from('tabela')
            .select('*');
        
        if (error) {
            console.error('[Service] Erro:', error);
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('[Service] Exceção:', error);
        throw error;
    }
};
```

### Códigos de Erro Comuns

| Código | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| `401` | Não autenticado | Redirecionar para login |
| `403` | Sem permissão | Verificar RLS policies |
| `404` | Não encontrado | Verificar ID/parâmetros |
| `409` | Conflito (duplicata) | Verificar constraints |
| `500` | Erro interno | Verificar logs do Supabase |

---

## Padrões de Uso

### Uso em Componentes React

```javascript
import React, { useState, useEffect } from 'react';
import { buscarTodasCampanhas } from '../services-apis/supabase/campanhasService';

const Campanhas = () => {
    const [campanhas, setCampanhas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const carregarCampanhas = async () => {
            try {
                setLoading(true);
                const data = await buscarTodasCampanhas();
                setCampanhas(data);
            } catch (err) {
                setError(err.message);
                console.error('Erro ao carregar campanhas:', err);
            } finally {
                setLoading(false);
            }
        };

        carregarCampanhas();
    }, []);

    if (loading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error}</div>;

    return (
        <div>
            {campanhas.map(c => (
                <div key={c.id}>{c.nome}</div>
            ))}
        </div>
    );
};
```

### Operações CRUD

```javascript
// CREATE
const novaCampanha = await criarCampanha({ nome: 'Nova Campanha', ... });

// READ
const campanhas = await buscarTodasCampanhas();
const campanha = await buscarCampanhaPorId('uuid');

// UPDATE
const atualizada = await atualizarCampanha('uuid', { nome: 'Novo Nome' });

// DELETE
await deletarCampanha('uuid');
```

### Filtros e Ordenação

```javascript
// Exemplo com filtros customizados
const { data, error } = await supabase
    .from('campanhas')
    .select('*, marca:marcas(*)')
    .eq('status', 'Ativa')
    .gte('data_inicio', '2025-01-01')
    .order('criado_em', { ascending: false })
    .limit(10);
```

---

## Considerações de Performance

1. **Selects com relacionamentos**: Use `select('*, relacao:tabela(*)')` para reduzir queries
2. **Paginação**: Implemente limit/offset para tabelas grandes
3. **Índices**: Verifique índices no Supabase para queries frequentes
4. **Cache**: Considere cache local para dados que mudam pouco

---

*Documentação atualizada: Dezembro 2025*
