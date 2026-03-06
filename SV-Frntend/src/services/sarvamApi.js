/**
 * services/sarvamApi.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sarvam AI Speech-to-Text client
 *
 * Usage:
 *   import { transcribeAudio } from '../services/sarvamApi'
 *   const text = await transcribeAudio(audioBlob, 'kn-IN')
 *
 * Requires env var:  VITE_SARVAM_API_KEY
 * Language codes:    'en-IN' | 'hi-IN' | 'kn-IN' (and other BCP-47 IN locales)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text'

/**
 * transcribeAudio — sends a recorded audio blob to Sarvam AI STT.
 *
 * @param {Blob}   audioBlob    - raw audio from MediaRecorder (webm/wav)
 * @param {string} languageCode - BCP-47 locale, e.g. 'kn-IN'
 * @returns {Promise<string>}   - transcribed text (empty string on failure)
 */
export async function transcribeAudio(audioBlob, languageCode = 'kn-IN') {
    const apiKey = import.meta.env.VITE_SARVAM_API_KEY
    if (!apiKey) {
        console.warn('[sarvamApi] VITE_SARVAM_API_KEY is not set — transcription disabled.')
        return ''
    }

    const form = new FormData()
    // Sarvam rejects codec-suffixed MIME types (e.g. 'audio/webm;codecs=opus')
    // Normalize to the base type it accepts.
    const baseType = audioBlob.type.split(';')[0] || 'audio/webm'
    const normalizedBlob = baseType !== audioBlob.type
        ? new Blob([audioBlob], { type: baseType })
        : audioBlob
    const ext = baseType.includes('wav') ? 'wav' : 'webm'
    form.append('file', normalizedBlob, `recording.${ext}`)
    form.append('language_code', languageCode)

    const res = await fetch(SARVAM_STT_URL, {
        method: 'POST',
        headers: {
            'api-subscription-key': apiKey,
        },
        body: form,
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Sarvam STT error ${res.status}: ${err}`)
    }

    const data = await res.json()
    return data.transcript ?? ''
}

/**
 * langCodeForLocale — maps app lang keys to Sarvam BCP-47 codes.
 *
 * @param {'en'|'hi'|'kn'} lang
 * @returns {string}
 */
export function langCodeForLocale(lang) {
    const map = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' }
    return map[lang] ?? 'kn-IN'
}
