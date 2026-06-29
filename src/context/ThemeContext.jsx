import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // accentColor: '' (varsayılan mavi), 'theme-emerald', vb.
    const [accentColor, setAccentColor] = useState(() => {
        return localStorage.getItem('app-accent-color') || '';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Önceki tema ve mod sınıflarını temizle
        root.classList.remove('dark', 'light', 'theme-emerald', 'theme-rose', 'theme-amber', 'theme-purple', 'theme-red');
        
        // Sadece aydınlık modu ekle
        root.classList.add('light');
        
        // Yeni vurgu rengini ekle (eğer boş değilse)
        if (accentColor) {
            root.classList.add(accentColor);
        }

        // LocalStorage'a kaydet
        localStorage.setItem('app-accent-color', accentColor);

    }, [accentColor]);

    const changeAccentColor = (colorClass) => {
        setAccentColor(colorClass);
    };

    return (
        <ThemeContext.Provider value={{ accentColor, changeAccentColor }}>
            {children}
        </ThemeContext.Provider>
    );
};
