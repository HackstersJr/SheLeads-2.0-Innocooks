/**
 * components/B2BHeader.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * White-label B2B Top Header
 *
 * LEFT  — SheVest wordmark + custom logo
 * CENTER— NGO partner logo placeholder
 * RIGHT — Theme toggle (Sun/Moon) · Language cycle (EN → हि → ಕ) · Logout
 *
 * Lang state is lowercase BCP-47 root: 'en' | 'hi' | 'kn'
 * Theme state: 'light' | 'dark' — toggled via AppContext.toggleTheme()
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Building2, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// Display labels & cycle order for the language pill
const LANG_DISPLAY = { en: 'EN', hi: 'हि', kn: 'ಕ' }
const LANG_NEXT_LABEL = { en: 'हि', hi: 'ಕ', kn: 'EN' }
const LANG_FULL = { en: 'English', hi: 'Hindi', kn: 'Kannada' }

// ─── NGO Partner Logo Placeholder ────────────────────────────────────────────
function PartnerLogo() {
    return (
        <div
            className="
                flex items-center gap-1.5 px-3 py-1 rounded-xl
                border border-stone-200/70
                bg-white/60 backdrop-blur-sm
            "
            aria-label="NGO Partner Logo"
        >
            <span className="
                w-5 h-5 rounded-full flex-shrink-0
                bg-gradient-to-br from-brand-400 to-brand-600
                flex items-center justify-center
                text-white text-[8px] font-black
            ">N</span>
            <span className="text-[10px] font-semibold text-stone-500 leading-none">
                NGO Partner
            </span>
        </div>
    )
}

// ─── Language Cycle Pill ──────────────────────────────────────────────────────
// lang prop is lowercase ('en' | 'hi' | 'kn'); displays human-readable labels.
function LangToggle({ lang, onToggle }) {
    const current = LANG_DISPLAY[lang] ?? lang.toUpperCase()
    const next = LANG_NEXT_LABEL[lang] ?? 'EN'

    return (
        <button
            onClick={onToggle}
            id="lang-toggle-btn"
            aria-label={`Current language: ${LANG_FULL[lang]}. Click to switch.`}
            className="
                relative flex items-center gap-0.5 px-2.5 py-1
                rounded-full select-none
                border border-stone-200/80
                bg-white/70 backdrop-blur-sm
                text-[11px] font-bold
                hover:bg-emerald-50/80
                hover:border-emerald-200/60
                active:scale-95 transition-all duration-200
                shadow-[0_2px_8px_rgba(31,38,135,0.06)]
            "
        >
            <span className="text-emerald-700">{current}</span>
            <span className="text-stone-300 mx-0.5 text-[10px]">/</span>
            <span className="text-stone-400">{next}</span>
        </button>
    )
}



// ─── Main Header ──────────────────────────────────────────────────────────────
export default function B2BHeader() {
    const { lang, toggleLang, t, isAuthenticated, logout, userRole } = useApp()
    const navigate = useNavigate()

    return (
        <header
            className="glass-nav flex-shrink-0 z-40"
            role="banner"
        >
            <div className="flex items-center justify-between px-4 h-14">

                {/* ── LEFT — SheVest brand mark ── */}
                <div className="flex items-center gap-2">
                    <img
                        src="/icon-512.png"
                        alt="SheVest"
                        className="w-8 h-8 rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.35)] flex-shrink-0"
                        draggable="false"
                        aria-hidden="true"
                    />
                    <div className="flex flex-col leading-none">
                        <span className="text-base font-extrabold text-stone-800 tracking-tight">
                            She<span className="text-brand-600">Vest</span>
                        </span>
                        <span className="text-[9px] font-medium text-stone-400 tracking-wider uppercase">
                            {t.poweredBy}
                        </span>
                    </div>
                </div>

                {/* ── CENTER — White-label NGO Partner placeholder ── */}
                <PartnerLogo />

                {/* ── RIGHT — Role nav · Language cycle · Logout ── */}
                <div className="flex items-center gap-2">
                    {isAuthenticated && userRole === 'ngo_admin' && (
                        <button
                            type="button"
                            onClick={() => navigate('/ngo-dashboard')}
                            aria-label="NGO Portal"
                            className="
                                flex items-center gap-1 px-2.5 py-1 rounded-xl
                                bg-white/60 backdrop-blur-sm border border-stone-200/60
                                text-xs font-semibold text-stone-600
                                hover:bg-emerald-50/80 hover:border-emerald-200/60 hover:text-emerald-700
                                active:scale-95 transition-all duration-200
                                shadow-[0_2px_8px_rgba(31,38,135,0.06)]
                            "
                        >
                            <Building2 size={13} strokeWidth={2} aria-hidden="true" />
                            NGO Portal
                        </button>
                    )}
                    {isAuthenticated && userRole === 'member' && (
                        <button
                            type="button"
                            onClick={() => navigate('/member-hub')}
                            aria-label="Member Hub"
                            className="
                                flex items-center gap-1 px-2.5 py-1 rounded-xl
                                bg-white/60 backdrop-blur-sm border border-stone-200/60
                                text-xs font-semibold text-stone-600
                                hover:bg-emerald-50/80 hover:border-emerald-200/60 hover:text-emerald-700
                                active:scale-95 transition-all duration-200
                                shadow-[0_2px_8px_rgba(31,38,135,0.06)]
                            "
                        >
                            <Home size={13} strokeWidth={2} aria-hidden="true" />
                            Member Hub
                        </button>
                    )}
                    <LangToggle lang={lang} onToggle={toggleLang} />
                    {isAuthenticated && (
                        <button
                            onClick={logout}
                            aria-label="Log out"
                            className="
                                w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                                border border-stone-200/80
                                bg-white/70 backdrop-blur-sm
                                text-stone-400
                                hover:text-rose-500 hover:border-rose-200/70 hover:bg-rose-50/80
                                active:scale-95 transition-all duration-200
                                shadow-[0_2px_8px_rgba(31,38,135,0.06)]
                            "
                        >
                            <LogOut size={14} strokeWidth={2} />
                        </button>
                    )}
                </div>
            </div>

            {/* Subtle 3D depth line */}
            <div
                className="h-px w-full"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.15) 30%, rgba(167,243,208,0.25) 50%, rgba(16,185,129,0.15) 70%, transparent 100%)',
                }}
                aria-hidden="true"
            />
        </header>
    )
}
