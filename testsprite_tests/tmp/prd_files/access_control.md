# Níveis de Acesso e Permissões de Telas (Menu)

## 1. ADM (Administrador)
- **Acesso Inicial:** Dashboard (`/`)
- **Acesso Completo:** TUDO (incluindo todas as páginas do menu)
- **Acessos EXCLUSIVOS do ADM:**
  - Dashboard
  - Campanhas
  - Segmentação
  - Uploads
  - Grupos de Anúncios (funcionalidade dentro de Mídias/Campanhas)
  - Criativos (funcionalidade dentro de Mídias/Anúncios)

## 2. Sócios
- **Acesso Inicial:** Onboard (`/onboard`)
- **Acesso:** TODAS as páginas, EXCETO as exclusivas do ADM
- **Páginas Permitidas:**
  - Onboard
  - Orçamento
  - Público-Alvo
  - Otimizações
  - Relatórios
  - Leads
  - Produtos
  - Mídias (Visualização Geral - sem Grupos de Anúncios)
  - Anúncios (Visualização Geral - sem Criativos)
  - Configurações
- **Restrições:**
  - Sem acesso a Dashboard
  - Sem acesso a Campanhas
  - Sem acesso a Segmentação
  - Sem acesso a Uploads
  - Sem acesso a Grupos de Anúncios
  - Sem acesso a Criativos

## 3. Gestores
- **Acesso Inicial:** Onboard (`/onboard`)
- **Acesso:** TODAS as páginas, EXCETO as exclusivas do ADM
- **Páginas Permitidas:**
  - Onboard
  - Orçamento
  - Público-Alvo
  - Otimizações
  - Relatórios
  - Leads
  - Produtos
  - Mídias (Visualização Geral - sem Grupos de Anúncios)
  - Anúncios (Visualização Geral - sem Criativos)
  - Configurações
- **Restrições:**
  - Sem acesso a Dashboard
  - Sem acesso a Campanhas
  - Sem acesso a Segmentação
  - Sem acesso a Uploads
  - Sem acesso a Grupos de Anúncios
  - Sem acesso a Criativos

## 4. Marketing
- **Acesso Inicial:** Onboard (`/onboard`)
- **Acesso Limitado a:**
  - Onboard
  - Orçamento
  - Público-Alvo
  - Otimizações
  - Leads
  - Produtos
  - Mídias
  - Anúncios
  - Configurações
- **Restrições:**
  - Sem acesso a Dashboard
  - Sem acesso a Relatórios
  - Sem acesso a Campanhas
  - Sem acesso a Segmentação
  - Sem acesso a Uploads
  - Sem acesso a Grupos de Anúncios
  - Sem acesso a Criativos

---

## Valores de Cargo no Banco de Dados

O campo `cargo` na tabela `perfil_de_usuario` deve conter **exatamente** um dos seguintes valores:

| Cargo | Valor no Banco |
|-------|---------------|
| Administrador | `ADM` |
| Sócios | `Sócios` |
| Gestores | `Gestores` |
| Marketing | `Marketing` |

**Importante:** 
- Os valores devem ser usados **exatamente** como listados acima (case-sensitive).
- Não há normalização de valores - o sistema compara diretamente com esses valores.
- ADM, Sócios e Gestores podem gerenciar cargos de outros usuários em **Configurações → Gerenciar Usuários**.
