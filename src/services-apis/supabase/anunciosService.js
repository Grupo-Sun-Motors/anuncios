import { supabase } from './client.js';

export async function buscarAnuncios() {
    try {
        const { data, error } = await supabase
            .from('anuncios')
            .select(`
                *,
                marca:marcas(nome),
                plataforma:plataformas(nome),
                conta:contas_de_anuncio(nome)
            `)
            .order('criado_em', { ascending: false });

        if (error) {
            console.error('Erro ao buscar anúncios:', error);
            return [];
        }

        // Process data to match frontend expectations if necessary
        // The frontend expects:
        // marca_nome (we get marca.nome)
        // modelos_nomes (we need to fetch models separately or use an approach to get names)
        // platform name (we get plataforma.nome)

        // For now return data structure close to Supabase and let Frontend adapt or adapt here.
        // Let's adapt here to minimize Frontend changes.

        // We need to fetch all models to map IDs to names since we can't easy join array of IDs
        const { data: modelos } = await supabase.from('modelos').select('id, nome');
        const modelosMap = new Map((modelos || []).map(m => [m.id, m.nome]));

        return data.map(anuncio => ({
            ...anuncio,
            marca_nome: anuncio.marca?.nome || '',
            plataforma_nome: anuncio.plataforma?.nome || '', // Display name
            plataforma: anuncio.plataforma?.nome?.toUpperCase().includes('META') ? 'META' : (anuncio.plataforma?.nome?.toUpperCase().includes('GOOGLE') ? 'GOOGLE' : anuncio.plataforma?.nome), // Keep internal code 'META'/'GOOGLE' if frontend relies on it for logic, or rely on ID.
            // But frontend currently relies on 'META'/'GOOGLE' strings for conditional rendering.

            modelos_nomes: (anuncio.modelo_ids || []).map(id => modelosMap.get(id) || 'Desconhecido'),

            // Ensure copy/json fields are objects
            copy: typeof anuncio.copy === 'string' ? JSON.parse(anuncio.copy) : anuncio.copy,
            metricas: typeof anuncio.metricas === 'string' ? JSON.parse(anuncio.metricas) : anuncio.metricas,
            configuracoes_avancadas: typeof anuncio.configuracoes_avancadas === 'string' ? JSON.parse(anuncio.configuracoes_avancadas) : anuncio.configuracoes_avancadas,
            orcamentos: typeof anuncio.orcamentos === 'string' ? JSON.parse(anuncio.orcamentos) : anuncio.orcamentos,
        }));

    } catch (error) {
        console.error('Erro inesperado ao buscar anúncios:', error);
        return [];
    }
}

export async function criarAnuncio(anuncio) {
    try {
        const { data, error } = await supabase
            .from('anuncios')
            .insert([{
                nome: anuncio.nome,
                status: anuncio.status,
                marca_id: anuncio.marca_id,
                plataforma_id: anuncio.plataforma_id, // UUID
                modelo_ids: anuncio.modelo_ids, // Array
                copy: anuncio.copy,
                preview_midia: anuncio.preview_midia,
                configuracoes_avancadas: anuncio.configuracoes_avancadas,
                orcamentos: anuncio.orcamentos,
                obs: anuncio.obs,
                metricas: anuncio.metricas || {},
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar anúncio:', error);
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Erro inesperado ao criar anúncio:', error);
        throw error;
    }
}

export async function atualizarAnuncio(id, dados) {
    try {
        const payload = {
            ...dados,
            atualizado_em: new Date().toISOString()
        };

        // Remove helper fields that shouldn't be in DB
        delete payload.marca_nome;
        delete payload.modelos_nomes;
        delete payload.plataforma; // We use plataforma_id

        const { data, error } = await supabase
            .from('anuncios')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Erro ao atualizar anúncio ${id}:`, error);
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Erro inesperado ao atualizar anúncio:', error);
        throw error;
    }
}

export async function excluirAnuncio(id) {
    try {
        const { error } = await supabase
            .from('anuncios')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Erro ao excluir anúncio ${id}:`, error);
            throw error;
        }
        return true;
    } catch (error) {
        console.error('Erro inesperado ao excluir anúncio:', error);
        return false;
    }
}
