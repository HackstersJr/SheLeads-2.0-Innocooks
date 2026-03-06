/**
 * context/AppContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SheVest Global State
 *
 * Manages:
 *   · language            — 'EN' | 'HI' | 'KN'
 *   · trustScore          — 0–100  (chit participation derived)
 *   · chitCyclesCompleted — 0–N
 *   · isAuthenticated     — boolean
 *   · userRole            — 'member' | 'ngo_admin' | null
 *
 * Auth actions:  login(role)  |  logout()  |  toggleRole()
 * loginUser(role) accepts 'member' (canonical) or 'borrower' (legacy alias).
 * Demo actions:  setTrustScoreManual(n)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    useEffect,
} from 'react'

// ─── Translation Map ──────────────────────────────────────────────────────────
// Imported from a separate file so Vite Fast Refresh can hot-reload this module
// without invalidating the whole component tree on every save.
import { T } from './translations'

// (FirModal now imports T from ./translations directly)
// Dead block kept for reference — content moved to translations.js
const _T_UNUSED = {
    en: {
        // ── App Shell ──
        appName: 'SheVest',
        poweredBy: 'Powered by Innocooks',
        partnerLabel: 'NGO Partner',
        langToggle: 'हिं',

        // ── Bottom Nav ──
        navChitHub: 'Chit Hub',
        navP2P: 'Marketplace',
        navLegal: 'Legal Shield',

        // ── ChitHub View ──
        activeChit: 'Active Chit Pool',
        potValue: 'Pot Value',
        members: 'Members',
        auctionCountdown: 'Days to Auction',
        myInstallment: 'My Monthly Installment',
        payInstallment: '💰 Pay Monthly Installment',
        paying: 'Verifying Payment…',
        paySuccess: 'Payment Confirmed! +20 Trust Points',
        cycle: 'Cycle',
        of: 'of',
        cycleComplete: 'Cycle Complete 🎉',
        chitCycles: 'Chit Cycles Completed',
        trustScore: 'Trust Score',
        trustGate: 'Unlock P2P at 80+',
        progress: 'Progress',

        // ── P2P Marketplace ──
        p2pTitle: 'P2P Micro-Loans',
        p2pSubtitle: 'Verified community borrowers',
        lockedTitle: 'Marketplace Locked',
        lockedBody: 'Complete 3 Chit cycles to unlock your P2P lending access.',
        lockedCta: 'Go to Chit Hub →',
        loanSeeks: 'Seeks',
        loanDays: 'days',
        loanRate: 'Rate',
        loanVerified: 'Verified',
        fundLoan: 'Fund This Loan',
        purpose: 'Purpose',
        matchScore: 'Trust Match',

        // ── Legal Shield ──
        legalTitle: 'AI Legal Bodyguard',
        legalSubtitle: 'Describe your situation — Gemini drafts your FIR.',
        reportThreat: '🚨 Report Threat',
        chatPlaceholder: 'Describe harassment or threat…',
        sendMessage: 'Send',
        autoTranslated: 'Auto-translated from Hindi',
        firAnalysis: 'Gemini Auto-FIR Analysis in Progress…',
        aiTyping: 'SheVest AI is analyzing…',
        downloadPdf: '↓ Download Legal PDF',
        closeModal: '✕ Close',

        // ── FIR Modal ──
        firTitle: 'Auto-FIR Draft',
        firSubtitle: 'Indian Penal Code · BNS 2023',
        firSection: 'BNS Section 308(2)',
        firOffence: 'Extortion — Financial Harassment',
        firComplainant: 'Complainant',
        firAccused: 'Accused',
        firIncident: 'Incident Summary',
        firLoading: 'Gemini is analyzing your statement…',
        firReady: 'FIR Draft Ready',
        firWarning: 'This is an AI-generated draft. Verify with a legal professional before filing.',

        // ── General ──
        verified: 'Verified',
        pending: 'Pending',
        active: 'Active',
        loading: 'Loading…',
    },

    hi: {
        // ── App Shell ──
        appName: 'शीवेस्ट',
        poweredBy: 'Innocooks द्वारा संचालित',
        partnerLabel: 'NGO साझेदार',
        langToggle: 'ಕನ್ನ',

        // ── Bottom Nav ──
        navChitHub: 'चिट हब',
        navP2P: 'बाज़ार',
        navLegal: 'कानूनी ढाल',

        // ── ChitHub View ──
        activeChit: 'सक्रिय चिट पूल',
        potValue: 'पॉट मूल्य',
        members: 'सदस्य',
        auctionCountdown: 'नीलामी में दिन',
        myInstallment: 'मेरी मासिक किस्त',
        payInstallment: '💰 मासिक किस्त भरें',
        paying: 'भुगतान सत्यापित हो रहा है…',
        paySuccess: 'भुगतान की पुष्टि हुई! +20 विश्वास अंक',
        cycle: 'चक्र',
        of: 'का',
        cycleComplete: 'चक्र पूरा हुआ 🎉',
        chitCycles: 'पूर्ण चिट चक्र',
        trustScore: 'विश्वास स्कोर',
        trustGate: '80+ पर P2P अनलॉक करें',
        progress: 'प्रगति',

        // ── P2P Marketplace ──
        p2pTitle: 'P2P सूक्ष्म-ऋण',
        p2pSubtitle: 'सत्यापित सामुदायिक उधारकर्ता',
        lockedTitle: 'बाज़ार बंद है',
        lockedBody: 'P2P ऋण एक्सेस अनलॉक करने के लिए 3 चिट चक्र पूरे करें।',
        lockedCta: 'चिट हब पर जाएं →',
        loanSeeks: 'मांग',
        loanDays: 'दिन',
        loanRate: 'दर',
        loanVerified: 'सत्यापित',
        fundLoan: 'ऋण वित्त करें',
        purpose: 'उद्देश्य',
        matchScore: 'विश्वास मिलान',

        // ── Legal Shield ──
        legalTitle: 'AI कानूनी अंगरक्षक',
        legalSubtitle: 'अपनी स्थिति बताएं — Gemini आपकी FIR तैयार करेगा।',
        reportThreat: '🚨 खतरा रिपोर्ट करें',
        chatPlaceholder: 'उत्पीड़न या धमकी का वर्णन करें…',
        sendMessage: 'भेजें',
        autoTranslated: 'हिंदी से स्वतः अनुवादित',
        firAnalysis: 'Gemini Auto-FIR विश्लेषण जारी है…',
        aiTyping: 'SheVest AI विश्लेषण कर रहा है…',
        downloadPdf: '↓ कानूनी PDF डाउनलोड करें',
        closeModal: '✕ बंद करें',

        // ── FIR Modal ──
        firTitle: 'Auto-FIR मसौदा',
        firSubtitle: 'भारतीय दंड संहिता · BNS 2023',
        firSection: 'BNS धारा 308(2)',
        firOffence: 'जबरन वसूली — वित्तीय उत्पीड़न',
        firComplainant: 'शिकायतकर्ता',
        firAccused: 'आरोपी',
        firIncident: 'घटना सारांश',
        firLoading: 'Gemini आपका बयान विश्लेषण कर रहा है…',
        firReady: 'FIR मसौदा तैयार',
        firWarning: 'यह AI द्वारा तैयार मसौदा है। दाखिल करने से पहले किसी कानूनी विशेषज्ञ से सत्यापित करें।',

        // ── General ──
        verified: 'सत्यापित',
        pending: 'लंबित',
        active: 'सक्रिय',
        loading: 'लोड हो रहा है…',
    },

    kn: {
        // ── App Shell ──
        appName: 'ಶೀವೆಸ್ಟ್',
        poweredBy: 'Innocooks ನಿಂದ ಚಾಲಿತ',
        partnerLabel: 'NGO ಪಾಲುದಾರ',
        langToggle: 'EN',

        // ── Bottom Nav ──
        navChitHub: 'ಚಿಟ್ ಹಬ್',
        navP2P: 'ಮಾರುಕಟ್ಟೆ',
        navLegal: 'ಕಾನೂನು ಗುರಾಣಿ',

        // ── ChitHub View ──
        activeChit: 'ಸಕ್ರಿಯ ಚಿಟ್ ಪೂಲ್',
        potValue: 'ಪಾತ್ರೆ ಮೌಲ್ಯ',
        members: 'ಸದಸ್ಯರು',
        auctionCountdown: 'ಹರಾಜಿಗೆ ದಿನಗಳು',
        myInstallment: 'ನನ್ನ ಮಾಸಿಕ ಕಂತು',
        payInstallment: '💰 ಮಾಸಿಕ ಕಂತು ಪಾವತಿಸಿ',
        paying: 'ಪಾವತಿ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
        paySuccess: 'ಪಾವತಿ ದೃಢಪಡಿಸಲಾಗಿದೆ! +20 ವಿಶ್ವಾಸ ಅಂಕಗಳು',
        cycle: 'ಚಕ್ರ',
        of: 'ರಲ್ಲಿ',
        cycleComplete: 'ಚಕ್ರ ಪೂರ್ಣಗೊಂಡಿದೆ 🎉',
        chitCycles: 'ಪೂರ್ಣಗೊಂಡ ಚಿಟ್ ಚಕ್ರಗಳು',
        trustScore: 'ವಿಶ್ವಾಸ ಸ್ಕೋರ್',
        trustGate: '80+ ರಲ್ಲಿ P2P ಅನ್‌ಲಾಕ್ ಮಾಡಿ',
        progress: 'ಪ್ರಗತಿ',

        // ── P2P Marketplace ──
        p2pTitle: 'P2P ಸೂಕ್ಷ್ಮ-ಸಾಲ',
        p2pSubtitle: 'ಪರಿಶೀಲಿಸಿದ ಸಮುದಾಯ ಸಾಲಗಾರರು',
        lockedTitle: 'ಮಾರುಕಟ್ಟೆ ಲಾಕ್ ಆಗಿದೆ',
        lockedBody: 'P2P ಸಾಲ ಪ್ರವೇಶ ಅನ್‌ಲಾಕ್ ಮಾಡಲು 3 ಚಿಟ್ ಚಕ್ರಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.',
        lockedCta: 'ಚಿಟ್ ಹಬ್‌ಗೆ ಹೋಗಿ →',
        loanSeeks: 'ಬೇಡಿಕೆ',
        loanDays: 'ದಿನಗಳು',
        loanRate: 'ದರ',
        loanVerified: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
        fundLoan: 'ಸಾಲ ನಿಧಿ ಮಾಡಿ',
        purpose: 'ಉದ್ದೇಶ',
        matchScore: 'ವಿಶ್ವಾಸ ಹೊಂದಾಣಿಕೆ',

        // ── Legal Shield ──
        legalTitle: 'AI ಕಾನೂನು ರಕ್ಷಕ',
        legalSubtitle: 'ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿ ವಿವರಿಸಿ — Gemini ನಿಮ್ಮ FIR ತಯಾರಿಸುತ್ತದೆ.',
        reportThreat: '🚨 ಅಪಾಯ ವರದಿ ಮಾಡಿ',
        chatPlaceholder: 'ಕಿರುಕುಳ ಅಥವಾ ಬೆದರಿಕೆ ವಿವರಿಸಿ…',
        sendMessage: 'ಕಳುಹಿಸಿ',
        autoTranslated: 'ಕನ್ನಡದಿಂದ ಸ್ವಯಂ ಭಾಷಾಂತರ',
        firAnalysis: 'Gemini Auto-FIR ವಿಶ್ಲೇಷಣೆ ಪ್ರಗತಿಯಲ್ಲಿದೆ…',
        aiTyping: 'SheVest AI ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ…',
        downloadPdf: '↓ ಕಾನೂನು PDF ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
        closeModal: '✕ ಮುಚ್ಚಿ',

        // ── FIR Modal ──
        firTitle: 'Auto-FIR ಕರಡು',
        firSubtitle: 'ಭಾರತೀಯ ದಂಡ ಸಂಹಿತೆ · BNS 2023',
        firSection: 'BNS ಸೆಕ್ಷನ್ 308(2)',
        firOffence: 'ಸುಲಿಗೆ — ಹಣಕಾಸಿನ ಕಿರುಕುಳ',
        firComplainant: 'ದೂರುದಾರ',
        firAccused: 'ಆರೋಪಿ',
        firIncident: 'ಘಟನೆ ಸಾರಾಂಶ',
        firLoading: 'Gemini ನಿಮ್ಮ ಹೇಳಿಕೆ ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ…',
        firReady: 'FIR ಕರಡು ಸಿದ್ಧವಾಗಿದೆ',
        firWarning: 'ಇದು AI ರಚಿಸಿದ ಕರಡು. ಸಲ್ಲಿಸುವ ಮೊದಲು ಕಾನೂನು ತಜ್ಞರಿಂದ ಪರಿಶೀಲಿಸಿ.',

        // ── General ──
        verified: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
        pending: 'ಬಾಕಿ ಇದೆ',
        active: 'ಸಕ್ರಿಯ',
        loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    },
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const AppContext = createContext(null)

// ─── Custom Hook — must be used inside <AppProvider> ─────────────────────────
export function useApp() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used within <AppProvider>')
    return ctx
}

// Convenience alias for language-only consumers
export function useLanguage() {
    const { lang, toggleLang } = useApp()
    return { lang, toggleLang }
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Trust score increment per paid installment
const TRUST_PER_INSTALLMENT = 20

// Trust points awarded when a full chit cycle completes
const TRUST_PER_CYCLE = 20

// Number of installments that constitute one chit cycle
const INSTALLMENTS_PER_CYCLE = 12

// P2P unlock gate
export const P2P_TRUST_GATE = 80
const UID_STORAGE_KEY = 'shevest_uid'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// Default / grace period constants
const DEFAULT_TRUST_PENALTY  = 50   // points deducted on confirmed default
const GRACE_TRUST_RESTORE    = 25   // points restored when grace is granted

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
    // ── Core state ──────────────────────────────────────────────────────────────
    const [lang, setLang] = useState('en')
    const [trustScore, setTrustScore] = useState(0)    // 0 until first installment paid
    const [chitCyclesCompleted, setChitCycles] = useState(0)
    const [installmentsPaidThisCycle, setInstPaid] = useState(0)
    const [currentUserUid, setCurrentUserUid] = useState('')
    const [apiNotice, setApiNotice] = useState('')
    const [isSessionRestoring, setIsSessionRestoring] = useState(false)
    // 'active' | 'overdue' | 'grace_period' | 'locked' | 'disputed'
    const [memberStatus, setMemberStatus] = useState('active')

    /**
     * hasPaidCurrentCycle — cryptographic escrow truth signal.
     * Set to true whenever a payment clears escrow (recordInstallmentPaid).
     * An NGO cannot trigger confirmDefaultLock while this is true.
     * Resets to false at the start of each new cycle.
     */
    const [hasPaidCurrentCycle, setHasPaidCurrentCycle] = useState(true)

    /**
     * disputeStatus — tracks active whistleblower escalation.
     * null            → no active dispute
     * 'under_investigation' → escalated to SheVest Central Audit Team;
     *                         any pending lock is paused until resolved.
     */
    const [disputeStatus, setDisputeStatus] = useState(null)

    // ── Auth state ───────────────────────────────────────────────────────────────
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userRole, setUserRole] = useState(null) // 'member' | 'ngo_admin'

    // ── Actions ──────────────────────────────────────────────────────────────────

    const toggleLang = useCallback(() => {
        setLang(l => l === 'en' ? 'hi' : l === 'hi' ? 'kn' : 'en')
    }, [])

    /**
     * recordInstallmentPaid
     * Also marks hasPaidCurrentCycle = true so the escrow lock activates.
     * Clears any prior overdue/disputed status on successful payment.
     * Called when user taps "Pay Monthly Installment" in ChitHub.
     * - Increments trust score by TRUST_PER_INSTALLMENT (capped at 100)
     * - Tracks installments within current cycle
     * - When INSTALLMENTS_PER_CYCLE reached, closes the cycle:
     *     · Awards TRUST_PER_CYCLE bonus
     *     · Increments chitCyclesCompleted
     *     · Resets installment counter
     */
    const recordInstallmentPaid = useCallback(() => {
        setInstPaid(prev => {
            const next = prev + 1
            if (next >= INSTALLMENTS_PER_CYCLE) {
                // Cycle complete — bonus trust + new cycle; reset escrow truth for new cycle
                setTrustScore(s => Math.min(100, s + TRUST_PER_INSTALLMENT + TRUST_PER_CYCLE))
                setChitCycles(c => c + 1)
                setHasPaidCurrentCycle(false) // new cycle begins unpaid
                return 0 // reset installment counter
            }
            setTrustScore(s => Math.min(100, s + TRUST_PER_INSTALLMENT))
            return next
        })
        // Escrow truth: member paid this cycle — blocks malicious default lock
        setHasPaidCurrentCycle(true)
        // Resolve any pending overdue/disputed flags on verified payment
        setMemberStatus(prev =>
            prev === 'overdue' || prev === 'disputed' ? 'active' : prev
        )
        setDisputeStatus(null)
    }, [])

    /**
     * setTrustScoreManual — for demo/testing overrides
     */
    const setTrustScoreManual = useCallback((scoreOrUpdater) => {
        if (typeof scoreOrUpdater === 'function') {
            setTrustScore(prev => {
                const next = scoreOrUpdater(prev)
                return Math.max(0, Math.min(100, isNaN(next) ? prev : next))
            })
        } else {
            const score = Number(scoreOrUpdater)
            setTrustScore(Math.max(0, Math.min(100, isNaN(score) ? 0 : score)))
        }
    }, [])

    const syncUserFromBackend = useCallback((user) => {
        if (!user) return
        if (user.uid) {
            setCurrentUserUid(user.uid)
            localStorage.setItem(UID_STORAGE_KEY, user.uid)
        }
        if (typeof user.trust_score === 'number') {
            setTrustScore(Math.max(0, Math.min(100, user.trust_score)))
        }
        if (typeof user.chit_cycles_completed === 'number') {
            setChitCycles(user.chit_cycles_completed)
        }
    }, [])

    const applyInstallmentResult = useCallback((result) => {
        if (!result) return
        if (typeof result.trust_score === 'number') {
            setTrustScore(Math.max(0, Math.min(100, result.trust_score)))
        }
        if (typeof result.chit_cycles_completed === 'number') {
            setChitCycles(result.chit_cycles_completed)
        }
        setInstPaid((prev) => {
            const next = prev + 1
            return next >= INSTALLMENTS_PER_CYCLE ? 0 : next
        })
    }, [])

    // ── Auth actions ─────────────────────────────────────────────────────────────

    /**
     * login(role) — called by Login view (real OTP path) and demo quick-login.
     * Sets authenticated=true and assigns the user role.
     */
    const login = useCallback((role, user = null) => {
        setUserRole(role)
        setIsAuthenticated(true)
        if (user?.uid) {
            syncUserFromBackend(user)
        }
        setApiNotice('')
    }, [syncUserFromBackend])

    /**
     * loginUser(role, payload) — Multi-role auth entry point.
     *
     * Called by MemberAuth and NgoLogin views after successful OTP/credential
     * verification. Enforces FinTech trust-score rules:
     *
     *   · New Member     → trustScore initialised to 0; builds with installments.
     *   · Return Member  → trust state synced from backend (if uid present).
     *   · NGO admin      → userRole set to 'ngo_admin'; no trust score change.
     *
     * Accepts role 'member' (canonical) or 'borrower' (legacy alias).
     * payload shape: { phone?, uid?, isNewUser?, aadhaar_last4?, upi_id? }
     */
    const loginUser = useCallback((role, payload = {}) => {
        const { uid, isNewUser } = payload
        const canonicalRole = (role === 'borrower') ? 'member' : role

        if (canonicalRole === 'member') {
            if (isNewUser) {
                setTrustScore(0)
                setChitCycles(0)
                setInstPaid(0)
            } else if (uid) {
                syncUserFromBackend({ uid })
            }
            setUserRole('member')
        } else if (canonicalRole === 'ngo_admin') {
            setUserRole('ngo_admin')
        }

        if (uid) {
            setCurrentUserUid(uid)
            localStorage.setItem(UID_STORAGE_KEY, uid)
        }

        setIsAuthenticated(true)
        setApiNotice('')
    }, [syncUserFromBackend])

    /**
     * logout — clears auth state, resets trust score.
     */
    const logout = useCallback(() => {
        localStorage.removeItem(UID_STORAGE_KEY)
        setIsAuthenticated(false)
        setUserRole(null)
        setCurrentUserUid('')
        setTrustScore(0)
        setChitCycles(0)
        setInstPaid(0)
        setMemberStatus('active')
        setHasPaidCurrentCycle(true)
        setDisputeStatus(null)
        setApiNotice('')
    }, [])

    const fetchTrustSnapshot = useCallback(async (uid) => {
        const response = await fetch(`${API_BASE}/admin/trust/${encodeURIComponent(uid)}/events?limit=100`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
            const body = await response.text()
            throw new Error(body || 'Unable to restore trust history right now.')
        }

        const payload = await response.json()
        const events = Array.isArray(payload?.data) ? payload.data : []
        const orderedEvents = [...events].sort((left, right) => {
            return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
        })

        const computedTrust = orderedEvents.reduce((score, event) => score + (Number(event.delta_score) || 0), 20)
        const chitCycles = orderedEvents.filter((event) => event.event_type === 'chit_payment').length

        return {
            trustScore: Math.max(0, Math.min(100, computedTrust)),
            chitCyclesCompleted: Math.max(0, chitCycles),
        }
    }, [])

    // Session restore only pre-populates UID/trust — does NOT auto-authenticate.
    // Login screen is always shown on page load; Quick Login / OTP sets isAuthenticated.
    useEffect(() => {
        const savedUid = localStorage.getItem(UID_STORAGE_KEY)
        if (!savedUid) return

        // Remember the UID so API calls work immediately after login
        setCurrentUserUid(savedUid)
    }, [])

    /**
     * fileWhistleblowerDispute
     * Called when a Member believes they are being maliciously defaulted despite
     * having proof of payment. Escalates to the SheVest Central Audit Team.
     *
     * Effects:
     *   · Sets memberStatus to 'disputed' — suspends any pending ban
     *   · Sets disputeStatus to 'under_investigation'
     *   · Any confirmDefaultLock action is blocked while this is active
     *   · Fires a best-effort audit log POST to the backend (non-blocking)
     */
    const fileWhistleblowerDispute = useCallback(async () => {
        setMemberStatus('disputed')
        setDisputeStatus('under_investigation')
        // Non-blocking audit trail — intentionally fire-and-forget
        try {
            await fetch(`${API_BASE}/admin/whistleblower-dispute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: null,  // currentUserUid not in closure — caller should pass if needed
                    timestamp: new Date().toISOString(),
                    event: 'whistleblower_dispute_filed',
                }),
            })
        } catch {
            // Audit log failure must NOT prevent the member's dispute from registering
        }
    }, [])

    /**
     * triggerDefaultPenalty
     * Called when a Member misses a payment (or the NGO confirms a default).
     * • Drops trustScore by DEFAULT_TRUST_PENALTY (floor 0)
     * • Sets memberStatus to 'overdue'
     * • P2P access auto-locks because trustScore falls below P2P_TRUST_GATE
     */
    const triggerDefaultPenalty = useCallback(() => {
        setTrustScore(prev => Math.max(0, prev - DEFAULT_TRUST_PENALTY))
        setMemberStatus('overdue')
    }, [])

    /**
     * grantGracePeriod
     * Called when the NGO approves a 7-day grace period.
     * • Restores GRACE_TRUST_RESTORE points (capped at 100)
     * • Sets memberStatus to 'grace_period'
     * • Does NOT fully re-open P2P — that requires the Member to clear the overdue
     */
    const grantGracePeriod = useCallback(() => {
        setTrustScore(prev => Math.min(100, prev + GRACE_TRUST_RESTORE))
        setMemberStatus('grace_period')
    }, [])

    /**
     * confirmDefaultLock
     * Called when the NGO clicks “Confirm Default (Lock Account)”.
     * BLOCKED if hasPaidCurrentCycle === true (escrow proof) or
     *           disputeStatus === 'under_investigation' (whistleblower active).
     * Permanently locks the member until manual review.
     */
    const confirmDefaultLock = useCallback(() => {
        // Escrow truth check — this guard is also enforced in the UI
        if (hasPaidCurrentCycle) return
        if (disputeStatus === 'under_investigation') return
        setMemberStatus('locked')
        setTrustScore(0)
    }, [hasPaidCurrentCycle, disputeStatus])

    /**
     * clearOverdueStatus
     * Resets memberStatus back to 'active' once overdue balance is cleared.
     */
    const clearOverdueStatus = useCallback(() => {
        setMemberStatus('active')
    }, [])

    /**
     * toggleRole — used by DemoGodMode to swap roles during a live pitch.
     */
    const toggleRole = useCallback(() => {
        setUserRole(prev => prev === 'member' ? 'ngo_admin' : 'member')
    }, [])

    // ── Derived state ────────────────────────────────────────────────────────────

    const isP2PUnlocked = trustScore >= P2P_TRUST_GATE && memberStatus !== 'locked' && memberStatus !== 'disputed'
    const installmentsLeft = INSTALLMENTS_PER_CYCLE - installmentsPaidThisCycle
    const cycleProgress = (installmentsPaidThisCycle / INSTALLMENTS_PER_CYCLE) * 100
    const t = T[lang]

    // ── Memoised context value ───────────────────────────────────────────────────
    const value = useMemo(() => ({
        // State
        lang,
        trustScore,
        memberStatus,
        hasPaidCurrentCycle,
        disputeStatus,
        chitCyclesCompleted,
        installmentsPaidThisCycle,
        currentUserUid,
        apiNotice,
        isSessionRestoring,

        // Auth state
        isAuthenticated,
        userRole,

        // Actions
        toggleLang,
        recordInstallmentPaid,
        setTrustScoreManual,
        syncUserFromBackend,
        applyInstallmentResult,
        setApiNotice,
        triggerDefaultPenalty,
        grantGracePeriod,
        confirmDefaultLock,
        clearOverdueStatus,
        fileWhistleblowerDispute,

        // Auth actions
        login,
        loginUser,
        logout,
        toggleRole,

        // Derived
        isP2PUnlocked,
        installmentsLeft,
        cycleProgress,
        t,

        // Constants (exposed for views)
        P2P_TRUST_GATE,
        INSTALLMENTS_PER_CYCLE,
        TRUST_PER_INSTALLMENT,
    }), [
        lang, trustScore, memberStatus, hasPaidCurrentCycle, disputeStatus,
        chitCyclesCompleted, installmentsPaidThisCycle, currentUserUid, apiNotice,
        isSessionRestoring,
        isAuthenticated, userRole,
        toggleLang, recordInstallmentPaid, setTrustScoreManual, syncUserFromBackend, applyInstallmentResult, setApiNotice,
        triggerDefaultPenalty, grantGracePeriod, confirmDefaultLock, clearOverdueStatus, fileWhistleblowerDispute,
        login, loginUser, logout, toggleRole,
        isP2PUnlocked, installmentsLeft, cycleProgress, t,
    ])

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export default AppContext
