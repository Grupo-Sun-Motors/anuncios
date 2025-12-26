import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Trata o preflight do CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { fileName, contentBase64, repoPath } = await req.json()

        // TODO: Configure these variables or use environment variables
        const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')
        const OWNER = 'Grupo-SUN-MOTORS-RS'
        const REPO = 'topstack-analytics'

        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${repoPath}/${fileName}`

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Upload via TopStack: ${fileName}`,
                content: contentBase64,
            }),
        })

        const data = await res.json()

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: res.status,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
