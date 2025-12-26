# Sun Motors - Documentação de Componentes

## Índice

1. [Visão Geral](#visão-geral)
2. [Componentes Globais](#componentes-globais)
3. [Componentes de Layout](#componentes-de-layout)
4. [Componentes de Contexto](#componentes-de-contexto)
5. [Componentes de Página](#componentes-de-página)
6. [Componentes de Feature](#componentes-de-feature)
7. [Padrões e Convenções](#padrões-e-convenções)

---

## Visão Geral

O Sun Motors utiliza React 19 com componentes funcionais e Hooks. A estrutura segue uma arquitetura de componentes bem definida para maximizar reutilização e manutenibilidade.

### Estrutura de Diretórios

```
src/
├── components/           # Componentes reutilizáveis
│   ├── Sidebar.jsx       # Navegação lateral
│   ├── MobileHeader.jsx  # Header mobile
│   ├── CurrencyInput.jsx # Input de moeda
│   ├── budget/           # Componentes de orçamento
│   ├── campaigns/        # Componentes de campanhas
│   ├── common/           # Componentes compartilhados
│   ├── dashboard/        # Componentes do dashboard
│   ├── leads/            # Componentes de leads
│   └── relatorios/       # Componentes de relatórios
├── contexts/             # Contextos React
├── layouts/              # Layouts da aplicação
└── pages/                # Componentes de página
```

---

## Componentes Globais

### `Sidebar.jsx`

Componente de navegação lateral principal da aplicação.

#### Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `isOpen` | boolean | Sim | Estado de visibilidade (mobile) |
| `onClose` | function | Sim | Callback para fechar sidebar |
| `isCollapsed` | boolean | Sim | Estado de colapso |
| `toggleCollapse` | function | Sim | Callback para alternar colapso |

#### Uso

```jsx
import Sidebar from './components/Sidebar';

<Sidebar
    isOpen={isMobileMenuOpen}
    onClose={() => setIsMobileMenuOpen(false)}
    isCollapsed={isSidebarCollapsed}
    toggleCollapse={toggleSidebar}
/>
```

#### Características
- Navegação responsiva (mobile/desktop)
- Estado colapsível com persistência em localStorage
- Suporte a RBAC (oculta itens baseado no cargo)
- Exibe avatar do usuário e informações de perfil
- Logo TopStack com link externo
- Animações suaves de transição

#### Itens de Menu

| Item | Rota | Ícone | Acesso |
|------|------|-------|--------|
| Dashboard | `/` | LayoutDashboard | ADM |
| Orçamento | `/orcamento` | DollarSign | Todos |
| Público-Alvo | `/publico-alvo` | Users | Todos |
| Campanhas | `/campanhas` | Megaphone | ADM |
| Otimizações | `/otimizacoes` | Zap | Todos |
| Relatórios | `/relatorios` | BarChart2 | ADM, Sócios, Gestores |
| Leads | `/leads` | Users2 | Todos |
| Produtos | `/produtos` | Package | Todos |
| Mídias | `/midias` | ImagePlus | Todos |
| Anúncios | `/anuncios` | Sparkles | Todos |
| Configurações | `/configuracoes` | Settings | Todos |

---

### `MobileHeader.jsx`

Header responsivo para dispositivos móveis.

#### Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `onMenuClick` | function | Sim | Callback ao clicar no botão de menu |

#### Uso

```jsx
import MobileHeader from './components/MobileHeader';

<MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
```

#### Características
- Visível apenas em telas pequenas (mobile)
- Botão hamburger para abrir sidebar
- Título/logo da aplicação

---

### `CurrencyInput.jsx`

Input com máscara para valores monetários (R$).

#### Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `value` | string/number | Sim | Valor atual |
| `onChange` | function | Sim | Callback de mudança |
| `placeholder` | string | Não | Texto placeholder |
| `disabled` | boolean | Não | Estado desabilitado |
| `className` | string | Não | Classes CSS adicionais |

#### Uso

```jsx
import CurrencyInput from './components/CurrencyInput';

const [valor, setValor] = useState('');

<CurrencyInput
    value={valor}
    onChange={(e) => setValor(e.target.value)}
    placeholder="R$ 0,00"
/>
```

#### Formatação
- Entrada: `1234` → Exibição: `12,34`
- Entrada: `100000` → Exibição: `1.000,00`
- Suporte a separador de milhar e decimal brasileiro

---

## Componentes de Layout

### `MainLayout.jsx`

Layout principal que envolve todas as páginas protegidas.

#### Localização
`src/layouts/MainLayout.jsx`

#### Responsabilidades
1. Renderizar Sidebar e MobileHeader
2. Aplicar verificação RBAC
3. Gerenciar estado de colapso da sidebar
4. Renderizar conteúdo de páginas via `<Outlet />`

#### Estados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `isMobileMenuOpen` | boolean | Menu mobile aberto |
| `isSidebarCollapsed` | boolean | Sidebar colapsada |

#### Fluxo RBAC

```
1. Verifica se loading === true → Mostra spinner
2. Verifica se user && !profile → Mostra "Carregando perfil..."
3. Obtém cargo do perfil
4. Verifica hasAccess(cargo, currentPath)
   └── Sem acesso → Navigate para getInitialRoute(cargo)
5. Renderiza layout e conteúdo
```

#### Uso

```jsx
// Em App.jsx
<Route path="/" element={
    <ProtectedRoute>
        <MainLayout />
    </ProtectedRoute>
}>
    <Route index element={<Dashboard />} />
    <Route path="orcamento" element={<Budget />} />
    {/* ... */}
</Route>
```

---

## Componentes de Contexto

### `AuthContext.jsx`

Contexto de autenticação global.

#### Localização
`src/contexts/AuthContext.jsx`

#### Provider

```jsx
import { AuthProvider, useAuth } from './contexts/AuthContext';

// No App.jsx
<AuthProvider>
    <App />
</AuthProvider>

// Em componentes
const { user, profile, login, logout } = useAuth();
```

#### Valores Expostos

| Valor | Tipo | Descrição |
|-------|------|-----------|
| `user` | object/null | Usuário Supabase Auth |
| `profile` | object/null | Perfil do banco de dados |
| `loading` | boolean | Estado de carregamento |
| `authError` | string/null | Erro de autenticação |
| `login` | function | Função de login |
| `signup` | function | Função de cadastro |
| `logout` | function | Função de logout |
| `resetPassword` | function | Recuperação de senha |

#### Fluxo de Inicialização

```
1. Verifica sessão existente (getSession)
2. Carrega perfil do localStorage (cache rápido)
3. Busca perfil atualizado do banco
4. Extrai cargo do JWT (prioritário)
5. Inicia heartbeat de sessão (4 min)
6. Configura listener onAuthStateChange
```

---

### `ToastContext.jsx`

Contexto de notificações (toasts) global.

#### Localização
`src/contexts/ToastContext.jsx`

#### Provider

```jsx
import { ToastProvider, useToast } from './contexts/ToastContext';

// No App.jsx
<ToastProvider>
    <App />
</ToastProvider>

// Em componentes
const { showToast, showSuccess, showError } = useToast();
```

#### Funções Expostas

| Função | Parâmetros | Descrição |
|--------|------------|-----------|
| `showToast` | message, type | Toast genérico |
| `showSuccess` | message | Toast de sucesso (verde) |
| `showError` | message | Toast de erro (vermelho) |
| `showWarning` | message | Toast de aviso (amarelo) |
| `showInfo` | message | Toast informativo (azul) |

#### Uso

```jsx
const { showSuccess, showError } = useToast();

try {
    await salvarDados();
    showSuccess('Dados salvos com sucesso!');
} catch (error) {
    showError('Erro ao salvar dados');
}
```

---

## Componentes de Página

### `Dashboard.jsx`

Página inicial para usuários ADM.

#### Localização
`src/pages/Dashboard.jsx`

#### Características
- KPIs principais (investimento, impressões, cliques, conversões)
- Gráficos de performance
- Filtros por período e marca
- Atividades recentes
- Otimizações pendentes

#### Estados Principais

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `loading` | boolean | Carregando dados |
| `filters` | object | Filtros ativos |
| `kpis` | object | Métricas principais |
| `recentActivity` | array | Atividades recentes |
| `marcas` | array | Lista de marcas |

#### Funções Helpers

| Função | Descrição |
|--------|-----------|
| `formatCurrency(value)` | Formata valor como moeda |
| `formatNumber(value)` | Formata número com separador |
| `formatPercentage(value)` | Formata percentual |
| `getTimeAgo(dateString)` | Tempo relativo ("há 5 min") |

---

### `Campanhas.jsx`

Gestão completa de campanhas publicitárias.

#### Localização
`src/pages/Campanhas.jsx`

#### Características
- Listagem de campanhas com filtros
- Criação multi-step (wizard)
- Gestão de grupos de anúncios
- Gestão de criativos
- Árvore hierárquica (campanha > grupo > criativo)
- Menu de contexto para ações

#### Estados Principais

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `campanhas` | array | Lista de campanhas |
| `currentStep` | number | Passo atual do wizard |
| `formData` | object | Dados do formulário |
| `selectedCampaign` | object | Campanha selecionada |
| `gruposDeAnuncios` | array | Grupos da campanha |
| `criativos` | array | Criativos do grupo |

#### Wizard de Criação

| Passo | Título | Campos |
|-------|--------|--------|
| 1 | Informações Básicas | Nome, marca, conta, objetivo, datas |
| 2 | Orçamento | Tipo (CBO/ABO), valor, período |
| 3 | Grupos de Anúncios | Segmentação, posicionamentos |
| 4 | Criativos | Imagens, textos, CTAs |
| 5 | Revisão | Confirmação final |

---

### `Leads.jsx`

Gestão de leads capturados.

#### Localização
`src/pages/Leads.jsx`

#### Características
- Listagem com filtros avançados
- Importação via CSV
- Estágios do funil (Kanban visual)
- Detalhes do lead em sidemenu
- Exportação de dados

#### Estados Principais

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `leads` | array | Lista de leads |
| `filters` | object | Filtros ativos |
| `selectedLead` | object | Lead selecionado |
| `isImporting` | boolean | Importando CSV |

#### Filtros Disponíveis

| Filtro | Tipo | Opções |
|--------|------|--------|
| Período | date range | Data início/fim |
| Fonte | select | Facebook, Google, Orgânico... |
| Estágio | select | Novo, Qualificado, Convertido... |
| Proprietário | select | Lista de vendedores |

---

### `Otimizacoes.jsx`

Histórico e registro de otimizações.

#### Localização
`src/pages/Otimizacoes.jsx`

#### Características
- Cards de otimizações
- Filtros por tipo, status, responsável
- Formulário de nova otimização
- Detalhes em modal/sidemenu
- Edição e exclusão

#### Tipos de Otimização

| Tipo | Descrição |
|------|-----------|
| Orçamento | Ajustes de budget |
| Público | Mudanças de segmentação |
| Criativo | Alterações em anúncios |
| Palavra-chave | Keywords (Google Ads) |
| Posicionamento | Placements |
| Lances | Ajustes de bid |

#### Status

| Status | Cor | Descrição |
|--------|-----|-----------|
| Pendente | Amarelo | Aguardando implementação |
| Implementada | Verde | Concluída |
| Cancelada | Vermelho | Não executada |

---

### `Budget.jsx`

Gestão de orçamentos mensais e detalhados.

#### Localização
`src/pages/Budget.jsx`

#### Características
- Orçamentos mensais por marca
- Detalhamento por modelo/conta
- Metas de investimento (Total/Google/Meta)
- Projeções e realizados
- Formulário de edição

---

### `PublicoAlvo.jsx`

Gestão de público-alvo e audiências.

#### Localização
`src/pages/PublicoAlvo.jsx`

#### Características
- Perfis de marca (demographics)
- Audiências por modelo
- Públicos personalizados
- Direcionamento por plataforma

---

### `Produtos.jsx`

Catálogo de veículos/modelos.

#### Localização
`src/pages/Produtos.jsx`

#### Características
- Lista de modelos por marca
- Detalhes: preço, segmento, status
- Galeria de imagens (integração Mídias)
- Formulário de adição/edição

---

### `Auth.jsx`

Página de autenticação.

#### Localização
`src/pages/Auth.jsx`

#### Modos

| Modo | Descrição |
|------|-----------|
| `login` | Formulário de login |
| `signup` | Formulário de cadastro |
| `reset` | Recuperação de senha |

---

## Componentes de Feature

### Dashboard (`/components/dashboard/`)

| Componente | Descrição |
|------------|-----------|
| `KPICard` | Card de métrica individual |
| `PerformanceChart` | Gráfico de performance |
| `RecentActivity` | Lista de atividades recentes |
| `CampaignSummary` | Resumo de campanhas |
| `OptimizationList` | Lista de otimizações pendentes |

### Budget (`/components/budget/`)

| Componente | Descrição |
|------------|-----------|
| `BudgetTable` | Tabela de orçamentos |
| `BudgetForm` | Formulário de orçamento |
| `AllocationChart` | Gráfico de alocação |

### Leads (`/components/leads/`)

| Componente | Descrição |
|------------|-----------|
| `LeadCard` | Card de lead individual |
| `LeadFilters` | Barra de filtros |
| `LeadDetails` | Sidemenu de detalhes |
| `CSVImporter` | Importador de CSV |

### Campaigns (`/components/campaigns/`)

| Componente | Descrição |
|------------|-----------|
| `CampaignCard` | Card de campanha |
| `CampaignWizard` | Wizard multi-step |

### Relatórios (`/components/relatorios/`)

| Componente | Descrição |
|------------|-----------|
| `ImportadorCSV` | Importador de relatórios |
| `ReportTable` | Tabela de métricas |

---

## Padrões e Convenções

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `Dashboard.jsx` |
| Funções | camelCase | `handleSubmit` |
| Estados | camelCase | `isLoading` |
| Constantes | UPPER_SNAKE | `API_URL` |

### Estrutura de Componente

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from 'lucide-react';
import { apiFunction } from '../services-apis/supabase/service';
import { useToast } from '../contexts/ToastContext';
import './Component.css'; // Se existir CSS específico

const Component = ({ prop1, prop2 }) => {
    // Estados
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    
    // Hooks
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    
    // Effects
    useEffect(() => {
        loadData();
    }, []);
    
    // Handlers
    const handleAction = async () => {
        try {
            setLoading(true);
            const result = await apiFunction();
            setData(result);
            showSuccess('Sucesso!');
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Helpers (locais)
    const formatValue = (val) => {
        return val.toFixed(2);
    };
    
    // Render
    if (loading) {
        return <div className="loading">Carregando...</div>;
    }
    
    return (
        <div className="component-container">
            {/* JSX */}
        </div>
    );
};

export default Component;
```

### Props Pattern

```jsx
// Desestruturação com defaults
const Component = ({ 
    title = 'Título Padrão',
    items = [],
    onSelect,
    isDisabled = false 
}) => {
    // ...
};

// PropTypes (opcional, mas recomendado)
Component.propTypes = {
    title: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.object),
    onSelect: PropTypes.func.isRequired,
    isDisabled: PropTypes.bool
};
```

### Estilos

1. **CSS Modules não utilizados** - Usa CSS global por página
2. **Classes semânticas** - `.campaign-card`, `.lead-details`
3. **Responsividade** - Media queries em cada CSS
4. **Variáveis CSS** - Definidas em `style.css`

---

*Documentação atualizada: Dezembro 2025*
