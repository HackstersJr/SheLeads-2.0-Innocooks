/**
 * context/translations.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bilingual copy for all views.
 * Separated from AppContext so Vite Fast Refresh can hot-reload AppContext
 * without invalidating the whole module tree.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const T = {
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
