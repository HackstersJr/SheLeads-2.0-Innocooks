const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// ── JWT token helpers ────────────────────────────────────────────────────────
const TOKEN_KEY = 'sv_access_token'

export function saveToken(token) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || null
}

export function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY)
}

function authHeaders(extra = {}) {
    const token = getToken()
    const headers = { 'Content-Type': 'application/json', ...extra }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
}
// ─────────────────────────────────────────────────────────────────────────────

async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await response.json() : await response.text()

    if (!response.ok) {
        let detail = 'Something went wrong. Please try again.'
        if (typeof body === 'string' && body) {
            detail = body
        } else if (body?.detail) {
            detail = body.detail
        } else if (body?.message?.text) {
            detail = body.message.text
        }
        throw new Error(detail)
    }

    return body
}

async function requestJson(url, options) {
    try {
        const response = await fetch(url, options)
        return await parseResponse(response)
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Connection issue. Please try again.')
        }
        throw error
    }
}

export async function sendOtp(phone) {
    return requestJson(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
    })
}

export async function verifyOtp(phone, otp) {
    const result = await requestJson(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
    })
    // Persist token immediately so all subsequent calls are authorised
    if (result?.data?.access_token) saveToken(result.data.access_token)
    return result
}

export async function ngoLogin(payload) {
    const result = await requestJson(`${API_BASE}/auth/ngo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (result?.data?.access_token) saveToken(result.data.access_token)
    return result
}

export async function registerUser(payload) {
    return requestJson(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
}

export async function payInstallment(uid, cycleNumber = 1) {
    return requestJson(`${API_BASE}/chit/pay-installment`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ uid, amount: 200, cycle_number: cycleNumber }),
    })
}

export async function getLoanMarket(uid) {
    return requestJson(`${API_BASE}/loans/market?uid=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: authHeaders(),
    })
}

export async function analyzeScreenshot(file) {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return requestJson(`${API_BASE}/ai/analyze-screenshot`, {
        method: 'POST',
        headers,
        body: formData,
    })
}

export async function analyzeText(text) {
    return requestJson(`${API_BASE}/ai/analyze-text`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
    })
}

export async function analyzeThreat(chatData) {
    const payload = {
        uid: chatData.uid,
        message_text: chatData.message_text,
    }

    const preferred = await fetch(`${API_BASE}/legal/analyze-threat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    })

    if (preferred.status !== 404) {
        return parseResponse(preferred)
    }

    return requestJson(`${API_BASE}/legal/scan-threat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    })
}

export { API_BASE }
