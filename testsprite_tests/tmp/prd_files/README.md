# Sun Motors - Sistema de Gestão de Campanhas Publicitárias

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB.svg)
![Supabase](https://img.shields.io/badge/Supabase-2.39.0-3ECF8E.svg)
![Vite](https://img.shields.io/badge/Vite-5.0.0-646CFF.svg)

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Tecnologias](#tecnologias)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Instalação](#instalação)
6. [Configuração](#configuração)
7. [Funcionalidades](#funcionalidades)
8. [Sistema de Autenticação](#sistema-de-autenticação)
9. [Controle de Acesso (RBAC)](#controle-de-acesso-rbac)
10. [Modelo de Dados](#modelo-de-dados)
11. [Serviços API](#serviços-api)
12. [Componentes](#componentes)
13. [Páginas](#páginas)
14. [Estilos](#estilos)
15. [Troubleshooting](#troubleshooting)
16. [Contribuição](#contribuição)

---

## 🎯 Visão Geral

O **Sun Motors** é uma plataforma completa e integrada para gestão de campanhas publicitárias digitais para a concessionária Sun Motors, otimizando o ROI e facilitando a tomada de decisões estratégicas. O sistema centraliza a gestão de campanhas publicitárias para múltiplas marcas de veículos (Kia, Suzuki, Zontes, Haojue).

### Objetivos do Sistema:
- Aumentar a eficiência na gestão de campanhas publicitárias
- Otimizar o ROI das campanhas digitais
- Centralizar dados de performance em um dashboard único
- Facilitar a segmentação de público-alvo por marca e modelo
- Automatizar relatórios de performance

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                  (React SPA com Vite)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Router    │  │  Contexts   │  │     Components      │  │
│  │ React-Router│  │ Auth/Toast  │  │  Pages/UI/Layouts   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                             │
│     ┌───────────────────────────────────────────────┐       │
│     │            Supabase Services                   │       │
│     │  (CRUD operations, Auth, Storage)             │       │
│     └───────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│                    (Supabase Cloud)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Auth     │  │      Storage        │  │
│  │  Database   │  │   Service   │  │   (Media Files)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Tecnologias

### Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| React | 19.2.0 | Biblioteca UI |
| React Router DOM | 6.30.2 | Roteamento SPA |
| Lucide React | 0.555.0 | Biblioteca de ícones |
| Chart.js | 4.5.1 | Gráficos e visualizações |
| React Chartjs 2 | 5.3.1 | Wrapper React para Chart.js |
| PapaParse | 5.4.1 | Parsing de CSV |
| XLSX | 0.18.5 | Manipulação de Excel |

### Backend / Infraestrutura
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| Supabase JS | 2.39.0 | Cliente Supabase |
| Vite | 5.0.0 | Build tool e dev server |
| PostgreSQL | - | Banco de dados (via Supabase) |

---

## 📁 Estrutura do Projeto

```
sun-motors-app/
├── 📁 documentation/          # Documentação do projeto
│   ├── README.md              # Este arquivo
│   ├── prd.md                 # Product Requirements Document
│   ├── access_control.md      # Documentação de controle de acesso
│   ├── supabase-schema.md     # Schema do banco de dados
│   └── ...
├── 📁 src/                    # Código fonte principal
│   ├── 📁 components/         # Componentes reutilizáveis
│   │   ├── Sidebar.jsx        # Barra lateral de navegação
│   │   ├── MobileHeader.jsx   # Header para dispositivos móveis
│   │   ├── CurrencyInput.jsx  # Input formatado para moeda
│   │   ├── 📁 budget/         # Componentes de orçamento
│   │   ├── 📁 campaigns/      # Componentes de campanhas
│   │   ├── 📁 common/         # Componentes compartilhados
│   │   ├── 📁 dashboard/      # Componentes do dashboard
│   │   ├── 📁 leads/          # Componentes de leads
│   │   └── 📁 relatorios/     # Componentes de relatórios
│   ├── 📁 contexts/           # Context API React
│   │   ├── AuthContext.jsx    # Contexto de autenticação
│   │   └── ToastContext.jsx   # Contexto de notificações
│   ├── 📁 layouts/            # Layouts da aplicação
│   │   └── MainLayout.jsx     # Layout principal
│   ├── 📁 pages/              # Páginas da aplicação
│   │   ├── Dashboard.jsx      # Página inicial (ADM)
│   │   ├── Auth.jsx           # Login/Cadastro
│   │   ├── Budget.jsx         # Gestão de orçamentos
│   │   ├── Campanhas.jsx      # Gestão de campanhas
│   │   ├── Leads.jsx          # Gestão de leads
│   │   ├── Otimizacoes.jsx    # Histórico de otimizações
│   │   ├── Produtos.jsx       # Gestão de produtos/modelos
│   │   ├── PublicoAlvo.jsx    # Público-alvo e audiências
│   │   ├── Relatorios.jsx     # Relatórios e análises
│   │   └── ...
│   ├── 📁 services-apis/      # Camada de serviços
│   │   └── 📁 supabase/       # Serviços Supabase
│   │       ├── client.js      # Cliente Supabase principal
│   │       ├── mediaClient.js # Cliente para storage (público)
│   │       ├── campanhasService.js
│   │       ├── leadsService.js
│   │       └── ...
│   ├── 📁 styles/             # Arquivos CSS
│   │   ├── style.css          # Estilos globais
│   │   ├── auth.css           # Estilos de autenticação
│   │   ├── dashboard.css      # Estilos do dashboard
│   │   └── ...
│   ├── 📁 utils/              # Utilitários
│   │   └── permissions.js     # Sistema de permissões RBAC
│   ├── App.jsx                # Componente raiz
│   ├── main.jsx               # Entry point
│   └── config.js              # Configurações
├── 📁 referencias/            # Arquivos de referência
├── index.html                 # HTML principal
├── package.json               # Dependências npm
├── vite.config.js             # Configuração Vite
└── ...
```

---

## 🚀 Instalação

### Pré-requisitos
- Node.js >= 18.x
- npm >= 9.x

### Passos

1. **Clone o repositório**
```bash
git clone [repository-url]
cd sun-motors-app
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente** (opcional)
O projeto já inclui as credenciais do Supabase no código. Para produção, considere usar variáveis de ambiente.

4. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

5. **Acesse a aplicação**
```
http://localhost:5173
```

### Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `npm run dev` | Inicia servidor de desenvolvimento |
| `build` | `npm run build` | Build para produção |
| `preview` | `npm run preview` | Preview do build de produção |

---

## ⚙️ Configuração

### Supabase Client (`src/services-apis/supabase/client.js`)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://[project-ref].supabase.co';
const supabaseKey = '[anon-key]';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,      // Persistência de sessão
        autoRefreshToken: true,    // Refresh automático de token
        detectSessionInUrl: true,  // Detectar OAuth callbacks
    },
});
```

### Vite Config (`vite.config.js`)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

---

## 🔧 Funcionalidades

### 1. Dashboard
- KPIs principais em tempo real (investimento, impressões, cliques, conversões)
- Gráficos de performance temporal
- Filtros por período, marca e plataforma
- Comparação com período anterior

### 2. Gestão de Orçamento
- Cadastro de orçamento mensal por marca
- Controle de orçamento diário planejado vs realizado
- Projeção de gasto mensal
- Histórico de orçamentos

### 3. Público-Alvo
- Perfis de público por marca
- Segmentação por faixa etária, gênero, localização
- Gestão de audiências personalizadas
- Públicos personalizados por plataforma

### 4. Campanhas
- Criação de campanhas multi-step
- Gestão de grupos de anúncios
- Controle de criativos
- Status tracking (Ativa, Pausada, Finalizada)

### 5. Leads
- Importação de leads via CSV
- Filtros e busca avançada
- Gestão de estágios do funil
- Integração com formulários

### 6. Otimizações
- Registro de otimizações realizadas
- Categorização por tipo
- Histórico com responsável e status
- Tracking de hipóteses e resultados

### 7. Relatórios
- Relatórios de performance
- Modo comparação entre campanhas
- Análise por plataforma
- Exportação de dados

---

## 🔐 Sistema de Autenticação

### AuthContext (`src/contexts/AuthContext.jsx`)

O sistema de autenticação é gerenciado pelo `AuthContext`, que fornece:

#### Estados
| Estado | Tipo | Descrição |
|--------|------|-----------|
| `user` | object | Usuário autenticado do Supabase |
| `profile` | object | Perfil do usuário (cargo, nome, etc) |
| `loading` | boolean | Estado de carregamento |
| `authError` | string | Mensagem de erro de autenticação |

#### Funções Expostas
| Função | Parâmetros | Descrição |
|--------|------------|-----------|
| `login` | email, password | Autenticação com senha |
| `signup` | email, password | Criação de conta |
| `logout` | - | Encerrar sessão |
| `resetPassword` | email | Recuperação de senha |

#### Fluxo de Autenticação
```
1. Usuário acessa aplicação
       │
       ▼
2. AuthContext verifica sessão (getSession)
       │
       ├─── Sessão válida ──► Carrega perfil do usuário
       │                            │
       │                            ▼
       │                      Inicia heartbeat de sessão
       │                            │
       │                            ▼
       │                      Redireciona para página apropriada
       │
       └─── Sem sessão ──► Redireciona para /auth (login)
```

#### Persistência de Sessão
- Sessão persistida via `localStorage`
- Refresh automático de tokens
- Heartbeat a cada 4 minutos para verificar validade
- Cargo extraído do JWT para RBAC

---

## 🛡️ Controle de Acesso (RBAC)

### Cargos Disponíveis

| Cargo | Valor no BD | Página Inicial |
|-------|-------------|----------------|
| Administrador | `ADM` | `/` (Dashboard) |
| Sócios | `Sócios` | `/onboard` |
| Gestores | `Gestores` | `/onboard` |
| Marketing | `Marketing` | `/onboard` |

### Matriz de Permissões

| Rota | ADM | Sócios | Gestores | Marketing |
|------|-----|--------|----------|-----------|
| `/` (Dashboard) | ✅ | ❌ | ❌ | ❌ |
| `/dashboard` | ✅ | ❌ | ❌ | ❌ |
| `/campanhas` | ✅ | ❌ | ❌ | ❌ |
| `/segmentacao` | ✅ | ❌ | ❌ | ❌ |
| `/uploads` | ✅ | ❌ | ❌ | ❌ |
| `/relatorios` | ✅ | ✅ | ✅ | ❌ |
| `/onboard` | ✅ | ✅ | ✅ | ✅ |
| `/orcamento` | ✅ | ✅ | ✅ | ✅ |
| `/publico-alvo` | ✅ | ✅ | ✅ | ✅ |
| `/otimizacoes` | ✅ | ✅ | ✅ | ✅ |
| `/leads` | ✅ | ✅ | ✅ | ✅ |
| `/produtos` | ✅ | ✅ | ✅ | ✅ |
| `/midias` | ✅ | ✅ | ✅ | ✅ |
| `/anuncios` | ✅ | ✅ | ✅ | ✅ |
| `/configuracoes` | ✅ | ✅ | ✅ | ✅ |

### Funções de Permissão (`src/utils/permissions.js`)

```javascript
// Verificar acesso a uma rota
hasAccess(cargo, path) → boolean

// Obter rota inicial baseada no cargo
getInitialRoute(cargo) → string

// Verificar acesso a elementos específicos
canViewElement(cargo, elementId) → boolean

// Obter itens de menu ocultos
getHiddenMenuItems(cargo) → string[]
```

---

## 🗄️ Modelo de Dados

### Entidades Principais

#### `perfil_de_usuario`
```sql
| Column       | Type      | Description              |
|--------------|-----------|--------------------------|
| id           | uuid (PK) | ID do usuário (auth.uid) |
| nome         | text      | Nome do usuário          |
| email        | text      | Email                    |
| avatar_url   | text      | URL do avatar            |
| telefone     | text      | Telefone                 |
| cargo        | text      | Cargo (RBAC)             |
| criado_em    | timestamp | Data de criação          |
| atualizado_em| timestamp | Última atualização       |
```

#### `marcas`
```sql
| Column         | Type      | Description          |
|----------------|-----------|----------------------|
| id             | uuid (PK) | ID da marca          |
| nome           | text      | Nome (Kia, Suzuki..) |
| nome_perfil    | text      | Nome do perfil       |
| descricao      | text      | Descrição            |
| faixa_etaria   | text      | Faixa etária alvo    |
| genero         | text      | Gênero alvo          |
| localizacao    | text      | Localização alvo     |
| interesses     | text[]    | Interesses           |
| comportamentos | text[]    | Comportamentos       |
```

#### `campanhas`
```sql
| Column              | Type      | Description               |
|---------------------|-----------|---------------------------|
| id                  | uuid (PK) | ID da campanha            |
| nome                | varchar   | Nome da campanha          |
| marca_id            | uuid (FK) | Referência à marca        |
| conta_de_anuncio_id | uuid (FK) | Conta de anúncio          |
| status              | text      | Status (Ativa/Pausada...) |
| objetivo            | varchar   | Objetivo da campanha      |
| orcamento           | jsonb     | Configuração de orçamento |
| data_inicio         | timestamp | Data de início            |
| data_fim            | timestamp | Data de término           |
```

#### `leads`
```sql
| Column              | Type      | Description           |
|---------------------|-----------|-----------------------|
| id                  | uuid (PK) | ID do lead            |
| nome                | text      | Nome do lead          |
| email               | text      | Email                 |
| telefone            | text      | Telefone principal    |
| whatsapp            | text      | WhatsApp              |
| fonte               | text      | Fonte do lead         |
| estagio             | text      | Estágio no funil      |
| formulario_id       | uuid (FK) | Formulário de origem  |
| conta_de_anuncio_id | uuid (FK) | Conta de anúncio      |
```

### Diagrama ER Simplificado

```
┌──────────────┐    ┌──────────────┐    ┌───────────────────┐
│   marcas     │───>│   modelos    │    │ contas_de_anuncio │
└──────────────┘    └──────────────┘    └───────────────────┘
       │                   │                      │
       │                   │                      │
       ▼                   ▼                      ▼
┌──────────────┐    ┌──────────────┐    ┌───────────────────┐
│  campanhas   │◄───│   anuncios   │    │      leads        │
└──────────────┘    └──────────────┘    └───────────────────┘
       │
       ▼
┌────────────────────┐    ┌──────────────────────────┐
│ grupos_de_anuncios │───>│       criativos          │
└────────────────────┘    └──────────────────────────┘
```

---

## 🔌 Serviços API

### Camada de Serviços (`src/services-apis/supabase/`)

| Serviço | Arquivo | Descrição |
|---------|---------|-----------|
| Cliente Principal | `client.js` | Inicialização do Supabase |
| Mídia | `mediaClient.js` | Cliente para Storage público |
| Campanhas | `campanhasService.js` | CRUD de campanhas |
| Leads | `leadsService.js` | Gestão de leads |
| Anúncios | `anunciosService.js` | CRUD de anúncios |
| Criativos | `criativosService.js` | Gestão de criativos |
| Grupos de Anúncios | `gruposDeAnunciosService.js` | Gestão de grupos |
| Histórico | `historicoOtimizacoesService.js` | Otimizações |
| Orçamento | `orcamentoService.js` | Gestão financeira |
| Perfil | `perfilUsuarioService.js` | Perfis de usuário |
| Público | `publicoPersonalizadoService.js` | Públicos customizados |
| Audiências | `audienciasService.js` | Gestão de audiências |
| Relatórios | `relatoriosService.js` | Dados de relatórios |
| Configurações | `configService.js` | Marcas, plataformas |
| Modelos | `modelosService.js` | Modelos de veículos |
| Formulários | `formulariosService.js` | Formulários de leads |
| Contas | `contasDeAnuncioService.js` | Contas publicitárias |
| Relatório Anúncios | `relatorioAnunciosService.js` | Métricas de anúncios |

### Exemplo de Serviço

```javascript
// campanhasService.js
import { supabase } from './client';

export const buscarTodasCampanhas = async () => {
    const { data, error } = await supabase
        .from('campanhas')
        .select(`
            *,
            marca:marcas(*),
            conta:contas_de_anuncio(*)
        `)
        .order('criado_em', { ascending: false });
    
    if (error) throw error;
    return data;
};

export const criarCampanha = async (campanha) => {
    const { data, error } = await supabase
        .from('campanhas')
        .insert(campanha)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};
```

---

## 🧩 Componentes

### Componentes Globais

| Componente | Descrição |
|------------|-----------|
| `Sidebar` | Navegação lateral com suporte a colapso |
| `MobileHeader` | Header responsivo para mobile |
| `CurrencyInput` | Input com máscara de moeda |

### Componentes por Funcionalidade

#### Dashboard (`/components/dashboard/`)
- Widgets de KPIs
- Gráficos de performance
- Cards de atividades recentes

#### Budget (`/components/budget/`)
- Formulários de orçamento
- Tabelas de alocação
- Gráficos de distribuição

#### Leads (`/components/leads/`)
- Filtros de leads
- Cards de lead
- Importador CSV

#### Campaigns (`/components/campaigns/`)
- Wizard de criação
- Cards de campanha

#### Relatórios (`/components/relatorios/`)
- Importador CSV
- Tabelas de métricas

---

## 📄 Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Auth | `/auth` | Login e cadastro |
| Dashboard | `/`, `/dashboard` | Painel principal |
| Onboard | `/onboard` | Página inicial (não-ADM) |
| Budget | `/orcamento` | Gestão de orçamentos |
| BudgetModelForm | `/orcamento/novo` | Formulário de orçamento |
| PublicoAlvo | `/publico-alvo` | Público-alvo |
| Campanhas | `/campanhas` | Gestão de campanhas |
| Otimizacoes | `/otimizacoes` | Histórico de otimizações |
| Relatorios | `/relatorios` | Relatórios e análises |
| Leads | `/leads` | Gestão de leads |
| Produtos | `/produtos` | Catálogo de veículos |
| Midias | `/midias` | Gestão de mídias |
| Anuncios | `/anuncios` | Gestão de anúncios |
| Segmentacao | `/segmentacao` | Segmentação avançada |
| Uploads | `/uploads` | Upload de arquivos |
| Configuracoes | `/configuracoes` | Configurações do sistema |

---

## 🎨 Estilos

### Arquivos CSS (`src/styles/`)

| Arquivo | Escopo |
|---------|--------|
| `style.css` | Estilos globais e variáveis CSS |
| `auth.css` | Página de autenticação |
| `dashboard.css` | Dashboard |
| `campanhas.css` | Campanhas |
| `leads.css` | Leads |
| `produtos.css` | Produtos |
| `publico-alvo.css` | Público-alvo |
| `relatorios.css` | Relatórios |
| `otimizacoes.css` | Otimizações |
| `midias.css` | Mídias |
| `segmentacao.css` | Segmentação |
| `uploads.css` | Uploads |
| `configuracoes.css` | Configurações |
| `components.css` | Componentes compartilhados |
| `inline.css` | Estilos inline auxiliares |

### Design System

```css
:root {
  /* Cores principais */
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --danger-color: #e74c3c;
  --warning-color: #f39c12;
  
  /* Cores de texto */
  --text-primary: #2d3748;
  --text-secondary: #6b7280;
  
  /* Backgrounds */
  --bg-primary: #f9fafb;
  --bg-secondary: #ffffff;
  
  /* Espaçamentos */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

---

## 🔧 Troubleshooting

### Problema: Aplicação fica em "Carregando..."

**Possíveis Causas:**
1. Erro na verificação de sessão do Supabase
2. Perfil de usuário não encontrado no banco
3. Conflito de múltiplos clientes Supabase

**Soluções:**
1. Limpar localStorage: `localStorage.clear()`
2. Verificar console do navegador para erros
3. Verificar se o usuário existe na tabela `perfil_de_usuario`
4. Confirmar conexão com Supabase

### Problema: Redirecionamento infinito

**Causa:** RBAC redirecionando repetidamente

**Solução:** 
1. Verificar valor do campo `cargo` no perfil
2. Confirmar que cargo está nos valores esperados: `ADM`, `Sócios`, `Gestores`, `Marketing`

### Problema: Estilos não carregando

**Solução:**
1. Verificar importações em `main.jsx`
2. Confirmar que arquivos CSS existem em `src/styles/`
3. Reiniciar servidor de desenvolvimento

### Problema: Formulário de login não funciona

**Verificar:**
1. Credenciais corretas
2. Usuário confirmado no Supabase Auth
3. Políticas RLS do Supabase

---

## 🤝 Contribuição

### Padrões de Código

1. **Componentes:** PascalCase (ex: `Dashboard.jsx`)
2. **Funções:** camelCase (ex: `handleSubmit`)
3. **Constantes:** UPPER_SNAKE_CASE (ex: `CARGOS`)
4. **CSS:** kebab-case (ex: `.main-content`)

### Estrutura de Commit

```
type(scope): description

[body opcional]

[footer opcional]
```

| Type | Descrição |
|------|-----------|
| feat | Nova funcionalidade |
| fix | Correção de bug |
| docs | Documentação |
| style | Formatação |
| refactor | Refatoração |
| test | Testes |
| chore | Manutenção |

---

## 📞 Suporte

Para questões técnicas ou dúvidas sobre o projeto:

- **Equipe:** TopStack / HYZY.IO
- **Documentação Adicional:** Ver pasta `/documentation`

---

*Última atualização: Dezembro 2025*
