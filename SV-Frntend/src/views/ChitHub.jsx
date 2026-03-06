/**
 * views/ChitHub.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 4 — "Save & Prove" View
 *
 * Shows:
 *   · Active Chit pool hero (₹50,000 pot, member count, cycle progress ring)
 *   · Auction countdown timer (live days/hours/mins)
 *   · Trust Score arc gauge
 *   · Pay Monthly Installment CTA → updates global trustScore
 *   · Chit cycle history timeline
 *   · Member grid
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Coins, Users, Trophy, Clock, CheckCircle2,
    ArrowRight, Sparkles, TrendingUp, AlertCircle, RotateCcw,
    AlertTriangle, ShieldX, Clock3, PhoneCall, Flag,
} from 'lucide-react'
import GlassCard from '../components/GlassCard'
import PillTag from '../components/PillTag'
import ActionButton from '../components/atoms/ActionButton'
import MockPaymentGateway from '../components/organisms/MockPaymentGateway'
import { useApp, P2P_TRUST_GATE } from '../context/AppContext'
import { payInstallment, API_BASE } from '../api/shevestApi'

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIT_POT = 50000          // ₹
const CHIT_MEMBERS = 10
const INSTALLMENT_AMT = CHIT_POT / CHIT_MEMBERS  // ₹5,000 per month
const AUCTION_TARGET = new Date('2026-04-01T10:00:00+05:30')

const CHIT_MEMBERS_DATA = [
    { id: 1, name: 'Priya S.', avatar: 'P', paid: true },
    { id: 2, name: 'Rekha M.', avatar: 'R', paid: true },
    { id: 3, name: 'Anjali K.', avatar: 'A', paid: true },
    { id: 4, name: 'Meena D.', avatar: 'M', paid: false },
    { id: 5, name: 'Sunita L.', avatar: 'S', paid: true },
    { id: 6, name: 'Kavita B.', avatar: 'K', paid: false },
    { id: 7, name: 'Deepa N.', avatar: 'D', paid: true },
    { id: 8, name: 'Gita P.', avatar: 'G', paid: true },
    { id: 9, name: 'Lalita C.', avatar: 'L', paid: false },
    { id: 10, name: 'You', avatar: '★', paid: false, isUser: true },
]

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(target) {
    const calc = () => {
        const diff = Math.max(0, target - Date.now())
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            mins: Math.floor((diff % 3600000) / 60000),
            secs: Math.floor((diff % 60000) / 1000),
        }
    }
    const [time, setTime] = useState(calc)
    useEffect(() => {
        const id = setInterval(() => setTime(calc()), 1000)
        return () => clearInterval(id)
    }, [])
    return time
}

// ─── Trust Score Ring SVG ─────────────────────────────────────────────────────
function TrustRing({ score }) {
    const R = 42
    const CIRC = 2 * Math.PI * R        // ~263.9
    const filled = (score / 100) * CIRC
    const dashoffset = CIRC - filled

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <svg width="96" height="96" viewBox="0 0 96 96" className="trust-ring -rotate-90">
                {/* Track */}
                <circle
                    cx="48" cy="48" r={R}
                    fill="none"
                    stroke="rgba(167,243,208,0.35)"
                    strokeWidth="8"
                />
                {/* Fill */}
                <circle
                    cx="48" cy="48" r={R}
                    fill="none"
                    stroke="url(#trustGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={dashoffset}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
                />
                <defs>
                    <linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                </defs>
            </svg>
            {/* Centre label */}
            <div className="absolute flex flex-col items-center">
                <span className="text-xl font-extrabold text-emerald-700 leading-none">{score}</span>
                <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">Trust</span>
            </div>
        </div>
    )
}

// ─── Countdown Block ──────────────────────────────────────────────────────────
function CountUnit({ value, label }) {
    return (
        <div className="flex flex-col items-center">
            <span
                className="
          text-2xl font-extrabold text-stone-800 leading-none
          tabular-nums w-10 text-center
        "
            >
                {String(value).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">
                {label}
            </span>
        </div>
    )
}

// ─── Trust Progress Card ─────────────────────────────────────────────────────
function TrustProgressCard({ score }) {
    const unlocked = score >= P2P_TRUST_GATE
    const pct = Math.min(100, Math.round((score / P2P_TRUST_GATE) * 100))
    const remainingCycles = unlocked ? 0 : Math.ceil((P2P_TRUST_GATE - score) / 20)

    return (
        <GlassCard
            variant={unlocked ? 'trust' : 'base'}
            padding="p-4"
            className="fade-in"
            style={{ animationDelay: '0.05s' }}
        >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp size={15} className={unlocked ? 'text-emerald-600' : 'text-amber-500'} />
                    <span className="text-sm font-bold text-stone-700">Trust Score Progress</span>
                </div>
                <span className={`text-sm font-extrabold tabular-nums ${ unlocked ? 'text-emerald-600' : 'text-amber-600' }`}>
                    {Math.min(score, P2P_TRUST_GATE)} / {P2P_TRUST_GATE}
                </span>
            </div>

            {/* Progress bar */}
            <div className="progress-track mb-2.5">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${ unlocked ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-emerald-500' }`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Pip blocks — each 20 pts */}
            <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors duration-500 ${ score >= (i + 1) * 20 ? 'bg-emerald-500' : 'bg-stone-200' }`}
                    />
                ))}
            </div>

            {/* Status message */}
            {unlocked ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-100/70 border border-emerald-200/60">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-800">Loan Marketplace Unlocked</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/60">
                    <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-amber-800">
                        You need <span className="font-bold">{remainingCycles} more savings cycle{remainingCycles !== 1 ? 's' : ''}</span> to unlock borrowing.
                    </span>
                </div>
            )}
        </GlassCard>
    )
}

function CountdownTimer({ t }) {
    const { days, hours, mins, secs } = useCountdown(AUCTION_TARGET)
    return (
        <div className="flex items-center gap-1">
            <CountUnit value={days} label={t.loanDays || 'Days'} />
            <span className="text-stone-300 font-bold text-xl mb-2">:</span>
            <CountUnit value={hours} label="Hrs" />
            <span className="text-stone-300 font-bold text-xl mb-2">:</span>
            <CountUnit value={mins} label="Mins" />
            <span className="text-stone-300 font-bold text-xl mb-2">:</span>
            <CountUnit value={secs} label="Secs" />
        </div>
    )
}

// ─── Overdue / Grace / Locked / Disputed Warning Card ───────────────────────
function OverdueWarningCard({ status, t, onWhistleblow, disputeStatus }) {
    const [confirmOpen, setConfirmOpen] = useState(false)

    if (status === 'active') return null

    const config = {
        overdue: {
            bg: 'bg-rose-50/90 border-rose-200/70',
            strip: 'bg-gradient-to-r from-rose-400 to-rose-600',
            icon: <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />,
            pillBg: 'bg-rose-100 text-rose-700',
            pillLabel: 'Payment Overdue',
            heading: 'Your installment is overdue',
            body: 'Your trust score has been reduced by 50 points and P2P Marketplace access is suspended. Contact your NGO coordinator to resolve this.',
            urgency: 'bg-rose-100/80 border-rose-200/60 text-rose-800',
            urgencyIcon: <PhoneCall size={12} className="text-rose-600 flex-shrink-0" />,
            urgencyText: 'Call your SheLeads coordinator immediately to avoid account lock.',
        },
        grace_period: {
            bg: 'bg-amber-50/90 border-amber-200/70',
            strip: 'bg-gradient-to-r from-amber-400 to-orange-500',
            icon: <Clock3 size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />,
            pillBg: 'bg-amber-100 text-amber-700',
            pillLabel: '7-Day Grace Period',
            heading: 'Grace period approved',
            body: 'Your NGO coordinator has granted you a 7-day grace window to clear your overdue installment. Your trust score has been partially restored (+25 pts).',
            urgency: 'bg-amber-100/80 border-amber-200/60 text-amber-800',
            urgencyIcon: <Clock3 size={12} className="text-amber-600 flex-shrink-0" />,
            urgencyText: 'Pay before your grace window expires to restore full standing.',
        },
        locked: {
            bg: 'bg-rose-100/90 border-rose-300/70',
            strip: 'bg-gradient-to-r from-rose-600 to-rose-900',
            icon: <ShieldX size={18} className="text-rose-700 flex-shrink-0 mt-0.5" />,
            pillBg: 'bg-rose-200 text-rose-800',
            pillLabel: 'Account Locked',
            heading: 'Account locked by NGO',
            body: 'Your account has been locked following a confirmed default. All chit participation and P2P access is suspended pending manual review.',
            urgency: 'bg-rose-200/80 border-rose-300/60 text-rose-900',
            urgencyIcon: <PhoneCall size={12} className="text-rose-700 flex-shrink-0" />,
            urgencyText: 'Contact your SheLeads coordinator to initiate account reinstatement.',
        },
        disputed: {
            bg: 'bg-amber-50/90 border-amber-300/70',
            strip: 'bg-gradient-to-r from-amber-400 to-amber-600',
            icon: <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />,
            pillBg: 'bg-amber-200 text-amber-800',
            pillLabel: 'Under Central Review',
            heading: 'Account Under Central Review',
            body: 'Your whistleblower dispute has been filed with the SheVest Central Audit Team. Your account is protected from lock actions while the investigation is ongoing.',
            urgency: 'bg-amber-100/80 border-amber-200/60 text-amber-800',
            urgencyIcon: <ShieldX size={12} className="text-amber-600 flex-shrink-0" />,
            urgencyText: 'You will be notified once the audit is complete. No further action required.',
        },
    }

    // If a whistleblower dispute is active, always show the protected amber state
    const effectiveStatus = disputeStatus === 'under_investigation' ? 'disputed' : status
    const c = config[effectiveStatus]
    if (!c) return null

    const showWhistleblowerBtn =
        (status === 'overdue' || status === 'locked') &&
        disputeStatus !== 'under_investigation'

    return (
        <>
            <div
                className={`rounded-3xl border overflow-hidden shadow-md fade-in ${c.bg}`}
                role="alert"
                aria-live="polite"
            >
                {/* Colour strip */}
                <div className={`h-1 w-full ${c.strip}`} />

                <div className="px-4 pt-3 pb-4">
                    {/* Header row */}
                    <div className="flex items-start gap-2 mb-2">
                        {c.icon}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.pillBg}`}>
                                    {c.pillLabel}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-stone-800 mt-1">{c.heading}</p>
                            <p className="text-[11px] text-stone-600 font-medium mt-0.5 leading-relaxed">{c.body}</p>
                        </div>
                    </div>

                    {/* Urgency strip */}
                    <div className={`flex items-start gap-2 px-3 py-2 rounded-xl border mt-2 ${c.urgency}`}>
                        {c.urgencyIcon}
                        <p className="text-[11px] font-semibold leading-relaxed">{c.urgencyText}</p>
                    </div>

                    {/* Whistleblower ghost button */}
                    {showWhistleblowerBtn && (
                        <button
                            type="button"
                            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200/70 text-[11px] font-bold text-stone-500 hover:bg-white/60 hover:border-amber-300 hover:text-amber-700 transition-colors"
                            onClick={() => setConfirmOpen(true)}
                        >
                            <Flag size={12} aria-hidden="true" />
                            Lodge Whistleblower Dispute
                        </button>
                    )}
                </div>
            </div>

            {/* Whistleblower confirmation modal */}
            {confirmOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-stone-900/30 backdrop-blur-sm"
                    onClick={() => setConfirmOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="whistle-title"
                >
                    <div
                        className="bg-white/90 backdrop-blur-xl border border-amber-200/60 rounded-2xl shadow-xl p-5 max-w-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-amber-100 p-1.5 rounded-lg border border-amber-200/50">
                                <Flag size={16} className="text-amber-600" aria-hidden="true" />
                            </div>
                            <h3 id="whistle-title" className="text-sm font-bold text-stone-800">Lodge Whistleblower Dispute</h3>
                        </div>
                        <p className="text-[11px] text-stone-600 leading-relaxed mb-4">
                            This will escalate your case to the{' '}
                            <strong className="text-stone-800">SheVest Central Audit Team</strong>.
                            Your account will be protected from any lock actions during the investigation.
                            This action is permanent and logged for governance oversight.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="flex-1 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => { onWhistleblow(); setConfirmOpen(false) }}
                                className="flex-1 py-2 rounded-xl bg-amber-500 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
                            >
                                Escalate to Central Audit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function ChitHub() {
    const {
        t, trustScore, chitCyclesCompleted,
        installmentsPaidThisCycle, cycleProgress, currentUserUid,
        installmentsLeft, setApiNotice, recordInstallmentPaid,
        INSTALLMENTS_PER_CYCLE, syncUserFromBackend,
        memberStatus, fileWhistleblowerDispute, disputeStatus, hasPaidCurrentCycle,
    } = useApp()

    const [payState, setPayState] = useState('idle') // 'idle' | 'loading' | 'success'
    const [showToast, setShowToast] = useState(false)
    const [payError, setPayError] = useState('')
    const [resetState, setResetState] = useState('idle') // 'idle' | 'loading' | 'done'
    const [showPayGateway, setShowPayGateway] = useState(false)

    // Open the mock escrow gateway instead of calling the API directly
    const handleOpenPayment = useCallback(() => {
        if (payState !== 'idle') return
        if (!currentUserUid) {
            setPayError('Please register first so your savings are safely recorded.')
            setApiNotice('Please complete OTP registration before paying installments.')
            return
        }
        setPayError('')
        setShowPayGateway(true)
    }, [payState, currentUserUid, setApiNotice])

    // Called by gateway on successful payment — awards trust points locally
    const handlePaySuccess = useCallback(() => {
        recordInstallmentPaid()
        setPayState('success')
        setShowToast(true)
        setTimeout(() => { setPayState('idle'); setShowToast(false) }, 3000)
    }, [recordInstallmentPaid])

    const handleResetDemo = useCallback(async () => {
        if (resetState !== 'idle') return
        setResetState('loading')
        try {
            await fetch(`${API_BASE}/admin/reset-demo`, { method: 'POST' })
            syncUserFromBackend({ uid: currentUserUid || 'user_001', trust_score: 0, chit_cycles_completed: 0 })
            setResetState('done')
            setTimeout(() => setResetState('idle'), 2500)
        } catch {
            setResetState('idle')
        }
    }, [resetState, currentUserUid, syncUserFromBackend])

    const paidCount = installmentsPaidThisCycle
    const potFill = ((10 - installmentsLeft) / 10) * 100  // % of ₹50k collected this month

    return (
        <div className="h-full overflow-y-auto overscroll-contain">
            <div className="flex flex-col gap-4 px-4 pt-6 pb-32">

                {/* ── Toast notification ── */}
                <div
                    className={`
            fixed top-16 left-1/2 -translate-x-1/2 z-50
            transition-all duration-500
            ${showToast ? 'opacity-100 translate-y-2' : 'opacity-0 -translate-y-4 pointer-events-none'}
          `}
                >
                    <div className="glass-card-trust px-4 py-2.5 flex items-center gap-2 shadow-trust">
                        <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                        <span className="text-sm font-bold text-emerald-800">
                            {t.paySuccess}
                        </span>
                    </div>
                </div>

                {/* ── OVERDUE / GRACE / LOCKED WARNING ── */}
                <OverdueWarningCard
                    status={memberStatus}
                    t={t}
                    onWhistleblow={fileWhistleblowerDispute}
                    disputeStatus={disputeStatus}
                />

                {/* ── HERO — Active Chit Pool ── */}
                <GlassCard variant="trust" padding="p-0" className="overflow-hidden fade-in">
                    {/* Gradient banner strip */}
                    <div
                        className="relative px-5 pt-5 pb-4"
                        style={{
                            background: 'linear-gradient(135deg,rgba(167,243,208,0.45) 0%,rgba(255,255,255,0.10) 100%)',
                        }}
                    >
                        <div className="flex items-start justify-between">
                            {/* Left — pot info */}
                            <div className="flex flex-col gap-1">
                                <PillTag color="trust" icon={Coins} label={t.activeChit} size="sm" />
                                <p className="text-3xl font-extrabold text-stone-800 mt-1 leading-none">
                                    ₹{CHIT_POT.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs font-medium text-stone-500">
                                    {t.potValue} · {CHIT_MEMBERS} {t.members}
                                </p>
                            </div>

                            {/* Right — Trust ring */}
                            <TrustRing score={trustScore} />
                        </div>

                        {/* Cycle indicator */}
                        <div className="mt-3 flex items-center gap-2">
                            <PillTag
                                color={chitCyclesCompleted >= 3 ? 'trust' : 'amber'}
                                icon={Trophy}
                                label={`${t.cycle} ${chitCyclesCompleted + 1} ${t.of} 10`}
                                size="sm"
                            />
                            <PillTag color="neutral" label={`${paidCount}/${INSTALLMENTS_PER_CYCLE} paid`} size="sm" />
                        </div>
                    </div>

                    {/* Cycle progress bar */}
                    <div className="px-5 pb-1 pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-stone-500">{t.progress}</span>
                            <span className="text-xs font-bold text-emerald-700">{Math.round(cycleProgress)}%</span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${cycleProgress}%` }} />
                        </div>
                    </div>

                    {/* Trust gate hint */}
                    <div className="px-5 pb-4 pt-2">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-brand-600" />
                            <span className="text-[11px] text-stone-500 font-medium">
                                {trustScore < 80
                                    ? `${80 - trustScore} points to unlock P2P Marketplace`
                                    : '🎉 P2P Marketplace unlocked!'}
                            </span>
                        </div>
                    </div>
                </GlassCard>

                {/* ── AUCTION COUNTDOWN ── */}
                <GlassCard variant="base" padding="p-5" className="fade-in" style={{ animationDelay: '0.07s' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-amber-500" />
                        <span className="section-title text-base">{t.auctionCountdown}</span>
                        <PillTag color="amber" label="Live" pulse size="sm" />
                    </div>
                    <div className="flex justify-center">
                        <CountdownTimer t={t} />
                    </div>
                    <div className="mt-4 flex items-start gap-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-100/60">
                        <AlertCircle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                            The member with the highest bid wins the ₹{CHIT_POT.toLocaleString('en-IN')} pot this cycle. All members continue paying installments.
                        </p>
                    </div>
                </GlassCard>

                {/* ── TRUST PROGRESS CARD ── */}
                <TrustProgressCard score={trustScore} />

                {/* ── PAY INSTALLMENT CTA ── */}
                <GlassCard variant="base" padding="p-5" className="fade-in" style={{ animationDelay: '0.12s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="section-title">{t.myInstallment}</p>
                            <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                                ₹{INSTALLMENT_AMT.toLocaleString('en-IN')}
                                <span className="text-sm font-medium text-stone-400 ml-1">/ month</span>
                            </p>
                        </div>
                        <PillTag
                            color={payState === 'success' ? 'trust' : 'amber'}
                            label={payState === 'success' ? 'Paid ✓' : 'Due'}
                            size="sm"
                        />
                    </div>

                    <ActionButton
                        variant="emerald"
                        onClick={handleOpenPayment}
                        isLoading={payState === 'loading'}
                        disabled={payState !== 'idle'}
                        className="w-full mt-4 py-4 rounded-2xl text-base"
                    >
                        {payState === 'success' ? (
                            <><CheckCircle2 size={18} />{t.paySuccess}</>
                        ) : (
                            <><Coins size={18} />Pay ₹{INSTALLMENT_AMT.toLocaleString('en-IN')} Installment</>
                        )}
                    </ActionButton>

                    {/* Trust score gain preview */}
                    {payState === 'idle' && (
                        <p className="text-center text-[11px] text-stone-400 mt-2.5 font-medium">
                            <Sparkles size={10} className="inline mr-1 text-emerald-500" />
                            Earn <span className="text-emerald-600 font-bold">+20 Trust Points</span> on payment
                        </p>
                    )}

                    {payError && (
                        <p className="text-center text-[11px] text-rose-600 mt-2.5 font-medium">{payError}</p>
                    )}
                </GlassCard>

                {/* ── MEMBER GRID ── */}
                <GlassCard variant="base" padding="p-5" className="fade-in" style={{ animationDelay: '0.18s' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={15} className="text-brand-600" />
                        <p className="section-title">Group Members</p>
                        <span className="ml-auto text-xs text-stone-400">
                            {CHIT_MEMBERS_DATA.filter(m => m.paid).length}/{CHIT_MEMBERS} paid
                        </span>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                        {CHIT_MEMBERS_DATA.map(member => (
                            <div key={member.id} className="flex flex-col items-center gap-1">
                                {/* Avatar bubble */}
                                <span
                                    className={`
                    w-11 h-11 rounded-2xl flex items-center justify-center
                    text-sm font-bold border-2 transition-all duration-200
                    ${member.isUser
                                            ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white border-brand-300 shadow-trust'
                                            : member.paid
                                                ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/70'
                                                : 'bg-stone-50/90 text-stone-400 border-stone-200/60'
                                        }
                  `}
                                >
                                    {member.avatar}
                                </span>
                                {/* Name */}
                                <span className="text-[9px] font-semibold text-stone-500 text-center leading-tight truncate w-full text-center">
                                    {member.name}
                                </span>
                                {/* Status dot */}
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${member.paid ? 'bg-emerald-500' : 'bg-stone-300'}`}
                                    aria-label={member.paid ? 'Paid' : 'Pending'}
                                />
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* ── CYCLE HISTORY ── */}
                {chitCyclesCompleted > 0 && (
                    <GlassCard variant="base" padding="p-5" className="fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy size={15} className="text-amber-500" />
                            <p className="section-title">{t.chitCycles}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: chitCyclesCompleted }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100/50">
                                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-stone-700">{t.cycle} {i + 1} {t.cycleComplete}</p>
                                        <p className="text-[10px] text-stone-400">{INSTALLMENTS_PER_CYCLE} installments · +{20 + 12 * 5} trust pts</p>
                                    </div>
                                    <ArrowRight size={14} className="text-stone-300" />
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}

                {/* ── RESET PROGRESS ── */}
                <GlassCard variant="base" padding="p-4" className="fade-in">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-stone-600">Reset Progress</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">Clear trust score and start your chit journey fresh</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleResetDemo}
                            disabled={resetState !== 'idle'}
                            className={`
                                flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                                border transition-all duration-200
                                ${ resetState === 'done'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-stone-50/80 border-stone-200 text-stone-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                                }
                                disabled:opacity-60 disabled:cursor-not-allowed
                            `}
                        >
                            {resetState === 'loading' ? (
                                <><span className="w-3 h-3 border-2 border-stone-400 border-t-stone-700 rounded-full animate-spin" /> Resetting…</>
                            ) : resetState === 'done' ? (
                                <><CheckCircle2 size={13} /> Reset Done</>
                            ) : (
                                <><RotateCcw size={13} /> Reset Progress</>
                            )}
                        </button>
                    </div>
                </GlassCard>

            </div>

            {/* ── Mock Escrow Payment Gateway ── */}
            <MockPaymentGateway
                isOpen={showPayGateway}
                amount={INSTALLMENT_AMT}
                onSuccess={handlePaySuccess}
                onClose={() => setShowPayGateway(false)}
            />
        </div>
    )
}
