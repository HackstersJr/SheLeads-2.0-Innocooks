/**
 * components/FirModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 5 — Auto-FIR Modal (clean ESM rewrite)
 *
 * Flow:
 *   1. Opens deep frosted slate/red modal (glass-fir-modal)
 *   2. 3-second Gemini analysis simulation (scan-line + step text)
 *   3. Reveals clinical BNS Section 308(2) FIR draft
 *   4. Download (txt blob) + Close actions
 *
 * Props:
 *   isOpen    — boolean
 *   onClose   — () => void
 *   incident  — string (reporter's text)
 *   lang      — 'EN' | 'HI'
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { T } from '../context/AppContext'
import {
    ShieldAlert, X, Download, AlertTriangle,
    CheckCircle2, Scale, Fingerprint, FileText,
} from 'lucide-react'

// ─── Bilingual FIR content ────────────────────────────────────────────────────
const FIR_CONTENT = {
    EN: {
        ps: 'Cyber Crimes & Financial Fraud Unit, Maharashtra',
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        section: 'BNS Section 308(2)',
        offence: 'Extortion — Financial Coercion & Harassment',
        complainant: 'SheVest Member (ID: SV-2026-XXXX)',
        accused: 'Unknown party / Illegal recovery agent',
        narrative:
            `The complainant, a verified SheVest ROSCA member, reports sustained financial coercion via digital channels:

1. The accused threatened physical harm and social defamation if repayment of a disputed micro-loan was not made within an unreasonably short timeframe.

2. Digital messages recovered indicate language consistent with extortion and criminal intimidation of the complainant's family.

3. The harassment spans both Chit Fund and P2P lending contexts, indicating a coordinated illegal recovery operation.

These acts constitute offences under BNS Section 308(2) — Extortion; IT Act Section 66A (threat via electronic communication); and IPC Section 503 (criminal intimidation).`,
        relief: 'Immediate FIR registration, seizure of accused communication devices, and an interim protection order for complainant.',
        disclaimer: 'AI-generated draft by SheVest Legal Engine. Must be reviewed by a licensed advocate before filing.',
    },
    HI: {
        ps: 'साइबर अपराध एवं वित्तीय धोखाधड़ी इकाई, महाराष्ट्र',
        date: new Date().toLocaleDateString('hi-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        section: 'BNS धारा 308(2)',
        offence: 'जबरन वसूली — वित्तीय दबाव एवं उत्पीड़न',
        complainant: 'SheVest सदस्य (ID: SV-2026-XXXX)',
        accused: 'अज्ञात पक्ष / अवैध वसूली एजेंट',
        narrative:
            `शिकायतकर्ता, SheVest ROSCA की एक सत्यापित सदस्य, डिजिटल माध्यम से उत्पीड़न की रिपोर्ट करती हैं:

1. आरोपी ने विवादित राशि समय पर न देने पर शारीरिक नुकसान और सामाजिक बदनामी की धमकी दी।

2. शिकायतकर्ता के उपकरणों से प्राप्त संदेश जबरन वसूली की भाषा दर्शाते हैं।

3. यह उत्पीड़न चिट फंड और P2P ऋण दोनों संदर्भों में फैला है।

ये कार्य BNS धारा 308(2), IT अधिनियम धारा 66A और IPC धारा 503 के अंतर्गत अपराध गठित करते हैं।`,
        relief: 'FIR का तत्काल पंजीकरण, आरोपी के उपकरणों की जब्ती, और शिकायतकर्ता हेतु संरक्षण आदेश।',
        disclaimer: 'SheVest Legal Engine द्वारा AI-जनित मसौदा। दाखिल करने से पहले लाइसेंस प्राप्त अधिवक्ता द्वारा समीक्षा अनिवार्य है।',
    },
}

const ANALYSIS_STEPS = [
    'Parsing incident keywords…',
    'Matching BNS 2023 sections…',
    'Cross-referencing P2P + Chit context…',
    'Drafting legal narrative…',
    'Finalising FIR structure…',
]

// ─── Gemini Loading State ─────────────────────────────────────────────────────
function GeminiLoader({ t }) {
    const [stepIdx, setStepIdx] = useState(0)

    useEffect(() => {
        const id = setInterval(() => setStepIdx(i => Math.min(i + 1, ANALYSIS_STEPS.length - 1)), 560)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="flex flex-col items-center gap-6 py-8 px-4">
            {/* Pulsing scanner icon */}
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
                <div
                    className="
            w-20 h-20 rounded-full flex items-center justify-center
            bg-gradient-to-br from-red-950/80 to-slate-900/80
            border border-red-500/40
            shadow-[0_0_40px_rgba(244,63,94,0.40)]
          "
                >
                    <Fingerprint size={34} strokeWidth={1.5} className="text-red-400" />
                </div>
                {/* Scan line */}
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                    <div
                        className="
              absolute top-0 left-0 right-0 h-0.5
              bg-gradient-to-r from-transparent via-red-400/80 to-transparent
              scan-line-anim
            "
                    />
                </div>
            </div>

            <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-bold text-red-300 text-center">{t.firLoading}</p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={stepIdx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.3 }}
                        className="text-xs text-slate-400 text-center"
                    >
                        {ANALYSIS_STEPS[stepIdx]}
                    </motion.p>
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className="typing-dot w-2 h-2 rounded-full bg-red-500/70"
                        style={{ animationDelay: `${i * 0.2}s` }}
                    />
                ))}
            </div>
        </div>
    )
}

// ─── FIR Draft ────────────────────────────────────────────────────────────────
function FirDraft({ t, content, onDownload }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col gap-4"
        >
            {/* Ready badge */}
            <div className="flex items-center justify-center gap-2">
                <CheckCircle2 size={18} className="text-red-400" />
                <span className="text-sm font-bold text-red-300">{t.firReady}</span>
            </div>

            {/* Document card */}
            <div className="rounded-2xl border border-red-500/20 overflow-hidden bg-slate-950/60">
                {/* Section header */}
                <div
                    className="px-4 py-3 border-b border-red-500/15"
                    style={{ background: 'rgba(244,63,94,0.08)' }}
                >
                    <div className="flex items-start gap-2">
                        <Scale size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-extrabold text-red-300 tracking-wider uppercase">
                                {content.section}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{content.offence}</p>
                        </div>
                    </div>
                </div>

                {/* Meta fields */}
                <div className="px-4 py-3 space-y-2 border-b border-red-500/10">
                    {[
                        ['Police Station', content.ps],
                        ['Date', content.date],
                        [t.firComplainant, content.complainant],
                        [t.firAccused, content.accused],
                    ].map(([label, value]) => (
                        <div key={label} className="flex gap-2 text-[11px]">
                            <span className="text-slate-500 font-semibold w-28 flex-shrink-0">{label}:</span>
                            <span className="text-slate-300 font-medium break-words">{value}</span>
                        </div>
                    ))}
                </div>

                {/* Narrative */}
                <div className="px-4 py-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {t.firIncident}
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">
                        {content.narrative}
                    </p>
                </div>

                {/* Relief */}
                <div
                    className="px-4 py-3 border-t border-red-500/10"
                    style={{ background: 'rgba(244,63,94,0.05)' }}
                >
                    <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1.5">
                        Relief Sought
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{content.relief}</p>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/20">
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-300/80 leading-relaxed">{content.disclaimer}</p>
            </div>

            {/* Download */}
            <button id="download-fir-btn" onClick={onDownload} className="btn-crimson w-full">
                <Download size={17} />
                {t.downloadPdf}
            </button>
        </motion.div>
    )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function FirModal({ isOpen, onClose, incident, lang = 'EN' }) {
    const [phase, setPhase] = useState('loading')
    const timerRef = useRef(null)
    const tMap = lang === 'HI' ? T.HI : T.EN
    const firContent = FIR_CONTENT[lang] ?? FIR_CONTENT.EN

    // Reset phase every time modal opens and start 3s timer
    useEffect(() => {
        if (isOpen) {
            setPhase('loading')
            timerRef.current = setTimeout(() => setPhase('ready'), 3000)
        }
        return () => clearTimeout(timerRef.current)
    }, [isOpen])

    const handleDownload = () => {
        const incidentRow = incident
            ? `<tr><th>Reporter Statement</th><td><em>"${incident}"</em></td></tr>`
            : ''
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SheVest FIR Draft</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.7; }
    h1 { text-align: center; font-size: 17px; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 2px solid #b91c1c; padding-bottom: 10px; margin-bottom: 24px; }
    .badge { text-align: center; font-size: 12px; color: #b91c1c; font-weight: bold; letter-spacing: 0.06em; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { text-align: left; width: 38%; color: #555; font-weight: bold; padding: 5px 0; vertical-align: top; }
    td { color: #111; padding: 5px 0 5px 12px; vertical-align: top; }
    tr { border-bottom: 1px solid #eee; }
    .section-heading { font-size: 11px; font-weight: bold; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin: 18px 0 6px; }
    .narrative { font-size: 12px; white-space: pre-line; line-height: 1.8; }
    .relief { font-size: 12px; color: #111; line-height: 1.7; }
    .disclaimer { margin-top: 28px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; line-height: 1.6; }
    .footer { text-align: center; font-size: 10px; color: #bbb; margin-top: 32px; }
    @media print { body { margin: 20px auto; } }
  </style>
</head>
<body>
  <p class="badge">SHEVEST LEGAL ENGINE — AI GENERATED DRAFT</p>
  <h1>First Information Report (FIR) Draft</h1>
  <table>
    <tr><th>Section</th><td>${firContent.section}</td></tr>
    <tr><th>Offence</th><td>${firContent.offence}</td></tr>
    <tr><th>Date</th><td>${firContent.date}</td></tr>
    <tr><th>Police Station</th><td>${firContent.ps}</td></tr>
    <tr><th>Complainant</th><td>${firContent.complainant}</td></tr>
    <tr><th>Accused</th><td>${firContent.accused}</td></tr>
    ${incidentRow}
  </table>
  <p class="section-heading">Incident Narrative</p>
  <p class="narrative">${firContent.narrative}</p>
  <p class="section-heading">Relief Sought</p>
  <p class="relief">${firContent.relief}</p>
  <p class="disclaimer">&#9888; ${firContent.disclaimer}</p>
  <p class="footer">Generated by SheVest Legal Engine &bull; ${new Date().toLocaleDateString('en-IN')}</p>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const win = window.open(url, '_blank')
        if (win) {
            win.onafterprint = () => URL.revokeObjectURL(url)
        } else {
            // Fallback: direct download as HTML if popup blocked
            const a = Object.assign(document.createElement('a'), {
                href: url,
                download: `SheVest_FIR_${Date.now()}.html`,
            })
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="fir-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/*
                      Centering shell — plain div, NOT a motion.div.
                      Reason: framer-motion overrides the CSS `transform` property on
                      motion elements it animates. If we put -translate-x-1/2 on a
                      motion.div with scale/y animations, framer-motion silently drops
                      the Tailwind translate and the card ends up at `left:50%` with
                      no offset — i.e. right-shifted. A plain div is immune to this.
                      The app uses max-w-md mx-auto so viewport-center === app-center.
                    */}
                    <div className="fixed inset-0 z-70 flex items-center justify-center px-4 pointer-events-none">
                        <motion.div
                            key="fir-modal"
                            initial={{ opacity: 0, scale: 0.92, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                            className="w-full max-w-md glass-fir-modal pointer-events-auto flex flex-col max-h-[82vh]"
                            role="dialog"
                            aria-modal="true"
                            aria-label={tMap.firTitle}
                        >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/20 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <span
                                    className="
                    w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    bg-gradient-to-br from-red-600 to-red-800
                    shadow-[0_4px_16px_rgba(244,63,94,0.50)]
                  "
                                >
                                    <ShieldAlert size={18} strokeWidth={2} className="text-white" />
                                </span>
                                <div>
                                    <p className="text-sm font-extrabold text-white leading-none">{tMap.firTitle}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{tMap.firSubtitle}</p>
                                </div>
                            </div>
                            <button
                                id="close-fir-modal-btn"
                                onClick={onClose}
                                className="
                  w-8 h-8 rounded-xl flex items-center justify-center
                  text-slate-400 hover:text-white hover:bg-red-500/20
                  border border-transparent hover:border-red-500/30
                  transition-all duration-200
                "
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Incident preview */}
                        {incident && (
                            <div className="px-5 pt-3 flex-shrink-0">
                                <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/15 bg-red-950/30">
                                    <FileText size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-slate-400 italic line-clamp-2">
                                        "{incident}"
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto scroll-area px-5 py-4">
                            <AnimatePresence mode="wait">
                                {phase === 'loading' ? (
                                    <motion.div
                                        key="loader"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <GeminiLoader t={tMap} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="draft"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <FirDraft t={tMap} content={firContent} onDownload={handleDownload} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Close footer */}
                        <div className="px-5 py-3 border-t border-red-500/15 flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-2xl text-slate-300 text-sm font-semibold border border-slate-700/60 hover:bg-slate-800/60 transition-all duration-200"
                            >
                                {tMap.closeModal}
                            </button>
                        </div>
                    </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
