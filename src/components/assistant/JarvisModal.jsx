import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Activity, Calendar, StickyNote, AlertTriangle, Save, HelpCircle, User, CheckCircle2 } from 'lucide-react';
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
    
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem çevrimiçi. Sizi dinliyorum efendim.");
    
    const [foundStudents, setFoundStudents] = useState([]);
    const [foundTopics, setFoundTopics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    const [pendingAction, setPendingAction] = useState(null); 
    const [pendingSources, setPendingSources] = useState([]); 
    
    const [draftGrades, setDraftGrades] = useState({});
    const [draftNotes, setDraftNotes] = useState({});
    
    const recognitionRef = useRef(null);
    const autoListenRef = useRef(true); // OTO-DİNLEME ANAHTARI
    
    const sortedFoundTopics = Array.isArray(foundTopics) ? [...foundTopics].filter(Boolean).reverse() : [];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const timer = setTimeout(() => { startListening(); }, 500);
        return () => { 
            clearTimeout(timer);
            document.body.style.overflow = ''; 
            if (recognitionRef.current) recognitionRef.current.abort();
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, []);

    // 🗣️ SESLENDİRME VE KESİNTİSİZ OTO-DİNLEME (DİYALOG)
    const speakFeedback = (text, shouldListenAfter = true) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        
        autoListenRef.current = shouldListenAfter;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0;
        
        utterance.onend = () => {
            if (autoListenRef.current) {
                setTimeout(() => startListening(), 300); // 300ms nefes payı
            }
        };
        
        window.speechSynthesis.speak(utterance);
    };

    const updateFeedbackAndSpeak = (msg, shouldListenAfter = true) => {
        setJarvisFeedback(msg);
        speakFeedback(msg, shouldListenAfter);
    };

    const getStudentReadableGrades = (student, cls) => {
        let records = [];
        if (!student || !cls || !cls.topics) return records;
        
        const safeTopics = Array.isArray(cls.topics) ? cls.topics.filter(t => t && Array.isArray(t.subColumns)) : [];
        safeTopics.forEach(t => {
            t.subColumns.forEach(col => {
                if (!col || !col.id) return; 
                const studentGrades = student.grades || {};
                const draftStudentGrades = draftGrades[student.id] || {};
                const status = draftStudentGrades[col.id] !== undefined ? draftStudentGrades[col.id] : studentGrades[col.id];
                if (status) {
                    const statusTR = status === 'done' ? 'Yapıldı' : status === 'missing' ? 'Eksik' : status === 'assigned' ? 'Verildi' : 'Muaf';
                    records.push(`${t.title || 'Konu'} - ${col.title || 'Kaynak'}: ${statusTR}`);
                }
            });
        });
        return records;
    };

    const callGroqAPI = async (transcript) => {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) { updateFeedbackAndSpeak("API Anahtarı eksik.", false); setIsThinking(false); return null; }

        let dynamicContextData;
        let currentStudentContext = "";
        const safeClasses = Array.isArray(classes) ? classes.filter(c => c && typeof c === 'object') : [];

        if (selectedStudent) {
            const targetClass = safeClasses.find(c => c.id === selectedStudent.classId);
            const studentCurrentData = targetClass?.students?.find(s => s && s.id === selectedStudent.id) || selectedStudent;
            
            dynamicContextData = {
                odakMode: "AKTIF_OGRENCI",
                ogrenciAdi: selectedStudent?.name || "",
                sinifAdi: selectedStudent?.className || "",
                notKayitlari: getStudentReadableGrades(studentCurrentData, targetClass),
                mevcutOdevler: Array.isArray(targetClass?.topics) ? targetClass.topics.filter(Boolean).map(t => ({
                    baslik: t.title || "",
                    kaynaklar: Array.isArray(t.subColumns) ? t.subColumns.filter(Boolean).map(col => col.title || "") : []
                })) : []
            };
            currentStudentContext = `Aktif odak: "${selectedStudent?.name || ''}". Komutta yeni isim yoksa işlemleri bu öğrenciye uygula.`;
        } else {
            dynamicContextData = {
                odakMode: "GENEL_ARAMA",
                siniflar: safeClasses.map(c => ({
                    sinifAdi: c.className || "",
                    ogrenciIsimleri: Array.isArray(c.students) ? c.students.filter(s => s && s.name).map(s => s.name) : [],
                    odevBasliklari: Array.isArray(c.topics) ? c.topics.filter(t => t && t.title).map(t => ({
                        baslik: t.title,
                        kaynaklar: Array.isArray(t.subColumns) ? t.subColumns.filter(col => col && col.title).map(col => col.title) : []
                    })) : []
                }))
            };
            currentStudentContext = `Şu an kimse seçili değil. Komuttan hedefi bul.`;
        }

        const systemPrompt = `
Sen "J.A.R.V.I.S" adında karizmatik, son derece doğal ve saygılı bir asistansın. Robot gibi uzun listeler okuma, muhabbet eder gibi kısa ve net cevaplar ver.
Sana verilen komutu analiz et ve SADECE JSON döndür. Asla JSON dışında düz metin yazma!

Veritabanı:
${JSON.stringify(dynamicContextData)}

${currentStudentContext}

Kullanıcı Komutu 4 Niyette Olabilir:
1. "select_student": Kullanıcı SADECE bir isim söylüyorsa (Örn: "Merve", "Aslıhan'ı aç", "İrem Atış"). Bu durumda asla eksiklerini sayma! Sadece öğrenciyi seç.
2. "update": Not girme (Örn: "Ahmet üslü sayıları çözmüş"). Kaynak veya konu eksikse "need_info" yap.
3. "query": Kullanıcı ÖZELLİKLE "Eksikleri neler?", "Durumu nasıl?" diye soruyorsa.
4. "save": "Değişiklikleri onayla", "Kaydet" denirse.

JSON FORMATIN:
{
  "action": "select_student" | "update" | "query" | "save" | "need_info",
  "student": "Öğrenci İsim Soyisim veya null",
  "topic": "Konu veya null",
  "source": "Kaynak veya null",
  "status": "done" | "missing" | "assigned" | "exempt" | null,
  "feedback": "Bana sesli olarak vereceğin, çok doğal ve duruma uygun Türkçe cevap."
}

Feedback Kuralları (ÇOK ÖNEMLİ):
- Eğer action "select_student" ise: "Aslıhan'ın profilini önünüze getirdim efendim, nasıl yardımcı olabilirim?" gibi bir şey söyle. ASLA EKSİK SAYMA!
- Eğer action "need_info" ise: Hangi kaynağı veya konuyu kastettiğini kibarca sor. (Örn: "Hangi kaynaktan çözdüğünü belirtir misiniz efendim?")
- Cümlelerinde bazen "efendim" kullan. Uzun ve robotik liste okuma.
`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: transcript } ],
                    response_format: { type: 'json_object' },
                    temperature: 0.3
                })
            });
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error("Groq Hatası:", error);
            return null;
        }
    };

    const processGroqResult = (aiResult) => {
        if (!aiResult) {
            updateFeedbackAndSpeak("Bağlantı hatası, tekrar dener misiniz efendim?", true);
            return;
        }

        if (aiResult.action === 'save') {
            updateFeedbackAndSpeak(aiResult.feedback || "Değişiklikler sisteme kaydediliyor efendim.", false);
            applyChanges();
            return;
        }

        const safeClasses = Array.isArray(classes) ? classes.filter(c => c && typeof c === 'object') : [];
        const allStudents = safeClasses.flatMap(cls => 
            Array.isArray(cls.students) ? cls.students.filter(std => std && std.name).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })) : []
        );
        
        let bestStudent = null;

        // 🧠 ÇOKLU EŞLEŞME (Merve / İrem Atış) ALGORİTMASI
        if (aiResult.student) {
            const safeItems = allStudents.filter(Boolean).map(item => ({ ...item, _safeSearchKey: getSafeText(item.name).toLocaleLowerCase('tr-TR') }));
            const fuse = new Fuse(safeItems, { keys: ['_safeSearchKey'], threshold: 0.35, includeScore: true });
            const results = fuse.search(aiResult.student);

            if (results.length > 0) {
                const bestScore = results[0].score;
                // En iyi sonuca çok yakın olan TÜM isimleri bul (Aynı isimde olanlar)
                const identicalMatches = results.filter(r => r.score <= bestScore + 0.1).map(r => r.item);

                if (identicalMatches.length > 1) {
                    setFoundStudents(identicalMatches);
                    setSelectedStudent(null);
                    setFoundTopics([]);
                    updateFeedbackAndSpeak(`Sistemde ${aiResult.student} adında ${identicalMatches.length} kişi buldum efendim. Ekrana listeledim, hangi sınıftaki veya VIP olanı kastettiğinizi belirtir misiniz?`, true);
                    return;
                } else {
                    bestStudent = identicalMatches[0];
                }
            }
        }
        
        if (!bestStudent && selectedStudent) bestStudent = selectedStudent;

        if (bestStudent) {
            setFoundStudents([bestStudent]);
            setSelectedStudent(bestStudent);
            const targetClass = safeClasses.find(c => c.id === bestStudent.classId); 
            const topics = targetClass?.topics || []; 
            setFoundTopics(topics);

            const findTopicCol = (items, key, textToSearch) => {
                if (!items || items.length === 0 || !textToSearch) return null;
                const sItems = items.filter(Boolean).map(item => ({ ...item, _safeSearchKey: getSafeText(item[key]) }));
                const f = new Fuse(sItems, { keys: ['_safeSearchKey'], threshold: 0.45, includeScore: true });
                const r = f.search(textToSearch);
                return r.length > 0 ? r[0].item : null;
            };

            const bestTopic = findTopicCol(topics, 'title', aiResult.topic);
            let bestCol = null;
            if (bestTopic && aiResult.source) {
                bestCol = findTopicCol(bestTopic.subColumns || [], 'title', aiResult.source);
            }

            // A. Sadece İsim Söylendi (Muhabbet ve Hazırlık)
            if (aiResult.action === 'select_student') {
                updateFeedbackAndSpeak(aiResult.feedback, true);
                return;
            }

            // B. Eksik Bilgi (Kaynak Soruyor)
            if (aiResult.action === 'need_info') {
                if (bestTopic) {
                    setPendingAction({ studentId: bestStudent.id, topicId: bestTopic.id, status: aiResult.status });
                    setPendingSources(bestTopic.subColumns || []);
                }
                updateFeedbackAndSpeak(aiResult.feedback, true); 
                return;
            }

            // C. Bilgi Sorgusu (Rapor Okuma)
            if (aiResult.action === 'query') {
                updateFeedbackAndSpeak(aiResult.feedback, true);
                return;
            }

            // D. Tam İşlem (Not Kaydetme)
            if (aiResult.action === 'update' && bestTopic && bestCol && aiResult.status) {
                handleDraftGradeChange(bestStudent.id, bestCol.id, aiResult.status);
                updateFeedbackAndSpeak(aiResult.feedback, true);
            } else {
                updateFeedbackAndSpeak(aiResult.feedback || "İşlemi eşleştiremedim efendim, tekrar eder misiniz?", true);
            }

        } else {
            updateFeedbackAndSpeak(aiResult.feedback || "Sistemde böyle bir öğrenci bulamadım efendim.", true);
        }
    };

    const handleCommand = async (transcript) => {
        if (!transcript.trim()) return;
        stopListening(); // Analiz sırasında dinlemeyi durdur
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
        recognition.onerror = () => { setIsListening(false); };
        recognition.onend = () => { setIsListening(false); }; 
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }
    };

    const handleManualSourceSelect = (col) => {
        if (!pendingAction) return;
        handleDraftGradeChange(pendingAction.studentId, col.id, pendingAction.status);
        updateFeedbackAndSpeak("Manuel seçiminiz kaydedildi efendim. Dinlemeye devam ediyorum.", true);
        setPendingAction(null);
        setPendingSources([]);
    };

    const handleDraftGradeChange = (studentId, colId, statusId) => { setDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } })); };

    const applyChanges = () => {
        if (!selectedStudent) return;
        const safeClasses = Array.isArray(classes) ? classes.filter(Boolean) : [];
        const targetClass = safeClasses.find(c => c.id === selectedStudent.classId); 
        if (!targetClass) return;
        
        const updatedStudents = Array.isArray(targetClass.students) ? targetClass.students.filter(Boolean).map(s => {
            if (s.id === selectedStudent.id) {
                const newGrades = { ...(s.grades || {}), ...(draftGrades[s.id] || {}) };
                const newNotes = { ...(s.assignmentNotes || {}), ...(draftNotes[s.id] || {}) };
                return { ...s, grades: newGrades, assignmentNotes: newNotes };
            } 
            return s;
        }) : [];
        
        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); setDraftNotes({});
        setTimeout(() => onClose(), 2000); 
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="bg-slate-900/95 border border-cyan-500/30 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[85vh]">
                
                {/* RADAR PANEL (GEREKSİZ ARAMA KUTUSU SİLİNDİ) */}
                <div className="relative overflow-hidden bg-slate-950 border-b border-cyan-900/50 p-8 flex flex-col items-center justify-center shrink-0 min-h-[220px]">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute w-56 h-56 border border-cyan-500/10 rounded-full border-t-cyan-400/40 pointer-events-none" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute w-36 h-36 border border-cyan-500/10 rounded-full border-b-cyan-400/40 pointer-events-none" />
                    
                    <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="absolute top-4 right-4 text-slate-500 hover:text-cyan-400 transition-colors z-30"><X size={24}/></button>
                    
                    {/* BÜYÜK DİNLEME BUTONU */}
                    <div onClick={isListening ? stopListening : startListening} className="z-10 bg-slate-900 p-6 rounded-full border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-4 cursor-pointer relative hover:scale-105 transition-transform group">
                        {isListening && <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></span>}
                        <Mic size={36} className={`text-cyan-400 ${(isListening || isThinking) ? 'animate-pulse' : 'group-hover:text-cyan-300'}`} />
                    </div>

                    <div className="z-10 text-center w-full px-4">
                        {speechTranscript && <p className="text-[12px] text-slate-400 italic mb-2">"{speechTranscript}"</p>}
                        <p className="font-mono text-cyan-300 text-sm flex items-center justify-center tracking-wide leading-relaxed">
                            {jarvisFeedback}
                        </p>
                    </div>

                    <AnimatePresence>
                        {(pendingSources || []).length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-5 flex flex-wrap justify-center gap-2 z-20 relative max-h-24 overflow-y-auto">
                                {(pendingSources || []).filter(Boolean).map(col => (
                                    <button key={col.id} onClick={() => handleManualSourceSelect(col)} className="px-4 py-2 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 hover:border-cyan-300 text-cyan-100 text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                        {getSafeText(col?.title)}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ÖDEV VE PROFİL LİSTESİ (MOBİL SCROLL DÜZELTİLDİ) */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-4 bg-slate-950/60 min-h-0 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    
                    {/* ÇOKLU EŞLEŞME DURUMU */}
                    {foundStudents.length > 1 && !selectedStudent && (
                        <div className="space-y-3">
                            <h4 className="text-cyan-400 font-mono text-xs uppercase tracking-widest px-2 flex items-center gap-2"><User size={14}/> Lütfen Hedefi Seçin</h4>
                            {foundStudents.map(student => (
                                <button key={student.id} onClick={() => { setSelectedStudent(student); setFoundTopics((classes || []).find(c=>c.id===student.classId)?.topics || []); setFoundStudents([student]); updateFeedbackAndSpeak(`${student.name} kilitlendi efendim.`, true); }} className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-cyan-900/20 hover:border-cyan-500/50 transition-all flex items-center gap-4 group">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${student.isVip ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{getSafeText(student.name).charAt(0)}</div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-200 group-hover:text-cyan-100">{getSafeText(student.name)}</span>
                                        <span className={`text-[10px] font-mono ${student.isVip ? 'text-amber-500/70' : 'text-slate-500'}`}>{student.isVip ? 'VIP ÖZEL DERS' : getSafeText(student.className)}</span>
                                    </div>
                                    <ChevronRight size={16} className="ml-auto text-slate-600 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* TEK ÖĞRENCİ SEÇİLİYSE */}
                    {selectedStudent && foundStudents.length === 1 && (
                        <>
                            <div className="flex items-center gap-4 bg-cyan-900/10 p-4 rounded-2xl border border-cyan-500/20 mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${selectedStudent.isVip ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>{getSafeText(selectedStudent?.name).charAt(0)}</div>
                                <div className="flex flex-col"><span className="text-lg font-bold text-white">{getSafeText(selectedStudent?.name)}</span><span className="text-[11px] font-mono text-cyan-500/70">{selectedStudent.isVip ? 'VIP ÖZEL DERS' : getSafeText(selectedStudent?.className)}</span></div>
                            </div>
                            
                            <div className="space-y-4 pb-12">
                                {sortedFoundTopics.map(topic => (
                                    <div key={topic.id} className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 md:p-5">
                                        <h4 className="font-bold text-slate-200 text-sm mb-4 border-b border-slate-800/80 pb-3 flex items-center gap-2"><div className={`w-1.5 h-4 rounded-full ${selectedStudent.isVip ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'}`}></div>{getSafeText(topic?.title)}</h4>
                                        <div className="space-y-3">
                                            {(topic.subColumns || []).filter(Boolean).map(col => {
                                                const targetClass = (classes || []).find(c => c && c.id === selectedStudent.classId);
                                                const studentData = targetClass?.students?.find(s => s && s.id === selectedStudent.id);
                                                const displayGrade = draftGrades[selectedStudent.id]?.[col.id] !== undefined ? draftGrades[selectedStudent.id]?.[col.id] : (studentData?.grades?.[col.id] || 'assigned');
                                                const isChanged = draftGrades[selectedStudent.id]?.[col.id] !== undefined;

                                                return (
                                                    <div key={col.id} className={`p-3 md:p-4 rounded-xl bg-slate-950/50 border ${isChanged ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-slate-800'} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                                                        <span className="text-xs md:text-sm font-medium text-slate-300 flex-1">{getSafeText(col?.title)}</span>
                                                        <div className="flex gap-1.5 shrink-0 overflow-x-auto pb-1 md:pb-0">
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button key={opt.id} onClick={() => handleDraftGradeChange(selectedStudent.id, col.id, opt.id)} className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-wide transition-all shrink-0 ${displayGrade === opt.id ? darkStatusStyles[opt.id] : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-800'}`}>
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
                    )}
                    
                    {!selectedStudent && foundStudents.length <= 1 && (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-600 font-mono py-12"><TerminalSquare size={48} className="mb-4 opacity-20"/><p className="text-xs">Bekleniyor...</p></div>
                    )}
                </div>

                {/* ALT AKSİYON PANELİ */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center gap-4 shrink-0">
                    <span className="text-[11px] font-mono text-slate-500">{Object.keys(draftGrades).length} Bekleyen Kayıt</span>
                    <div className="flex gap-2">
                        <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="px-5 py-2.5 text-xs font-bold text-slate-400 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors">İptal</button>
                        <button onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0} className={`px-6 py-2.5 rounded-xl text-xs font-black text-slate-900 transition-all ${Object.keys(draftGrades).length > 0 ? 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}><Save size={16} className="inline mr-1" /> KAYDET</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
