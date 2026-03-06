/**
 * views/AuthEntry.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 1 — Auth Entry Screen
 *
 * The first screen a user sees after the splash. Presents two large, tactile
 * glassmorphism cards to route the user to the correct login portal:
 *   · Member    → /auth/member
 *   · NGO Admin → /auth/ngo
 *
 * Design: Soft 3D Glassmorphism (bg-stone-50, emerald/amber accents).
 * NO pure black anywhere. Mobile-first (max-w-md).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Building2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

// ─── Floating ambient blobs (pure CSS, no heavy 3rd-party) ───────────────────
function AmbientBlobs() {
    return (
        <>
            {/* Top-left emerald blob */}
            <div
                aria-hidden="true"
                className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(110,231,183,0.28) 0%, transparent 70%)',
                    filter: 'blur(32px)',
                }}
            />
            {/* Bottom-right amber blob */}
            <div
                aria-hidden="true"
                className="absolute -bottom-20 -right-16 w-64 h-64 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)',
                    filter: 'blur(32px)',
                }}
            />
        </>
    )
}

// ─── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ icon: Icon, title, subtitle, badge, accentClass, borderClass, onClick, delay }) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            className={[
                'w-full text-left rounded-3xl p-6',
                'bg-white/60 backdrop-blur-xl border shadow-lg',
                'transition-shadow duration-200 hover:shadow-xl',
                borderClass,
            ].join(' ')}
            aria-label={title}
        >
            {/* Icon + badge row */}
            <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${accentClass}`}>
                    <Icon size={26} strokeWidth={1.8} />
                </div>
                {badge && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200/60">
                        {badge}
                    </span>
                )}
            </div>

            {/* Copy */}
            <h2 className="text-lg font-bold text-emerald-950 font-sans mb-1 leading-snug">
                {title}
            </h2>
            <p className="text-sm text-stone-500 font-sans leading-relaxed">
                {subtitle}
            </p>

            {/* CTA row */}
            <div className="mt-5 flex items-center gap-1.5">
                <span className="text-sm font-semibold text-emerald-700 font-sans">Get started</span>
                <ArrowRight size={15} className="text-emerald-600" strokeWidth={2.2} />
            </div>
        </motion.button>
    )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function AuthEntry() {
    const navigate = useNavigate()

    return (
        <div
            className="auth-bg relative min-h-screen w-full max-w-md mx-auto flex flex-col overflow-hidden"
        >
            <AmbientBlobs />

            {/* ── Header ── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="relative z-10 flex flex-col items-center pt-14 pb-2 px-6"
            >
                {/* Logo mark */}
                <img
                    src="/icon-512.png"
                    alt="SheVest"
                    className="w-16 h-16 rounded-2xl shadow-lg shadow-emerald-200 mb-5"
                    draggable="false"
                />

                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-extrabold text-emerald-950 tracking-tight font-sans">
                        SheVest
                    </span>
                    <Sparkles size={18} className="text-amber-400" />
                </div>

                <p className="text-sm text-stone-500 font-sans text-center leading-relaxed">
                    Financial freedom for every woman
                </p>
            </motion.div>

            {/* ── Divider headline ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="relative z-10 px-6 pt-10 pb-4"
            >
                <h1 className="text-xl font-bold text-emerald-950 font-sans leading-snug">
                    How are you joining{' '}
                    <span className="text-emerald-600">SheVest</span> today?
                </h1>
                <p className="text-sm text-stone-400 font-sans mt-1">
                    Choose your role to continue
                </p>
            </motion.div>

            {/* ── Role cards ── */}
            <div className="relative z-10 flex flex-col gap-4 px-6 pb-10">
                <RoleCard
                    icon={Users}
                    title="I am a Member"
                    subtitle="Join a Chit Pool, build your Trust Score, and access micro-loans on your own terms."
                    badge="Most Popular"
                    accentClass="bg-emerald-100 text-emerald-600"
                    borderClass="border-emerald-200/60 hover:border-emerald-300/80"
                    onClick={() => navigate('/auth/member')}
                    delay={0.3}
                />

                <RoleCard
                    icon={Building2}
                    title="I am an NGO Partner"
                    subtitle="Manage your community members, verify KYC, and monitor loan health across your network."
                    accentClass="bg-amber-100 text-amber-600"
                    borderClass="border-amber-200/60 hover:border-amber-300/80"
                    onClick={() => navigate('/auth/ngo')}
                    delay={0.42}
                />
            </div>

            {/* ── Footer trust line ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="relative z-10 mt-auto pb-8 flex flex-col items-center gap-1 px-6"
            >
                <div className="flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span className="text-xs text-stone-400 font-sans">
                        256-bit encrypted · RBI compliant · DigiLocker KYC
                    </span>
                </div>
            </motion.div>
        </div>
    )
}
