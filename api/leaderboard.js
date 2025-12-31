// Vercel Edge Config Leaderboard API
// Handles GET (fetch leaderboard) and POST (submit score)

export const config = {
    runtime: 'edge',
};

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const LEADERBOARD_KEY = 'leaderboard';
const MAX_LEADERBOARD_SIZE = 100;

// Helper to get Edge Config connection string
function getEdgeConfigUrl() {
    return process.env.EDGE_CONFIG;
}

// Fetch leaderboard from Edge Config using the connection string
async function getLeaderboard() {
    const edgeConfigUrl = getEdgeConfigUrl();
    
    if (!edgeConfigUrl) {
        console.error('EDGE_CONFIG environment variable not set');
        return [];
    }
    
    try {
        // Parse the connection string to get the URL
        const url = new URL(edgeConfigUrl);
        const itemUrl = `${url.origin}${url.pathname}/item/${LEADERBOARD_KEY}${url.search}`;
        
        const response = await fetch(itemUrl);
        
        if (!response.ok) {
            if (response.status === 404) {
                return []; // Key doesn't exist yet
            }
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

// Update leaderboard in Edge Config via Vercel API
async function updateLeaderboard(leaderboard) {
    if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
        throw new Error('Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN');
    }
    
    const response = await fetch(
        `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: [
                    {
                        operation: 'upsert',
                        key: LEADERBOARD_KEY,
                        value: leaderboard,
                    },
                ],
            }),
        }
    );
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update leaderboard: ${response.status} - ${errorText}`);
    }
    
    return response.json();
}

// Validate and sanitize player name
function sanitizePlayerName(name) {
    if (typeof name !== 'string') return null;
    // Remove any HTML/script tags and limit length
    const sanitized = name
        .replace(/<[^>]*>/g, '')
        .replace(/[<>\"'&]/g, '')
        .trim()
        .slice(0, 20);
    return sanitized.length >= 1 ? sanitized : null;
}

// Validate score
function validateScore(score) {
    const num = parseInt(score, 10);
    return !isNaN(num) && num >= 0 && num <= 10000000 ? num : null;
}

export default async function handler(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    try {
        if (request.method === 'GET') {
            // Fetch and return leaderboard
            const leaderboard = await getLeaderboard();
            return new Response(JSON.stringify({ leaderboard }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        if (request.method === 'POST') {
            // Submit a new score
            const body = await request.json();
            const playerName = sanitizePlayerName(body.playerName);
            const score = validateScore(body.score);
            
            if (!playerName) {
                return new Response(
                    JSON.stringify({ error: 'Invalid player name. Must be 1-20 characters.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            
            if (score === null) {
                return new Response(
                    JSON.stringify({ error: 'Invalid score. Must be a positive number.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            
            // Fetch current leaderboard
            const leaderboard = await getLeaderboard();
            
            // Add new entry with timestamp
            const newEntry = {
                playerName,
                score,
                timestamp: new Date().toISOString(),
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            
            leaderboard.push(newEntry);
            
            // Sort by score (descending) and limit size
            leaderboard.sort((a, b) => b.score - a.score);
            const trimmedLeaderboard = leaderboard.slice(0, MAX_LEADERBOARD_SIZE);
            
            // Update leaderboard in Edge Config
            await updateLeaderboard(trimmedLeaderboard);
            
            // Find the rank of the new entry
            const rank = trimmedLeaderboard.findIndex(entry => entry.id === newEntry.id) + 1;
            
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    rank: rank > 0 ? rank : null,
                    message: rank > 0 ? `You ranked #${rank}!` : 'Score submitted!',
                    leaderboard: trimmedLeaderboard.slice(0, 10), // Return top 10
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
    } catch (error) {
        console.error('API Error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}
