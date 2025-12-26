# Sun Motors - Guia de Desenvolvimento

## Índice

1. [Início Rápido](#início-rápido)
2. [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
3. [Fluxo de Trabalho](#fluxo-de-trabalho)
4. [Padrões de Código](#padrões-de-código)
5. [Criando Novos Componentes](#criando-novos-componentes)
6. [Criando Novos Serviços](#criando-novos-serviços)
7. [Adicionando Novas Páginas](#adicionando-novas-páginas)
8. [Trabalhando com Supabase](#trabalhando-com-supabase)
9. [Debugging](#debugging)
10. [Deploy](#deploy)

---

## Início Rápido

### Pré-requisitos

```bash
# Versões recomendadas
node --version  # >= 18.x
npm --version   # >= 9.x
```

### Setup Inicial

```bash
# 1. Clone o repositório
git clone [repository-url]
cd sun-motors-app

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev

# 4. Acesse no navegador
# http://localhost:5173
```

### Estrutura de Arquivos Importantes

```
📁 sun-motors-app/
├── 📄 index.html          # Entry point HTML
├── 📄 vite.config.js      # Configuração Vite
├── 📄 package.json        # Dependências
├── 📁 src/
│   ├── 📄 main.jsx        # Entry point React
│   ├── 📄 App.jsx         # Componente raiz
│   ├── 📁 pages/          # Páginas da aplicação
│   ├── 📁 components/     # Componentes reutilizáveis
│   ├── 📁 contexts/       # Context API
│   ├── 📁 services-apis/  # Camada de serviços
│   ├── 📁 styles/         # Arquivos CSS
│   └── 📁 utils/          # Utilitários
└── 📁 documentation/      # Documentação
```

---

## Ambiente de Desenvolvimento

### IDE Recomendada

**VS Code** com extensões:
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Path Intellisense
- GitLens

### Configurações VS Code

```json
// .vscode/settings.json
{
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "emmet.includeLanguages": {
        "javascript": "javascriptreact"
    }
}
```

### Scripts NPM

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run preview` | Preview do build de produção |

---

## Fluxo de Trabalho

### Git Workflow

```bash
# 1. Crie uma branch para sua feature
git checkout -b feature/nome-da-feature

# 2. Faça seus commits
git add .
git commit -m "feat: descrição da alteração"

# 3. Push para o remoto
git push origin feature/nome-da-feature

# 4. Abra um Pull Request
```

### Convenção de Commits

```
type(scope): description

[body opcional]

[footer opcional]
```

| Type | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação (não afeta lógica) |
| `refactor` | Refatoração |
| `test` | Testes |
| `chore` | Manutenção |

**Exemplos:**
```bash
git commit -m "feat(campanhas): adiciona filtro por data"
git commit -m "fix(auth): corrige loop de loading"
git commit -m "docs: atualiza README"
```

---

## Padrões de Código

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `Dashboard.jsx` |
| Hooks | camelCase com "use" | `useAuth`, `useToast` |
| Funções | camelCase | `handleSubmit`, `fetchData` |
| Constantes | UPPER_SNAKE_CASE | `API_URL`, `MAX_ITEMS` |
| CSS Classes | kebab-case | `.main-content`, `.card-header` |
| Arquivos de serviço | camelCase | `campanhasService.js` |

### Estrutura de Componente

```jsx
// 1. Imports (ordem: React, bibliotecas, locais, estilos)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { buscarDados, salvarDados } from '../services-apis/supabase/service';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import '../styles/component.css';

// 2. Constantes locais (se houver)
const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ['Ativo', 'Pausado', 'Finalizado'];

// 3. Componente
const MeuComponente = ({ prop1, prop2 = 'default' }) => {
    // 3a. Hooks de roteamento/contexto
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const { showSuccess, showError } = useToast();
    
    // 3b. Estados
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({});
    
    // 3c. Dados derivados (useMemo)
    const filteredData = useMemo(() => {
        return data.filter(item => /* lógica de filtro */);
    }, [data, filters]);
    
    // 3d. Effects
    useEffect(() => {
        loadData();
    }, []);
    
    // 3e. Callbacks
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const result = await buscarDados();
            setData(result);
        } catch (error) {
            console.error('Erro ao carregar:', error);
            showError('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, []);
    
    const handleSubmit = useCallback(async (formData) => {
        try {
            await salvarDados(formData);
            showSuccess('Salvo com sucesso!');
            loadData();
        } catch (error) {
            showError(error.message);
        }
    }, [loadData]);
    
    // 3f. Helpers locais
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };
    
    // 3g. Early returns (loading, error, empty)
    if (loading) {
        return <div className="loading">Carregando...</div>;
    }
    
    // 3h. Render principal
    return (
        <div className="meu-componente">
            {/* JSX */}
        </div>
    );
};

// 4. Export
export default MeuComponente;
```

### CSS

```css
/* 
 * Ordem das propriedades (recomendado):
 * 1. Posicionamento
 * 2. Box Model
 * 3. Tipografia
 * 4. Visual
 * 5. Misc
 */

.component {
    /* Posicionamento */
    position: relative;
    display: flex;
    align-items: center;
    
    /* Box Model */
    width: 100%;
    padding: 1rem;
    margin-bottom: 1rem;
    
    /* Tipografia */
    font-size: 1rem;
    font-weight: 500;
    text-align: left;
    
    /* Visual */
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: var(--shadow-sm);
    
    /* Misc */
    cursor: pointer;
    transition: all 0.2s ease;
}

.component:hover {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md);
}
```

---

## Criando Novos Componentes

### 1. Componente Simples

```bash
# Criar arquivo
touch src/components/MeuComponente.jsx
```

```jsx
// src/components/MeuComponente.jsx
import React from 'react';

const MeuComponente = ({ title, children }) => {
    return (
        <div className="meu-componente">
            <h3>{title}</h3>
            {children}
        </div>
    );
};

export default MeuComponente;
```

### 2. Componente com Estado e API

```jsx
// src/components/ListaItens.jsx
import React, { useState, useEffect } from 'react';
import { buscarItens } from '../services-apis/supabase/itensService';

const ListaItens = ({ filtroInicial = {} }) => {
    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const carregar = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await buscarItens(filtroInicial);
                setItens(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        carregar();
    }, []);
    
    if (loading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error}</div>;
    if (!itens.length) return <div>Nenhum item encontrado</div>;
    
    return (
        <ul>
            {itens.map(item => (
                <li key={item.id}>{item.nome}</li>
            ))}
        </ul>
    );
};

export default ListaItens;
```

### 3. Componente com Formulário

```jsx
// src/components/FormularioItem.jsx
import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { criarItem } from '../services-apis/supabase/itensService';

const FormularioItem = ({ onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
    });
    const [saving, setSaving] = useState(false);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validação básica
        if (!formData.nome.trim()) {
            showError('Nome é obrigatório');
            return;
        }
        
        try {
            setSaving(true);
            await criarItem(formData);
            showSuccess('Item criado com sucesso!');
            setFormData({ nome: '', descricao: '' });
            onSuccess?.();
        } catch (error) {
            showError(error.message);
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="nome">Nome</label>
                <input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    disabled={saving}
                    required
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    disabled={saving}
                />
            </div>
            
            <button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
            </button>
        </form>
    );
};

export default FormularioItem;
```

---

## Criando Novos Serviços

### Template de Serviço

```javascript
// src/services-apis/supabase/novoService.js
import { supabase } from './client';

const TABLE_NAME = 'nome_tabela';

/**
 * Busca todos os registros
 * @param {Object} [filtros] - Filtros opcionais
 * @returns {Promise<Array>}
 */
export const buscarTodos = async (filtros = {}) => {
    let query = supabase
        .from(TABLE_NAME)
        .select('*')
        .order('criado_em', { ascending: false });
    
    // Aplicar filtros
    if (filtros.status) {
        query = query.eq('status', filtros.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error(`[${TABLE_NAME}] Erro ao buscar:`, error);
        throw error;
    }
    
    return data;
};

/**
 * Busca um registro por ID
 * @param {string} id - UUID do registro
 * @returns {Promise<Object>}
 */
export const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
};

/**
 * Cria um novo registro
 * @param {Object} dados - Dados do registro
 * @returns {Promise<Object>}
 */
export const criar = async (dados) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(dados)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

/**
 * Atualiza um registro existente
 * @param {string} id - UUID do registro
 * @param {Object} dados - Dados a atualizar
 * @returns {Promise<Object>}
 */
export const atualizar = async (id, dados) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({ ...dados, atualizado_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

/**
 * Remove um registro
 * @param {string} id - UUID do registro
 * @returns {Promise<void>}
 */
export const deletar = async (id) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
    
    if (error) throw error;
};
```

---

## Adicionando Novas Páginas

### Passo 1: Criar o Componente de Página

```jsx
// src/pages/NovaPagina.jsx
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { buscarTodos } from '../services-apis/supabase/novoService';
import { useToast } from '../contexts/ToastContext';
import '../styles/nova-pagina.css';

const NovaPagina = () => {
    const { showError } = useToast();
    const [dados, setDados] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        carregarDados();
    }, []);
    
    const carregarDados = async () => {
        try {
            setLoading(true);
            const result = await buscarTodos();
            setDados(result);
        } catch (error) {
            showError('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="nova-pagina">
            <div className="page-header">
                <h1>Nova Página</h1>
                <button className="btn btn-primary">
                    <Plus size={16} />
                    Adicionar
                </button>
            </div>
            
            <div className="page-content">
                {loading ? (
                    <div className="loading">Carregando...</div>
                ) : (
                    <div className="data-list">
                        {dados.map(item => (
                            <div key={item.id} className="item-card">
                                {item.nome}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NovaPagina;
```

### Passo 2: Criar o CSS

```css
/* src/styles/nova-pagina.css */
.nova-pagina {
    padding: 1.5rem;
}

.nova-pagina .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.nova-pagina .page-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
}

.nova-pagina .data-list {
    display: grid;
    gap: 1rem;
}

.nova-pagina .item-card {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}
```

### Passo 3: Adicionar a Rota

```jsx
// src/App.jsx
import NovaPagina from './pages/NovaPagina';

// Dentro das rotas
<Route path="nova-pagina" element={<NovaPagina />} />
```

### Passo 4: Adicionar ao Menu (se necessário)

```jsx
// src/components/Sidebar.jsx
// Adicionar item no array de navegação

{
    path: '/nova-pagina',
    label: 'Nova Página',
    icon: IconName,
}
```

### Passo 5: Configurar Permissão (se necessário)

```javascript
// src/utils/permissions.js
// Adicionar rota ao ROUTE_PERMISSIONS

'/nova-pagina': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES],
```

---

## Trabalhando com Supabase

### Queries Comuns

```javascript
// SELECT simples
const { data } = await supabase.from('tabela').select('*');

// SELECT com relacionamento
const { data } = await supabase
    .from('campanhas')
    .select(`
        *,
        marca:marcas(*),
        conta:contas_de_anuncio(id, nome)
    `);

// SELECT com filtros
const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'Novo')
    .gte('criado_em', '2025-01-01')
    .order('criado_em', { ascending: false })
    .limit(10);

// INSERT
const { data, error } = await supabase
    .from('tabela')
    .insert({ campo: 'valor' })
    .select()
    .single();

// UPDATE
const { data } = await supabase
    .from('tabela')
    .update({ campo: 'novo_valor' })
    .eq('id', 'uuid')
    .select()
    .single();

// DELETE
await supabase.from('tabela').delete().eq('id', 'uuid');

// UPSERT
const { data } = await supabase
    .from('tabela')
    .upsert({ id: 'uuid', campo: 'valor' })
    .select();
```

### Trabalhando com Storage

```javascript
import { mediaClient } from './mediaClient';

// Upload de arquivo
const uploadArquivo = async (file, path) => {
    const { data, error } = await mediaClient.storage
        .from('bucket-name')
        .upload(path, file);
    
    if (error) throw error;
    return data;
};

// Obter URL pública
const getPublicUrl = (path) => {
    const { data } = mediaClient.storage
        .from('bucket-name')
        .getPublicUrl(path);
    
    return data.publicUrl;
};

// Deletar arquivo
const deletarArquivo = async (path) => {
    const { error } = await mediaClient.storage
        .from('bucket-name')
        .remove([path]);
    
    if (error) throw error;
};
```

---

## Debugging

### Console Logs Úteis

```javascript
// Prefixar logs com contexto
console.log('[Campanhas] Carregando dados...');
console.error('[LeadsService] Erro:', error);
console.warn('[RBAC] Usuário sem permissão');
```

### React DevTools

1. Instale a extensão React DevTools no Chrome/Firefox
2. Use para inspecionar:
   - Árvore de componentes
   - Props e estados
   - Context values
   - Performance (Profiler)

### Network Tab

Verificar requisições ao Supabase:
1. Abra DevTools > Network
2. Filtre por "supabase"
3. Verifique:
   - Status das requisições
   - Payload enviado
   - Resposta recebida

### Debugging de Auth

```javascript
// Verificar sessão atual
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Verificar usuário
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Verificar token JWT
const token = session?.access_token;
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('JWT Payload:', payload);
```

---

## Deploy

### Build para Produção

```bash
# Gerar build
npm run build

# Testar build localmente
npm run preview
```

### Vercel

```json
// vercel.json
{
    "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Netlify

```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Variáveis de Ambiente

Para produção, configure as variáveis no painel da plataforma de deploy:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

---

## Checklist Antes de PR

- [ ] Código segue padrões de nomenclatura
- [ ] Sem erros no console
- [ ] Funcionalidade testada manualmente
- [ ] CSS responsivo (mobile/desktop)
- [ ] Commits com mensagens descritivas
- [ ] Código não quebra funcionalidades existentes

---

*Guia atualizado: Dezembro 2025*
