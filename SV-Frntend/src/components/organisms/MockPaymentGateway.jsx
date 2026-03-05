/**
 * components/organisms/MockPaymentGateway.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 5 — Simulated Razorpay / UPI Escrow Gateway
 *
 * Intentionally NOT glassmorphism — looks like an external payment provider
 * to sell the escrow handoff during a live demo.
 *
 * Flow:
 *   State 1 "idle"        → Payment summary + "Pay via UPI" CTA
 *   State 2 "processing"  → Spinner + "Processing transaction…"
 *   State 3 "success"     → Green checkmark + "Payment Successful"
 *   State 4 (auto-close)  → 1 s after success: calls onSuccess() & closes
 *
 * Props:
 *   isOpen    boolean
 *   amount    number   (default 5000)
 *   onSuccess () => void   — called after success animation; caller awards trust pts
 *   onClose   () => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Lock, ShieldCheck, X, CreditCard } from 'lucide-react'

// ─── UPI app logos (text-based fallbacks for hackathon) ──────────────────────
const UPI_APPS = [
    { id: 'gpay',   label: 'G Pay',     bg: '#4285F4', text: 'G' },
    { id: 'phonepe',label: 'PhonePe',   bg: '#5F259F', text: 'P' },
    { id: 'paytm',  label: 'Paytm',     bg: '#002970', text: 'T' },
    { id: 'upi',    label: 'Any UPI',   bg: '#FF6B00', text: 'U' },
]

// ─── Phase components ─────────────────────────────────────────────────────────

function PaymentSummary({ amount, onPay }) {
    const [selectedApp, setSelectedApp] = useState('gpay')

    return (
        <div className="flex flex-col gap-0">
            {/* Bank-style header strip */}
            <div className="bg-[#0f4c81] px-5 py-4 rounded-t-2xl">
                <div className="flex items-center gap-2 mb-1">
                    <Lock size={12} className="text-white/70" />
                    <span className="text-[10px] text-white/70 font-medium tracking-widest uppercase">
                        Secure Payment
                    </span>
                </div>
                <p className="text-white text-xs font-semibold">SheVest Escrow · NPCI Regulated</p>
            </div>

            <div className="px-5 pt-5 pb-2 bg-white">
                {/* Merchant row */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                    <div>
                        <p className="text-[11px] text-slate-400 font-medium">Paying to</p>
                        <p className="text-sm font-bold text-slate-800">SheVest Chit Fund Pool</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Merchant ID: SV-CHIT-2026</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CreditCard size={18} className="text-emerald-700" />
                    </div>
                </div>

                {/* Amount */}
                <div className="text-center mb-5">
                    <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-4xl font-black text-slate-900">
                        ₹{amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Monthly installment · Cycle 1</p>
                </div>

                {/* UPI app selector */}
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                    Pay via UPI App
                </p>
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {UPI_APPS.map(app => (
                        <button
                            key={app.id}
                            onClick={() => setSelectedApp(app.id)}
                            className={`
                                flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all duration-150
                                ${selectedApp === app.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'}
                            `}
                        >
                            <span
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black"
                                style={{ background: app.bg }}
                            >
                                {app.text}
                            </span>
                            <span className="text-[9px] text-slate-500 font-medium">{app.label}</span>
                        </button>
                    ))}
                </div>

                {/* Pay CTA */}
                <button
                    id="mock-pay-upi-btn"
                    onClick={onPay}
                    className="
                        w-full py-3.5 rounded-xl font-bold text-sm text-white
                        bg-[#0f4c81] hover:bg-[#0d3f6d]
                        active:scale-[0.98] transition-all duration-150
                        shadow-md
                    "
                >
                    Pay ₹{amount.toLocaleString('en-IN')} via UPI
                </button>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-3 mt-3">
                    <div className="flex items-center gap-1">
                        <ShieldCheck size={11} className="text-slate-400" />
                        <span className="text-[9px] text-slate-400">256-bit SSL</span>
                    </div>
                    <span className="text-slate-200">·</span>
                    <span className="text-[9px] text-slate-400">RBI Regulated</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[9px] text-slate-400">NPCI UPI</span>
                </div>
            </div>
        </div>
    )
}

function ProcessingState() {
    return (
        <div className="bg-white flex flex-col items-center justify-center gap-5 py-14 px-6 rounded-2xl">
            {/* Spinner */}
            <div className="relative w-16 h-16">
                <svg className="animate-spin w-16 h-16" viewBox="0 0 64 64">
                    <circle
                        cx="32" cy="32" r="28"
                        fill="none" stroke="#e2e8f0" strokeWidth="5"
                    />
                    <circle
                        cx="32" cy="32" r="28"
                        fill="none" stroke="#0f4c81" strokeWidth="5"
                        strokeDasharray="88 90"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
            <div className="text-center">
                <p className="text-base font-bold text-slate-800">Processing transaction…</p>
                <p className="text-xs text-slate-400 mt-1">Contacting your bank. Please wait.</p>
            </div>
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-400 typing-dot"
                        style={{ animationDelay: `${i * 0.2}s` }}
                    />
                ))}
            </div>
        </div>
    )
}

function SuccessState({ amount }) {
    return (
        <div className="bg-white flex flex-col items-center justify-center gap-4 py-14 px-6 rounded-2xl">
            {/* Animated checkmark */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_8px_32px_rgba(16,185,129,0.45)]"
            >
                <CheckCircle2 size={42} className="text-white" strokeWidth={2.5} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
                className="text-center"
            >
                <p className="text-xl font-black text-slate-900">Payment Successful</p>
                <p className="text-sm text-slate-500 mt-1">
                    ₹{amount.toLocaleString('en-IN')} debited from your UPI
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-700">+20 Trust Points Earned</span>
                </div>
            </motion.div>

            <p className="text-[10px] text-slate-300 mt-2">Transaction ID: SV{Date.now()}</p>
        </div>
    )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function MockPaymentGateway({ isOpen, amount = 5000, onSuccess, onClose }) {
    const [phase, setPhase] = useState('idle') // 'idle' | 'processing' | 'success'
    const timerRef = useRef(null)

    // Reset phase whenever modal opens
    useEffect(() => {
        if (isOpen) setPhase('idle')
        return () => clearTimeout(timerRef.current)
    }, [isOpen])

    const handlePay = () => {
        setPhase('processing')
        timerRef.current = setTimeout(() => {
            setPhase('success')
            timerRef.current = setTimeout(() => {
                onSuccess?.()
                onClose?.()
            }, 1000)
        }, 1500)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="mpg-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm"
                        onClick={phase === 'idle' ? onClose : undefined}
                        aria-hidden="true"
                    />

                    {/* Centering shell — plain div so framer-motion can't clobber Tailwind transforms */}
                    <div className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none">
                        <motion.div
                            key="mpg-card"
                            initial={{ opacity: 0, scale: 0.93, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
                        >
                            {/* Close button — only shown in idle */}
                            {phase === 'idle' && (
                                <button
                                    onClick={onClose}
                                    aria-label="Cancel payment"
                                    className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                >
                                    <X size={13} />
                                </button>
                            )}

                            <AnimatePresence mode="wait">
                                {phase === 'idle' && (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <PaymentSummary amount={amount} onPay={handlePay} />
                                    </motion.div>
                                )}
                                {phase === 'processing' && (
                                    <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <ProcessingState />
                                    </motion.div>
                                )}
                                {phase === 'success' && (
                                    <motion.div key="succ" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <SuccessState amount={amount} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
