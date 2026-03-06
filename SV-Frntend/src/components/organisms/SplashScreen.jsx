/**
 * components/organisms/SplashScreen.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT 1 — Premium app launch screen.
 *
 * Sequence (total ~2.5 s):
 *   0.0 s  → Background fades in (stone-50)
 *   0.3 s  → Logo mark scales in with spring
 *   0.6 s  → "SheVest" wordmark reveals with emerald gradient + blur-to-clear
 *   1.1 s  → Tagline fades up
 *   1.8 s  → Hold
 *   2.3 s  → Entire screen fades out (parent unmounts after onComplete fires)
 *
 * Props:
 *   onComplete — () => void  called when exit animation finishes
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Staggered word-reveal for "SheVest" ──────────────────────────────────────
const WORD = ['S', 'h', 'e', 'V', 'e', 's', 't'];

const letterVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      delay: 0.55 + i * 0.055,
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// ── Logo mark — uses the actual app icon image ───────────────────────────────
function LogoMark() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 22 }}
      className="relative mb-5"
    >
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-[28px] bg-emerald-400/25"
        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.0, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <img
        src="/icon-512.png"
        alt="SheVest logo"
        className="relative w-24 h-24 rounded-[28px] shadow-xl shadow-emerald-500/30"
        draggable="false"
      />
    </motion.div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SplashScreen({ onComplete }) {
  // Trigger exit → parent removes component
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 2600);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.45, ease: 'easeIn' }}
      className="fixed inset-0 z-[100] bg-stone-50 flex flex-col items-center justify-center select-none"
      aria-label="SheVest loading"
      role="status"
    >
      {/* Soft radial emerald bloom in background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(16,185,129,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <LogoMark />

      {/* Wordmark — staggered letter reveal */}
      <div className="flex items-end gap-0" aria-hidden="true">
        {WORD.map((char, i) => {
          // "She" = stone-800, "Vest" = emerald gradient
          const isVest = i >= 3;
          return (
            <motion.span
              key={i}
              custom={i}
              variants={letterVariants}
              initial="hidden"
              animate="visible"
              className={[
                'text-5xl font-bold tracking-tight font-sans leading-none',
                isVest
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent'
                  : 'text-stone-800',
              ].join(' ')}
            >
              {char}
            </motion.span>
          );
        })}
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15, duration: 0.5, ease: 'easeOut' }}
        className="mt-3 text-sm text-stone-500 font-medium tracking-wide"
      >
        Financial freedom for every woman
      </motion.p>

      {/* Bottom powered-by */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="absolute bottom-10 text-[11px] text-stone-400 font-medium tracking-widest uppercase"
      >
        Powered by SheVest · India
      </motion.p>
    </motion.div>
  );
}
