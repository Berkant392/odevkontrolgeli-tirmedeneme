import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VirtualAgentCursor = () => {
    const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [isVisible, setIsVisible] = useState(false);
    const [isClicking, setIsClicking] = useState(false);
    const [trail, setTrail] = useState([]);
    const trailIdRef = useRef(0);

    // Akıcı kuyruk izi (trail particles) için pozisyon değiştikçe iz noktaları ekle
    useEffect(() => {
        if (!isVisible) {
            setTrail([]);
            return;
        }
        trailIdRef.current++;
        const newParticle = {
            id: trailIdRef.current,
            x: position.x,
            y: position.y,
            scale: 1,
            opacity: 0.8
        };
        setTrail(prev => [...prev.slice(-15), newParticle]); // Son 15 kareyi tut
    }, [position, isVisible]);

    // DOM Öğesini isme veya seçiciye göre bulma (Çok gelişmiş semantik arama)
    const findTargetElement = useCallback((targetStr) => {
        if (!targetStr) return null;
        const normalizedTarget = targetStr.toLowerCase().trim();

        // 1. Doğrudan CSS seçici ise sorgula
        if (normalizedTarget.startsWith('.') || normalizedTarget.startsWith('#') || normalizedTarget.startsWith('[') || normalizedTarget.includes(' ')) {
            try {
                const el = document.querySelector(targetStr);
                if (el) return el;
            } catch (e) {}
        }

        // 2. Semantik Eşleşmeler Sözlüğü (En sık kullanılan öğeler)
        const semanticMappings = {
            'net takibi': 'div[onClick*="trialTracker"]',
            'net takibi kartı': 'div[onClick*="trialTracker"]',
            'ödevlerim': 'div[onClick*="homework"]',
            'ödevlerim kartı': 'div[onClick*="homework"]',
            'notlarım': 'button[title="Notlarım"]',
            'notlarım butonu': 'button[title="Notlarım"]',
            'akıllı notlar': 'button[title="Notlarım"]',
            'not defteri': 'button[title="Notlarım"]',
            'yeni öğrenci': 'button', // contains metni ile aşağıda taranacak
            'öğrenci ara': 'button',
            'kapat': 'button[title="Kapat"]',
            'kapat butonu': 'button[title="Kapat"]',
            'ayarlar': 'button[title="Sistem Ayarları"]',
            'ödev ekle': 'button', 
            'ödev ekle butonu': 'button',
            'kaydet': 'button',
            'kaydet butonu': 'button',
            'vıp': 'span',
            'vıp kartı': 'div'
        };

        // Sözlükte doğrudan bir eşleşme varsa ve o seçici DOM'da mevcutsa döndür
        if (semanticMappings[normalizedTarget]) {
            const el = document.querySelector(semanticMappings[normalizedTarget]);
            if (el) {
                // Eğer buton metin içeriyorsa metin kontrolüyle doğrula (Örn: "YENİ ÖĞRENCİ ARA" butonu)
                if (normalizedTarget.includes('öğrenci') && el.textContent.includes('ÖĞRENCİ')) return el;
                if (normalizedTarget.includes('ödev ekle') && el.textContent.includes('Ödev Ekle')) return el;
                return el;
            }
        }

        // 3. Genel DOM Taraması (Metin bazlı arama)
        // Öncelik Sırası: Butonlar, İnteraktif Divler, Inputlar, Linkler
        const candidates = Array.from(document.querySelectorAll('button, input, a, [role="button"], .cursor-pointer, td, th, h3, h4'));
        
        // A) Tam Metin Eşleşmesi (Büyük-küçük harf duyarsız)
        let matched = candidates.find(el => {
            const text = el.textContent?.toLowerCase().trim() || '';
            const placeholder = el.getAttribute('placeholder')?.toLowerCase().trim() || '';
            const title = el.getAttribute('title')?.toLowerCase().trim() || '';
            return text === normalizedTarget || placeholder === normalizedTarget || title === normalizedTarget;
        });
        if (matched) return matched;

        // B) Kısmi Metin Eşleşmesi
        matched = candidates.find(el => {
            const text = el.textContent?.toLowerCase().trim() || '';
            const placeholder = el.getAttribute('placeholder')?.toLowerCase().trim() || '';
            const title = el.getAttribute('title')?.toLowerCase().trim() || '';
            return text.includes(normalizedTarget) || placeholder.includes(normalizedTarget) || title.includes(normalizedTarget);
        });
        if (matched) return matched;

        // C) Alternatif arama: Öğrenci ismi eşleşmesi (Örn: "ali koç")
        if (normalizedTarget.length > 2) {
            const spans = Array.from(document.querySelectorAll('span, p, div.font-bold, font-black'));
            matched = spans.find(el => {
                const text = el.textContent?.toLowerCase().trim() || '';
                return text === normalizedTarget || text.includes(normalizedTarget);
            });
            if (matched) {
                // Tıklanabilir en yakın üst elemanı bulmaya çalış
                const clickableParent = matched.closest('button, tr, .cursor-pointer, [onClick]');
                return clickableParent || matched;
            }
        }

        return null;
    }, []);

    // Sanal İmleç Glide (Kayma) ve Tetikleme Motoru
    const triggerAction = useCallback(async (actionType, target, text = '', duration = 1200) => {
        return new Promise((resolve) => {
            let element = findTargetElement(target);

            // Eğer hedef o an bulunamadıysa ama biz öğrenci detayında veya net takibindeysek
            // Home/Dashboard görünümüne dönüp tekrar deneme yapabiliriz (Çok proaktif bir davranış!)
            if (!element) {
                console.warn(`Hedef eleman '${target}' bulunamadı. Genel görünüm kontrol ediliyor...`);
                // Eğer home butonumuz varsa veya platformun ana sayfasına dönmek gerekiyorsa trigger edebiliriz.
                // Şimdilik bulamadıysa arayüzde bir arama yapmaya devam et
            }

            if (!element) {
                console.error(`Sanal Fare Hedefi Bulunamadı: ${target}`);
                resolve({ success: false, error: 'Target not found' });
                return;
            }

            // Koordinatları hesapla
            const rect = element.getBoundingClientRect();
            const destX = rect.left + rect.width / 2 + window.scrollX;
            const destY = rect.top + rect.height / 2 + window.scrollY;

            // İmleci görünür yap ve başlangıç koordinatını ayarla (Eğer görünür değilse Jarvis'in fab butonundan veya ekran ortasından başlasın)
            setIsVisible(true);
            
            // Yumuşak geçişli imleç hareketi
            const startX = isVisible ? position.x : (window.innerWidth - 100);
            const startY = isVisible ? position.y : (window.innerHeight - 100);
            
            let startTime = null;

            const animateCursor = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);

                // Bezier eğrisi ile fütüristik yavaşlayarak kayma efekti (easeOutCubic)
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                
                const currentX = startX + (destX - startX) * easeOutCubic;
                const currentY = startY + (destY - startY) * easeOutCubic;

                setPosition({ x: currentX, y: currentY });

                if (progress < 1) {
                    requestAnimationFrame(animateCursor);
                } else {
                    // Hedefe ulaşıldı! Tıklama animasyonunu başlat
                    setIsClicking(true);

                    setTimeout(() => {
                        setIsClicking(false);

                        // Eylemi Gerçekleştir
                        try {
                            if (actionType === 'click') {
                                element.click();
                                // Eğer input ise focusla
                                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                                    element.focus();
                                }
                            } else if (actionType === 'type') {
                                element.focus();
                                element.value = text;
                                // React state güncellemesini tetiklemek için standart input olaylarını fırlat
                                const inputEvent = new Event('input', { bubbles: true });
                                const changeEvent = new Event('change', { bubbles: true });
                                element.dispatchEvent(inputEvent);
                                element.dispatchEvent(changeEvent);
                                
                                // Tuş basım simülasyonu
                                element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                            } else if (actionType === 'scroll') {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            } else if (actionType === 'navigate') {
                                element.click();
                            }
                        } catch (err) {
                            console.error("Sanal fare tetikleme hatası:", err);
                        }

                        // Kısa bir süre sonra imleci gizle
                        setTimeout(() => {
                            setIsVisible(false);
                            resolve({ success: true });
                        }, 500);

                    }, 400); // Tıklama gecikmesi
                }
            };

            requestAnimationFrame(animateCursor);
        });
    }, [isVisible, position, findTargetElement]);

    // Global asistan API'sine bağla
    useEffect(() => {
        window.bhAgent = {
            trigger: triggerAction,
            find: findTargetElement,
            isVisible: () => isVisible,
            getPosition: () => position
        };
        return () => {
            delete window.bhAgent;
        };
    }, [triggerAction, findTargetElement, isVisible, position]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
            {/* ☄️ Işıklı Parçacık Kuyruk İzi (Particle Trail) */}
            <AnimatePresence>
                {trail.map((particle, idx) => (
                    <motion.div
                        key={particle.id}
                        initial={{ opacity: 0.8, scale: 1 }}
                        animate={{ 
                            opacity: 0, 
                            scale: 0.2,
                            x: particle.x - 6,
                            y: particle.y - 6 
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 blur-[1px] shadow-[0_0_8px_rgba(236,72,153,0.6)]"
                        style={{ left: 0, top: 0 }}
                    />
                ))}
            </AnimatePresence>

            {/* 🪐 Fütüristik Neon Pembe/Mor Küre ve Parlayan Halka */}
            {isVisible && (
                <div 
                    className="absolute transition-transform duration-75"
                    style={{ 
                        left: position.x - 16, 
                        top: position.y - 16,
                        transform: isClicking ? 'scale(0.85)' : 'scale(1)'
                    }}
                >
                    {/* Dış parlayan dönen halka */}
                    <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-dashed border-pink-400 animate-[spin_6s_linear_infinite] shadow-[0_0_12px_rgba(244,114,182,0.5)]"></div>
                    
                    {/* İç fütüristik parlayan çekirdek */}
                    <div className="absolute inset-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.8),_inset_0_0_4px_rgba(255,255,255,0.6)] flex items-center justify-center">
                        {/* Sihirli merkez parıltısı */}
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                    </div>

                    {/* Tıklama Dalgası Efekti (Neon Ripple Click Animation) */}
                    <AnimatePresence>
                        {isClicking && (
                            <motion.div
                                initial={{ opacity: 1, scale: 0.3 }}
                                animate={{ opacity: 0, scale: 2.8 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="absolute -inset-4 w-16 h-16 rounded-full border-4 border-pink-500/80 blur-[2px] shadow-[0_0_20px_rgba(236,72,153,0.8)]"
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default VirtualAgentCursor;
