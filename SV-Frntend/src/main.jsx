import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register service worker — autoUpdate mode silently fetches new versions
// and applies them on next page load (no user intervention needed).
registerSW({
    onNeedRefresh() {
        // New content available; auto-update will reload on next navigation.
    },
    onOfflineReady() {
        console.log('[SheVest PWA] App is ready for offline use.')
    },
})

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
