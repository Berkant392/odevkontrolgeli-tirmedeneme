import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // accentColor: '' (varsayılan mavi), 'theme-emerald', vb.
    const [accentColor, setAccentColor] = useState(() => {
        return localStorage.getItem('app-accent-color') || '';
    });

    // mode: 'light' veya 'dark'
    const [mode, setMode] = useState(() => {
        return localStorage.getItem('app-theme-mode') || 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Önceki tema ve mod sınıflarını temizle
        root.classList.remove('dark', 'light', 'theme-emerald', 'theme-rose', 'theme-amber', 'theme-purple', 'theme-red');
        
        // Yeni modu ekle
        root.classList.add(mode);
        
        // Yeni vurgu rengini ekle (eğer boş değilse)
        if (accentColor) {
            root.classList.add(accentColor);
        }

        // LocalStorage'a kaydet
        localStorage.setItem('app-accent-color', accentColor);
        localStorage.setItem('app-theme-mode', mode);

    }, [accentColor, mode]);

    const changeAccentColor = (colorClass) => {
        setAccentColor(colorClass);
    };

    const toggleMode = () => {
        setMode(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ accentColor, changeAccentColor, mode, toggleMode }}>
            {children}
        </ThemeContext.Provider>
    );
};
