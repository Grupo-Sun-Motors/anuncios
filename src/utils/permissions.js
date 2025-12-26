
/**
 * Níveis de Acesso e Permissões de Telas (Menu)
 * 
 * Valores do campo "cargo" na tabela perfil_de_usuario:
 * - "ADM" - Administrador
 * - "Sócios"
 * - "Gestores"
 * - "Marketing"
 */

// Valores exatos do campo cargo na tabela perfil_de_usuario
export const CARGOS = {
    ADM: 'ADM',
    SOCIOS: 'Sócios',
    GESTORES: 'Gestores',
    MARKETING: 'Marketing'
};

/**
 * Permissões por rota
 * 
 * 1. ADM (Administrador):
 *    - Acesso Inicial: Dashboard (/)
 *    - Acesso Completo a TUDO
 *    - Acessos EXCLUSIVOS: Dashboard, Campanhas, Segmentação, Uploads
 * 
 * 2. Sócios:
 *    - Acesso Inicial: Onboard (/onboard)
 *    - Acesso a TODAS as páginas, EXCETO as exclusivas do ADM
 * 
 * 3. Gestores:
 *    - Acesso Inicial: Onboard (/onboard)
 *    - Acesso a TODAS as páginas, EXCETO as exclusivas do ADM
 * 
 * 4. Marketing:
 *    - Acesso Inicial: Onboard (/onboard)
 *    - Acesso limitado (sem Dashboard, Relatórios, e exclusivas do ADM)
 */
export const ROUTE_PERMISSIONS = {
    // EXCLUSIVO ADM
    '/': [CARGOS.ADM],
    '/dashboard': [CARGOS.ADM],
    '/campanhas': [CARGOS.ADM],
    '/segmentacao': [CARGOS.ADM],
    '/uploads': [CARGOS.ADM],

    // ADM, Sócios e Gestores (Marketing NÃO tem acesso)
    '/relatorios': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES],

    // Todos têm acesso
    '/onboard': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/orcamento': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/orcamento/novo': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/publico-alvo': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/otimizacoes': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/leads': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/produtos': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/midias': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/anuncios': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/landing-pages': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
    '/configuracoes': [CARGOS.ADM, CARGOS.SOCIOS, CARGOS.GESTORES, CARGOS.MARKETING],
};

/**
 * Verifica se o usuário tem acesso à rota
 * @param {string} cargo - Valor do campo cargo do perfil_de_usuario
 * @param {string} path - Caminho da rota (ex: '/dashboard')
 */
export const hasAccess = (cargo, path) => {
    if (!cargo) {
        // Silently return false for undefined cargo (e.g. loading state or guest)
        return false;
    }

    // Remove trailing slash do path
    const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;

    // Verifica permissão exata
    if (ROUTE_PERMISSIONS[normalizedPath]) {
        const allowed = ROUTE_PERMISSIONS[normalizedPath].includes(cargo);
        console.log(`[RBAC] cargo='${cargo}' path='${normalizedPath}' → ${allowed ? 'PERMITIDO' : 'NEGADO'}`);
        return allowed;
    }

    // Verifica por prefixo (rotas filhas)
    const matchedPath = Object.keys(ROUTE_PERMISSIONS).find(p =>
        p !== '/' && normalizedPath.startsWith(p)
    );

    if (matchedPath) {
        const allowed = ROUTE_PERMISSIONS[matchedPath].includes(cargo);
        console.log(`[RBAC] cargo='${cargo}' path='${normalizedPath}' (match: ${matchedPath}) → ${allowed ? 'PERMITIDO' : 'NEGADO'}`);
        return allowed;
    }

    // Rota não mapeada - permite por padrão
    console.log(`[RBAC] Rota '${normalizedPath}' não mapeada, permitindo acesso`);
    return true;
};

/**
 * Retorna a rota inicial baseada no cargo
 * @param {string} cargo - Valor do campo cargo do perfil_de_usuario
 */
export const getInitialRoute = (cargo) => {
    if (cargo === CARGOS.ADM) {
        return '/'; // Dashboard
    }
    return '/onboard'; // Para Sócios e Gestores e Marketing
};

/**
 * Verifica permissões para elementos de UI (Grupos de Anúncios, Criativos)
 * @param {string} cargo - Valor do campo cargo do perfil_de_usuario
 * @param {string} elementId - ID do elemento
 */
export const canViewElement = (cargo, elementId) => {
    const admOnlyElements = ['criativos', 'grupos-anuncios', 'grupos-de-anuncios'];

    if (admOnlyElements.includes(elementId.toLowerCase())) {
        return cargo === CARGOS.ADM;
    }

    return true;
};

/**
 * Lista de itens do menu que devem ser ocultos baseado no cargo
 * @param {string} cargo - Valor do campo cargo do perfil_de_usuario
 */
export const getHiddenMenuItems = (cargo) => {
    if (cargo === CARGOS.MARKETING) {
        return ['dashboard', 'relatorios', 'campanhas', 'segmentacao', 'uploads'];
    }

    if (cargo === CARGOS.SOCIOS || cargo === CARGOS.GESTORES) {
        return ['dashboard', 'campanhas', 'segmentacao', 'uploads'];
    }

    // ADM vê tudo
    return [];
};
