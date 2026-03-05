const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, amount: 200, cycle_number: cycleNumber }),
    })
}

export async function getLoanMarket(uid) {
    return requestJson(`${API_BASE}/loans/market?uid=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    })
}

export async function analyzeThreat(chatData) {
    const payload = {
        uid: chatData.uid,
        message_text: chatData.message_text,
    }

    const preferred = await fetch(`${API_BASE}/legal/analyze-threat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    if (preferred.status !== 404) {
        return parseResponse(preferred)
    }

    return requestJson(`${API_BASE}/legal/scan-threat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
}

export { API_BASE }
