import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

// The dev server never uses the PWA service worker. A worker left behind by `npm run preview`
// on the same origin (port 4173) would keep serving the old cached build, so drop it.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        if (registrations.length === 0) return
        await Promise.all(registrations.map((registration) => registration.unregister()))
        if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map((key) => caches.delete(key)))
        }
        if (navigator.serviceWorker.controller) window.location.reload()
    })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
