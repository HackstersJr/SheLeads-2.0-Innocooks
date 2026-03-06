/**
 * views/NgoLogin.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 1 — NGO Partner Login Portal (re-architected)
 *
 * Toggle: "Login" | "Register NGO"
 *
 *   Login — frictionless daily access
 *     · Phone (+91) → 6-digit OTP → verifyOtp → loginUser('ngo_admin')
 *     · Demo OTP hint shown in UI
 *
 *   Register NGO — full KYC onboarding
 *     · Phone Number
 *     · Email
 *     · Aadhaar (12 digits, masked 4-4-4)
 *     · NGO License Number
 *     · Primary Emerald "Submit NGO Application" button → ngoLogin()
 *
 * Design: Soft 3D Glassmorphism · amber NGO accent · no pure black.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Building2,
    Phone,
    Mail,
    ShieldCheck,
    ArrowLeft,
    ArrowRight,
    ChevronLeft,
    RefreshCw,
    CreditCard,
    FileText,
    CheckCircle2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { sendOtp, verifyOtp, ngoLogin } from '../api/shevestApi'
import NgoSelect from '../components/atoms/NgoSelect'
import LegalConsentModal from '../components/organisms/LegalConsentModal'

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_LENGTH = 6
const RESEND_COOLDOWN = 30

// ─── Ambient warm blobs ───────────────────────────────────────────────────────
function AmbientBlobs() {
    return (
        <>
            <div
                aria-hidden="true"
                className="absolute -top-24 -right-20 w-80 h-80 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)',
                    filter: 'blur(36px)',
                }}
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(110,231,183,0.18) 0%, transparent 70%)',
                    filter: 'blur(36px)',
                }}
            />
        </>
    )
}

// ─── Toggle: Login | Register NGO ────────────────────────────────────────────
function MethodToggle({ mode, onChange }) {
    const tabs = [
        { id: 'login',    label: 'Login'        },
        { id: 'register', label: 'Register NGO' },
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
                                layoutId="ngo-tab-bg"
                                className="absolute inset-0 bg-amber-500 rounded-xl shadow-md"
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

// ─── Shared field wrapper ─────────────────────────────────────────────────────
function Field({ label, icon: Icon, children, error }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-stone-600 font-sans flex items-center gap-1.5">
                {Icon && <Icon size={12} className="text-amber-500" />}
                {label}
            </label>
            {children}
            {error && (
                <p className="text-xs text-rose-500 font-sans">{error}</p>
            )}
        </div>
    )
}

// ─── Text input ───────────────────────────────────────────────────────────────
function TextInput({ type = 'text', placeholder, value, onChange, prefix, inputMode, maxLength, autoComplete, error }) {
    return (
        <div className={[
            'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden transition-colors duration-150',
            error ? 'border-rose-300' : 'border-stone-200 focus-within:border-amber-400',
        ].join(' ')}>
            {prefix && (
                <span className="pl-3 pr-2 py-3.5 text-sm font-semibold text-stone-500 font-sans border-r border-stone-200 bg-stone-50/80 whitespace-nowrap">
                    {prefix}
                </span>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                inputMode={inputMode}
                maxLength={maxLength}
                autoComplete={autoComplete}
                className="flex-1 px-3 py-3.5 bg-transparent text-sm font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none"
            />
        </div>
    )
}

// ─── Aadhaar masked input ─────────────────────────────────────────────────────
function AadhaarInput({ value, onChange, error }) {
    const handleChange = useCallback(e => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
        onChange(raw)
    }, [onChange])

    const display = value.match(/.{1,4}/g)?.join(' ') ?? value
    const isValid = value.length === 12

    return (
        <div className={[
            'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden transition-colors duration-150',
            error ? 'border-rose-300' : 'border-stone-200 focus-within:border-amber-400',
        ].join(' ')}>
            <input
                type="text"
                inputMode="numeric"
                value={display}
                onChange={handleChange}
                placeholder="1234 5678 9012"
                maxLength={14}
                className="flex-1 px-3 py-3.5 bg-transparent text-sm font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none tracking-widest"
                aria-label="Aadhaar number"
            />
            {isValid && <CheckCircle2 size={16} className="text-emerald-400 mr-3 shrink-0" />}
        </div>
    )
}

// ─── 6-digit OTP boxes ────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
    const inputs = useRef([])

    useEffect(() => { inputs.current[0]?.focus() }, [])

    const handleChange = (e, idx) => {
        const digit = e.target.value.replace(/\D/g, '')
        if (!digit) {
            const arr = value.split('')
            arr[idx] = ''
            onChange(arr.join(''))
            if (idx > 0) inputs.current[idx - 1]?.focus()
            return
        }
        const arr = value.padEnd(OTP_LENGTH, ' ').split('')
        arr[idx] = digit[0]
        onChange(arr.join('').trimEnd())
        if (idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus()
    }

    const handlePaste = e => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
        if (pasted.length > 0) {
            onChange(pasted)
            inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
        }
        e.preventDefault()
    }

    return (
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const filled = !!(value[i]?.trim())
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
                            onKeyDown={e => {
                                if (e.key === 'Backspace' && !value[i] && i > 0) {
                                    inputs.current[i - 1]?.focus()
                                }
                            }}
                            aria-label={`OTP digit ${i + 1}`}
                            className={[
                                'w-10 h-12 rounded-xl border-2 text-center text-lg font-bold font-sans',
                                'bg-white/70 text-emerald-950 caret-amber-500',
                                'focus:outline-none transition-colors duration-150 disabled:opacity-50',
                                filled
                                    ? 'border-amber-400 bg-amber-50/60 text-amber-700'
                                    : 'border-stone-200 hover:border-amber-200',
                            ].join(' ')}
                        />
                    </motion.div>
                )
            })}
        </div>
    )
}

// ─── Resend OTP timer ─────────────────────────────────────────────────────────
function ResendTimer({ onResend }) {
    const [secs, setSecs] = useState(RESEND_COOLDOWN)

    useEffect(() => {
        if (secs <= 0) return
        const t = setTimeout(() => setSecs(s => s - 1), 1000)
        return () => clearTimeout(t)
    }, [secs])

    return (
        <div className="text-center text-sm font-sans">
            {secs > 0 ? (
                <span className="text-stone-400">
                    Resend in <span className="font-semibold text-amber-700">{secs}s</span>
                </span>
            ) : (
                <button
                    onClick={() => { setSecs(RESEND_COOLDOWN); onResend() }}
                    className="flex items-center gap-1 mx-auto text-amber-700 font-semibold hover:text-amber-600 transition-colors"
                >
                    <RefreshCw size={13} strokeWidth={2.2} />
                    Resend OTP
                </button>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PANEL — Phone + 6-digit OTP
// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PANEL — Phone + 6-digit OTP
// onRequestSend: consent-gated callback that actually fires sendOtp()
// onLoginUser:   direct loginUser call (no consent re-gate needed)
// ═══════════════════════════════════════════════════════════════════════════════
function LoginPanel({ onRequestSend, onLoginUser }) {
    const [step,      setStep]      = useState('phone')   // 'phone' | 'otp'
    const [phone,     setPhone]     = useState('')
    const [otp,       setOtp]       = useState('')
    const [demoHint,  setDemoHint]  = useState('')
    const [loading,   setLoading]   = useState(false)
    const [error,     setError]     = useState('')

    const isValidPhone = /^[6-9]\d{9}$/.test(phone)
    const isOtpDone    = otp.replace(/\s/g, '').length === OTP_LENGTH

    // Actual OTP-send logic — called AFTER consent is accepted
    const handleSendOtpActual = async () => {
        setError(''); setLoading(true)
        try {
            const res = await sendOtp(phone)
            const hint = res?.data?.demo_otp ?? res?.demo_otp ?? ''
            setDemoHint(String(hint))
            setStep('otp')
        } catch {
            setError('Failed to send OTP. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Gate consent before sending OTP (same pattern as MemberAuth)
    const handleSendOtp = () => onRequestSend(handleSendOtpActual)

    // Call loginUser directly — consent was already accepted at OTP-send stage
    const handleVerify = async () => {
        if (!isOtpDone) { setError(`Please enter all ${OTP_LENGTH} digits.`); return }
        setError(''); setLoading(true)
        try {
            const res = await verifyOtp(phone, otp)
            const uid = res?.data?.uid ?? 'ngo_admin_demo'
            onLoginUser({ uid, role: 'ngo_admin', phone, isNewUser: false })
        } catch {
            setError('Incorrect OTP. Please check and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence mode="wait">
            {step === 'phone' ? (
                <motion.div
                    key="login-phone"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                    className="flex flex-col gap-5"
                >
                    <Field label="NGO Registered Mobile" icon={Phone} error={error}>
                        <TextInput
                            value={phone}
                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="9876543210"
                            inputMode="numeric"
                            prefix="🇮🇳 +91"
                            autoComplete="tel"
                        />
                    </Field>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={!isValidPhone || loading}
                        onClick={handleSendOtp}
                        className={[
                            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base font-sans transition-all duration-200',
                            isValidPhone && !loading
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                        ].join(' ')}
                    >
                        {loading
                            ? <><RefreshCw size={16} className="animate-spin" /><span>Sending…</span></>
                            : <><span>Send OTP</span><ArrowRight size={16} /></>
                        }
                    </motion.button>
                </motion.div>
            ) : (
                <motion.div
                    key="login-otp"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                    className="flex flex-col gap-5"
                >
                    {/* Back button */}
                    <button
                        onClick={() => { setStep('phone'); setOtp(''); setError(''); setDemoHint('') }}
                        className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 font-sans transition-colors self-start"
                    >
                        <ChevronLeft size={14} />
                        +91 {phone}
                    </button>

                    {/* Demo OTP hint */}
                    {demoHint && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl bg-emerald-50/80 border border-emerald-200/60 px-4 py-3 text-center"
                        >
                            <p className="text-xs text-emerald-600 font-sans font-medium">Your OTP</p>
                            <p className="text-2xl font-bold tracking-[0.25em] text-amber-600 font-sans mt-0.5">
                                {demoHint}
                            </p>
                        </motion.div>
                    )}

                    <Field label="Enter 6-digit OTP" error={error}>
                        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                    </Field>

                    <ResendTimer onResend={() => { setOtp(''); setError(''); handleSendOtp() }} />

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={!isOtpDone || loading}
                        onClick={handleVerify}
                        className={[
                            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base font-sans transition-all duration-200',
                            isOtpDone && !loading
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                        ].join(' ')}
                    >
                        {loading
                            ? <><RefreshCw size={16} className="animate-spin" /><span>Verifying…</span></>
                            : <><span>Verify &amp; Login</span><ArrowRight size={16} /></>
                        }
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER NGO PANEL — Full KYC onboarding (no password)
// ═══════════════════════════════════════════════════════════════════════════════
function RegisterPanel({ onSuccess }) {
    const [form,    setForm]    = useState({ phone: '', email: '', aadhaar: '', license: '', parentOrg: '' })
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState('')

    const setField = key => e  => setForm(f => ({ ...f, [key]: e.target.value }))
    const setPhone       = e  => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
    const setAadhaar     = raw => setForm(f => ({ ...f, aadhaar: raw }))

    const validate = () => {
        const { phone, email, aadhaar, license } = form
        if (!/^[6-9]\d{9}$/.test(phone))           return 'Please enter a valid 10-digit mobile number.'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
        if (aadhaar.length !== 12)                  return 'Aadhaar must be exactly 12 digits.'
        if (!license.trim())                        return 'NGO License Number is required.'
        if (!form.parentOrg)                           return 'Please select your parent organisation.'
        return null
    }

    const handleSubmit = async () => {
        const err = validate()
        if (err) { setError(err); return }
        setError(''); setLoading(true)
        try {
            const res = await ngoLogin({
                email:              form.email.trim().toLowerCase(),
                aadhaar_number:     form.aadhaar,
                ngo_license_number: form.license.trim(),
            })
            const data = res?.data
            if (data?.access_token) {
                onSuccess({ uid: data.uid, role: 'ngo_admin', email: data.email, isNewUser: true })
            } else {
                setError(res?.message ?? res?.detail ?? 'Application could not be submitted. Please check your credentials.')
            }
        } catch {
            setError('Submission failed. Please verify your credentials and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            key="register"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
            className="flex flex-col gap-4"
        >
            {/* KYC notice */}
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50/80 border border-amber-200/60 px-3 py-2.5">
                <ShieldCheck size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 font-sans leading-relaxed">
                    All details are verified against DigiLocker &amp; MCA21 NGO registry.
                </p>
            </div>

            <Field label="Mobile Number" icon={Phone}>
                <TextInput
                    value={form.phone}
                    onChange={setPhone}
                    placeholder="9876543210"
                    inputMode="numeric"
                    prefix="🇮🇳 +91"
                    autoComplete="tel"
                />
            </Field>

            <Field label="Official Email" icon={Mail}>
                <TextInput
                    type="email"
                    value={form.email}
                    onChange={setField('email')}
                    placeholder="director@ngo.org.in"
                    autoComplete="email"
                />
            </Field>

            <Field label="Aadhaar Number" icon={CreditCard}>
                <AadhaarInput value={form.aadhaar} onChange={setAadhaar} />
            </Field>

            <Field label="NGO License Number" icon={FileText}>
                <TextInput
                    value={form.license}
                    onChange={setField('license')}
                    placeholder="MH/NGO/2023/00001"
                    autoComplete="off"
                />
            </Field>

            <NgoSelect
                label="Parent Organisation"
                value={form.parentOrg}
                onChange={val => setForm(f => ({ ...f, parentOrg: val }))}
            />

            {error && <p className="text-xs text-rose-500 font-sans text-center">{error}</p>}

            <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={loading}
                onClick={handleSubmit}
                className={[
                    'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base font-sans transition-all duration-200',
                    !loading
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                ].join(' ')}
            >
                {loading
                    ? <><RefreshCw size={16} className="animate-spin" /><span>Submitting…</span></>
                    : <><ShieldCheck size={16} strokeWidth={2} /><span>Submit NGO Application</span></>
                }
            </motion.button>
        </motion.div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main view
// ═══════════════════════════════════════════════════════════════════════════════
export default function NgoLogin() {
    const navigate  = useNavigate()
    const appCtx    = useApp()
    const loginUser = appCtx.loginUser ?? ((role) => appCtx.login(role))

    const [mode, setMode] = useState('login')   // 'login' | 'register'

    // ── Legal consent gate ─────────────────────────────────────────────────────────
    const [showConsent,     setShowConsent]     = useState(false)
    const [pendingAction,   setPendingAction]   = useState(null)
    const [consentAccepted, setConsentAccepted] = useState(false)

    const requireConsent = useCallback((action) => {
        if (consentAccepted) { action(); return }
        setPendingAction(() => action)
        setShowConsent(true)
    }, [consentAccepted])

    const handleConsentAccept = useCallback(() => {
        setConsentAccepted(true)
        setShowConsent(false)
        if (pendingAction) { pendingAction(); setPendingAction(null) }
    }, [pendingAction])

    const handleSuccess = useCallback(payload => {
        loginUser('ngo_admin', { ...payload, isNewUser: payload.isNewUser ?? false })
        // Navigation handled by App.jsx RoleNavigator → /ngo-dashboard
    }, [loginUser])

    return (
        <div
            className="auth-bg-ngo relative min-h-screen w-full max-w-md mx-auto flex flex-col overflow-hidden"
        >
            <AmbientBlobs />

            {/* ── Legal consent modal (z-[100]) ── */}
            {showConsent && (
                <LegalConsentModal
                    role="ngo_admin"
                    onAccept={handleConsentAccept}
                    onClose={() => setShowConsent(false)}
                />
            )}

            {/* ── Back button ── */}
            <motion.button
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => navigate('/auth')}
                className="relative z-10 flex items-center gap-1.5 text-sm text-stone-500 font-sans hover:text-amber-700 transition-colors m-5 self-start"
                aria-label="Back to role selection"
            >
                <ArrowLeft size={16} strokeWidth={2} />
                All login options
            </motion.button>

            {/* ── Content ── */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-5 pb-10">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="flex flex-col items-center mb-7"
                >
                    <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-200 mb-4">
                        <Building2 size={28} className="text-white" strokeWidth={1.8} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-emerald-950 font-sans tracking-tight">
                        NGO Partner Portal
                    </h1>
                    <p className="text-sm text-stone-500 font-sans mt-1 text-center max-w-xs leading-relaxed">
                        {mode === 'login'
                            ? 'Quick OTP access for verified partner organisations'
                            : 'Register your NGO for KYC-verified access'}
                    </p>
                </motion.div>

                {/* Frosted glass card */}
                <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-3xl p-6 flex flex-col gap-5"
                >
                    {/* Mode toggle */}
                    <MethodToggle mode={mode} onChange={setMode} />

                    {/* Animated panels */}
                    <AnimatePresence mode="wait">
                        {mode === 'login' ? (
                            <motion.div
                                key="login-panel"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                            >
                                <LoginPanel
                                onRequestSend={requireConsent}
                                onLoginUser={handleSuccess}
                            />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="register-panel"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                            >
                                <RegisterPanel onSuccess={(p) => requireConsent(() => handleSuccess(p))} />
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
                        SOC 2 compliant · DigiLocker KYC · RBI regulated
                    </span>
                </motion.div>


            </div>
        </div>
    )
}
