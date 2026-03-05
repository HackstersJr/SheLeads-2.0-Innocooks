import { useState } from 'react'
import { AlertTriangle, Send, ShieldCheck } from 'lucide-react'
import { analyzeThreat } from '../api/shevestApi'

export default function ThreatReportPanel({ uid, onResult }) {
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState(null)

    const handleSubmit = async () => {
        const trimmed = message.trim()
        if (!trimmed) return
        if (!uid) {
            setError('Please complete registration first so your report is linked securely.')
            return
        }

        setError('')
        setLoading(true)
        try {
            const response = await analyzeThreat({ uid, message_text: trimmed })
            setResult(response.data)
            if (onResult) {
                onResult(response.data, trimmed)
            }
        } catch (apiError) {
            setError(apiError.message || 'Connection issue. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-4 mb-4 p-4 rounded-2xl border border-rose-100/70 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-rose-600" />
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Threat Report Panel</p>
            </div>

            <textarea
                value={message}
                onChange={(event) => {
                    setMessage(event.target.value)
                    setError('')
                }}
                rows={3}
                placeholder="Share the exact threatening message you received..."
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-rose-300"
            />

            <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !message.trim()}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <Send size={14} />
                {loading ? 'Analyzing message...' : 'Analyze Threat'}
            </button>

            {error && <p className="mt-2 text-xs text-rose-600 font-medium">{error}</p>}

            {result && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">AI Legal Result</p>
                    </div>
                    <p className="text-xs text-stone-700"><span className="font-semibold">Threat detected:</span> {String(result.is_threat_detected)}</p>
                    <p className="text-xs text-stone-700 mt-1"><span className="font-semibold">Legal section:</span> {result.bns_section || '-'}</p>
                    <p className="text-xs text-stone-700 mt-1 whitespace-pre-wrap"><span className="font-semibold">Draft FIR:</span> {result.draft_fir_text || '-'}</p>
                    {!result.is_threat_detected && (
                        <p className="text-xs text-emerald-700 mt-2 font-medium">
                            No threat detected. If you feel unsafe, contact your local support group.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
