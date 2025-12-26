import * as campanhasService from './services-apis/supabase/campanhasService.js';
import * as criativosService from './services-apis/supabase/criativosService.js';
import * as gruposDeAnunciosService from './services-apis/supabase/gruposDeAnunciosService.js';
import * as modelosService from './services-apis/supabase/modelosService.js';
import * as relatoriosService from './services-apis/supabase/relatoriosService.js';
import * as orcamentoService from './services-apis/supabase/orcamentoService.js';
import * as historicoOtimizacoesService from './services-apis/supabase/historicoOtimizacoesService.js';
import * as leadsService from './services-apis/supabase/leadsService.js';
import * as configServiceModule from './services-apis/supabase/configService.js';
import { buscarPerfilUsuario } from './services-apis/supabase/perfilUsuarioService.js';
import { atualizarPlanoUsuario } from './services-apis/supabase/configService.js';

// Expose services globally
window.campanhasService = campanhasService;
window.criativosService = criativosService;
window.gruposDeAnunciosService = gruposDeAnunciosService;
window.modelosService = modelosService;
window.relatoriosService = relatoriosService;
window.orcamentoService = orcamentoService;
window.historicoOtimizacoesService = historicoOtimizacoesService;
window.leadsService = leadsService;

// Reconstruct configService
window.configService = {
    buscarPerfilUsuario: async function (userId) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return buscarPerfilUsuario(userId, client);
        }
        return buscarPerfilUsuario(userId);
    },
    atualizarPlanoUsuario: async function (userId, plan) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return atualizarPlanoUsuario(userId, plan, client);
        }
        return atualizarPlanoUsuario(userId, plan);
    },
    buscarMarcas: configServiceModule.buscarMarcas,
    buscarPlataformas: configServiceModule.buscarPlataformas,
    buscarTodasContasDeAnuncio: configServiceModule.buscarTodasContasDeAnuncio,
    buscarTodasMarcasContas: configServiceModule.buscarTodasMarcasContas,
    buscarContasPorMarca: configServiceModule.buscarContasPorMarca
};

console.log('Legacy services initialized');
