/**
 * views/NgoLogin.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 2 — NGO Partner Login Portal
 *
 * High-security glassmorphism authentication view with a toggle switch between
 * two login methods:
 *
 *   Method A — "Mobile OTP"
 *     · Phone number (+91) → Send OTP
 *     · 4-digit OTP entry  → Verify
 *
 *   Method B — "Official Credentials"
 *     · Email
 *     · Password  (show/hide toggle)
 *     · Aadhaar Number (12 digits, masked 4-4-4)
 *     · NGO License Number
 *     · Primary Emerald "Authenticate Organization" button
 *
 * On success: calls loginUser('ngo_admin', payload) → Agent 3 sets userRole.
 * Falls back to legacy login('ngo_admin') if loginUser not yet present.
 *
 * Design: Soft 3D Glassmorphism · amber NGO accent · no pure black.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Building2,
    Phone,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    ArrowLeft,
    RefreshCw,
    CreditCard,
    FileText,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const RESEND_COOLDOWN = 30

// ─── Ambient blobs (amber-toned for NGO) ─────────────────────────────────────
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

// ─── Method toggle switch ─────────────────────────────────────────────────────
function MethodToggle({ method, onChange }) {
    const isOtp = method === 'otp'

    return (
        <div
            className="flex rounded-2xl bg-stone-100/80 p-1 gap-1"
            role="tablist"
            aria-label="Login method"
        >
            {[
                { id: 'otp',         label: 'Mobile OTP',          icon: Phone    },
                { id: 'credentials', label: 'Official Credentials', icon: FileText },
            ].map(({ id, label, icon: Icon }) => {
                const active = method === id
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(id)}
                        className={[
                            'flex-1 flex items-center justify-center gap-1.5',
                            'py-2.5 px-2 rounded-xl text-xs font-semibold font-sans',
                            'transition-all duration-200',
                            active
                                ? 'bg-white shadow-sm text-emerald-800 border border-white/60'
                                : 'text-stone-500 hover:text-stone-700',
                        ].join(' ')}
                    >
                        <Icon size={13} strokeWidth={2.2} />
                        {label}
                    </button>
                )
            })}
        </div>
    )
}

// ─── Shared field component ───────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-stone-600 font-sans">
                {label}
                {hint && (
                    <span className="ml-1.5 text-xs font-normal text-stone-400">{hint}</span>
                )}
            </label>
            {children}
            {error && (
                <p className="text-xs text-rose-500 font-sans flex items-center gap-1">
                    <AlertTriangle size={11} />
                    {error}
                </p>
            )}
        </div>
    )
}

// ─── Text / email input ───────────────────────────────────────────────────────
function TextInput({ type = 'text', placeholder, value, onChange, icon: Icon, error, ...rest }) {
    return (
        <div
            className={[
                'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden',
                'transition-colors duration-150',
                error
                    ? 'border-rose-300'
                    : 'border-stone-200 focus-within:border-emerald-400',
            ].join(' ')}
        >
            {Icon && (
                <div className="pl-3 pr-2 text-stone-300">
                    <Icon size={16} strokeWidth={1.8} />
                </div>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="flex-1 py-3.5 pr-3 bg-transparent text-sm font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none focus:ring-0"
                {...rest}
            />
        </div>
    )
}

// ─── Password input with show/hide ────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder = 'Enter password', error }) {
    const [visible, setVisible] = useState(false)
    return (
        <div
            className={[
                'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden',
                'transition-colors duration-150',
                error
                    ? 'border-rose-300'
                    : 'border-stone-200 focus-within:border-emerald-400',
            ].join(' ')}
        >
            <div className="pl-3 pr-2 text-stone-300">
                <Lock size={16} strokeWidth={1.8} />
            </div>
            <input
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete="current-password"
                className="flex-1 py-3.5 bg-transparent text-sm font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none focus:ring-0"
            />
            <button
                type="button"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                className="pr-3 text-stone-400 hover:text-stone-600 transition-colors"
            >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    )
}

// ─── Aadhaar input — formats as XXXX XXXX XXXX ───────────────────────────────
function AadhaarInput({ value, onChange, error }) {
    const handleChange = e => {
        // Strip all non-digits, limit to 12
        const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
        onChange(raw)
    }

    // Display with spaces: "1234 5678 9012"
    const display = value
        .match(/.{1,4}/g)
        ?.join(' ') ?? value

    const isValid = value.length === 12

    return (
        <div
            className={[
                'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden',
                'transition-colors duration-150',
                error
                    ? 'border-rose-300'
                    : 'border-stone-200 focus-within:border-emerald-400',
            ].join(' ')}
        >
            <div className="pl-3 pr-2 text-stone-300">
                <CreditCard size={16} strokeWidth={1.8} />
            </div>
            <input
                type="text"
                inputMode="numeric"
                value={display}
                onChange={handleChange}
                placeholder="1234 5678 9012"
                maxLength={14}   /* 12 digits + 2 spaces */
                className="flex-1 py-3.5 bg-transparent text-sm font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none focus:ring-0 tracking-widest"
                aria-label="Aadhaar number"
            />
            {isValid && <CheckCircle2 size={16} className="text-emerald-400 mr-3 shrink-0" />}
        </div>
    )
}

// ─── 4-digit OTP boxes ────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
    const inputs = useRef([])
    const OTP_LEN = 4

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
        const arr = value.padEnd(OTP_LEN, ' ').split('')
        arr[idx] = digit[0]
        onChange(arr.join('').trimEnd())
        if (idx < OTP_LEN - 1) inputs.current[idx + 1]?.focus()
    }

    return (
        <div className="flex gap-3 justify-center">
            {Array.from({ length: OTP_LEN }).map((_, i) => {
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
                                'w-14 h-14 rounded-2xl border-2 text-center text-xl font-bold font-sans',
                                'bg-white/70 text-emerald-950 caret-emerald-500',
                                'focus:outline-none transition-colors duration-150 disabled:opacity-50',
                                filled
                                    ? 'border-amber-400 bg-amber-50/60'
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
// METHOD A — Mobile OTP (2 sub-steps)
// ═══════════════════════════════════════════════════════════════════════════════
function OtpMethod({ onSuccess }) {
    const [step,    setStep]    = useState('phone')
    const [phone,   setPhone]   = useState('')
    const [otp,     setOtp]     = useState('')
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState('')

    const isValidPhone = /^[6-9]\d{9}$/.test(phone)
    const isOtpDone    = otp.replace(/\s/g, '').length === 4

    const sendOtp = async () => {
        setError(''); setLoading(true)
        await new Promise(r => setTimeout(r, 900))
        setLoading(false); setStep('otp')
    }

    const verify = async () => {
        setError(''); setLoading(true)
        await new Promise(r => setTimeout(r, 1000))
        if (!isOtpDone) { setError('Enter all 4 digits.'); setLoading(false); return }
        onSuccess({ phone })
    }

    return (
        <AnimatePresence mode="wait">
            {step === 'phone' ? (
                <motion.div
                    key="phone"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28 }}
                    className="flex flex-col gap-5"
                >
                    <Field label="NGO Registered Mobile" error={error}>
                        <div className={[
                            'flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden',
                            'transition-colors duration-150',
                            error ? 'border-rose-300' : 'border-stone-200 focus-within:border-amber-400',
                        ].join(' ')}>
                            <div className="flex items-center gap-1 px-3 py-3.5 border-r border-stone-200 bg-stone-50/80">
                                <span className="text-base">🇮🇳</span>
                                <span className="text-sm font-semibold text-stone-600 font-sans">+91</span>
                            </div>
                            <input
                                type="tel" inputMode="numeric" maxLength={10}
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="98765 43210"
                                autoFocus
                                className="flex-1 px-3 py-3.5 bg-transparent text-base font-sans text-emerald-950 placeholder:text-stone-300 focus:outline-none"
                            />
                            {isValidPhone && <CheckCircle2 size={18} className="text-amber-400 mr-3 shrink-0" />}
                        </div>
                    </Field>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={!isValidPhone || loading}
                        onClick={sendOtp}
                        className={[
                            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base font-sans transition-all duration-200',
                            isValidPhone && !loading
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                        ].join(' ')}
                    >
                        {loading
                            ? <><RefreshCw size={16} className="animate-spin" /><span>Sending OTP…</span></>
                            : <><Phone size={16} strokeWidth={2} /><span>Send OTP</span></>
                        }
                    </motion.button>
                </motion.div>
            ) : (
                <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28 }}
                    className="flex flex-col gap-5"
                >
                    {/* Banner */}
                    <div className="rounded-2xl bg-amber-50/80 border border-amber-200/60 px-4 py-3">
                        <p className="text-sm font-sans text-amber-800">
                            OTP sent to <span className="font-bold">+91 {phone}</span>
                        </p>
                        <p className="text-xs text-amber-600 font-sans mt-0.5">Valid for 10 minutes</p>
                    </div>

                    <Field label="Enter 4-digit OTP" error={error}>
                        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                    </Field>

                    <ResendTimer onResend={() => { setOtp(''); setError('') }} />

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={!isOtpDone || loading}
                        onClick={verify}
                        className={[
                            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base font-sans transition-all duration-200',
                            isOtpDone && !loading
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                        ].join(' ')}
                    >
                        {loading
                            ? <><RefreshCw size={16} className="animate-spin" /><span>Verifying…</span></>
                            : <><Lock size={16} strokeWidth={2} /><span>Verify &amp; Secure Login</span></>
                        }
                    </motion.button>

                    <button
                        onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                        className="flex items-center justify-center gap-1.5 text-sm text-stone-400 font-sans hover:text-stone-600 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Change number
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// METHOD B — Official Credentials
// ═══════════════════════════════════════════════════════════════════════════════

// Very lightweight password strength helper (no external dependency)
function passwordStrength(pwd) {
    if (pwd.length < 8)  return { level: 0, label: '',        color: '' }
    if (pwd.length < 12) return { level: 1, label: 'Weak',    color: 'bg-rose-400' }
    const hasUpper   = /[A-Z]/.test(pwd)
    const hasDigit   = /\d/.test(pwd)
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
    const score = [hasUpper, hasDigit, hasSpecial].filter(Boolean).length
    if (score <= 1)      return { level: 2, label: 'Fair',    color: 'bg-amber-400' }
    if (score === 2)     return { level: 3, label: 'Good',    color: 'bg-emerald-400' }
    return               { level: 4, label: 'Strong',   color: 'bg-emerald-500' }
}

function CredentialsMethod({ onSuccess }) {
    const [form, setForm] = useState({
        email:      '',
        password:   '',
        aadhaar:    '',
        licenseNo:  '',
    })
    const [errors,  setErrors]  = useState({})
    const [loading, setLoading] = useState(false)

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
    const setAadhaar = raw => setForm(f => ({ ...f, aadhaar: raw }))

    const pwdStrength = passwordStrength(form.password)

    const validate = () => {
        const errs = {}
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            errs.email = 'Enter a valid email address.'
        if (form.password.length < 8)
            errs.password = 'Password must be at least 8 characters.'
        if (form.aadhaar.length !== 12)
            errs.aadhaar = 'Aadhaar must be exactly 12 digits.'
        if (form.licenseNo.trim().length < 4)
            errs.licenseNo = 'Enter a valid NGO License Number.'
        return errs
    }

    const handleSubmit = async e => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }
        setErrors({})
        setLoading(true)
        // Mock: simulate API round-trip
        await new Promise(r => setTimeout(r, 1400))
        onSuccess({ email: form.email, licenseNo: form.licenseNo })
    }

    return (
        <motion.form
            key="credentials"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28 }}
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
        >
            {/* Security notice */}
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50/80 border border-amber-200/60 px-3 py-2.5">
                <ShieldCheck size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 font-sans leading-relaxed">
                    All credentials are transmitted over TLS 1.3 and never stored in plaintext.
                </p>
            </div>

            {/* Email */}
            <Field label="Official Email" error={errors.email}>
                <TextInput
                    type="email"
                    icon={Mail}
                    placeholder="director@ngo.org.in"
                    value={form.email}
                    onChange={set('email')}
                    error={errors.email}
                    autoComplete="email"
                />
            </Field>

            {/* Password + strength bar */}
            <Field label="Password" error={errors.password}>
                <PasswordInput
                    value={form.password}
                    onChange={set('password')}
                    error={errors.password}
                />
                {form.password.length >= 8 && (
                    <div className="flex items-center gap-2 mt-1" aria-live="polite">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full rounded-full ${pwdStrength.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${(pwdStrength.level / 4) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-stone-500 font-sans w-12 text-right">
                            {pwdStrength.label}
                        </span>
                    </div>
                )}
            </Field>

            {/* Aadhaar */}
            <Field label="Aadhaar Number" hint="(Director / Authorised Signatory)" error={errors.aadhaar}>
                <AadhaarInput
                    value={form.aadhaar}
                    onChange={setAadhaar}
                    error={errors.aadhaar}
                />
            </Field>

            {/* NGO License */}
            <Field label="NGO License Number" error={errors.licenseNo}>
                <TextInput
                    icon={FileText}
                    placeholder="e.g. MH/NGO/2023/00456"
                    value={form.licenseNo}
                    onChange={set('licenseNo')}
                    error={errors.licenseNo}
                    autoComplete="off"
                    autoCapitalize="characters"
                />
            </Field>

            {/* Submit */}
            <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className={[
                    'w-full flex items-center justify-center gap-2',
                    'py-4 mt-1 rounded-2xl font-bold text-base font-sans',
                    'transition-all duration-200',
                    !loading
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed',
                ].join(' ')}
            >
                {loading ? (
                    <><RefreshCw size={16} className="animate-spin" /><span>Authenticating…</span></>
                ) : (
                    <><ShieldCheck size={16} strokeWidth={2} /><span>Authenticate Organization</span></>
                )}
            </motion.button>
        </motion.form>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main view
// ═══════════════════════════════════════════════════════════════════════════════
export default function NgoLogin() {
    const navigate  = useNavigate()
    const appCtx    = useApp()
    const loginUser = appCtx.loginUser ?? ((role) => appCtx.login(role))

    const [method, setMethod] = useState('otp')  // 'otp' | 'credentials'

    const handleSuccess = payload => {
        loginUser('ngo_admin', { ...payload, isNewUser: false })
        // Navigation handled by App.jsx RoleNavigator → /ngo
    }

    return (
        <div
            className="relative min-h-screen w-full max-w-md mx-auto flex flex-col overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #f9f6f0 0%, #fefce8 55%, #ecfdf5 100%)' }}
        >
            <AmbientBlobs />

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
                        High-security access for verified partner organisations
                    </p>
                </motion.div>

                {/* Frosted glass card */}
                <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-3xl p-6 flex flex-col gap-5"
                >
                    {/* Method toggle */}
                    <MethodToggle
                        method={method}
                        onChange={m => setMethod(m)}
                    />

                    {/* Animated method panels */}
                    <AnimatePresence mode="wait">
                        {method === 'otp' ? (
                            <motion.div
                                key="otp-method"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                            >
                                <OtpMethod onSuccess={handleSuccess} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="cred-method"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                            >
                                <CredentialsMethod onSuccess={handleSuccess} />
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

                {/* Demo shortcut */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.65 }}
                    className="mt-5 rounded-2xl border border-dashed border-amber-300/70 bg-amber-50/50 px-4 py-3"
                >
                    <p className="text-xs text-amber-700 font-semibold font-sans mb-2 text-center">
                        ⚡ Demo shortcut
                    </p>
                    <button
                        onClick={() => handleSuccess({ email: 'admin@gramseva.org', licenseNo: 'MH/NGO/2023/00001' })}
                        className="w-full text-sm font-semibold text-amber-700 font-sans py-2 rounded-xl bg-white/60 hover:bg-amber-50 border border-amber-200/50 transition-colors"
                    >
                        Quick Login as NGO Admin (GramSeva)
                    </button>
                </motion.div>
            </div>
        </div>
    )
}
