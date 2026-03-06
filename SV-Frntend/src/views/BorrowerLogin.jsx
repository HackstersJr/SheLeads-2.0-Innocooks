/**
 * views/BorrowerLogin.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 1 — Borrower Login Portal
 *
 * Two-state mobile-first frosted-glass card:
 *   State 1 — Phone number entry (+91) → Emerald "Send OTP"
 *   State 2 — 4-digit OTP input        → "Verify & Secure Login"
 *
 * On successful OTP verification: calls loginUser('borrower', payload) from
 * AppContext (wired in Agent 3). Falls back to legacy login(role) if
 * loginUser is not yet present, ensuring Agent 1 works standalone.
 *
 * Design: Soft 3D Glassmorphism. bg-stone-50, emerald accents.
 * No pure black anywhere. Mobile-first (max-w-md).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOtp, verifyOtp } from '../api/shevestApi'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Phone,
    ShieldCheck,
    ArrowLeft,
    RefreshCw,
    Lock,
    CheckCircle2,
    CreditCard,
    Fingerprint,
    AtSign,
    UserPlus,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const RESEND_COOLDOWN_SECONDS = 30

// ─── Login / Register toggle ─────────────────────────────────────────────────
function MethodToggle({ mode, onChange }) {
    const tabs = [
        { id: 'login',    label: 'Login'    },
        { id: 'register', label: 'Register' },
    ]
    return (
        <div className="flex bg-stone-100/80 rounded-2xl p-1 gap-1" role="tablist">
            {tabs.map(({ id, label }) => {
                const active = mode === id
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(id)}
                        className="relative flex-1 py-2.5 text-xs font-semibold font-sans rounded-xl transition-all duration-200"
                    >
                        {active && (
                            <motion.div
                                layoutId="borrower-tab-bg"
                                className="absolute inset-0 bg-emerald-500 rounded-xl shadow-md"
                                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            />
                        )}
                        <span className={`relative z-10 transition-colors ${active ? 'text-white' : 'text-stone-500 hover:text-stone-700'}`}>
                            {label}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

// ─── Ambient background blobs ─────────────────────────────────────────────────
function AmbientBlobs() {
    return (
        <>
            <div
                aria-hidden="true"
                className="absolute -top-28 -left-20 w-80 h-80 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(110,231,183,0.25) 0%, transparent 70%)',
                    filter: 'blur(36px)',
                }}
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)',
                    filter: 'blur(36px)',
                }}
            />
        </>
    )
}

// ─── 4-digit OTP box input ────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
    const inputs = useRef([])
    const OTP_LENGTH = 6

    const handleChange = (e, idx) => {
        const digit = e.target.value.replace(/\D/g, '')
        if (!digit) {
            const next = value.split('')
            next[idx] = ''
            onChange(next.join(''))
            if (idx > 0) inputs.current[idx - 1]?.focus()
            return
        }
        const next = value.padEnd(OTP_LENGTH, ' ').split('')
        next[idx] = digit[0]
        const newVal = next.join('').trimEnd()
        onChange(newVal)
        if (idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus()
    }

    const handleKeyDown = (e, idx) => {
        if (e.key === 'Backspace' && !value[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus()
        }
    }

    // Auto-focus first box on mount
    useEffect(() => {
        inputs.current[0]?.focus()
    }, [])

    return (
        <div className="flex gap-3 justify-center" role="group" aria-label="OTP input">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const filled = !!(value[i] && value[i].trim())
                return (
                    <motion.div
                        key={i}
                        animate={filled ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={{ duration: 0.18 }}
                    >
                        <input
                            ref={el => (inputs.current[i] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={value[i] ?? ''}
                            disabled={disabled}
                            onChange={e => handleChange(e, i)}
                            onKeyDown={e => handleKeyDown(e, i)}
                            aria-label={`OTP digit ${i + 1}`}
                            className={[
                                'w-14 h-14 rounded-2xl border-2 text-center text-xl font-bold font-sans',
                                'bg-white/70 text-emerald-950 caret-emerald-500',
                                'focus:outline-none focus:ring-0',
                                'transition-colors duration-150',
                                'disabled:opacity-50',
                                filled
                                    ? 'border-emerald-400 bg-emerald-50/60'
                                    : 'border-stone-200 hover:border-emerald-200',
                            ].join(' ')}
                        />
                    </motion.div>
                )
            })}
        </div>
    )
}

// ─── Resend timer ─────────────────────────────────────────────────────────────
function ResendTimer({ onResend }) {
    const [seconds, setSeconds] = useState(RESEND_COOLDOWN_SECONDS)

    useEffect(() => {
        if (seconds <= 0) return
        const t = setTimeout(() => setSeconds(s => s - 1), 1000)
        return () => clearTimeout(t)
    }, [seconds])

    const handleResend = () => {
        setSeconds(RESEND_COOLDOWN_SECONDS)
        onResend()
    }

    return (
        <div className="flex items-center justify-center gap-1.5 text-sm font-sans">
            {seconds > 0 ? (
                <span className="text-stone-400">
                    Resend OTP in{' '}
                    <span className="font-semibold text-emerald-700">{seconds}s</span>
                </span>
            ) : (
                <button
                    onClick={handleResend}
                    className="flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-600 transition-colors"
                >
                    <RefreshCw size={13} strokeWidth={2.2} />
                    Resend OTP
                </button>
            )}
        </div>
    )
}

// ─── Step 1 — Phone entry ─────────────────────────────────────────────────────
function PhoneStep({ phone, setPhone, onSendOtp, loading, error }) {
    const isValid = /^[6-9]\d{9}$/.test(phone)

    const handleSubmit = e => {
        e.preventDefault()
        if (isValid && !loading) onSendOtp()
    }

    return (
        <motion.div
            key="phone-step"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {/* Label */}
                <div>
                    <label className="block text-sm font-semibold text-stone-600 font-sans mb-2">
                        Mobile Number
                    </label>

                    {/* Phone input with country code badge */}
                    <div
                        className={[
                            'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden',
                            'transition-colors duration-150',
                            error
                                ? 'border-rose-300'
                                : 'border-stone-200 focus-within:border-emerald-400',
                        ].join(' ')}
                    >
                        {/* +91 badge */}
                        <div className="flex items-center gap-1.5 px-3 py-3.5 border-r border-stone-200 bg-stone-50/80">
                            <span className="text-base">🇮🇳</span>
                            <span className="text-sm font-semibold text-stone-600 font-sans">+91</span>
                        </div>

                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={phone}
                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="98765 43210"
                            autoFocus
                            aria-label="Mobile number"
                            className={[
                                'flex-1 px-3 py-3.5 bg-transparent text-base font-sans',
                                'text-emerald-950 placeholder:text-stone-300',
                                'focus:outline-none focus:ring-0',
                            ].join(' ')}
                        />

                        {isValid && (
                            <CheckCircle2 size={18} className="text-emerald-400 mr-3 shrink-0" />
                        )}
                    </div>

                    {error && (
                        <p className="text-xs text-rose-500 font-sans mt-1.5 pl-1">{error}</p>
                    )}
                </div>

                {/* Helper text */}
                <p className="text-xs text-stone-400 font-sans -mt-2">
                    We'll send a 6-digit OTP to verify your number. Standard SMS rates apply.
                </p>

                {/* CTA */}
                <motion.button
                    type="submit"
                    disabled={!isValid || loading}
                    whileTap={{ scale: 0.97 }}
                    className={[
                        'w-full flex items-center justify-center gap-2',
                        'py-4 rounded-2xl font-bold text-base font-sans',
                        'transition-all duration-200',
                        isValid && !loading
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:bg-emerald-700'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                    ].join(' ')}
                >
                    {loading ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Sending OTP…</span>
                        </>
                    ) : (
                        <>
                            <Phone size={16} strokeWidth={2} />
                            <span>Send OTP</span>
                        </>
                    )}
                </motion.button>
            </form>
        </motion.div>
    )
}

// ─── Step 2 — OTP verification ────────────────────────────────────────────────
function OtpStep({ phone, otp, setOtp, onVerify, onBack, onResend, loading, error, demoHint }) {
    const isComplete = otp.replace(/\s/g, '').length === 6

    const handleSubmit = e => {
        e.preventDefault()
        if (isComplete && !loading) onVerify()
    }

    return (
        <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {/* Info banner */}
                <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/60 px-4 py-3">
                    <p className="text-sm font-sans text-emerald-800 leading-snug">
                        OTP sent to{' '}
                        <span className="font-bold">+91 {phone}</span>
                    </p>
                    <p className="text-xs text-emerald-600 font-sans mt-0.5">
                        Valid for 10 minutes
                    </p>
                    {demoHint && (
                        <p className="text-xs font-bold text-amber-700 font-sans mt-1.5 tracking-widest">
                            Your OTP: {demoHint}
                        </p>
                    )}
                </div>

                {/* OTP boxes */}
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-semibold text-stone-600 font-sans text-center">
                        Enter 6-digit OTP
                    </label>
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                    {error && (
                        <p className="text-xs text-rose-500 font-sans text-center">{error}</p>
                    )}
                </div>

                {/* Resend */}
                <ResendTimer onResend={onResend} />

                {/* Verify CTA */}
                <motion.button
                    type="submit"
                    disabled={!isComplete || loading}
                    whileTap={{ scale: 0.97 }}
                    className={[
                        'w-full flex items-center justify-center gap-2',
                        'py-4 rounded-2xl font-bold text-base font-sans',
                        'transition-all duration-200',
                        isComplete && !loading
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                    ].join(' ')}
                >
                    {loading ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Verifying…</span>
                        </>
                    ) : (
                        <>
                            <Lock size={16} strokeWidth={2} />
                            <span>Verify &amp; Secure Login</span>
                        </>
                    )}
                </motion.button>

                {/* Back link */}
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center justify-center gap-1.5 text-sm text-stone-400 font-sans hover:text-stone-600 transition-colors"
                >
                    <ArrowLeft size={14} />
                    Change number
                </button>
            </form>
        </motion.div>
    )
}

// ─── Aadhaar input — formatted XXXX XXXX XXXX ────────────────────────────────
function AadhaarInput({ value, onChange }) {
    // value = raw 12 digits; display as "XXXX XXXX XXXX"
    const handleChange = useCallback((e) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
        onChange(raw)
    }, [onChange])

    const display = value
        .padEnd(12, '')
        .replace(/(.{4})(.{4})(.{4})/, '$1 $2 $3')
        .trimEnd()

    const isValid = value.length === 12

    return (
        <div>
            <label className="block text-sm font-semibold text-stone-600 font-sans mb-2">
                Aadhaar Number
            </label>
            <div className={[
                'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden transition-colors duration-150',
                isValid ? 'border-emerald-400' : 'border-stone-200 focus-within:border-emerald-400',
            ].join(' ')}>
                <div className="flex items-center px-3 py-3.5 border-r border-stone-200 bg-stone-50/80">
                    <Fingerprint size={16} className="text-stone-500" />
                </div>
                <input
                    type="text"
                    inputMode="numeric"
                    value={display}
                    onChange={handleChange}
                    placeholder="XXXX XXXX XXXX"
                    aria-label="Aadhaar number"
                    className="flex-1 px-3 py-3.5 bg-transparent text-base font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none focus:ring-0 tracking-widest"
                />
                {isValid && <CheckCircle2 size={18} className="text-emerald-400 mr-3 shrink-0" />}
            </div>
            <p className="text-[10px] text-stone-400 font-sans mt-1.5 pl-1">
                Used for identity verification only · End-to-end encrypted
            </p>
        </div>
    )
}

// ─── UPI ID input ─────────────────────────────────────────────────────────────
function UpiInput({ value, onChange }) {
    const isValid = /^[\w.]+@[\w]+$/.test(value.trim())
    return (
        <div>
            <label className="block text-sm font-semibold text-stone-600 font-sans mb-2">
                UPI ID
            </label>
            <div className={[
                'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden transition-colors duration-150',
                isValid ? 'border-emerald-400' : 'border-stone-200 focus-within:border-emerald-400',
            ].join(' ')}>
                <div className="flex items-center px-3 py-3.5 border-r border-stone-200 bg-stone-50/80">
                    <AtSign size={16} className="text-stone-500" />
                </div>
                <input
                    type="text"
                    inputMode="email"
                    value={value}
                    onChange={e => onChange(e.target.value.trim())}
                    placeholder="name@ybl"
                    aria-label="UPI ID"
                    className="flex-1 px-3 py-3.5 bg-transparent text-base font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none focus:ring-0"
                />
                {isValid && <CheckCircle2 size={18} className="text-emerald-400 mr-3 shrink-0" />}
            </div>
            <p className="text-[10px] text-stone-400 font-sans mt-1.5 pl-1">
                Enables escrow-locked disbursement to your UPI account
            </p>
        </div>
    )
}

// ─── Register panel ───────────────────────────────────────────────────────────
function RegisterPanel({ phone, setPhone, aadhaar, setAadhaar, upiId, setUpiId, loading, error, success, onSubmit }) {
    const allValid =
        /^[6-9]\d{9}$/.test(phone) &&
        aadhaar.length === 12 &&
        /^[\w.]+@[\w]+$/.test(upiId.trim())

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-6"
            >
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <CheckCircle2 size={34} className="text-white" strokeWidth={2} />
                </div>
                <div className="text-center">
                    <p className="text-base font-extrabold text-emerald-900">KYC Verified!</p>
                    <p className="text-xs text-stone-500 mt-1">Entering SheVest…</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            key="register-form"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
            className="flex flex-col gap-4"
        >
            {/* Anti-fraud explainer */}
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/60">
                <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-800 font-sans leading-relaxed">
                    <strong>Why we ask:</strong> Aadhaar & UPI verify your identity, enable our
                    anti-fraud UPI name-match, and lock your escrow disbursement to your account only.
                </p>
            </div>

            {/* Phone */}
            <div>
                <label className="block text-sm font-semibold text-stone-600 font-sans mb-2">
                    Mobile Number
                </label>
                <div className={[
                    'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden transition-colors duration-150',
                    /^[6-9]\d{9}$/.test(phone) ? 'border-emerald-400' : 'border-stone-200 focus-within:border-emerald-400',
                ].join(' ')}>
                    <div className="flex items-center gap-1 px-3 py-3.5 border-r border-stone-200 bg-stone-50/80">
                        <span className="text-base">🇮🇳</span>
                        <span className="text-sm font-semibold text-stone-600 font-sans">+91</span>
                    </div>
                    <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        className="flex-1 px-3 py-3.5 bg-transparent text-base font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none"
                    />
                    {/^[6-9]\d{9}$/.test(phone) && <CheckCircle2 size={18} className="text-emerald-400 mr-3 shrink-0" />}
                </div>
            </div>

            {/* Aadhaar */}
            <AadhaarInput value={aadhaar} onChange={setAadhaar} />

            {/* UPI */}
            <UpiInput value={upiId} onChange={setUpiId} />

            {/* Error */}
            {error && (
                <p className="text-xs text-rose-500 font-sans text-center">{error}</p>
            )}

            {/* CTA */}
            <motion.button
                onClick={onSubmit}
                disabled={!allValid || loading}
                whileTap={{ scale: 0.97 }}
                className={[
                    'w-full flex items-center justify-center gap-2',
                    'py-4 rounded-2xl font-bold text-base font-sans',
                    'transition-all duration-200',
                    allValid && !loading
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                ].join(' ')}
            >
                {loading ? (
                    <><RefreshCw size={16} className="animate-spin" /><span>Verifying…</span></>
                ) : (
                    <><CreditCard size={16} strokeWidth={2} /><span>Verify &amp; Create Account</span></>
                )}
            </motion.button>
        </motion.div>
    )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function BorrowerLogin() {
    const navigate  = useNavigate()
    const appCtx    = useApp()
    const loginUser = appCtx.loginUser ?? ((role) => appCtx.login(role))

    // ── Mode: 'login' | 'register' ───────────────────────────────────────────
    const [mode,     setMode]     = useState('login')

    // ── Login sub-state ──────────────────────────────────────────────────────
    const [step,     setStep]     = useState('phone')  // 'phone' | 'otp'
    const [phone,    setPhone]    = useState('')
    const [otp,      setOtp]      = useState('')
    const [loading,  setLoading]  = useState(false)
    const [error,    setError]    = useState('')
    const [demoHint, setDemoHint] = useState('')

    // ── Register sub-state ───────────────────────────────────────────────────
    const [regPhone,   setRegPhone]   = useState('')
    const [aadhaar,    setAadhaar]    = useState('')   // raw 12 digits
    const [upiId,      setUpiId]      = useState('')
    const [regLoading, setRegLoading] = useState(false)
    const [regError,   setRegError]   = useState('')
    const [regSuccess, setRegSuccess] = useState(false)

    // Reset sub-state when toggling mode
    const handleModeChange = useCallback((m) => {
        setMode(m)
        setError('')
        setRegError('')
        setStep('phone')
        setOtp('')
    }, [])

    // ── Login handlers ───────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        setError('')
        setLoading(true)
        try {
            const res = await sendOtp(phone)
            if (res?.data?.demo_otp) setDemoHint(res.data.demo_otp)
            setStep('otp')
        } catch (err) {
            setError(err.message || 'Failed to send OTP. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        setError('')
        if (otp.replace(/\s/g, '').length < 6) { setError('Please enter all 6 digits.'); return }
        setLoading(true)
        try {
            const res = await verifyOtp(phone, otp.replace(/\s/g, ''))
            const { uid, chit_cycles_completed } = res?.data ?? {}
            loginUser('borrower', { phone, uid, isNewUser: !chit_cycles_completed })
        } catch (err) {
            setError(err.message || 'Incorrect code. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setOtp(''); setError(''); setDemoHint('')
        setLoading(true)
        try {
            const res = await sendOtp(phone)
            if (res?.data?.demo_otp) setDemoHint(res.data.demo_otp)
        } catch (err) {
            setError(err.message || 'Could not resend OTP.')
        } finally {
            setLoading(false)
        }
    }

    // ── Register handler ─────────────────────────────────────────────────────
    const handleRegister = useCallback(async () => {
        setRegError('')
        const cleanPhone = regPhone.trim()
        const cleanAadhaar = aadhaar.replace(/\s/g, '')
        const cleanUpi = upiId.trim()

        if (!/^[6-9]\d{9}$/.test(cleanPhone)) { setRegError('Enter a valid 10-digit mobile number.'); return }
        if (cleanAadhaar.length !== 12) { setRegError('Aadhaar must be exactly 12 digits.'); return }
        if (!/^[\w.]+@[\w]+$/.test(cleanUpi)) { setRegError('Enter a valid UPI ID (e.g. name@ybl).'); return }

        setRegLoading(true)
        try {
            // Demo: skip real API, create user locally
            setRegSuccess(true)
            setTimeout(() => {
                loginUser('borrower', {
                    phone: cleanPhone,
                    uid: `borrower_${Date.now()}`,
                    isNewUser: true,
                    aadhaar_last4: cleanAadhaar.slice(-4),
                    upi_id: cleanUpi,
                })
            }, 1200)
        } catch (err) {
            setRegError(err.message || 'Registration failed. Please try again.')
        } finally {
            setRegLoading(false)
        }
    }, [regPhone, aadhaar, upiId, loginUser])

    return (
        <div
            className="relative min-h-screen w-full max-w-md mx-auto flex flex-col overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #f9f6f0 0%, #ecfdf5 60%, #fefce8 100%)' }}
        >
            <AmbientBlobs />

            {/* ── Back to role selection ── */}
            <motion.button
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => navigate('/auth')}
                className="relative z-10 flex items-center gap-1.5 text-sm text-stone-500 font-sans hover:text-emerald-700 transition-colors m-5 self-start"
                aria-label="Back to role selection"
            >
                <ArrowLeft size={16} strokeWidth={2} />
                All login options
            </motion.button>

            <div className="relative z-10 flex-1 flex flex-col justify-center px-5 pb-10">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="flex flex-col items-center mb-6"
                >
                    <img
                        src="/icon-512.png"
                        alt="SheVest"
                        className="w-16 h-16 rounded-2xl shadow-lg shadow-emerald-200 mb-4"
                        draggable="false"
                    />
                    <h1 className="text-2xl font-extrabold text-emerald-950 font-sans tracking-tight">
                        {mode === 'register' ? 'Create Your Account' : 'Member Login'}
                    </h1>
                    <p className="text-sm text-stone-500 font-sans mt-1 text-center leading-relaxed max-w-xs">
                        {mode === 'register'
                            ? 'Verify your identity to access SheVest credit'
                            : 'Enter your registered mobile number to continue'
                        }
                    </p>
                </motion.div>

                {/* Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 }}
                    className="mb-4"
                >
                    <MethodToggle mode={mode} onChange={handleModeChange} />
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-3xl p-6"
                >
                    <AnimatePresence mode="wait">
                        {mode === 'login' ? (
                            <motion.div key="login" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
                                <AnimatePresence mode="wait">
                                    {step === 'phone' ? (
                                        <PhoneStep
                                            key="phone"
                                            phone={phone}
                                            setPhone={setPhone}
                                            onSendOtp={handleSendOtp}
                                            loading={loading}
                                            error={error}
                                        />
                                    ) : (
                                        <OtpStep
                                            key="otp"
                                            phone={phone}
                                            otp={otp}
                                            setOtp={setOtp}
                                            onVerify={handleVerify}
                                            onBack={() => { setStep('phone'); setOtp(''); setError('') }}
                                            onResend={handleResend}
                                            loading={loading}
                                            error={error}
                                            demoHint={demoHint}
                                        />
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <motion.div key="register" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
                                <RegisterPanel
                                    phone={regPhone} setPhone={setRegPhone}
                                    aadhaar={aadhaar} setAadhaar={setAadhaar}
                                    upiId={upiId} setUpiId={setUpiId}
                                    loading={regLoading}
                                    error={regError}
                                    success={regSuccess}
                                    onSubmit={handleRegister}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Trust badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="flex items-center justify-center gap-1.5 mt-6"
                >
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span className="text-xs text-stone-400 font-sans">
                        Your data is encrypted and never shared with lenders
                    </span>
                </motion.div>


            </div>
        </div>
    )
}
