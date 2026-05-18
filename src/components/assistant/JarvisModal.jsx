import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Activity, Calendar, StickyNote, AlertTriangle, Save, User, CheckCircle2, TerminalSquare, Keyboard, Send, ChevronRight } from 'lucide-react';
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

const AssistantModal = ({ classes, updateClassInDb, onClose, initialStudent }) => {
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [textCommand, setTextCommand] = useState("");
    
    const [jarvisFeedback, setJarvisFeedback] = useState("Yerel sistem aktif. Komutunuzu bekliyorum.");
    
    const [foundStudents, setFoundStudents] = useState(initialStudent ? [initialStudent] : []);
    const [selectedStudent, setSelectedStudent] = useState(initialStudent || null);
    const [foundTopics, setFoundTopics] = useState([]);
    
    const [pendingAction, setPendingAction] = useState(null); 
    const [pendingSources, setPendingSources] = useState([]); 
    
    const [draftGrades, setDraftGrades] = useState({});
    
    const recognitionRef = useRef(null);
    const inputRef = useRef(null);

    const sortedFoundTopics = Array.isArray(foundTopics) ? [...foundTopics].filter(Boolean).reverse() : [];

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        
        if (initialStudent) {
            const safeClasses = Array.isArray(classes) ? classes.filter(Boolean) : [];
            const targetClass = safeClasses.find(c => c.id === initialStudent.classId);
            setFoundTopics(targetClass?.topics || []);
            setJarvisFeedback(`${initialStudent.name} profili aktif. Komut bekliyorum.`);
        }

        return () => { 
            document.body.style.overflow = ''; 
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, [initialStudent, classes]);

    // 🧠 100% YEREL (LOCAL) NLP MOTORU (API'siz, Kısıtlamasız, Işık Hızında)
    const analyzeCommandLocal = (transcript) => {
        let text = transcript.toLocaleLowerCase('tr-TR');
        setPendingAction(null);
        setPendingSources([]);
        
        // 1. SİSTEM KOMUTLARI
        if (text.includes('kaydet') || text.includes('onayla')) {
            setJarvisFeedback("Değişiklikler kaydediliyor...");
            applyChanges();
            return;
        }
        if (text === 'kapat' || text === 'çık') {
            if (Object.keys(draftGrades).length > 0) {
                setJarvisFeedback("Kaydedilmemiş notlar var. Lütfen 'Kaydet' butonunu kullanın.");
            } else {
                onClose();
            }
            return;
        }

        // 2. KELİME VE RAKAM DÜZELTMELERİ
        text = text.replace(/birinci/g, '1').replace(/ikinci/g, '2').replace(/üçüncü/g, '3')
                   .replace(/\bbir\b/g, '1').replace(/\biki\b/g, '2').replace(/\b[uü]ç\b/g, '3')
                   .replace(/testi/g, 'test').replace(/testini/g, 'test');
        if (text.includes('vdd')) text += " video ders defteri";

        // 3. DURUM (STATUS) TESPİTİ
        let status = null;
        if (text.match(/çözmemiş|yapmamış|yapmadı|eksik|boş|yok|çözmüyor|yapılmadı|çözülmedi/)) status = 'missing';
        else if (text.match(/çözdü|yaptı|tamamladı|bitirdi|full|bitti|çözmüş|yapmış|yapıldı|çözüldü|tamamlandı|yapıyoruz/)) status = 'done';
        else if (text.match(/verdim|verildi|atadım|ödev ver|çözecek|yapacak/)) status = 'assigned';
        else if (text.match(/muaf|gerek yok|çözmesin/)) status = 'exempt';

        const isAllSources = text.match(/tüm kaynaklar|hepsi|bütün kaynaklar/);

        // 4. BULANIK ARAMA (FUSE.JS) MOTORU
        const extractNumbers = (str) => { const m = str.match(/\d+/g); return m ? m : []; };
        const transcriptNumbers = extractNumbers(text);

        const findBestMatch = (items, key, threshold = 0.4) => {
            if (!items || items.length === 0) return null;
            const safeItems = items.filter(Boolean).map(item => ({ ...item, _safeSearchKey: getSafeText(item[key]).toLocaleLowerCase('tr-TR') }));
            const fuse = new Fuse(safeItems, { keys: ['_safeSearchKey'], threshold: threshold, distance: 100, includeScore: true, ignoreLocation: true });
            
            const words = text.replace(/[.,!?]/g, "").split(/\s+/).filter(w => w.length > 2);
            let bestMatch = null; let bestScore = 1;

            // Önce tüm metni ara (Net isim eşleşmeleri için)
            const fullResults = fuse.search(text);
            if (fullResults.length > 0 && fullResults[0].score < 0.2) return fullResults[0].item;

            for (let i=0; i < words.length; i++) {
                const ngrams = [words[i]];
                if(i < words.length - 1) ngrams.push(words[i] + " " + words[i+1]);
                if(i < words.length - 2) ngrams.push(words[i] + " " + words[i+1] + " " + words[i+2]);
                
                for (const ngram of ngrams) {
                    if (ngram.length < 3) continue;
                    const results = fuse.search(ngram);
                    for (const res of results) {
                        const itemNumbers = extractNumbers(res.item._safeSearchKey);
                        const hasMissingNumber = itemNumbers.some(num => !transcriptNumbers.includes(num));
                        if (hasMissingNumber) continue; 
                        if (res.score < bestScore) { bestScore = res.score; bestMatch = res.item; }
                    }
                }
            }
            return bestMatch;
        };

        const safeClasses = Array.isArray(classes) ? classes.filter(c => c && typeof c === 'object') : [];
        const allStudents = safeClasses.flatMap(cls => 
            Array.isArray(cls.students) ? cls.students.filter(std => std && std.name).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })) : []
        );

        let bestStudent = findBestMatch(allStudents, 'name', 0.4);

        // ÇOKLU İSİM (Merve / İrem) KONTROLÜ
        if (bestStudent) {
            const safeItems = allStudents.filter(Boolean).map(item => ({ ...item, _safeSearchKey: getSafeText(item.name).toLocaleLowerCase('tr-TR') }));
            const fuse = new Fuse(safeItems, { keys: ['_safeSearchKey'], threshold: 0.35, includeScore: true });
            
            const firstName = bestStudent.name.split(' ')[0];
            const results = fuse.search(firstName);
            
            if (results.length > 0) {
                const identicalMatches = results.filter(r => r.score <= results[0].score + 0.1).map(r => r.item);
                // Eğer cümle içinde spesifik olarak "Merve Eski" denmediyse ve 2 Merve bulunduysa:
                const isExactNameMentioned = identicalMatches.some(m => text.includes(m.name.toLowerCase()));
                
                if (identicalMatches.length > 1 && !isExactNameMentioned) {
                    setFoundStudents(identicalMatches);
                    setSelectedStudent(null);
                    setFoundTopics([]);
                    setJarvisFeedback(`"${firstName}" isminde ${identicalMatches.length} kişi bulundu. Lütfen listeden seçin.`);
                    return;
                } else if (isExactNameMentioned) {
                    bestStudent = identicalMatches.find(m => text.includes(m.name.toLowerCase())) || identicalMatches[0];
                }
            }
        }

        // Eğer cümlede yeni bir isim bulunamadıysa aktif öğrenciye kilitlen
        if (!bestStudent && selectedStudent) {
            bestStudent = selectedStudent;
        }

        if (!bestStudent) {
            setJarvisFeedback("Öğrenci bulunamadı. Lütfen bir isim söyleyin.");
            return;
        }

        setFoundStudents([bestStudent]);
        setSelectedStudent(bestStudent);
        const targetClass = safeClasses.find(c => c.id === bestStudent.classId); 
        const topics = targetClass?.topics || []; 
        setFoundTopics(topics);

        // KONU VE KAYNAK BUL (Sadece aktif öğrencinin müfredatından)
        const bestTopic = findBestMatch(topics, 'title', 0.45);
        let bestCol = null;
        if (bestTopic && !isAllSources) {
            bestCol = findBestMatch(bestTopic.subColumns || [], 'title', 0.45);
        }

        // AKSİYON İCRA KONTROLÜ
        if (bestTopic && status) {
            if (isAllSources) {
                (bestTopic.subColumns || []).forEach(col => {
                    handleDraftGradeChange(bestStudent.id, col.id, status);
                });
                setJarvisFeedback(`Tüm kaynaklar işaretlendi.`);
            } else if (bestCol) {
                handleDraftGradeChange(bestStudent.id, bestCol.id, status);
                setJarvisFeedback(`Kaynak işaretlendi.`);
            } else {
                setPendingAction({ studentId: bestStudent.id, topicId: bestTopic.id, status: status });
                setPendingSources(bestTopic.subColumns || []);
                setJarvisFeedback("Kaynak anlaşılamadı. Lütfen listeden seçin.");
            }
        } else if (bestTopic && !status) {
            setJarvisFeedback(`"${bestTopic.title}" bulundu ama durum (yapıldı/eksik) anlaşılamadı.`);
        } else {
            setJarvisFeedback(`${bestStudent.name} seçildi. Komut bekliyorum.`);
        }
    };

    const handleCommand = (transcript) => {
        if (!transcript.trim()) return;
        setJarvisFeedback("Analiz ediliyor...");
        setTimeout(() => {
            analyzeCommandLocal(transcript);
        }, 100); // 100ms UI rahatlaması için
    };

    // 🎙️ SAF DİNLEME MODU (Sadece butona basınca dinler)
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { setJarvisFeedback("Tarayıcınız ses modülünü desteklemiyor."); return; }
        if (recognitionRef.current) recognitionRef.current.abort();
        
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'tr-TR';
        recognition.continuous = false;

        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); setJarvisFeedback("Dinliyorum..."); };
        recognition.onresult = (event) => { 
            const transcript = event.results[0][0].transcript; 
            setSpeechTranscript(transcript); 
            handleCommand(transcript); 
        };
        recognition.onerror = () => { setIsListening(false); setJarvisFeedback("Mikrofon kapandı."); };
        recognition.onend = () => { setIsListening(false); }; 
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) { recognitionRef.current.abort(); setIsListening(false); }
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
        setJarvisFeedback("Kaynak seçimi tamamlandı.");
        setPendingAction(null);
        setPendingSources([]);
    };

    const handleDraftGradeChange = (studentId, colId, statusId) => { setDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } })); };

    const applyChanges = () => {
        if (!selectedStudent) {
            onClose(); 
            return;
        }
        const safeClasses = Array.isArray(classes) ? classes.filter(Boolean) : [];
        const targetClass = safeClasses.find(c => c.id === selectedStudent.classId); 
        if (!targetClass) return;
        
        const updatedStudents = Array.isArray(targetClass.students) ? targetClass.students.filter(Boolean).map(s => {
            if (s.id === selectedStudent.id) {
                const newGrades = { ...(s.grades || {}), ...(draftGrades[s.id] || {}) };
                return { ...s, grades: newGrades };
            } 
            return s;
        }) : [];
        
        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); 
        onClose(); 
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="bg-slate-900/95 border border-cyan-500/30 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[85vh]">
                
                {/* RADAR PANEL */}
                <div className="relative overflow-hidden bg-slate-950 border-b border-cyan-900/50 p-8 flex flex-col items-center justify-center shrink-0 min-h-[220px]">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute w-56 h-56 border border-cyan-500/10 rounded-full border-t-cyan-400/40 pointer-events-none" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="absolute w-36 h-36 border border-cyan-500/10 rounded-full border-b-cyan-400/40 pointer-events-none" />
                    
                    <button onClick={() => { stopListening(); onClose(); }} className="absolute top-4 right-4 text-slate-500 hover:text-cyan-400 transition-colors z-30"><X size={24}/></button>
                    
                    {/* MANUEL MİKROFON BUTONU */}
                    <div onClick={isListening ? stopListening : startListening} className="z-10 bg-slate-900 p-6 rounded-full border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-4 cursor-pointer relative hover:scale-105 transition-transform group mt-2">
                        {isListening && <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></span>}
                        <Mic size={36} className={`text-cyan-400 ${isListening ? 'animate-pulse' : 'group-hover:text-cyan-300'}`} />
                    </div>

                    <div className="w-full max-w-xl z-10 relative flex items-center mb-4">
                        <div className="absolute left-4 text-cyan-500/50 pointer-events-none"><Keyboard size={18} /></div>
                        <input 
                            ref={inputRef} type="text" placeholder="Manuel komut (Örn: Logaritma tüm kaynaklar eksik)" 
                            className="w-full bg-slate-900/80 border border-cyan-800/50 text-cyan-100 rounded-xl pl-12 pr-24 py-3 text-sm focus:outline-none focus:border-cyan-400 transition-all font-medium"
                            value={textCommand} onChange={(e) => setTextCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} disabled={isListening}
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                            <button onClick={isListening ? stopListening : startListening} className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800 text-slate-400'}`}><Mic size={18} className={isListening ? 'animate-pulse' : ''} /></button>
                            <button onClick={handleManualSubmit} className="p-2 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 rounded-lg transition-colors" disabled={!textCommand.trim() || isListening}><Send size={18} /></button>
                        </div>
                    </div>

                    <div className="z-10 text-center w-full px-4">
                        {speechTranscript && <p className="text-[12px] text-slate-400 italic mb-2">"{speechTranscript}"</p>}
                        <p className="font-mono text-cyan-300 text-sm flex items-center justify-center tracking-wide">
                            <span className="text-cyan-600 mr-1.5">&gt;</span> {jarvisFeedback}
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

                {/* ÖDEV VE PROFİL LİSTESİ */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-4 bg-slate-950/60 min-h-[300px] custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    
                    {foundStudents.length > 1 && !selectedStudent && (
                        <div className="space-y-3">
                            <h4 className="text-cyan-400 font-mono text-xs uppercase tracking-widest px-2 flex items-center gap-2"><User size={14}/> Lütfen Hedefi Seçin</h4>
                            {foundStudents.map(student => (
                                <button key={student.id} onClick={() => { setSelectedStudent(student); setFoundTopics((classes || []).find(c=>c.id===student.classId)?.topics || []); setFoundStudents([student]); setJarvisFeedback(`${student.name} kilitlendi. Komut bekliyorum.`); }} className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-cyan-900/20 hover:border-cyan-500/50 transition-all flex items-center gap-4 group">
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

                    {selectedStudent && foundStudents.length === 1 && (
                        <>
                            <div className="flex items-center gap-4 bg-cyan-900/10 p-4 rounded-2xl border border-cyan-500/20 mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${selectedStudent.isVip ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{getSafeText(selectedStudent?.name).charAt(0)}</div>
                                <div className="flex flex-col"><span className="text-lg font-bold text-white">{getSafeText(selectedStudent?.name)}</span><span className="text-[11px] font-mono text-cyan-500/70">{selectedStudent.isVip ? 'VIP ÖZEL DERS' : getSafeText(selectedStudent?.className)}</span></div>
                            </div>
                            
                            <div className="space-y-4 pb-12">
                                {sortedFoundTopics.map(topic => (
                                    <div key={topic.id} className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 md:p-5">
                                        <h4 className="font-bold text-slate-200 text-sm mb-4 border-b border-slate-800/80 pb-3 flex items-center gap-2"><div className={`w-1.5 h-4 rounded-full ${selectedStudent.isVip ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>{getSafeText(topic?.title)}</h4>
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
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-600 font-mono py-12"><TerminalSquare size={48} className="mb-4 opacity-20"/><p className="text-xs">Komut veya Ses Bekleniyor...</p></div>
                    )}
                </div>

                {/* ALT AKSİYON PANELİ */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center gap-4 shrink-0">
                    <span className="text-[11px] font-mono text-slate-500">{Object.keys(draftGrades).length} Bekleyen Kayıt</span>
                    <div className="flex gap-2">
                        <button onClick={() => { stopListening(); onClose(); }} className="px-5 py-2.5 text-xs font-bold text-slate-400 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors">İptal</button>
                        <button onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0} className={`px-6 py-2.5 rounded-xl text-xs font-black text-slate-900 transition-all ${Object.keys(draftGrades).length > 0 ? 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}><Save size={16} className="inline mr-1" /> KAYDET</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
