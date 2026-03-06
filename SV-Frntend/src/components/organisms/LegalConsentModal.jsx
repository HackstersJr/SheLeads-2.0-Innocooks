/**
 * components/organisms/LegalConsentModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 2 — Mandatory Legal Consent Gate
 *
 * A fixed full-screen glassmorphism overlay (z-[100]) that blocks the API
 * call (Send OTP / Register) until the user has read and accepted the Terms.
 *
 * Props:
 *   role       'member' | 'ngo_admin'   — controls dynamic text rendered
 *   onAccept   () => void               — fired when user clicks "Accept & Continue"
 *   onClose    () => void               — fired when user dismisses (X)
 *
 * Design: Soft 3D Glassmorphism · bg-stone-50 base · emerald CTAs.
 * Mobile-first (max-w-md). No pure black.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, AlertTriangle, Scale, FileText, CheckCircle2 } from 'lucide-react'

// ─── Role-specific legal content ─────────────────────────────────────────────
const LEGAL_CONTENT = {
    member: {
        title: 'Member Terms of Service',
        subtitle: 'Please read and accept before joining SheVest',
        accentColor: 'emerald',
        sections: [
            {
                icon: Scale,
                heading: 'P2P Lending Risks',
                body: 'SheVest facilitates peer-to-peer micro-lending. All investments carry risk, including partial or total loss of principal. Returns are not guaranteed. You acknowledge that SheVest is not a bank and deposits are not insured by the RBI or DICGC. Lending decisions are yours alone.',
            },
            {
                icon: FileText,
                heading: 'ROSCA Escrow Rules',
                body: 'Chit Fund contributions are held in an RBI-compliant escrow account managed by our licensed partner. Funds are released only upon verified auction or maturity. Early withdrawal forfeits accrued Trust Score points and may attract a 2% administrative fee as per ROSCA norms.',
            },
            {
                icon: AlertTriangle,
                heading: 'BNS Section 308(2) — Extortion Reporting',
                body: 'By using the AI Legal Bodyguard feature, you consent to anonymised reporting of extortion threats under Bharatiya Nyaya Sanhita (BNS) Section 308(2). The Auto-FIR tool generates a draft only — you must verify its accuracy and confirm it represents true threats before filing with authorities. False reporting is a criminal offence under BNS Section 240.',
            },
        ],
    },
    ngo_admin: {
        title: 'NGO Partner Agreement',
        subtitle: 'Mandatory compliance terms for partner organisations',
        accentColor: 'amber',
        sections: [
            {
                icon: ShieldCheck,
                heading: 'Oversight Liability',
                body: 'As an NGO Partner, your organisation accepts fiduciary responsibility for all members you onboard. If a member you verified is found to have provided fraudulent KYC, your organisation\'s access may be suspended pending investigation. SheVest reserves the right to recover losses through your escrow deposit.',
            },
            {
                icon: FileText,
                heading: 'KYC Verification Duties',
                body: 'You are required to perform in-person or DigiLocker-based identity verification for every member referral. Bulk or unverified onboarding is strictly prohibited. Member data collected on SheVest must be handled in compliance with the Information Technology Act, 2000 and DPDP Act, 2023.',
            },
            {
                icon: Scale,
                heading: 'Escrow Audit Compliance',
                body: 'Your organisation\'s chit pool contributions and disbursements are subject to quarterly audits by our licensed NBFC partner. You must maintain accurate records and produce them within 7 business days upon request. Non-compliance will result in forfeiture of escrow and termination of the partner agreement.',
            },
        ],
    },
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, heading, body, accent }) {
    const iconColor  = accent === 'amber' ? 'text-amber-600'  : 'text-emerald-600'
    const bgColor    = accent === 'amber' ? 'bg-amber-50/80'  : 'bg-emerald-50/80'
    const borderColor= accent === 'amber' ? 'border-amber-200/60' : 'border-emerald-200/60'

    return (
        <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${bgColor} ${borderColor}`}>
            <div className="flex items-center gap-2">
                <Icon size={15} className={iconColor} strokeWidth={2} />
                <h3 className="text-sm font-bold text-emerald-950 font-sans">{heading}</h3>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">{body}</p>
        </div>
    )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function LegalConsentModal({ role = 'member', onAccept, onClose }) {
    const [agreed, setAgreed] = useState(false)
    const content = LEGAL_CONTENT[role] ?? LEGAL_CONTENT.member
    const isNgo   = role === 'ngo_admin'

    const btnBase  = 'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base font-sans transition-all duration-200'
    const btnActive = isNgo
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:bg-emerald-800'
        : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:bg-emerald-700'
    const btnDisabled = 'bg-stone-100 text-stone-400 cursor-not-allowed'

    return (
        <AnimatePresence>
            {/* ── Backdrop ── */}
            <motion.div
                key="legal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[100] bg-stone-900/50 backdrop-blur-sm flex items-end justify-center sm:items-center"
                onClick={onClose}
                aria-modal="true"
                role="dialog"
                aria-label="Terms of Service"
            >
                {/* ── Sheet panel — stop propagation so clicks inside don't close ── */}
                <motion.div
                    key="legal-panel"
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 60 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
                    style={{ maxHeight: '92vh' }}
                >
                    {/* ── Drag handle (mobile) ── */}
                    <div className="flex justify-center pt-3 pb-1 sm:hidden">
                        <div className="w-10 h-1 rounded-full bg-stone-300" />
                    </div>

                    {/* ── Header ── */}
                    <div className="flex items-start justify-between px-6 pt-4 pb-3 border-b border-stone-200/60 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isNgo ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                                <Scale size={16} className={isNgo ? 'text-amber-600' : 'text-emerald-600'} strokeWidth={2} />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-emerald-950 font-sans leading-tight">
                                    {content.title}
                                </h2>
                                <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                                    {content.subtitle}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                        >
                            <X size={16} strokeWidth={2} />
                        </button>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                        {content.sections.map(({ icon, heading, body }) => (
                            <SectionCard
                                key={heading}
                                icon={icon}
                                heading={heading}
                                body={body}
                                accent={content.accentColor}
                            />
                        ))}

                        {/* Governing law notice */}
                        <p className="text-[10px] text-stone-400 font-sans text-center leading-relaxed px-2 pb-1">
                            Governed by the laws of India. Disputes subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra. By proceeding you confirm you are 18 years of age or older.
                        </p>
                    </div>

                    {/* ── Footer: checkbox + CTA ── */}
                    <div className="px-6 pb-8 pt-4 border-t border-stone-200/60 flex flex-col gap-4 flex-shrink-0 bg-white/60 backdrop-blur-xl">
                        {/* Mandatory checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <div
                                className={[
                                    'mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150',
                                    agreed
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'bg-white border-stone-300 hover:border-emerald-400',
                                ].join(' ')}
                                onClick={() => setAgreed(v => !v)}
                                role="checkbox"
                                aria-checked={agreed}
                                tabIndex={0}
                                onKeyDown={e => e.key === ' ' && setAgreed(v => !v)}
                            >
                                {agreed && <CheckCircle2 size={13} className="text-white" strokeWidth={3} />}
                            </div>
                            <span
                                className="text-xs text-stone-600 font-sans leading-relaxed"
                                onClick={() => setAgreed(v => !v)}
                            >
                                I have read and agree to the{' '}
                                <span className="font-semibold text-emerald-700">Terms of Service</span>,
                                including all legal obligations, risk disclosures, and data processing
                                consent described above.
                            </span>
                        </label>

                        {/* CTA — disabled until checkbox ticked */}
                        <motion.button
                            whileTap={agreed ? { scale: 0.97 } : {}}
                            disabled={!agreed}
                            onClick={agreed ? onAccept : undefined}
                            className={`${btnBase} ${agreed ? btnActive : btnDisabled}`}
                            aria-disabled={!agreed}
                        >
                            <ShieldCheck size={17} strokeWidth={2} />
                            <span>Accept &amp; Continue</span>
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
