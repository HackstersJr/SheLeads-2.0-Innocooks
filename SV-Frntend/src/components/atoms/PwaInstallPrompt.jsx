/**
 * components/atoms/PwaInstallPrompt.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PWA "Add to Home Screen" install banner — Soft 3D Glassmorphism design.
 *
 * Behaviour
 * ─────────
 * • Listens for the native `beforeinstallprompt` browser event.
 * • Only renders when the event has fired (i.e. app is installable and not
 *   yet installed).
 * • Clicking "Install" calls deferred prompt.prompt() and hides the banner
 *   regardless of the user's choice.
 * • Clicking "✕" dismisses for the session (does not suppress future visits).
 *
 * Placement
 * ─────────
 * fixed bottom-20 — sits just above the BottomNav (which is h-16 / bottom-0).
 * z-[60]           — below modals (z-70) but above page content.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile Chrome
            e.preventDefault()
            setDeferredPrompt(e)
            setVisible(true)
        }

        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    // Also hide after the app is installed
    useEffect(() => {
        const onInstalled = () => setVisible(false)
        window.addEventListener('appinstalled', onInstalled)
        return () => window.removeEventListener('appinstalled', onInstalled)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log(`[SheVest PWA] Install prompt outcome: ${outcome}`)
        setDeferredPrompt(null)
        setVisible(false)
    }

    const handleDismiss = () => setVisible(false)

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="pwa-banner"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    // Centering shell — plain div (not motion) for safe positioning
                    className="fixed bottom-20 left-4 right-4 z-[60]"
                >
                    {/* Glass card */}
                    <div className="
                        flex items-center gap-3
                        bg-white/60 backdrop-blur-md
                        border border-white/40
                        shadow-lg shadow-emerald-900/10
                        rounded-2xl px-4 py-3
                    ">
                        {/* Icon */}
                        <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                            <Smartphone size={18} className="text-white" strokeWidth={2} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-950 font-sans leading-tight">
                                Install SheVest
                            </p>
                            <p className="text-[11px] text-stone-500 font-sans leading-snug mt-0.5 truncate">
                                Install for the best experience
                            </p>
                        </div>

                        {/* Install CTA */}
                        <motion.button
                            onClick={handleInstall}
                            whileTap={{ scale: 0.95 }}
                            className="
                                shrink-0 flex items-center gap-1.5
                                bg-emerald-500 hover:bg-emerald-600
                                text-white text-xs font-bold font-sans
                                px-3 py-2 rounded-xl
                                shadow-md shadow-emerald-500/30
                                border border-emerald-400/40
                                transition-colors duration-150
                            "
                            aria-label="Install SheVest app"
                        >
                            <Download size={13} strokeWidth={2.5} />
                            Install
                        </motion.button>

                        {/* Dismiss */}
                        <motion.button
                            onClick={handleDismiss}
                            whileTap={{ scale: 0.9 }}
                            className="shrink-0 w-7 h-7 rounded-full bg-stone-100/80 hover:bg-stone-200/80 flex items-center justify-center transition-colors duration-150"
                            aria-label="Dismiss install prompt"
                        >
                            <X size={13} className="text-stone-500" strokeWidth={2.5} />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
