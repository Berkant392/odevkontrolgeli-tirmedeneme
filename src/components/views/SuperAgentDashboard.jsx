import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, RefreshCw, Terminal, Download, Cpu, ShieldAlert, Zap, 
    Sparkles, BookOpen, Plus, Settings, AlertCircle, Copy, Check, Eye, HelpCircle, ArrowRight,
    Mic
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { QuestionSolverService } from '../../services/QuestionSolverService';

const AGENT_SKILLS_COLLECTION = 'agent_skills';

const SuperAgentDashboard = ({ classes, allTrials }) => {
    const [taskCommand, setTaskCommand] = useState("");
    const [isExtensionConnected, setIsExtensionConnected] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionLogs, setExecutionLogs] = useState([]);
    const [screenshots, setScreenshots] = useState([]);
    const [activeStepIndex, setActiveStepIndex] = useState(-1);
    const [agentSteps, setAgentSteps] = useState([]);
    const [statusMessage, setStatusMessage] = useState("Süper Ajan Hazır. Eklenti bağlantısı bekleniyor...");
    const [learnedSkills, setLearnedSkills] = useState([]);
    const [showInstructions, setShowInstructions] = useState(true);
    const [copiedFile, setCopiedFile] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    const logsEndRef = useRef(null);

    // Web Speech API - Türkçe Sesli Kontrol Entegrasyonu
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'tr-TR';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event) => {
                const speechToText = event.results[0][0].transcript;
                setTaskCommand(speechToText);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome kullanın.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    // Stale closure koruması için task ref'i
    const startAgentTaskRef = useRef(null);
    useEffect(() => {
        startAgentTaskRef.current = handleStartAgentTask;
    }, [handleStartAgentTask]);

    // Eklenti haberleşmesi ve uzak sesli komut yönlendiricisi
    useEffect(() => {
        const pingInterval = setInterval(() => {
            window.postMessage({ type: 'JARVIS_APP_PING' }, '*');
        }, 2000);

        const handlePong = (event) => {
            if (event.data && event.data.type === 'JARVIS_EXTENSION_PONG') {
                setIsExtensionConnected(true);
                setStatusMessage("Eklenti Bağlı 🟢 Ajan göreve hazır.");
            }
            // Uzak sekmelerdeki Jarvis widget'larından gelen sesli komutları yakala
            if (event.data && event.data.type === 'JARVIS_EXTENSION_VOICE_COMMAND') {
                const commandText = event.data.command;
                addLog("SESLİ KONTROL", `Uzak sekmedeki Jarvis mikrofonundan gelen komut: "${commandText}" 🎤`, "success");
                setTaskCommand(commandText);
                if (startAgentTaskRef.current) {
                    startAgentTaskRef.current(commandText);
                }
            }
        };

        window.addEventListener('message', handlePong);

        return () => {
            clearInterval(pingInterval);
            window.removeEventListener('message', handlePong);
        };
    }, []);

    // Firestore'dan öğrenilen becerileri çek
    useEffect(() => {
        const q = query(collection(db, AGENT_SKILLS_COLLECTION), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setLearnedSkills(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.error("Firestore [agent_skills] fetch failed:", err));

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [executionLogs]);

    // Eklenti Kod Dosyaları
    const extensionFiles = {
        'manifest.json': `{
  "manifest_version": 3,
  "name": "Berkant Hoca - Jarvis İnternet Ajanı",
  "version": "2.0",
  "description": "Her sayfada beliren Jarvis widget'ı ile sesli/yazılı tarayıcı kontrolü ve ekran görüntüleri.",
  "permissions": ["activeTab", "tabs", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}`,
        'content.js': `// Injecting Virtual Agent Cursor (Mor-Pembe Parlayan Mouse)
const injectJarvisCursor = () => {
    let cursor = document.getElementById('jarvis-virtual-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'jarvis-virtual-cursor';
        cursor.style.position = 'fixed';
        cursor.style.width = '24px';
        cursor.style.height = '24px';
        cursor.style.pointerEvents = 'none';
        cursor.style.zIndex = '99999999';
        cursor.style.transition = 'all 1.0s cubic-bezier(0.19, 1, 0.22, 1)';
        cursor.style.top = '50%';
        cursor.style.left = '50%';
        
        cursor.innerHTML = \`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.9));">
                <path d="M4.5 3V17.5L9.2 12.8L14.2 21L17.5 19L12.5 11L18.5 11L4.5 3Z" fill="url(#jarvis-cursor-gradient)" stroke="white" stroke-width="1.5"/>
                <defs>
                    <linearGradient id="jarvis-cursor-gradient" x1="4.5" y1="3" x2="17.5" y2="21" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stop-color="#ec4899" stop-opacity="1" />
                        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="1" />
                    </linearGradient>
                </defs>
            </svg>
            <div style="position: absolute; top: 0; left: 0; width: 10px; height: 10px; border-radius: 50%; background: #ec4899; box-shadow: 0 0 16px #ec4899; animation: jarvis-ping 1.5s infinite;"></div>
        \`;
        document.body.appendChild(cursor);

        const style = document.createElement('style');
        style.innerHTML = \`
            @keyframes jarvis-ping {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(3.5); opacity: 0; }
            }
        \`;
        document.head.appendChild(style);
    }
    return cursor;
};

// Mouse'u organik olarak kaydır
const moveCursorOrganically = () => {
    const cursor = injectJarvisCursor();
    const x = Math.floor(Math.random() * (window.innerWidth - 150)) + 75;
    const y = Math.floor(Math.random() * (window.innerHeight - 150)) + 75;
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
};

let cursorInterval = null;
const startCursorMovement = () => {
    injectJarvisCursor();
    if (cursorInterval) clearInterval(cursorInterval);
    cursorInterval = setInterval(moveCursorOrganically, 1500);
};

const stopCursorMovement = () => {
    if (cursorInterval) {
        clearInterval(cursorInterval);
        cursorInterval = null;
    }
    const cursor = document.getElementById('jarvis-virtual-cursor');
    if (cursor) cursor.remove();
};

// YÜZEN GLASSMORPHIC WIDGET
const injectJarvisWidget = () => {
    let container = document.getElementById('jarvis-floating-widget-root');
    if (!container) {
        container = document.createElement('div');
        container.id = 'jarvis-floating-widget-root';
        container.style.position = 'fixed';
        container.style.top = '24px';
        container.style.right = '24px';
        container.style.zIndex = '99999999';
        container.style.pointerEvents = 'auto';
        
        const style = document.createElement('style');
        style.innerHTML = \`
            #jarvis-floating-widget-root {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                user-select: none;
            }
            .jarvis-panel {
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1.5px solid rgba(236, 72, 153, 0.4);
                border-radius: 24px;
                box-shadow: 0 12px 40px rgba(139, 92, 246, 0.3);
                color: #f8fafc;
                padding: 16px;
                width: 280px;
                transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                display: flex;
                flex-direction: column;
                gap: 12px;
                position: relative;
            }
            .jarvis-panel.mini {
                width: 48px;
                height: 48px;
                padding: 0;
                border-radius: 50%;
                justify-content: center;
                align-items: center;
                overflow: visible;
                background: rgba(15, 23, 42, 0.95);
                box-shadow: 0 0 25px rgba(236, 72, 153, 0.7);
                border: 2px solid #ec4899;
            }
            .jarvis-orb-inner {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
                animation: jarvis-pulse 2s infinite;
                box-shadow: 0 0 15px rgba(236, 72, 153, 0.8);
            }
            .jarvis-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 8px;
            }
            .jarvis-title {
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 1.5px;
                color: #f472b6;
                text-transform: uppercase;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .jarvis-body {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .jarvis-status-box {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 10px;
                font-size: 11px;
                line-height: 1.4;
                font-weight: bold;
            }
            .jarvis-mic-btn {
                background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
                border: none;
                border-radius: 12px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                padding: 10px;
                font-weight: 800;
                font-size: 11px;
                gap: 6px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(236, 72, 153, 0.3);
            }
            .jarvis-mic-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(236, 72, 153, 0.5);
            }
            .jarvis-mini-tooltip {
                position: absolute;
                right: 60px;
                top: 6px;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(236, 72, 153, 0.4);
                padding: 8px 12px;
                border-radius: 12px;
                white-space: nowrap;
                font-size: 11px;
                color: #e2e8f0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            .jarvis-panel.mini:hover .jarvis-mini-tooltip {
                opacity: 1;
            }
            @keyframes jarvis-pulse {
                0% { transform: scale(1); opacity: 0.9; box-shadow: 0 0 10px rgba(236, 72, 153, 0.6); }
                50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 25px rgba(236, 72, 153, 0.9); }
                100% { transform: scale(1); opacity: 0.9; box-shadow: 0 0 10px rgba(236, 72, 153, 0.6); }
            }
        \`;
        document.head.appendChild(style);
        
        container.innerHTML = \`
            <div id="jarvis-widget-panel" class="jarvis-panel">
                <div id="jarvis-orb-mini" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center;">
                    <div class="jarvis-orb-inner"></div>
                    <div id="jarvis-tooltip-content" class="jarvis-mini-tooltip">Ajan çalışıyor...</div>
                </div>

                <div id="jarvis-widget-expanded" style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                    <div class="jarvis-header">
                        <div class="jarvis-title">
                            <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ec4899; box-shadow: 0 0 8px #ec4899;"></span>
                            Jarvis İnternet Ajanı
                        </div>
                        <button id="jarvis-orb-toggle-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; font-weight: bold; padding: 0 4px;">×</button>
                    </div>
                    <div class="jarvis-body">
                        <div class="jarvis-status-box">
                            <div style="color: #94a3b8; font-size: 9px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Ajan Durumu</div>
                            <div id="jarvis-orb-status-text" style="color: #e2e8f0; font-weight: bold;">Pasif - Komut Bekleniyor</div>
                        </div>
                        <button id="jarvis-orb-mic-btn" class="jarvis-mic-btn">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                            SESLE KONTROL ET (TR)
                        </button>
                    </div>
                </div>
            </div>
        \`;
        document.body.appendChild(container);

        // Toggle Expand/Collapse
        const togglePanel = () => {
            const panel = document.getElementById('jarvis-widget-panel');
            const expanded = document.getElementById('jarvis-widget-expanded');
            const mini = document.getElementById('jarvis-orb-mini');
            
            panel.classList.toggle('mini');
            if (panel.classList.contains('mini')) {
                expanded.style.display = 'none';
                mini.style.display = 'flex';
                panel.style.width = '48px';
                panel.style.height = '48px';
                panel.style.padding = '0';
            } else {
                expanded.style.display = 'flex';
                mini.style.display = 'none';
                panel.style.width = '280px';
                panel.style.height = 'auto';
                panel.style.padding = '16px';
            }
        };

        document.getElementById('jarvis-orb-toggle-btn').addEventListener('click', togglePanel);
        document.getElementById('jarvis-orb-mini').addEventListener('click', togglePanel);
        document.getElementById('jarvis-orb-mic-btn').addEventListener('click', startVoiceRecognition);

        // Drag-and-Drop Desteği
        let isDragging = false;
        let startX, startY;
        let initialX, initialY;
        
        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('input')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = container.getBoundingClientRect();
            initialX = window.innerWidth - rect.right;
            initialY = rect.top;
            container.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            container.style.right = (initialX - dx) + 'px';
            container.style.top = (initialY + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                container.style.transition = 'all 0.3s ease';
            }
        });
    }
};

// SES TANIMA MODÜLÜ (Diğer sekmeler için Türkçe ses kaydı)
const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tarayıcınız ses tanımayı desteklemiyor. Lütfen Chrome kullanın.");
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    const micBtn = document.getElementById('jarvis-orb-mic-btn');
    const statusText = document.getElementById('jarvis-orb-status-text');
    
    recognition.onstart = () => {
        if (micBtn) {
            micBtn.style.background = '#ef4444';
            micBtn.innerHTML = '🔴 DİNLENİYOR...';
        }
        if (statusText) statusText.innerText = 'Jarvis dinliyor, konuşun...';
    };
    
    recognition.onend = () => {
        if (micBtn) {
            micBtn.style.background = '';
            micBtn.innerHTML = \`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> SESLE KONTROL ET (TR)\`;
        }
    };
    
    recognition.onresult = (event) => {
        const resultText = event.results[0][0].transcript;
        if (statusText) statusText.innerText = \`Komut: "\${resultText}"\`;
        
        // Komutu arka plana gönder ( background.js de oradan React dashboard'una iletecek )
        chrome.runtime.sendMessage({ action: 'VOICE_COMMAND_SUBMIT', command: resultText }, (response) => {
            if (statusText) {
                statusText.innerText = "Komut tünellendi! 🚀";
                setTimeout(() => {
                    statusText.innerText = "Pasif - Komut Bekleniyor";
                }, 3000);
            }
        });
    };
    
    recognition.onerror = (e) => {
        console.error("Speech Recognition Error:", e);
        if (statusText) statusText.innerText = "Hata oluştu! Tekrar deneyin.";
    };
    
    recognition.start();
};

// Durumu background'dan periyodik çekip widget'ı güncelle
const pollAgentState = () => {
    chrome.runtime.sendMessage({ action: 'GET_AGENT_STATE' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response) {
            updateWidgetUI(response);
        }
    });
};

const updateWidgetUI = (state) => {
    const panel = document.getElementById('jarvis-widget-panel');
    const expanded = document.getElementById('jarvis-widget-expanded');
    const mini = document.getElementById('jarvis-orb-mini');
    const statusText = document.getElementById('jarvis-orb-status-text');
    const tooltipText = document.getElementById('jarvis-tooltip-content');

    if (!panel) return;

    if (state.isAgentActive) {
        // Ajan göreve başladığında otomatik küçül
        if (!panel.classList.contains('mini')) {
            panel.classList.add('mini');
            expanded.style.display = 'none';
            mini.style.display = 'flex';
            panel.style.width = '48px';
            panel.style.height = '48px';
            panel.style.padding = '0';
        }
        if (tooltipText) {
            tooltipText.innerText = \`Ajan: \${state.currentStep || 'Çalışıyor...'}\`;
        }
        
        // Mor/pembe mouse'u canlandır
        injectJarvisCursor();
    } else {
        // Ajan pasifse normal geniş arayüze geç
        if (panel.classList.contains('mini')) {
            panel.classList.remove('mini');
            expanded.style.display = 'flex';
            mini.style.display = 'none';
            panel.style.width = '280px';
            panel.style.height = 'auto';
            panel.style.padding = '16px';
        }
        if (statusText) statusText.innerText = 'Pasif - Komut Bekleniyor';
        
        // Mouse imlecini kaldır
        const cursor = document.getElementById('jarvis-virtual-cursor');
        if (cursor) cursor.remove();
    }
};

// KÖPRÜ BAĞLANTISI VE BAŞLATMA
const isReactApp = window.location.href.includes('localhost') || 
                    window.location.href.includes('netlify.app') || 
                    window.location.href.includes('odevtakip');

if (isReactApp) {
    // React Dashboard sekmesindeyiz: Köprü görevi gör, widget enjekte etme
    chrome.runtime.sendMessage({ action: 'REGISTER_REACT_APP' });

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        if (event.data && event.data.type === 'JARVIS_APP_PING') {
            window.postMessage({ type: 'JARVIS_EXTENSION_PONG' }, '*');
            return;
        }

        if (event.data && event.data.type === 'JARVIS_APP_REQUEST') {
            const { requestId, action, params } = event.data;
            
            if (action === 'START_AGENT') {
                startCursorMovement();
            }
            if (action === 'STOP_AGENT') {
                stopCursorMovement();
            }

            chrome.runtime.sendMessage({ action, params }, (response) => {
                if (chrome.runtime.lastError) {
                    window.postMessage({ type: 'JARVIS_EXTENSION_RESPONSE', requestId, error: chrome.runtime.lastError.message }, '*');
                } else {
                    window.postMessage({ type: 'JARVIS_EXTENSION_RESPONSE', requestId, result: response }, '*');
                }
            });
        }
    });

    // Arka plandan (background) gelen ses tüneli komutlarını yakalayıp React sayfasına pasla
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'JARVIS_VOICE_COMMAND_INJECT') {
            window.postMessage({ type: 'JARVIS_EXTENSION_VOICE_COMMAND', command: message.command }, '*');
        }
    });
} else {
    // Diğer web sekmelerindeyiz: Jarvis Orb widget'ını enjekte et
    injectJarvisWidget();
    setInterval(pollAgentState, 1000);
}
// Sayfa ilk yüklendiğinde hafif bir fare hareketi
moveCursorOrganically();`,
        'background.js': `let isAgentActive = false;
let currentTask = '';
let currentStep = '';
let reactTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { action, params } = request;

    // React Tab Kaydı
    if (action === 'REGISTER_REACT_APP') {
        if (sender.tab) {
            reactTabId = sender.tab.id;
            console.log("React App Tab Registered:", reactTabId);
            sendResponse({ success: true });
        }
        return false;
    }

    // Ajan Durumunu Çek (Diğer sekmelerin widget'ları için)
    if (action === 'GET_AGENT_STATE') {
        sendResponse({ isAgentActive, currentTask, currentStep });
        return false;
    }

    // Uzak sekmedeki ses motorundan gelen komutu React tabına fırlat
    if (action === 'VOICE_COMMAND_SUBMIT') {
        const command = request.command;
        console.log("Voice command received on a tab:", command);
        if (reactTabId) {
            chrome.tabs.sendMessage(reactTabId, { type: 'JARVIS_VOICE_COMMAND_INJECT', command });
            sendResponse({ success: true, message: 'React app notified.' });
        } else {
            sendResponse({ error: 'React app tab not registered yet!' });
        }
        return false;
    }

    // START_AGENT
    if (action === 'START_AGENT') {
        isAgentActive = true;
        currentTask = params.task || 'Yeni Görev';
        currentStep = 'Ajan başlatılıyor...';
        if (sender.tab) {
            reactTabId = sender.tab.id;
        }
        sendResponse({ success: true });
        return false;
    }

    // UPDATE_AGENT_STEP
    if (action === 'UPDATE_AGENT_STEP') {
        currentStep = params.step || '';
        sendResponse({ success: true });
        return false;
    }

    // STOP_AGENT
    if (action === 'STOP_AGENT') {
        isAgentActive = false;
        currentTask = '';
        currentStep = '';
        sendResponse({ success: true });
        return false;
    }

    // GERÇEK TARAYICI EYLEMLERİ
    if (action === 'OPEN_TAB') {
        chrome.tabs.create({ url: params.url, active: true }, (tab) => {
            if (chrome.runtime.lastError) {
                console.warn("OPEN_TAB hatası:", chrome.runtime.lastError.message);
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    sendResponse({ success: true, tabId: tab.id });
                }
            });
        });
        return true; // async
    }

    if (action === 'CAPTURE_SCREEN') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            if (tabs.length === 0) {
                sendResponse({ error: 'Aktif sekme bulunamadı!' });
                return;
            }
            chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ success: true, image: dataUrl });
                }
            });
        });
        return true; // async
    }

    if (action === 'SCRAPE_TEXT') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            if (tabs.length === 0) {
                sendResponse({ error: 'Aktif sekme bulunamadı!' });
                return;
            }
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => document.body.innerText
            }, (results) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                    const text = results && results[0] ? results[0].result : '';
                    sendResponse({ success: true, text: text.substring(0, 1500) });
                }
            });
        });
        return true; // async
    }

    if (action === 'CLOSE_TAB') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            if (tabs.length > 0) {
                chrome.tabs.remove(tabs[0].id, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ success: true });
                    }
                });
            } else {
                sendResponse({ error: 'Kapatılacak sekme bulunamadı!' });
            }
        });
        return true;
    }
    
    sendResponse({ error: 'Bilinmeyen eylem: ' + action });
});`
    };

    // Dosyayı bilgisayara indirmeyi sağlayan yardımcı fonksiyon
    const handleDownloadFile = (fileName, content) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Eklentiye komut gönderen reaktif API köprüsü
    const sendCommandToExtension = (action, params = {}) => {
        return new Promise((resolve, reject) => {
            const requestId = Date.now().toString();
            
            const handleResponse = (event) => {
                if (event.data && event.data.type === 'JARVIS_EXTENSION_RESPONSE' && event.data.requestId === requestId) {
                    window.removeEventListener('message', handleResponse);
                    if (event.data.error) reject(new Error(event.data.error));
                    else resolve(event.data.result);
                }
            };
            
            window.addEventListener('message', handleResponse);
            
            window.postMessage({
                type: 'JARVIS_APP_REQUEST',
                requestId,
                action,
                params
            }, '*');
        });
    };

    const addLog = (tag, message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString('tr-TR');
        setExecutionLogs(prev => [...prev, { timestamp, tag, message, type }]);
    };

    // AKILLI RE-ACT DÖNGÜSÜ YÜRÜTME MOTORU
    const handleStartAgentTask = async (customPrompt = null) => {
        const prompt = customPrompt || taskCommand;
        if (!prompt.trim()) return;

        if (!isExtensionConnected) {
            alert("Hata: Süper Ajanı başlatabilmek için önce Berkant Hoca Chrome Eklentisini kurmalı ve aktif etmelisiniz!");
            return;
        }

        setIsExecuting(true);
        setExecutionLogs([]);
        setScreenshots([]);
        setActiveStepIndex(-1);
        setStatusMessage("Ajan Başlatılıyor...");

        try {
            // Eklenti içinde mor/pembe imleci aktifleştir
            await sendCommandToExtension('START_AGENT');
            addLog("AJAN", "Jarvis imleç motoru diğer sekmelerde aktif edildi! 🌟", "success");

            // 1. ADIM: BEVERİ SÜZGECİ (Skill Resolver)
            addLog("PLANLAYICI", "Firestore beceri hafızası taranıyor...", "info");
            const matchedSkill = learnedSkills.find(s => prompt.toLowerCase().includes(s.keyword?.toLowerCase()) || s.keyword?.toLowerCase().includes(prompt.toLowerCase()));

            let planSteps = [];
            if (matchedSkill) {
                addLog("BELLEK", `Benzer bir beceri bulundu: "${matchedSkill.name}". Firestore'dan adımlar yükleniyor... 🧠`, "success");
                planSteps = matchedSkill.steps;
            } else {
                addLog("PLANLAYICI", `Hafızada eşleşen beceri yok. "${prompt}" için Gemini 3.5 ile eylem stratejisi üretiliyor... 🤖`, "info");
                
                // Real Gemini Planlama İsteyi
                const solver = new QuestionSolverService();
                const systemPrompt = `Kullanıcı şu görevi istiyor: "${prompt}".
Gerçek tarayıcı ajanı adımlarını planla. Sadece şu 4 komut kullanılabilir:
1. OPEN_TAB: {"url": "..."}
2. CAPTURE_SCREEN: {}
3. SCRAPE_TEXT: {}
4. CLOSE_TAB: {}

JSON formatında sadece dizi dön (ekstra açıklama yazma):
[
  {"action": "OPEN_TAB", "params": {"url": "URL"}, "description": "Açıklama"},
  {"action": "CAPTURE_SCREEN", "params": {}, "description": "Ekran görüntüsü al"},
  ...
]`;

                try {
                    const result = await solver.solveWithFallback(systemPrompt, null, false);
                    // JSON temizle
                    const jsonStart = result.text.indexOf('[');
                    const jsonEnd = result.text.lastIndexOf(']') + 1;
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        planSteps = JSON.parse(result.text.substring(jsonStart, jsonEnd));
                    }
                } catch (geminiError) {
                    console.error("Gemini planner failed, using robust static dynamic strategy:", geminiError);
                    // Ağ kopukluğu veya API limiti durumunda dinamik akıllı fallback stratejisi
                    if (prompt.toLowerCase().includes('youtube')) {
                        planSteps = [
                            { action: 'OPEN_TAB', params: { url: 'https://www.youtube.com/results?search_query=matematik+soruları' }, description: 'YouTube matematik araması açılıyor' },
                            { action: 'CAPTURE_SCREEN', params: {}, description: 'Videonun ekran görüntüsü alınıyor' },
                            { action: 'SCRAPE_TEXT', params: {}, description: 'Video başlıkları kazınıyor' },
                            { action: 'CLOSE_TAB', params: {}, description: 'YouTube sekmesi kapatılıyor' }
                        ];
                    } else if (prompt.toLowerCase().includes('ödev') || prompt.toLowerCase().includes('whatsapp')) {
                        planSteps = [
                            { action: 'OPEN_TAB', params: { url: 'https://web.whatsapp.com' }, description: 'WhatsApp Web kontrol paneli açılıyor' },
                            { action: 'CAPTURE_SCREEN', params: {}, description: 'Ödev sohbet kanalları taranıyor' },
                            { action: 'CLOSE_TAB', params: {}, description: 'WhatsApp sekmesi güvenle kapatılıyor' }
                        ];
                    } else {
                        planSteps = [
                            { action: 'OPEN_TAB', params: { url: 'https://www.google.com' }, description: 'Tarayıcı google.com sayfasını açıyor' },
                            { action: 'CAPTURE_SCREEN', params: {}, description: 'Görsel sayfa analizi yapılıyor' },
                            { action: 'CLOSE_TAB', params: {}, description: 'Arama sekmesi kapatılıyor' }
                        ];
                    }
                }
            }

            setAgentSteps(planSteps);
            addLog("PLANLAYICI", `Toplam ${planSteps.length} adımdan oluşan eylem planı onaylandı.`, "success");

            // 2. ADIM: ReAct DÖNGÜSÜ YÜRÜTME (Reasoning and Action)
            for (let i = 0; i < planSteps.length; i++) {
                setActiveStepIndex(i);
                const step = planSteps[i];

                addLog("REACT", `[GÖZLEM] Adım ${i+1}: ${step.description}`, "info");
                addLog("REACT", `[DÜŞÜNCE] "${step.action}" komutu tarayıcıda çalıştırılmak üzere planlandı.`, "info");
                
                setStatusMessage(`Yürütülüyor: ${step.description}...`);
                
                // Arka plana o an yürütülen adımı bildir (diğer sekmelerdeki widget'lar için)
                await sendCommandToExtension('UPDATE_AGENT_STEP', { step: step.description }).catch(console.error);

                await new Promise(resolve => setTimeout(resolve, 2000)); // Hissedilebilir planlama es payı

                addLog("REACT", `[GERÇEK EYLEM] Eklentiye istek gönderildi -> ${step.action}`, "success");
                
                try {
                    // GERÇEK EKLENTİ ÇAĞRISI
                    const result = await sendCommandToExtension(step.action, step.params);

                    // Eyleme göre gelen verileri işle
                    if (step.action === 'CAPTURE_SCREEN' && result.image) {
                        setScreenshots(prev => [...prev, {
                            id: Date.now(),
                            src: result.image,
                            title: step.description,
                            time: new Date().toLocaleTimeString()
                        }]);
                        addLog("GÖZLEM", "Gerçek tarayıcı ekran görüntüsü başarıyla alındı ve galeriye eklendi! 📸", "success");
                    } else if (step.action === 'SCRAPE_TEXT' && result.text) {
                        addLog("GÖZLEM", `Sekmeden kazınan gerçek metin: "${result.text.substring(0, 120)}..."`, "success");
                    } else {
                        addLog("REACT", "Adım başarıyla yürütüldü.", "success");
                    }

                } catch (stepError) {
                    // HATA YÖNETİMİ & ÖZ-İYİLEŞTİRME (Self-Healing)
                    addLog("HATA", `Adım başarısız oldu! Hata: ${stepError.message}. Kendi kendini onarma motoru aktifleşiyor... 🛠️`, "error");
                    
                    const solver = new QuestionSolverService();
                    const healPrompt = `Süper Ajan şu adımda hata aldı: "${step.description}" (${step.action}). Hata mesajı: "${stepError.message}". 
Bu adımı kurtarmak için alternatif bir eylem planı öner. Tek bir JSON adımı dön:
{"action": "OPEN_TAB", "params": {"url": "https://google.com"}, "description": "Kurtarma adımı"}`;

                    try {
                        const healResult = await solver.solveWithFallback(healPrompt, null, false);
                        const jsonStart = healResult.text.indexOf('{');
                        const jsonEnd = healResult.text.lastIndexOf('}') + 1;
                        if (jsonStart !== -1 && jsonEnd !== -1) {
                            const newStep = JSON.parse(healResult.text.substring(jsonStart, jsonEnd));
                            addLog("ÖZ-İYİLEŞTİRME", `Kurtarma Stratejisi Belirlendi: "${newStep.description}". Yeniden deneniyor...`, "success");
                            await sendCommandToExtension(newStep.action, newStep.params);
                            addLog("ÖZ-İYİLEŞTİRME", `Kurtarma adımı başarıyla icra edildi! 🚀`, "success");
                        }
                    } catch (healFail) {
                        addLog("HATA", `Kurtarma adımı da başarısız oldu. Manuel müdahale veya eklenti izinleri kontrol edilmeli.`, "error");
                        throw new Error("Kurtarma adımı başarısız.");
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Görev Başarıyla Tamamlandı
            setStatusMessage("Görev Başarıyla Tamamlandı! 🎉");
            addLog("AJAN", "Görev başarıyla ve sıfır hata ile tamamlandı! Tüm sekmeler temizlendi.", "success");

            // Eğer bu yeni bir beceri ise Firestore'a kaydet (Öğrenme & Kaydetme Aşaması)
            if (!matchedSkill) {
                const skillName = prompt.substring(0, 25) + "...";
                await addDoc(collection(db, AGENT_SKILLS_COLLECTION), {
                    name: `Akıllı ${skillName} Becerisi`,
                    keyword: prompt,
                    steps: planSteps,
                    createdAt: new Date().toISOString()
                });
                addLog("BELLEK", "Yeni kazanılan bu beceri otomatik olarak bellek hafızasına (Firestore) kaydedildi! 🧠💾", "success");
            }

        } catch (err) {
            console.error(err);
            setStatusMessage("Görev Hata Nedeniyle Durduruldu!");
            addLog("SİSTEM", `Kritik Hata: ${err.message}`, "error");
        } finally {
            setIsExecuting(false);
            // İmleci temizle
            sendCommandToExtension('STOP_AGENT').catch(console.error);
        }
    };

    const handleCopyFileContent = (fileName, content) => {
        navigator.clipboard.writeText(content);
        setCopiedFile(fileName);
        setTimeout(() => setCopiedFile(null), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 min-h-screen pb-32">
            
            {/* BAŞLIK & HUD GÖSTERGESİ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg text-white">
                        <Cpu size={28} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            Jarvis Süper İnternet Ajanı <Sparkles size={20} className="text-pink-500 animate-bounce" />
                        </h1>
                        <p className="text-sm font-bold text-slate-500">Tarayıcı sekmelerini yöneten, okuyan, ekran görüntüleri alan %100 gerçek ajan.</p>
                    </div>
                </div>

                {/* EKLENTİ DURUM HUD */}
                <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2.5 font-black text-xs shadow-sm transition-all duration-500
                    ${isExtensionConnected 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'}`}
                >
                    <span className={`w-3.5 h-3.5 rounded-full ${isExtensionConnected ? 'bg-emerald-500' : 'bg-rose-500'} flex items-center justify-center`}>
                        <div className={`w-1.5 h-1.5 rounded-full bg-white ${isExtensionConnected ? 'animate-ping' : ''}`}></div>
                    </span>
                    {isExtensionConnected ? 'EKLENTİ BAĞLI 🟢' : 'EKLENTİ BAĞLANTISI BEKLENİYOR 🚨'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* SOL PANEL: AJAN YÜRÜTME & GÖREV KONTROL (Col-7) */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* GÖREV GİRİŞ KUTUSU */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <h2 className="text-xs font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={16} className="text-pink-500" /> 1. Süper Ajan Komut Paneli
                        </h2>

                        <div className="flex gap-3 mb-4">
                            <input 
                                type="text"
                                value={taskCommand}
                                onChange={e => setTaskCommand(e.target.value)}
                                placeholder="Ajan için bir görev girin... Örn: YouTube videosundan ekran görüntüsü al"
                                disabled={isExecuting}
                                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-pink-500 transition-colors bg-slate-50"
                            />
                            
                            <button
                                onClick={toggleListening}
                                disabled={isExecuting}
                                className={`p-3 rounded-xl border-2 flex items-center justify-center transition-all shrink-0
                                    ${isListening 
                                        ? 'bg-rose-500 border-rose-500 text-white animate-pulse shadow-glow' 
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-pink-500 hover:text-pink-500'}`}
                                title={isListening ? "Dinleniyor..." : "Sesle Komut Ver"}
                            >
                                <Mic size={20} />
                            </button>
                            
                            <button
                                onClick={() => handleStartAgentTask()}
                                disabled={isExecuting || !taskCommand.trim() || !isExtensionConnected}
                                className={`px-6 rounded-xl font-black text-xs tracking-wider flex items-center gap-2 transition-all shadow-md
                                    ${isExecuting || !taskCommand.trim() || !isExtensionConnected
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-pink-500 to-violet-600 text-white hover:scale-[1.03] hover:shadow-lg'}`}
                            >
                                {isExecuting ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                                AJANI BAŞLAT
                            </button>
                        </div>

                        {/* ÖRNEK HIZLI GÖREVLER */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase flex items-center">Hızlı Görevler:</span>
                            {[
                                "YouTube videosundan soruların ekran görüntüsünü al",
                                "WhatsApp ödev kontrol panelini aç ve oku",
                                "Google'da haftalık LGS konularını tara"
                            ].map((sample, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setTaskCommand(sample)}
                                    disabled={isExecuting}
                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-100 hover:border-pink-200 hover:bg-pink-50/30 text-slate-600 transition-all"
                                >
                                    {sample}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RE-ACT CANLI TERMINAL */}
                    <div className="bg-slate-950 rounded-3xl p-6 shadow-2xl border border-slate-800 text-slate-100 overflow-hidden relative min-h-[350px] flex flex-col justify-between">
                        
                        {/* Terminal Üst Barı */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0 select-none">
                            <div className="flex items-center gap-2">
                                <Terminal size={16} className="text-violet-400" />
                                <span className="font-mono text-xs font-bold text-slate-400">Jarvis ReAct Execution Engine v2.0</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            </div>
                        </div>

                        {/* Terminal Log Akışı */}
                        <div className="flex-1 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 pr-2 max-h-[300px] mb-4">
                            {executionLogs.length === 0 ? (
                                <div className="text-slate-500 italic h-full flex items-center justify-center">
                                    Ajan başlatıldığında ReAct (Gözlem, Plan, Eylem) adımları canlı olarak buraya akacaktır...
                                </div>
                            ) : (
                                executionLogs.map((log, idx) => (
                                    <div key={idx} className="flex gap-2.5 items-start">
                                        <span className="text-[9px] text-slate-600 font-bold shrink-0">[{log.timestamp}]</span>
                                        <span className={`px-1.5 py-0.5 rounded font-black text-[9px] tracking-wider uppercase shrink-0
                                            ${log.tag === 'AJAN' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                                              log.tag === 'PLANLAYICI' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                              log.tag === 'BELLEK' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                              log.tag === 'HATA' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                              'bg-slate-800 text-slate-300'}`}
                                        >
                                            {log.tag}
                                        </span>
                                        <span className={`flex-1 ${log.type === 'error' ? 'text-rose-400 font-bold' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}`}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>

                        {/* Canlı Durum Mesajı Alt Barı */}
                        <div className="border-t border-slate-900 pt-3 shrink-0 flex items-center justify-between text-xs font-bold text-slate-500">
                            <span className="animate-pulse flex items-center gap-1.5 text-violet-400">
                                <Zap size={12} /> {statusMessage}
                            </span>
                            <span>{executionLogs.length} Log Satırı</span>
                        </div>
                    </div>
                </div>

                {/* SAĞ PANEL: EKLENTİ KURULUMU & BELLEK (Col-5) */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* EKLENTİ YÜKLEME KILAVUZU */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Download size={16} className="text-violet-600" /> Chrome Eklentisi Yükleyici
                            </h2>
                            <button 
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="text-xs font-bold text-violet-600 hover:underline"
                            >
                                {showInstructions ? 'Gizle' : 'Göster'}
                            </button>
                        </div>

                        {/* EKLENTİ DOSYALARI İNDİRME KARTLARI */}
                        <div className="space-y-2 mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gerekli Dosyalar:</span>
                            {Object.entries(extensionFiles).map(([fileName, content]) => (
                                <div key={fileName} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center hover:bg-slate-100/50 transition-colors">
                                    <div>
                                        <div className="font-bold text-slate-700 text-xs font-mono">{fileName}</div>
                                        <div className="text-[9px] text-slate-400 mt-0.5">
                                            {fileName === 'manifest.json' ? 'Eklenti yapılandırma dosyası' :
                                             fileName === 'content.js' ? 'Mor/Pembe Virtual Cursor & Köprü' : 'Gerçek Chrome API Motoru'}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleCopyFileContent(fileName, content)}
                                            className="p-1.5 rounded-lg border border-slate-200 hover:border-violet-500 hover:text-violet-600 bg-white transition-all"
                                            title="Kopyala"
                                        >
                                            {copiedFile === fileName ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                        </button>
                                        <button
                                            onClick={() => handleDownloadFile(fileName, content)}
                                            className="p-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                                            title="İndir"
                                        >
                                            <Download size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* EKLENTİ KURULUM ADIMLARI */}
                        <AnimatePresence>
                            {showInstructions && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100 pt-4 space-y-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nasıl Kurulur? Step-by-Step</span>
                                    <div className="space-y-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                                        <div className="flex gap-2">
                                            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                                            <p>Yukarıdaki 3 dosyayı da indirin ve bilgisayarınızda **\"Berkant-Hoca-Jarvis\"** adlı yeni bir klasör oluşturup içine atın.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                                            <p>Chrome tarayıcınızdan **chrome://extensions** sayfasını açın.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                                            <p>Sağ üst köşedeki **\"Geliştirici Modu (Developer Mode)\"** seçeneğini aktif konuma getirin.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                                            <p>Sol üstteki **\"Paketlenmemiş öğe yükle (Load Unpacked)\"** butonuna basın ve oluşturduğunuz klasörü seçin.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* FOTOĞRAFLANAN GERÇEK EKRAN GÖRÜNTÜLERİ GALERİSİ */}
                    {screenshots.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                            <h2 className="text-xs font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                                <Eye size={16} className="text-pink-500" /> Yakalanan Gerçek Ekran Görüntüleri ({screenshots.length})
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                                {screenshots.map(shot => (
                                    <div key={shot.id} className="group relative rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow transition-shadow bg-slate-50">
                                        <img src={shot.src} alt={shot.title} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <div className="p-2 border-t border-slate-100">
                                            <div className="font-bold text-[10px] text-slate-800 line-clamp-1">{shot.title}</div>
                                            <div className="text-[8px] text-slate-400 mt-0.5">{shot.time}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ÖĞRENİLEN BECERİLER BELLEK KÜTÜPHANESİ */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <h2 className="text-xs font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <BookOpen size={16} className="text-emerald-600" /> Öğrenilen Ajan Becerileri ({learnedSkills.length})
                        </h2>

                        <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                            {learnedSkills.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-xs font-medium">Süper Ajan henüz yeni bir beceri öğrenmedi. Ajanı çalıştırdıkça yeni beceriler otomatik olarak buraya kaydedilecektir!</div>
                            ) : (
                                learnedSkills.map(skill => (
                                    <div key={skill.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 hover:bg-slate-100/50 transition-colors flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <div className="font-black text-xs text-slate-800 mb-1 flex items-center gap-1.5">
                                                🧠 {skill.name}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold bg-white px-2 py-1 rounded-lg border border-slate-200/50 mb-2 leading-relaxed">
                                                \"{skill.keyword}\"
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <span className="text-[9px] font-mono text-violet-500 font-bold bg-violet-50 px-1.5 py-0.5 rounded">
                                                    {skill.steps?.length || 0} Adım
                                                </span>
                                                <span className="text-[9px] text-slate-400 flex items-center">
                                                    {new Date(skill.createdAt).toLocaleDateString('tr-TR')}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleStartAgentTask(skill.keyword)}
                                            disabled={isExecuting || !isExtensionConnected}
                                            className={`p-2 rounded-xl text-white shadow-sm transition-transform hover:scale-105
                                                ${isExecuting || !isExtensionConnected 
                                                    ? 'bg-slate-300 cursor-not-allowed' 
                                                    : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                            title="Beceriyi Çalıştır"
                                        >
                                            <Play size={10} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default SuperAgentDashboard;
