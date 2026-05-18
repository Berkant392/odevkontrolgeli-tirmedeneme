import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, TerminalSquare, Keyboard, Mic, Send, User, Activity, Calendar, StickyNote, AlertTriangle, Save, ChevronRight, HelpCircle } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import Fuse from 'fuse.js';

const getSafeText = (val) => {
    if (!val) return "";
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        if (val.title) return getSafeText(val.title);
        if (val.text) return getSafeText(val.text);
        if (val.name) return getSafeText(val.name);
        return "İsimsiz";
    }
    return String(val);
};

const darkStatusStyles = {
    'done': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'missing': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'assigned': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'exempt': 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

const AssistantModal = ({ classes, updateClassInDb, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false); // Yapay zeka düşünürken
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [textCommand, setTextCommand] = useState("");
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem devrede. Sesli veya yazılı komut bekliyorum...");
    
    const [foundStudents, setFoundStudents] = useState([]);
    const [foundTopics, setFoundTopics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    const [pendingAction, setPendingAction] = useState(null); 
    const [pendingSources, setPendingSources] = useState([]); 
    
    const [draftGrades, setDraftGrades] = useState({});
    const [draftNotes, setDraftNotes] = useState({});
    const inputRef = useRef(null);
    const reversedFoundTopics = [...foundTopics].reverse();

    // 🔒 SCROLL KİLİDİ
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // 🗣️ YENİ: J.A.R.V.I.S KONUŞMA FONKSİYONU (Web Speech API - Tamamen Ücretsiz)
    const speakFeedback = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // Önceki konuşmayı kes
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0; // Hız
        utterance.pitch = 1.0; // Ses tonu
        window.speechSynthesis.speak(utterance);
    };

    const updateFeedbackAndSpeak = (msg) => {
        setJarvisFeedback(msg);
        speakFeedback(msg);
    };

    // 🧠 YENİ: GROQ API BAĞLANTISI
    const callGroqAPI = async (transcript) => {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            updateFeedbackAndSpeak("API Anahtarı bulunamadı. Lütfen .env dosyanızı kontrol edin.");
            setIsThinking(false);
            return null;
        }

        // LLM'e göndereceğimiz bağlam (Sınıflar, öğrenciler, konular)
        const contextData = classes.map(c => ({
            className: c.className,
            students: c.students.map(s => s.name),
            topics: c.topics.map(t => t.title)
        }));

        const systemPrompt = `
Sen bir eğitim asistanısın. Adın J.A.R.V.I.S.
Sana öğretmenin veya öğrencinin söylediği bir komut verilecek. Bu komutun içinden "Öğrenci Adı", "Konu Adı", "Kaynak (Test/Kitap)", ve "Durum" bilgilerini çıkar.
Durumlar şunlar olabilir: "done" (çözdü/yaptı/bitirdi), "missing" (yapmadı/eksik/boş), "assigned" (verildi/ödev atandı), "exempt" (muaf/es geçti).
Eğer bir bilgi cümlede yoksa değerini null yap.
SADECE GEÇERLİ BİR JSON DÖNDÜR, BAŞKA HİÇBİR AÇIKLAMA YAZMA!

Sistemdeki Mevcut Veriler:
${JSON.stringify(contextData)}

Örnek Yanıt Formatı:
{
  "student": "Ahmet Yılmaz",
  "topic": "Üslü Sayılar",
  "source": "Bilgi Sarmalı Test 1",
  "status": "missing"
}`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: transcript }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1
                })
            });

            const data = await response.json();
            const aiResult = JSON.parse(data.choices[0].message.content);
            return aiResult;

        } catch (error) {
            console.error("Groq API Hatası:", error);
            updateFeedbackAndSpeak("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
            return null;
        }
    };

    // 🎯 EŞLEŞTİRME (AI'dan gelen veriyi sistemdeki ID'ler ile eşleştirir)
    const findBestMatch = (items, key, textToSearch) => {
        if (!items || items.length === 0 || !textToSearch) return null;
        const safeItems = items.map(item => ({ ...item, _safeSearchKey: getSafeText(item[key]) }));
        const fuse = new Fuse(safeItems, { keys: ['_safeSearchKey'], threshold: 0.4, includeScore: true });
        const results = fuse.search(textToSearch);
        return results.length > 0 ? results[0].item : null;
    };

    const processGroqResult = (aiResult) => {
        if (!aiResult) return;

        // 1. ÖĞRENCİ EŞLEŞTİRME
        const allStudents = classes.flatMap(cls => (cls.students || []).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })));
        const bestStudent = findBestMatch(allStudents, 'name', aiResult.student);

        if (!bestStudent) {
            setFoundStudents([]); setSelectedStudent(null); setFoundTopics([]);
            updateFeedbackAndSpeak(`${aiResult.student || 'Bahsedilen'} isminde bir öğrenci sistemde bulunamadı.`);
            return;
        }

        setFoundStudents([bestStudent]);
        setSelectedStudent(bestStudent);
        
        const targetClass = classes.find(c => c.id === bestStudent.classId); 
        const topics = targetClass?.topics || []; 
        setFoundTopics(topics);

        // 2. KONU VE KAYNAK EŞLEŞTİRME
        const bestTopic = findBestMatch(topics, 'title', aiResult.topic);
        let bestCol = null;
        if (bestTopic && aiResult.source) {
            bestCol = findBestMatch(bestTopic.subColumns || [], 'title', aiResult.source);
        }

        // 3. AKSİYON ALMA VE KONUŞMA
        if (bestTopic && bestCol && aiResult.status) {
            handleDraftGradeChange(bestStudent.id, bestCol.id, aiResult.status);
            const statusLabels = { 'done': 'Yapıldı', 'missing': 'Eksik', 'assigned': 'Verildi', 'exempt': 'Muaf' };
            updateFeedbackAndSpeak(`${getSafeText(bestStudent.name)} için ${getSafeText(bestTopic.title)} konusu ${statusLabels[aiResult.status]} olarak işaretlendi.`);
        } 
        else if (bestTopic && !bestCol && aiResult.status) { 
            setPendingAction({ studentId: bestStudent.id, topicId: bestTopic.id, status: aiResult.status });
            setPendingSources(bestTopic.subColumns || []);
            updateFeedbackAndSpeak(`${getSafeText(bestTopic.title)} konusunu anladım. Lütfen ekrandan ilgili kaynağı seçiniz.`); 
        } 
        else if (bestTopic && !bestCol) {
            updateFeedbackAndSpeak(`Konuyu buldum, ancak hangi kaynak veya eylem olduğunu anlayamadım.`); 
        } 
        else if (!bestTopic) { 
            updateFeedbackAndSpeak(`${getSafeText(bestStudent.name)} profili hazır. Lütfen eklenecek konuyu belirtin.`); 
        }
    };

    const handleCommand = async (transcript) => {
        if (!transcript.trim()) return;
        setPendingAction(null);
        setPendingSources([]);
        
        setIsThinking(true);
        updateFeedbackAndSpeak("Kayıtlar taranıyor...");
        
        const aiResult = await callGroqAPI(transcript);
        setIsThinking(false);
        
        processGroqResult(aiResult);
    };

    const handleManualSubmit = () => {
        if (!textCommand.trim()) return;
        setSpeechTranscript(textCommand); 
        handleCommand(textCommand);
        setTextCommand(""); 
    };

    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { updateFeedbackAndSpeak("Tarayıcınız ses modülünü desteklemiyor. Lütfen yazarak devam edin."); return; }
        if (isListening) { setIsListening(false); return; }
        const recognition = new SpeechRecognition(); recognition.lang = 'tr-TR'; recognition.continuous = false;
        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); updateFeedbackAndSpeak("Sizi dinliyorum..."); };
        recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; setSpeechTranscript(transcript); handleCommand(transcript); };
        recognition.onerror = (event) => { setIsListening(false); updateFeedbackAndSpeak("Sinyal alamadım. Manuel giriş yapabilirsiniz."); };
        recognition.onend = () => setIsListening(false); 
        recognition.start();
    };

    const handleManualSourceSelect = (col) => {
        if (!pendingAction) return;
        handleDraftGradeChange(pendingAction.studentId, col.id, pendingAction.status);
        const statusLabels = { 'done': 'Yapıldı', 'missing': 'Eksik', 'assigned': 'Verildi', 'exempt': 'Muaf' };
        updateFeedbackAndSpeak(`İşlem Tamam. Kaynak ${statusLabels[pendingAction.status]} olarak güncellendi.`);
        setPendingAction(null);
        setPendingSources([]);
    };

    const handleDraftGradeChange = (studentId, colId, statusId) => { setDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } })); };
    const handleDraftNoteChange = (studentId, colId, note) => { setDraftNotes(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: note } })); };

    const applyChanges = () => {
        if (!selectedStudent) return;
        const targetClass = classes.find(c => c.id === selectedStudent.classId); if (!targetClass) return;
        const updatedStudents = targetClass.students.map(s => {
            if (s.id === selectedStudent.id) {
                const newGrades = { ...(s.grades || {}), ...(draftGrades[s.id] || {}) };
                const newNotes = { ...(s.assignmentNotes || {}), ...(draftNotes[s.id] || {}) };
                return { ...s, grades: newGrades, assignmentNotes: newNotes };
            } return s;
        });
        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); setDraftNotes({}); 
        updateFeedbackAndSpeak("Tüm güncellemeler ana veritabanına işlendi."); 
        setTimeout(() => onClose(), 2000);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-4 font-sans">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 md:rounded-[2rem] w-full h-full md:h-auto md:max-h-[90vh] max-w-5xl overflow-hidden flex flex-col border-0 md:border border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)]">
                
                {/* 1. HOLOGRAFİK RADAR VE INPUT BÖLÜMÜ */}
                <div className="relative overflow-hidden bg-slate-950 border-b border-cyan-900/50 shrink-0 flex flex-col items-center justify-center pt-8 md:pt-10 pb-4 md:pb-6 px-4">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} className="absolute w-40 h-40 md:w-64 md:h-64 border border-cyan-500/10 rounded-full border-t-cyan-400/30" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} className="absolute w-24 h-24 md:w-48 md:h-48 border border-cyan-500/10 rounded-full border-b-cyan-400/40" />
                    
                    <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="absolute top-4 right-4 text-cyan-500/50 hover:text-cyan-400 transition-colors z-20"><X size={24}/></button>
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-cyan-500/40 text-[10px] font-mono tracking-widest z-20"><TerminalSquare size={14}/> GROQ AI CORE ACTIVE</div>

                    <div className="z-10 bg-slate-900 p-3 md:p-4 rounded-full border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] mb-4 md:mb-6 hidden md:block">
                        <Activity size={32} className={`text-cyan-400 ${(isListening || isThinking) ? 'animate-pulse' : ''}`} />
                    </div>

                    <div className="w-full max-w-2xl z-10 relative flex items-center mb-2 md:mb-4 mt-2 md:mt-0">
                        <div className="absolute left-4 text-cyan-500/50 pointer-events-none"><Keyboard size={18} /></div>
                        <input 
                            ref={inputRef} type="text" placeholder="Örn: Ahmet üslü sayılar bilgi sarmalından eksik..." 
                            className="w-full bg-slate-900/80 border border-cyan-800/50 text-cyan-100 rounded-xl pl-12 pr-24 py-3 md:py-4 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all placeholder:text-slate-600 font-medium"
                            value={textCommand} onChange={(e) => setTextCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} disabled={isListening || isThinking}
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                            <button onClick={toggleListening} className={`p-2 md:p-2.5 rounded-lg transition-colors ${isListening ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-400'}`} title="Sesli Komut"><Mic size={20} className={isListening ? 'animate-pulse' : ''} /></button>
                            <button onClick={handleManualSubmit} className="p-2 md:p-2.5 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 rounded-lg transition-colors" disabled={!textCommand.trim() || isListening || isThinking}><Send size={20} /></button>
                        </div>
                    </div>

                    <div className="z-10 text-center min-h-[40px] flex flex-col items-center justify-center w-full">
                        {speechTranscript && <p className="text-xs text-slate-500 italic mb-1">"{speechTranscript}"</p>}
                        <p className="font-mono text-cyan-300 text-[11px] md:text-sm flex items-center justify-center text-center px-2 md:px-4">
                            {pendingSources.length > 0 && <HelpCircle size={16} className="text-amber-400 mr-2 animate-pulse shrink-0"/>}
                            {!pendingSources.length && <span className="mr-2 text-cyan-500/50 shrink-0">&gt;</span>} 
                            <span className="truncate whitespace-normal leading-tight">{jarvisFeedback}</span>
                            {!pendingSources.length && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity }} className="ml-1 inline-block w-2 h-4 bg-cyan-400 shrink-0" />}
                        </p>
                        
                        <AnimatePresence>
                            {pendingSources.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-3 md:mt-4 flex flex-wrap justify-center gap-2 max-w-3xl px-2">
                                    {pendingSources.map(col => (
                                        <button key={col.id} onClick={() => handleManualSourceSelect(col)} className="px-3 py-1.5 md:px-4 md:py-2 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 hover:border-cyan-400 text-cyan-100 text-[10px] md:text-xs font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                                            {getSafeText(col.title)}
                                        </button>
                                    ))}
                                    <button onClick={() => { setPendingAction(null); setPendingSources([]); updateFeedbackAndSpeak("İşlem iptal edildi."); }} className="px-3 py-1.5 md:px-4 md:py-2 bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-200 text-[10px] md:text-xs font-bold rounded-lg transition-all">İptal</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                
                {/* 2. LİSTELER VE İÇERİK BÖLÜMÜ */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-950 min-h-[300px]">
                    
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-cyan-900/30 overflow-y-auto p-4 flex flex-row md:flex-col gap-2 h-28 md:h-auto shrink-0 md:shrink custom-scrollbar">
                        <div className="hidden md:block text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-2 px-1 sticky top-0 bg-slate-950 z-10 py-1 border-b border-cyan-900/30">Hedef Profil</div>
                        {foundStudents.map(student => {
                            const isSelected = selectedStudent?.id === student.id; 
                            return ( 
                                <button key={student.id} onClick={() => setSelectedStudent(student)} className={`text-left p-2 md:p-3 min-w-[140px] md:min-w-0 rounded-xl border transition-all flex items-center gap-2 md:gap-3 ${isSelected ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-transparent hover:bg-slate-900 hover:border-cyan-900/30'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>{getSafeText(student.name).charAt(0)}</div>
                                    <div className="flex flex-col overflow-hidden w-full">
                                        <span className={`font-bold text-[11px] md:text-sm truncate ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>{getSafeText(student.name)}</span>
                                        <span className={`text-[9px] md:text-[10px] font-mono truncate ${isSelected ? 'text-cyan-500/70' : 'text-slate-600'}`}>{getSafeText(student.className)}</span>
                                    </div>
                                </button> 
                            );
                        })}
                        {foundStudents.length === 0 && <div className="text-xs text-cyan-800/50 text-center py-4 md:py-8 flex w-full justify-center md:flex-col items-center gap-2 font-mono"><User size={20} className="opacity-50"/> Veri Yok</div>}
                    </div>
                    
                    <div className="w-full md:w-2/3 overflow-y-auto p-3 md:p-6 relative h-full custom-scrollbar pb-24 md:pb-6">
                        {selectedStudent ? (
                            <div className="space-y-4 md:space-y-6">
                                {reversedFoundTopics.map(topic => (
                                    <div key={topic.id} className="bg-slate-900/50 rounded-2xl border border-cyan-900/30 p-3 md:p-5">
                                        <h4 className="font-bold text-cyan-100 text-sm md:text-base mb-3 md:mb-4 border-b border-slate-800 pb-2 md:pb-3 flex items-center gap-2 justify-between">
                                            <div className="flex items-center gap-2"><div className="w-1.5 h-4 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>{getSafeText(topic.title)}</div>
                                        </h4>
                                        <div className="space-y-2 md:space-y-3">
                                            {topic.subColumns.map(col => {
                                                const targetClass = classes.find(c => c.id === selectedStudent.classId); const studentData = targetClass?.students.find(s => s.id === selectedStudent.id);
                                                const currentDbGrade = studentData?.grades?.[col.id] || 'assigned'; const currentDbNote = studentData?.assignmentNotes?.[col.id] || '';
                                                const draftGrade = draftGrades[selectedStudent.id]?.[col.id]; const draftNote = draftNotes[selectedStudent.id]?.[col.id];
                                                const displayGrade = draftGrade !== undefined ? draftGrade : currentDbGrade; const displayNote = draftNote !== undefined ? draftNote : currentDbNote;
                                                const isChanged = (draftGrade !== undefined && draftGrade !== currentDbGrade) || (draftNote !== undefined && draftNote !== currentDbNote);
                                                
                                                return (
                                                    <div key={col.id} className={`flex flex-col gap-2 p-3 md:p-4 rounded-xl transition-all duration-500 ${isChanged ? 'bg-cyan-900/10 border border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'bg-slate-900 border border-slate-800'}`}>
                                                        <div className="text-xs md:text-sm font-medium text-slate-300 flex justify-between items-center">
                                                            {getSafeText(col.title)}
                                                            {isChanged && <span className="text-[8px] md:text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase"><Zap size={8}/> Sync</span>}
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                                                            {STATUS_OPTIONS.map(opt => {
                                                                const isSelected = displayGrade === opt.id;
                                                                const activeStyle = darkStatusStyles[opt.id];
                                                                return ( 
                                                                    <button key={opt.id} onClick={() => handleDraftGradeChange(selectedStudent.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-1.5 md:p-2 rounded-lg border transition-all ${isSelected ? `${activeStyle} shadow-md scale-105` : 'bg-slate-950 text-slate-600 border-slate-800 hover:border-slate-600 hover:text-slate-400'}`}>
                                                                        <opt.icon size={14} className="mb-0.5 md:mb-1" strokeWidth={2.5} />
                                                                        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider hidden sm:block">{opt.label}</span>
                                                                    </button> 
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : ( 
                            <div className="flex flex-col h-full items-center justify-center text-cyan-800/50 p-4 md:p-8 font-mono">
                                <Activity size={32} className={`mb-3 opacity-50 ${isThinking ? 'animate-bounce' : ''}`} />
                                <p className="text-xs md:text-sm">{isThinking ? 'Neural Network Processing...' : 'Awaiting Target Selection...'}</p>
                            </div> 
                        )}
                    </div>
                </div>
                
                {/* 3. ONAY VE KAYIT BÖLÜMÜ */}
                <div className="p-3 md:p-4 border-t border-cyan-900/50 bg-slate-950 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0 z-20 absolute md:relative bottom-0 left-0 w-full">
                    <div className="text-[10px] md:text-xs font-mono hidden md:block w-auto text-left">
                        {Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0 ? ( 
                            <span className="text-cyan-400 flex items-center gap-1.5 animate-pulse"><AlertTriangle size={14}/> Senkronizasyon bekleniyor</span> 
                        ) : ( <span className="text-slate-600">Değişiklik yok</span> )}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="px-4 md:px-6 py-2 md:py-2.5 font-bold text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors text-xs md:text-sm">İptal</button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0 && Object.keys(draftNotes).length === 0} className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-xl font-bold text-slate-900 transition-all text-xs md:text-sm flex items-center justify-center gap-2 ${(Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0) ? 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-slate-700 text-slate-500 cursor-not-allowed'} `}>
                            <Save size={16} /> <span className="hidden sm:inline">SİSTEME</span> İŞLE
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
