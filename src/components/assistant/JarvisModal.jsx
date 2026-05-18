import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, TerminalSquare, Keyboard, Mic, Send, User, Activity, Calendar, StickyNote, AlertTriangle, Save, ChevronRight, HelpCircle } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import Fuse from 'fuse.js';

// 🛡️ ÇÖKME ENGELLEYİCİ KALKAN
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
    const [isThinking, setIsThinking] = useState(false); 
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem çevrimiçi. Size nasıl yardımcı olabilirim efendim?");
    
    const [foundStudents, setFoundStudents] = useState([]);
    const [foundTopics, setFoundTopics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    const [pendingAction, setPendingAction] = useState(null); 
    const [pendingSources, setPendingSources] = useState([]); 
    
    const [draftGrades, setDraftGrades] = useState({});
    const [draftNotes, setDraftNotes] = useState({});
    
    const recognitionRef = useRef(null);
    const sortedFoundTopics = [...(foundTopics || [])].reverse();

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        setTimeout(() => { startListening(); }, 500);
        return () => { 
            document.body.style.overflow = ''; 
            if (recognitionRef.current) recognitionRef.current.abort();
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, []);

    const speakFeedback = (text, autoListenAfter = false) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0;
        
        utterance.onend = () => {
            if (autoListenAfter) {
                startListening();
            }
        };
        
        window.speechSynthesis.speak(utterance);
    };

    const updateFeedbackAndSpeak = (msg, autoListenAfter = false) => {
        setJarvisFeedback(msg);
        speakFeedback(msg, autoListenAfter);
    };

    const getStudentReadableGrades = (student, cls) => {
        let records = [];
        (cls?.topics || []).forEach(t => {
            (t.subColumns || []).forEach(col => {
                const status = draftGrades[student.id]?.[col.id] || student.grades?.[col.id];
                if (status) {
                    const statusTR = status === 'done' ? 'Yapıldı' : status === 'missing' ? 'Eksik' : status === 'assigned' ? 'Verildi' : 'Muaf';
                    records.push(`${t.title} - ${col.title}: ${statusTR}`);
                }
            });
        });
        return records;
    };

    // 🧠 TOKEN TASARRUFLU (DİNAMİK) GROQ API ÇAĞRISI
    const callGroqAPI = async (transcript) => {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            updateFeedbackAndSpeak("API Anahtarı bulunamadı.");
            setIsThinking(false);
            return null;
        }

        let dynamicContextData;
        let currentStudentContext = "";

        // 🔥 OPTİMİZASYON: Sadece seçili öğrenci varsa notlarını gönder. Yoksa sadece isim listesini gönder.
        if (selectedStudent) {
            const targetClass = (classes || []).find(c => c.id === selectedStudent.classId);
            const studentCurrentData = targetClass?.students?.find(s => s.id === selectedStudent.id) || selectedStudent;
            
            dynamicContextData = {
                odakMode: "AKTIF_OGRENCI",
                ogrenciAdi: selectedStudent.name,
                sinifAdi: selectedStudent.className,
                // Sadece seçili öğrencinin notları gönderilir!
                notKayitlari: getStudentReadableGrades(studentCurrentData, targetClass),
                mevcutOdevler: (targetClass?.topics || []).map(t => ({
                    baslik: t.title,
                    kaynaklar: (t.subColumns || []).map(col => col.title)
                }))
            };
            currentStudentContext = `Şu an ekranda seçili aktif öğrenci: "${selectedStudent.name}". Eğer komutta yeni bir isim yoksa, sadece bu öğrencinin verilerini baz al.`;
        } else {
            dynamicContextData = {
                odakMode: "GENEL_ARAMA",
                siniflar: (classes || []).map(c => ({
                    sinifAdi: c.className,
                    // Sadece isimler gönderilir, notlar asla gönderilmez! (Muazzam Token tasarrufu)
                    ogrenciIsimleri: (c.students || []).map(s => s.name),
                    odevBasliklari: (c.topics || []).map(t => ({
                        baslik: t.title,
                        kaynaklar: (t.subColumns || []).map(col => col.title)
                    }))
                }))
            };
            currentStudentContext = `Şu an seçili bir öğrenci yok. Kullanıcının komutundan öğrenci ismini eşleştirmelisin.`;
        }

        const systemPrompt = `
Sen "J.A.R.V.I.S" adında, son derece zeki, profesyonel ve saygılı bir eğitim yapay zekasısın.
Sana verilen komutu analiz et ve SADECE aşağıdaki JSON formatında yanıt ver. Asla JSON dışında düz metin yazma!

Mevcut Aktif Veritabanı (Dinamik Bağlam):
${JSON.stringify(dynamicContextData)}

${currentStudentContext}

Kullanıcı Komutu 3 Farklı Niyette Olabilir:
1. "update": Not girme (Örn: Ahmet üslü sayıları çözmüş).
2. "query": Bilgi sorma (Örn: Ahmet'in eksikleri neler?).
3. "save": Onaylama (Örn: Değişiklikleri onayla, kaydet).

Eğer "update" yapılıyorsa ama "Kaynak (source)" veya "Konu" eksikse, işlemi "need_info" yap.

JSON FORMATIN:
{
  "action": "update" | "query" | "save" | "need_info",
  "student": "Öğrenci Adı veya null",
  "topic": "Konu veya null",
  "source": "Kaynak veya null",
  "status": "done" | "missing" | "assigned" | "exempt" | null,
  "feedback": "Bana sesli olarak vereceğin, çok doğal, karizmatik ve duruma uygun Türkçe cevap."
}

Kurallar:
- "feedback" alanı çok önemlidir. Mekanik değil, akıcı konuş. "Efendim" kelimesini ara sıra kullan.
- Eğer eylem "query" ise, veritabanına bakıp eksikleri bularak "feedback" içine yaz.
- Eğer "need_info" ise "feedback" içinde eksik olan bilgiyi karizmatikçe sor.
- Durumlar İngilizce döndürülmelidir: yapıldı->done, eksik->missing, verildi->assigned, muaf->exempt.
`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: transcript } ],
                    response_format: { type: 'json_object' },
                    temperature: 0.2
                })
            });
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error("Groq Hatası:", error);
            return null;
        }
    };

    const findBestMatch = (items, key, textToSearch) => {
        if (!items || items.length === 0 || !textToSearch) return null;
        const safeItems = items.map(item => ({ ...item, _safeSearchKey: getSafeText(item[key]) }));
        const fuse = new Fuse(safeItems, { keys: ['_safeSearchKey'], threshold: 0.45, includeScore: true });
        const results = fuse.search(textToSearch);
        return results.length > 0 ? results[0].item : null;
    };

    const processGroqResult = (aiResult) => {
        if (!aiResult) return;

        if (aiResult.action === 'save') {
            updateFeedbackAndSpeak(aiResult.feedback || "Değişiklikler sisteme kaydediliyor efendim.");
            applyChanges();
            return;
        }

        const allStudents = (classes || []).flatMap(cls => (cls.students || []).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })));
        let bestStudent = findBestMatch(allStudents, 'name', aiResult.student);
        
        if (!bestStudent && selectedStudent) bestStudent = selectedStudent;

        if (bestStudent) {
            setFoundStudents([bestStudent]);
            setSelectedStudent(bestStudent);
            const targetClass = classes.find(c => c.id === bestStudent.classId); 
            const topics = targetClass?.topics || []; 
            setFoundTopics(topics);

            const bestTopic = findBestMatch(topics, 'title', aiResult.topic);
            let bestCol = null;
            if (bestTopic && aiResult.source) {
                bestCol = findBestMatch(bestTopic.subColumns || [], 'title', aiResult.source);
            }

            if (aiResult.action === 'need_info') {
                if (bestTopic) {
                    setPendingAction({ studentId: bestStudent.id, topicId: bestTopic.id, status: aiResult.status });
                    setPendingSources(bestTopic.subColumns || []);
                }
                updateFeedbackAndSpeak(aiResult.feedback, true); 
                return;
            }

            if (aiResult.action === 'query') {
                updateFeedbackAndSpeak(aiResult.feedback);
                return;
            }

            if (aiResult.action === 'update' && bestTopic && bestCol && aiResult.status) {
                handleDraftGradeChange(bestStudent.id, bestCol.id, aiResult.status);
                updateFeedbackAndSpeak(aiResult.feedback);
            } else {
                updateFeedbackAndSpeak(aiResult.feedback || "İstediğiniz işlemi veritabanında eşleştiremedim efendim.");
            }

        } else {
            updateFeedbackAndSpeak(aiResult.feedback || "Sistemde böyle bir öğrenci kaydı bulamadım efendim.");
        }
    };

    const handleCommand = async (transcript) => {
        if (!transcript.trim()) return;
        setPendingAction(null);
        setPendingSources([]);
        
        setIsThinking(true);
        setJarvisFeedback("Analiz ediliyor...");
        
        const aiResult = await callGroqAPI(transcript);
        setIsThinking(false);
        
        processGroqResult(aiResult);
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        if (recognitionRef.current) recognitionRef.current.abort();
        
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'tr-TR';
        recognition.continuous = false;

        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); setJarvisFeedback("Sizi dinliyorum..."); };
        recognition.onresult = (event) => { 
            const transcript = event.results[0][0].transcript; 
            setSpeechTranscript(transcript); 
            handleCommand(transcript); 
        };
        recognition.onerror = () => { setIsListening(false); setJarvisFeedback("Sinyal kesildi. Yazarak devam edebilirsiniz."); };
        recognition.onend = () => setIsListening(false); 
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }
    };

    const handleManualSubmit = () => {
        if (!textCommand.trim()) return;
        setSpeechTranscript(textCommand); 
        handleCommand(textCommand);
        setTextCommand(""); 
    };

    const handleManualSourceSelect = (col) => {
        if (!pendingAction) return;
        handleDraftGradeChange(pendingAction.studentId, col.id, pendingAction.status);
        updateFeedbackAndSpeak("Manuel seçiminiz algılandı ve sisteme işlendi efendim.");
        setPendingAction(null);
        setPendingSources([]);
    };

    const handleDraftGradeChange = (studentId, colId, statusId) => { setDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } })); };
    const handleDraftNoteChange = (studentId, colId, note) => { setDraftNotes(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: note } })); };

    const applyChanges = () => {
        if (!selectedStudent) return;
        const targetClass = classes.find(c => c.id === selectedStudent.classId); if (!targetClass) return;
        const updatedStudents = (targetClass.students || []).map(s => {
            if (s.id === selectedStudent.id) {
                const newGrades = { ...(s.grades || {}), ...(draftGrades[s.id] || {}) };
                const newNotes = { ...(s.assignmentNotes || {}), ...(draftNotes[s.id] || {}) };
                return { ...s, grades: newGrades, assignmentNotes: newNotes };
            } return s;
        });
        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); setDraftNotes({});
        setTimeout(() => onClose(), 2000); 
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="bg-slate-900/95 border border-cyan-500/30 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[85vh]">
                
                {/* RADAR PANEL */}
                <div className="relative overflow-hidden bg-slate-950 border-b border-cyan-900/50 p-6 flex flex-col items-center justify-center shrink-0">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute w-44 h-44 border border-cyan-500/10 rounded-full border-t-cyan-400/40" />
                    <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="absolute top-4 right-4 text-slate-500 hover:text-cyan-400 transition-colors z-30"><X size={20}/></button>
                    
                    <div onClick={isListening ? stopListening : startListening} className="z-10 bg-slate-900 p-4 rounded-full border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] mb-3 cursor-pointer relative hover:scale-105 transition-transform">
                        {isListening && <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></span>}
                        <Activity size={24} className={`text-cyan-400 ${(isListening || isThinking) ? 'animate-pulse' : ''}`} />
                    </div>

                    <div className="w-full max-w-xl z-10 relative flex items-center mb-4">
                        <div className="absolute left-4 text-cyan-500/50 pointer-events-none"><Keyboard size={18} /></div>
                        <input 
                            ref={inputRef} type="text" placeholder="Manuel komut (Örn: Merve'nin eksiklerini say)" 
                            className="w-full bg-slate-900/80 border border-cyan-800/50 text-cyan-100 rounded-xl pl-12 pr-24 py-3 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all font-medium"
                            value={textCommand} onChange={(e) => setTextCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} disabled={isListening || isThinking}
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                            <button onClick={isListening ? stopListening : startListening} className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-400'}`}><Mic size={18} className={isListening ? 'animate-pulse' : ''} /></button>
                            <button onClick={handleManualSubmit} className="p-2 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 rounded-lg transition-colors" disabled={!textCommand.trim() || isListening || isThinking}><Send size={18} /></button>
                        </div>
                    </div>

                    <div className="z-10 text-center w-full px-2">
                        {speechTranscript && <p className="text-[11px] text-slate-500 italic mb-1">"{speechTranscript}"</p>}
                        <p className="font-mono text-cyan-300 text-xs flex items-center justify-center tracking-wide leading-tight">
                            <span className="text-cyan-600 mr-1.5">&gt;</span> {jarvisFeedback}
                        </p>
                    </div>

                    <AnimatePresence>
                        {(pendingSources || []).length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-4 flex flex-wrap justify-center gap-1.5 z-20 relative max-h-24 overflow-y-auto">
                                {(pendingSources || []).map(col => (
                                    <button key={col.id} onClick={() => handleManualSourceSelect(col)} className="px-3 py-1.5 bg-cyan-950/90 border border-cyan-500/40 hover:border-cyan-300 text-cyan-200 text-[10px] font-bold rounded-xl transition-all">
                                        {getSafeText(col.title)}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ÖDEV MATRİS LİSTESİ */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40 min-h-[300px] custom-scrollbar">
                    {selectedStudent ? (
                        <>
                            <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-cyan-900/30">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-sm">{getSafeText(selectedStudent.name).charAt(0)}</div>
                                <div className="flex flex-col"><span className="text-sm font-bold text-cyan-100">{getSafeText(selectedStudent.name)}</span><span className="text-[10px] font-mono text-slate-500">{getSafeText(selectedStudent.className)}</span></div>
                            </div>
                            
                            <div className="space-y-4">
                                {sortedFoundTopics.map(topic => (
                                    <div key={topic.id} className="bg-slate-900/40 rounded-2xl border border-cyan-900/20 p-4">
                                        <h4 className="font-bold text-cyan-200 text-xs mb-3 border-b border-slate-800/60 pb-2 flex items-center gap-1.5"><div className="w-1 h-3 bg-cyan-500 rounded-full"></div>{getSafeText(topic.title)}</h4>
                                        <div className="space-y-2.5">
                                            {(topic.subColumns || []).map(col => {
                                                const targetClass = (classes || []).find(c => c.id === selectedStudent.classId);
                                                const studentData = targetClass?.students?.find(s => s.id === selectedStudent.id);
                                                const displayGrade = draftGrades[selectedStudent.id]?.[col.id] !== undefined ? draftGrades[selectedStudent.id]?.[col.id] : (studentData?.grades?.[col.id] || 'assigned');
                                                const isChanged = draftGrades[selectedStudent.id]?.[col.id] !== undefined;

                                                return (
                                                    <div key={col.id} className={`p-3 rounded-xl bg-slate-900/80 border ${isChanged ? 'border-cyan-500/40' : 'border-slate-800'} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5`}>
                                                        <span className="text-xs font-medium text-slate-300 truncate max-w-[200px]">{getSafeText(col.title)}</span>
                                                        <div className="flex gap-1 shrink-0">
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button key={opt.id} onClick={() => handleDraftGradeChange(selectedStudent.id, col.id, opt.id)} className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wide transition-all ${displayGrade === opt.id ? darkStatusStyles[opt.id] : 'bg-slate-950 text-slate-600 border-transparent'}`}>
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono py-12"><TerminalSquare size={36} className="mb-2 opacity-30 animate-pulse"/><p className="text-xs">Komut Girişi veya Ses Bekleniyor...</p></div>
                    )}
                </div>

                {/* ALT AKSİYON PANELİ */}
                <div className="p-4 border-t border-cyan-900/50 bg-slate-950 flex justify-between items-center gap-4 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500">{Object.keys(draftGrades).length} Değişiklik Hazır</span>
                    <div className="flex gap-2">
                        <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors">Kapat</button>
                        <button onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0} className={`px-5 py-2 rounded-xl text-xs font-black text-slate-900 transition-all ${Object.keys(draftGrades).length > 0 ? 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>SİSTEME İŞLE</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
