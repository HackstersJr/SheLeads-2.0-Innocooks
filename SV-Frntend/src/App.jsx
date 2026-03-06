/**
 * App.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SheVest App Shell — 3-phase launch sequence
 *
 *   Phase 1 — SplashScreen      (2.5 s, AnimatePresence exit)
 *   Phase 2 — Multi-Role Auth   (!isAuthenticated)
 *               /auth             → AuthEntry   (role selection)
 *               /auth/member      → MemberAuth
 *               /auth/ngo         → NgoLogin
 *   Phase 3 — Authenticated shell
 *               Member    → /member-hub
 *               NGO admin → /ngo-dashboard
 *
 * DemoGodMode is injected globally in Phase 3 (always visible during pitches).
 * RoleNavigator watches userRole changes and auto-navigates on role switch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Suspense, lazy, useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav         from './components/BottomNav'
import B2BHeader         from './components/B2BHeader'
import SplashScreen      from './components/organisms/SplashScreen'
import DemoGodMode       from './components/organisms/DemoGodMode'
import PwaInstallPrompt  from './components/atoms/PwaInstallPrompt'

// ─── Lazy-load views ──────────────────────────────────────────────────────────
const ChitHub        = lazy(() => import('./views/ChitHub'))
const P2PMarketplace = lazy(() => import('./views/P2PMarketplace'))
const LegalChat      = lazy(() => import('./views/LegalChat'))
const BorrowerHub    = lazy(() => import('./views/BorrowerHub'))
const NgoDashboard   = lazy(() => import('./views/NgoDashboard'))
const Login          = lazy(() => import('./views/Login'))

// ─── Auth views (multi-role flow) ────────────────────────────────────────────
const AuthEntry      = lazy(() => import('./views/AuthEntry'))
const MemberAuth     = lazy(() => import('./views/MemberAuth'))
const BorrowerLogin  = lazy(() => import('./views/BorrowerLogin')) // legacy alias
const NgoLogin       = lazy(() => import('./views/NgoLogin'))

// ─── Page loading skeleton ────────────────────────────────────────────────────
function PageSkeleton() {
    return (
        <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
            {[1, 2, 3].map(i => (
                <div
                    key={i}
                    className="glass-card p-5 h-28 relative overflow-hidden"
                    style={{ animationDelay: `${i * 0.08}s` }}
                >
                    <div className="shimmer absolute inset-0 rounded-3xl" />
                    <div className="h-4 bg-stone-100/80 rounded-full w-2/3 mb-3" />
                    <div className="h-3 bg-stone-100/60 rounded-full w-1/2" />
                </div>
            ))}
        </div>
    )
}

// ─── RoleNavigator ────────────────────────────────────────────────────────────
// Navigates ONLY when userRole actually changes value (e.g. DemoGodMode
// toggleRole). Uses a ref to track the previous role so normal in-app
// navigation to /chithub, /p2p, /legal is never overridden.
function RoleNavigator() {
    const { userRole } = useApp()
    const navigate = useNavigate()
    const prevRoleRef = useRef(null)

    useEffect(() => {
        // Only navigate when the role value itself changes, not on every render
        if (userRole === prevRoleRef.current) return
        prevRoleRef.current = userRole
        if (userRole === 'member')     navigate('/member-hub',      { replace: true })
        if (userRole === 'borrower')   navigate('/member-hub',      { replace: true }) // legacy
        if (userRole === 'ngo_admin')  navigate('/ngo-dashboard',   { replace: true })
    }, [userRole, navigate])

    return null
}

// ─── Phase 3: Authenticated app shell ────────────────────────────────────────
function AuthenticatedApp() {
    const { userRole } = useApp()
    const defaultPath = userRole === 'ngo_admin' ? '/ngo-dashboard' : '/member-hub'

    return (
        <motion.div
            key="authenticated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-md mx-auto h-screen flex flex-col overflow-hidden shadow-[0_0_80px_rgba(31,38,135,0.12)]"
        >
            {/* Inner glass shimmer ring */}
            <div
                className="absolute inset-0 pointer-events-none z-50"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)' }}
            />

            {/* Partner header */}
            <B2BHeader />

            {/* Scrollable route content */}
            <main className="flex-1 overflow-hidden relative">
                <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                        {/* Role-aware default redirect */}
                        <Route path="/"               element={<Navigate to={defaultPath} replace />} />

                        {/* Primary role views — canonical post-login URLs */}
                        <Route path="/member-hub"      element={<BorrowerHub />} />
                        <Route path="/borrower-hub"    element={<Navigate to="/member-hub" replace />} />
                        <Route path="/ngo-dashboard"  element={<NgoDashboard />} />

                        {/* Core feature views (accessible from both roles via nav) */}
                        <Route path="/chithub"        element={<ChitHub />} />
                        <Route path="/p2p"            element={<P2PMarketplace />} />
                        <Route path="/legal"          element={<LegalChat />} />

                        {/* Legacy aliases — preserved for backward compat */}
                        <Route path="/borrower"       element={<Navigate to="/member-hub"     replace />} />
                        <Route path="/ngo"            element={<Navigate to="/ngo-dashboard"  replace />} />
                        <Route path="/dashboard"      element={<Navigate to={defaultPath}     replace />} />
                        <Route path="/market"         element={<Navigate to="/p2p"            replace />} />

                        {/* 404 */}
                        <Route path="*"               element={<Navigate to={defaultPath} replace />} />
                    </Routes>
                </Suspense>
            </main>

            {/* Bottom nav */}
            <BottomNav />

            {/* ── Demo God Mode — always on screen after login ── */}
            <DemoGodMode />

            {/* ── PWA install banner — fires when browser deems app installable ── */}
            <PwaInstallPrompt />

            {/* Role navigator — reacts to GodMode toggleRole */}
            <RoleNavigator />
        </motion.div>
    )
}

// ─── Phase 2: Multi-role auth flow ───────────────────────────────────────────
// Renders its own <Routes> so the browser URL updates as the user moves
// through AuthEntry → MemberAuth / NgoLogin, giving each step a back-able
// URL. A wildcard catch-all redirects any unrecognised path to /auth so
// unauthenticated deep-links always land on the role-selection screen.
function AuthPhase() {
    return (
        <motion.div
            key="auth"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full"
        >
                <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
                <Routes>
                    <Route path="/auth"          element={<AuthEntry />} />
                    <Route path="/auth/member"   element={<MemberAuth />} />
                    <Route path="/auth/borrower" element={<Navigate to="/auth/member" replace />} />
                    <Route path="/auth/ngo"      element={<NgoLogin />} />

                    {/* Legacy single-login screen — still reachable */}
                    <Route path="/login"         element={<Login />} />

                    {/* Any unauthenticated path → role selection */}
                    <Route path="*"              element={<Navigate to="/auth" replace />} />
                </Routes>
            </Suspense>
        </motion.div>
    )
}

// ─── App Shell — orchestrates 3-phase sequence ───────────────────────────────
function AppShell() {
    const { isAuthenticated } = useApp()
    const [showSplash, setShowSplash] = useState(true)

    return (
        <AnimatePresence mode="wait">
            {showSplash ? (
                // Phase 1 — Splash (onComplete fires after 2.6 s)
                <SplashScreen
                    key="splash"
                    onComplete={() => setShowSplash(false)}
                />
            ) : !isAuthenticated ? (
                // Phase 2 — Multi-role auth
                <AuthPhase key="auth" />
            ) : (
                // Phase 3 — Authenticated shell
                <AuthenticatedApp key="app" />
            )}
        </AnimatePresence>
    )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <AppShell />
            </BrowserRouter>
        </AppProvider>
    )
}
