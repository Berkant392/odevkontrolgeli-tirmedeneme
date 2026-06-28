import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Dev modunda eski Service Worker'ları temizle
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
            registration.unregister();
            console.log("Dev modunda eski Service Worker devredışı bırakıldı:", registration);
        }
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
