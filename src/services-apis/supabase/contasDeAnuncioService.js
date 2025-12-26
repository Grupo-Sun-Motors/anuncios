import { supabase } from './client.js';

export async function buscarContasDeAnuncioComMarcas() {
    const { data, error } = await supabase
        .from('contas_de_anuncio')
        .select(`
            *,
            plataformas:contas_de_anuncio_plataforma_id_fkey(id, nome),
            marcas_contas(marca_id, marcas(id, nome))
        `);

    if (error) {
        console.error('Erro ao buscar contas de anúncio com marcas:', error);
        return [];
    }
    return data;
}

export async function buscarTodasContasDeAnuncio() {
    const { data, error } = await supabase
        .from('contas_de_anuncio')
        .select(`
            *,
            plataformas:contas_de_anuncio_plataforma_id_fkey(id, nome)
        `);

    if (error) {
        console.error('Erro ao buscar contas de anúncio:', error);
        return [];
    }
    return data;
}
