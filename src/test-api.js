import { buscarMarcas, buscarPlataformas, buscarTodasContasDeAnuncio, buscarTodasMarcasContas } from './services-apis/supabase/configService.js';
import { buscarTodasCampanhas } from './services-apis/supabase/campanhasService.js';
import { buscarGruposPorCampanha } from './services-apis/supabase/gruposDeAnunciosService.js';
import { buscarCriativosPorGrupo } from './services-apis/supabase/criativosService.js';
import { buscarTodasAudiencias } from './services-apis/supabase/audienciasService.js';
import { buscarTodosModelos } from './services-apis/supabase/modelosService.js';
import { buscarTodosOrcamentosMensais, buscarTodosOrcamentosDetalhados } from './services-apis/supabase/orcamentoService.js';
import { buscarTodosRelatorios } from './services-apis/supabase/relatoriosService.js';
import { buscarTodoHistorico } from './services-apis/supabase/historicoOtimizacoesService.js';
import { buscarTodosPublicos } from './services-apis/supabase/publicoPersonalizadoService.js';


async function executarTestes() {
    console.log("Executando testes abrangentes...");

    try {
        const marcas = await buscarMarcas();
        console.log("Marcas:", marcas);

        const plataformas = await buscarPlataformas();
        console.log("Plataformas:", plataformas);

        const contas = await buscarTodasContasDeAnuncio();
        console.log("Contas de Anúncio:", contas);

        const marcasContas = await buscarTodasMarcasContas();
        console.log("Relações Marcas/Contas:", marcasContas);

        const campanhas = await buscarTodasCampanhas();
        console.log("Campanhas:", campanhas);

        const audiencias = await buscarTodasAudiencias();
        console.log("Audiências:", audiencias);

        const modelos = await buscarTodosModelos();
        console.log("Modelos:", modelos);

        const orcamentosMensais = await buscarTodosOrcamentosMensais();
        console.log("Orçamentos Mensais:", orcamentosMensais);
        
        const orcamentosDetalhados = await buscarTodosOrcamentosDetalhados();
        console.log("Orçamentos Detalhados:", orcamentosDetalhados);

        const relatorios = await buscarTodosRelatorios();
        console.log("Relatórios:", relatorios);

        const historico = await buscarTodoHistorico();
        console.log("Histórico de Otimizações:", historico);

        const publicos = await buscarTodosPublicos();
        console.log("Públicos Personalizados:", publicos);

        // Teste encadeado para grupos e criativos
        if (campanhas && campanhas.length > 0) {
            const primeiraCampanhaId = campanhas[0].id;
            console.log(`Buscando grupos para a campanha ID: ${primeiraCampanhaId}`);
            const grupos = await buscarGruposPorCampanha(primeiraCampanhaId);
            console.log(`Grupos da Campanha ${primeiraCampanhaId}:`, grupos);

            if (grupos && grupos.length > 0) {
                const primeiroGrupoId = grupos[0].id;
                console.log(`Buscando criativos para o grupo ID: ${primeiroGrupoId}`);
                const criativos = await buscarCriativosPorGrupo(primeiroGrupoId);
                console.log(`Criativos do Grupo ${primeiroGrupoId}:`, criativos);
            } else {
                console.log("Nenhum grupo de anúncio encontrado para a primeira campanha, não foi possível testar criativos.");
            }
        } else {
            console.log("Nenhuma campanha encontrada, não foi possível testar grupos e criativos.");
        }

    } catch (error) {
        console.error("Ocorreu um erro durante os testes:", error);
    }
}

executarTestes();
