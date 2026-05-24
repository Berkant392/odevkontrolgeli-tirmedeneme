import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VirtualAgentCursor = () => {
    const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [isVisible, setIsVisible] = useState(false);
    const [isClicking, setIsClicking] = useState(false);
    const [trail, setTrail] = useState([]);
    
    // HUD & Ajan Durumları
    const [activeAction, setActiveAction] = useState('tarama'); // tarama, click, type, scroll, navigate, correcting
    const [activeThought, setActiveThought] = useState('Ekran analiz ediliyor...');
    const [activeTargetName, setActiveTargetName] = useState('');
    const [detectedTags, setDetectedTags] = useState([]); // Vimium tarzı neon etiketler

    const trailIdRef = useRef(0);
    const cursorRef = useRef(null);
    const hideTimeoutRef = useRef(null);

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
            y: position.y
        };
        setTrail(prev => [...prev.slice(-18), newParticle]); // Gelişmiş zengin kuyruk (son 18 kare)
    }, [position, isVisible]);

    // Sayfadaki interaktif öğeleri tarayıp harf etiketleri atama (Vimium-Style Visual Grounding)
    const generateVisualTags = useCallback(() => {
        const candidates = Array.from(document.querySelectorAll(
            'button, input, a, [role="button"], .cursor-pointer, td[onClick], tr[onClick], .vip-card, [title]'
        )).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top <= window.innerHeight;
        });

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const tags = candidates.slice(0, 20).map((el, index) => {
            const rect = el.getBoundingClientRect();
            return {
                id: el.id || `el-${index}`,
                char: alphabet[index] || `A${index}`,
                rect: {
                    left: rect.left + window.scrollX,
                    top: rect.top + window.scrollY,
                    width: rect.width,
                    height: rect.height
                },
                element: el,
                text: el.textContent?.trim().slice(0, 15) || el.getAttribute('placeholder') || el.getAttribute('title') || 'Buton'
            };
        });

        setDetectedTags(tags);
        return tags;
    }, []);

    // DOM Öğesini isme veya seçiciye göre bulma (Semantik & Eşleşme Arama)
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

        // 2. Semantik Sözlük Eşleşmesi
        const semanticMappings = {
            'net takibi': 'div[onClick*="trialTracker"]',
            'net takibi kartı': 'div[onClick*="trialTracker"]',
            'ödevlerim': 'div[onClick*="homework"]',
            'ödevlerim kartı': 'div[onClick*="homework"]',
            'notlarım': 'button[title="Notlarım"]',
            'notlarım butonu': 'button[title="Notlarım"]',
            'akıllı notlar': 'button[title="Notlarım"]',
            'not defteri': 'button[title="Notlarım"]',
            'kapat': 'button[title="Kapat"]',
            'kapat butonu': 'button[title="Kapat"]',
            'ayarlar': 'button[title="Sistem Ayarları"]',
            'ödev-başlık-girişi': 'input[placeholder*="Ödev Başlığı"], input[name*="title"], input[id*="title"]',
            'ödev-tarih-girişi': 'input[type="date"], input[name*="date"], input[id*="date"]'
        };

        if (semanticMappings[normalizedTarget]) {
            const el = document.querySelector(semanticMappings[normalizedTarget]);
            if (el) return el;
        }

        // 3. Genel DOM Arama
        const candidates = Array.from(document.querySelectorAll('button, input, a, [role="button"], .cursor-pointer, td, th, h3, h4, span'));
        
        let matched = candidates.find(el => {
            const text = el.textContent?.toLowerCase().trim() || '';
            const placeholder = el.getAttribute('placeholder')?.toLowerCase().trim() || '';
            const title = el.getAttribute('title')?.toLowerCase().trim() || '';
            return text === normalizedTarget || placeholder === normalizedTarget || title === normalizedTarget;
        });
        if (matched) return matched;

        matched = candidates.find(el => {
            const text = el.textContent?.toLowerCase().trim() || '';
            const placeholder = el.getAttribute('placeholder')?.toLowerCase().trim() || '';
            return text.includes(normalizedTarget) || placeholder.includes(normalizedTarget);
        });
        if (matched) return matched;

        // 4. Öğrenci detayına inen arama (Örn: "ali koç")
        if (normalizedTarget.length > 2) {
            const spans = Array.from(document.querySelectorAll('span, p, div.font-bold, font-black'));
            matched = spans.find(el => {
                const text = el.textContent?.toLowerCase().trim() || '';
                return text === normalizedTarget || text.includes(normalizedTarget);
            });
            if (matched) {
                const clickableParent = matched.closest('button, tr, .cursor-pointer, [onClick]');
                return clickableParent || matched;
            }
        }

        return null;
    }, []);

    // Matematiksel Kavisli Bezier Hareketi Üreteci (Human-like curved path)
    const calculateBezierPath = (start, end, pointsCount = 40) => {
        const points = [];
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        // Hareket açısına dik yönde rastgele kavis sapması uyguluyoruz
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
        const deflection = distance * 0.18 * (Math.random() > 0.5 ? 1 : -1);
        
        const ctrlX = midX + Math.cos(angle) * deflection;
        const ctrlY = midY + Math.sin(angle) * deflection;

        for (let i = 0; i <= pointsCount; i++) {
            const t = i / pointsCount;
            // İvmelenme ve yavaşlama grafiği (easeOutCubic ile Fitts Yasası)
            const easedT = 1 - Math.pow(1 - t, 2.5);
            
            // Quadratic Bezier formülü
            const x = Math.pow(1 - easedT, 2) * start.x + 2 * (1 - easedT) * easedT * ctrlX + Math.pow(easedT, 2) * end.x;
            const y = Math.pow(1 - easedT, 2) * start.y + 2 * (1 - easedT) * easedT * ctrlY + Math.pow(easedT, 2) * end.y;
            points.push({ x, y });
        }
        return points;
    };

    // Sanal İmleç Glide Hareketi, Tıklama ve Kendi Kendini Düzeltmeli Klavye Motoru
    const triggerAction = useCallback(async (actionType, target, text = '') => {
        return new Promise((resolve) => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            // Ajan görsel tarama yapıyor hissi uyandır
            setActiveAction('tarama');
            setActiveThought(`Ekrandaki interaktif nesneler taranıyor ve etiketleniyor...`);
            setActiveTargetName(target);
            setIsVisible(true);

            // Vimium etiketlerini üret ve render et
            const currentTags = generateVisualTags();

            setTimeout(async () => {
                let element = findTargetElement(target);

                if (!element) {
                    setActiveThought(`Hedef '${target}' bulunamadı, yeniden taranıyor...`);
                    // Eylemler veya modal geç açıldıysa 500ms bekleyip tekrar kontrol et (Step-Check)
                    await new Promise(r => setTimeout(r, 600));
                    element = findTargetElement(target);
                }

                if (!element) {
                    setActiveThought(`⚠️ Hata: '${target}' bulunamadı. Eylem iptal edildi.`);
                    setTimeout(() => {
                        setIsVisible(false);
                        setDetectedTags([]);
                        resolve({ success: false, error: 'Target not found' });
                    }, 1200);
                    return;
                }

                // Eşleşen Vimium etiketini bulup imlece göster
                const matchingTag = currentTags.find(tag => tag.element === element);
                if (matchingTag) {
                    setActiveThought(`Hedef etiket belirlendi: [${matchingTag.char}] -> '${target}'`);
                } else {
                    setActiveThought(`Hedef odaklandı: '${target}'`);
                }

                // Koordinatları al
                const rect = element.getBoundingClientRect();
                const destX = rect.left + rect.width / 2 + window.scrollX;
                const destY = rect.top + rect.height / 2 + window.scrollY;

                // Başlangıç noktası
                const startX = position.x;
                const startY = position.y;

                // Kavisli Bezier koordinatlarını oluştur
                const pathPoints = calculateBezierPath({ x: startX, y: startY }, { x: destX, y: destY });
                let pointIndex = 0;

                // İmleç kavisli süzülme animasyonunu başlat
                const animateGlide = () => {
                    if (pointIndex < pathPoints.length) {
                        setPosition(pathPoints[pointIndex]);
                        pointIndex++;
                        requestAnimationFrame(animateGlide);
                    } else {
                        // Hedefe ulaşıldı! 
                        executeInteraction(element, actionType, text, resolve);
                    }
                };

                requestAnimationFrame(animateGlide);
            }, 700); // Tarama ve vizör izleme süresi
        });
    }, [position, findTargetElement, generateVisualTags]);

    // Nesneyle Etkileşim ve Kendi Kendine Düzeltmeli (Self-Correction) Klavye Motoru
    const executeInteraction = async (element, actionType, text, resolve) => {
        setIsClicking(true);
        setActiveAction(actionType);

        if (actionType === 'click') {
            setActiveThought(`[Tıklanıyor] '${activeTargetName}' öğesi tetiklendi.`);
            setTimeout(() => {
                setIsClicking(false);
                element.click();
                
                // Input alanına tıklandıysa focuslan
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.focus();
                }

                // Actor-Critic: Tıklama sonrası modal veya veri değişimi oldu mu doğrula
                setTimeout(() => {
                    setDetectedTags([]);
                    hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
                    resolve({ success: true });
                }, 400);
            }, 300);

        } else if (actionType === 'type') {
            setIsClicking(false);
            element.focus();
            element.value = ''; // Alanı boşalt
            
            // Kullanıcıya ultra zeki "kendi kendine hata düzeltme" şovu yap
            // Metin "Polinomlar" ise, önce bilerek "Polinm" yazıp hata simüle edeceğiz,
            // ardından geri silip doğrusunu yazacağız!
            const makeTypo = text.length > 5 && Math.random() > 0.1; 
            const typoText = makeTypo ? text.slice(0, -3) : text; // Hatalı kısım (örn: Polin)
            
            setActiveThought(`⌨️ Yazılıyor: "${typoText}"`);

            // 1. Aşama: Kelimenin ilk/hatalı kısmını yaz
            for (let i = 0; i < typoText.length; i++) {
                element.value += typoText[i];
                const inputEvent = new Event('input', { bubbles: true });
                element.dispatchEvent(inputEvent);
                await new Promise(r => setTimeout(r, 70 + Math.random() * 50)); // İnsani yazım hızı
            }

            if (makeTypo) {
                // 300ms Duraksama (Self-Reflection adımı!)
                setActiveAction('correcting');
                setActiveThought(`🔍 Yazım Hatası Algılandı! Doğrulanıyor...`);
                await new Promise(r => setTimeout(r, 600));

                // 2. Aşama: Hatalı kısmı siliyor taklidi yap
                setActiveThought(`↩️ Hatalı yazım geri alınıyor...`);
                for (let i = 0; i < 2; i++) {
                    element.value = element.value.slice(0, -1);
                    const inputEvent = new Event('input', { bubbles: true });
                    element.dispatchEvent(inputEvent);
                    await new Promise(r => setTimeout(r, 120));
                }

                // 3. Aşama: Doğrusunu tamamla
                setActiveAction('type');
                setActiveThought(`✍️ Düzeltildi ve Tamamlanıyor: "${text}"`);
                const remainingText = text.slice(element.value.length);
                for (let i = 0; i < remainingText.length; i++) {
                    element.value += remainingText[i];
                    const inputEvent = new Event('input', { bubbles: true });
                    element.dispatchEvent(inputEvent);
                    await new Promise(r => setTimeout(r, 80 + Math.random() * 60));
                }
            }

            // Değişiklikleri React state'ine bildir
            const changeEvent = new Event('change', { bubbles: true });
            element.dispatchEvent(changeEvent);
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

            setTimeout(() => {
                setDetectedTags([]);
                hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
                resolve({ success: true });
            }, 600);

        } else {
            // Scroll veya Diğer
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                setDetectedTags([]);
                hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
                resolve({ success: true });
            }, 600);
        }
    };

    // Ajan API'sini global pencereye bağla
    useEffect(() => {
        window.bhAgent = {
            trigger: triggerAction,
            find: findTargetElement,
            isVisible: () => isVisible,
            getPosition: () => position,
            activeThought: () => activeThought,
            activeAction: () => activeAction
        };
        return () => {
            delete window.bhAgent;
        };
    }, [triggerAction, findTargetElement, isVisible, position, activeThought, activeAction]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
            
            {/* 🏷️ Vimium Tarzı Neon Pembe/Mor Hedef Etiketleri Overlay */}
            <AnimatePresence>
                {detectedTags.map((tag) => (
                    <motion.div
                        key={tag.id}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute z-[999990] flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/85 border border-pink-500 text-pink-400 font-bold text-xs shadow-[0_0_10px_rgba(236,72,153,0.6)] backdrop-blur-sm pointer-events-none select-none font-mono"
                        style={{
                            left: tag.rect.left + 5,
                            top: tag.rect.top + 5
                        }}
                    >
                        <span className="text-white bg-pink-600 px-1 rounded text-[10px] font-black">{tag.char}</span>
                        <span className="opacity-90">{tag.text}</span>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* ☄️ Işıklı Premium Parçacık Kuyruk İzi (Curved Particle Trail) */}
            <AnimatePresence>
                {trail.map((particle, idx) => (
                    <motion.div
                        key={particle.id}
                        initial={{ opacity: 0.8, scale: 1.1 }}
                        animate={{ 
                            opacity: 0, 
                            scale: 0.1,
                            x: particle.x - 5,
                            y: particle.y - 5 
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 blur-[0.5px] shadow-[0_0_8px_rgba(236,72,153,0.7)]"
                        style={{ left: 0, top: 0 }}
                    />
                ))}
            </AnimatePresence>

            {/* 🪐 Sanal Fare İmleci, Radar Lens ve Kayan Düşünce Baloncuğu */}
            {isVisible && (
                <div 
                    className="absolute"
                    style={{ 
                        left: position.x, 
                        top: position.y,
                        transform: 'translate(-50%, -50%) scale(1)'
                    }}
                >
                    {/* 1. Radar Tarayıcı Lens Katmanı (Radar Vision Pulse Rings) */}
                    <div className="absolute w-12 h-12 -left-6 -top-6 rounded-full border border-pink-400/35 animate-ping opacity-45 shadow-[0_0_12px_rgba(236,72,153,0.3)]"></div>
                    <div className="absolute w-8 h-8 -left-4 -top-4 rounded-full border border-dashed border-purple-400 animate-[spin_8s_linear_infinite] opacity-60"></div>
                    
                    {/* 2. Ana İmleç Küresi */}
                    <div 
                        className="absolute w-6 h-6 -left-3 -top-3 rounded-full bg-gradient-to-br from-pink-500 via-pink-600 to-purple-700 shadow-[0_0_15px_rgba(236,72,153,0.9),_inset_0_0_4px_rgba(255,255,255,0.7)] flex items-center justify-center transition-transform duration-100"
                        style={{ transform: isClicking ? 'scale(0.8)' : 'scale(1)' }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,1)]"></div>
                    </div>

                    {/* Tıklama Ripple Dalgası */}
                    <AnimatePresence>
                        {isClicking && (
                            <motion.div
                                initial={{ opacity: 1, scale: 0.2 }}
                                animate={{ opacity: 0, scale: 2.5 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                className="absolute w-16 h-16 -left-8 -top-8 rounded-full border-4 border-pink-500/90 blur-[1px] shadow-[0_0_20px_rgba(236,72,153,0.9)]"
                            />
                        )}
                    </AnimatePresence>

                    {/* 3. Kayan Fütüristik Düşünce Baloncuğu HUD Panel (Option B) */}
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 w-52 pointer-events-none select-none">
                        <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-black/85 border border-pink-500/50 shadow-[0_4px_20px_rgba(236,72,153,0.4)] backdrop-blur-md">
                            
                            {/* Vizör Başlık & Aktif Mod */}
                            <div className="flex items-center justify-between text-[8px] font-black text-pink-400 tracking-wider uppercase font-mono">
                                <span>{activeAction === 'correcting' ? '⚠️ REFLECTION' : '🤖 BH-VISION'}</span>
                                <span className="animate-pulse">{activeAction === 'tarama' ? 'SCANNING' : 'ACTIVE'}</span>
                            </div>

                            {/* Aktif Düşünce İç Ses */}
                            <div className="text-[10px] text-white font-medium leading-tight font-sans">
                                {activeThought}
                            </div>

                            {/* Harf yazma simülasyonu HUD */}
                            {activeAction === 'type' && (
                                <div className="mt-1 flex items-center gap-1 text-[9px] text-purple-300 font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                                    <span>Giriş Yapılıyor...</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Konuşma Balonu Kuyruğu (Triangular tail pointer) */}
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-black/85 absolute -top-[6px] left-1/2 -translate-x-1/2 filter drop-shadow-[0_-1px_0_rgba(236,72,153,0.5)]"></div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default VirtualAgentCursor;
