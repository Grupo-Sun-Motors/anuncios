
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://agdvozsqcrszflzsimyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZHZvenNxY3JzemZsenNpbXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDUzODksImV4cCI6MjA2OTM4MTM4OX0.pgYBlwUqLZZ7I5EOD1LFcSeBrrTy1Jf1Ep8zLjYj3LQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectData() {
    console.log('--- MARCAS ---');
    const { data: marcas, error: errorMarcas } = await supabase.from('marcas').select('*').limit(1);
    if (errorMarcas) console.error(errorMarcas);
    else console.log(JSON.stringify(marcas, null, 2));

    console.log('\n--- AUDIENCIAS ---');
    const { data: audiencias, error: errorAudiencias } = await supabase.from('audiencias').select('*').limit(1);
    if (errorAudiencias) console.error(errorAudiencias);
    else console.log(JSON.stringify(audiencias, null, 2));
}

inspectData();
