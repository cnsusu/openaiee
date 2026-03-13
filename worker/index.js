async function handleRequest(request, env) {
    const { pathname } = new URL(request.url);
    const [_, token, next, ...params] = pathname.split('/');

    if (/^v\d+$/.test(token)) {
        return proxy(request, env);
    } else if (token === env.ACCESS_TOKEN) {
        console.log('Accessing master handler');
        let result;
        if (request.method === 'DELETE') {
            await deleteUser(next, env);
            result = 'ok';
        } else if (next === 'register' || next === 'reset') {
            result = await registerUser(params[0], env);
        }

        if (!result) throw 'Invalid action';
        return new Response(`${result}\n`, {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    throw 'Access forbidden';
}

async function proxy(request, env) {
    const headers = new Headers(request.headers);
    const authKey = 'Authorization';
    const authHeader = headers.get(authKey);

    // Check if Authorization header exists
    if (!authHeader) throw 'Auth required';

    const token = authHeader.split(' ').pop();
    if (!token) throw 'Auth required';

    // validate user
    const users = await env.KV.get("users", { type: 'json' }) || {};
    let name;
    for (let key in users) {
        if (users[key].key === token) {
            name = key;
            break;
        }
    }

    if (!name) throw 'Invalid token';
    console.log(`User ${name} accepted.`);

    // proxy the request
    const url = new URL(request.url);
    // 1. replace with the official host
    url.host = 'api.openai.com';
    // 2. replace with the real API key
    headers.set(authKey, `Bearer ${env.OPENAPI_API_KEY}`);
    // 3. issue the underlying request
    // Only pass body if request method is not 'GET' and has body
    let requestBody = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
            requestBody = await request.text();
        } catch {
            // No body or body already consumed
        }
    }

    return fetch(url, {
        method: request.method,
        headers: headers,
        body: requestBody,
    });
}

async function registerUser(user, env) {
    if (!user?.length) throw 'Invalid username';

    const users = await env.KV.get("users", { type: 'json' }) || {};
    const key = generateAPIKey();
    users[user] = { key };
    await env.KV.put("users", JSON.stringify(users));
    return key;
}

async function deleteUser(user, env) {
    if (!user?.length) throw 'Invalid username';

    const users = await env.KV.get("users", { type: 'json' }) || {};
    if (!users[user]) throw 'User not found';

    delete users[user];
    await env.KV.put("users", JSON.stringify(users));
}

function generateAPIKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = 'sk-cfw';

    // Use crypto.getRandomValues for secure random generation
    const randomValues = new Uint32Array(45);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < 45; i++) {
        const randomIndex = randomValues[i] % characters.length;
        apiKey += characters.charAt(randomIndex);
    }

    return apiKey;
}

export default {
    async fetch(request, env) {
        return handleRequest(request, env).catch(err =>
            new Response(err || 'Unknown reason', { status: 403 })
        );
    }
};
