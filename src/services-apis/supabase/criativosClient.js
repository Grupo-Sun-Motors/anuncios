import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase de Criativos (qeckbczlymcidnuqtrxc)
const criativosUrl = 'https://qeckbczlymcidnuqtrxc.supabase.co';
const criativosKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2tiY3pseW1jaWRudXF0cnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjczODgsImV4cCI6MjA3MzcwMzM4OH0.X-7la7rqgc605B-ylVpT2dODYdoLNzGyNAfCkO08QLE';

export const supabaseCriativos = createClient(criativosUrl, criativosKey);

/**
 * Retorna a URL pública de uma imagem no bucket 'fotos' do Supabase de Criativos.
 * @param {string} path - O caminho/nome do arquivo no bucket.
 * @returns {string} - A URL pública da imagem.
 */
export function getCriativoPublicUrl(path) {
    if (!path) return null;

    // Se já for uma URL completa, retorna ela mesma
    if (path.startsWith('http')) return path;

    const { data } = supabaseCriativos.storage.from('fotos').getPublicUrl(path);
    return data?.publicUrl;
}
