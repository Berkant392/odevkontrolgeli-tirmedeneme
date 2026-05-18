import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, TerminalSquare, Keyboard, Mic, Send, User, CheckCircle2, Activity, Calendar, StickyNote, AlertTriangle, Save, ChevronRight, HelpCircle } from 'lucide-react';
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
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [textCommand, setTextCommand] = useState("");
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem devrede. Sesli veya yazılı komut bekliyorum...");
    
    const [foundStudents, setFoundStudents] = useState([]);
    const [foundTopics, setFoundTopics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    const [pendingTranscript, setPendingTranscript] = useState(null);
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

    // ------------------------------------------------------------------------
    // 🧠 J.A.R.V.I.S 4.0: GELİŞMİŞ NLP VE HATA TOLERANS MOTORU
    // ------------------------------------------------------------------------
    const determineStatus = (text) => {
        // Genişletilmiş Niyet (Intent) Sözlüğü
        if (text.match(/çözmemiş|yapmamış|yapmadı|eksik|boş|yok|çözmüyor|yapılmadı|çözülmedi|es geçmiş|atlamış|unutmuş|yapmayı unutmuş/)) return 'missing';
        if (text.match(/çözdü|yaptı|tamamladı|bitirdi|full|bitti|çözmüş|yapmış|yapıldı|çözüldü|tamamlandı|halletmiş|halletti|hepsini çözdü|bitirmiş/)) return 'done';
        if (text.match(/verdim|verildi|atadım|ödev ver|çözecek|yapacak/)) return 'assigned';
        if (text.match(/muaf|gerek yok|çözmesin|es geç|atla|pas geç|es geçebilir/)) return 'exempt';
        return null;
    };

    const extractNumbers = (str) => { const m = str.match(/\d+/g); return m ? m : []; };

    // 🎯 FUSE.JS İLE MAKSİMUM ESNEKLİK (Hata Toleransı Artırıldı)
    const findBestMatch = (items, key, textToSearch, threshold = 0.5) => { // Threshold 0.5'e çıkarıldı (Harf hatasını tolere etmesi için)
        if (!items || items.length === 0) return null;
        const transcriptNumbers = extractNumbers(textToSearch);
        const safeItems = items.map(item => ({ ...item, _safeSearchKey: getSafeText(item[key]).toLocaleLowerCase('tr-TR') }));
        
        // Uzaklığı (distance) ve konumu (ignoreLocation) esnek tutarak yazım yanlışlarını engeller
        const fuse = new Fuse(safeItems, { keys: ['_safeSearchKey'], threshold: threshold, distance: 100, includeScore: true, ignoreLocation: true });
        
        const words = textToSearch.replace(/[.,!?]/g, "").split(/\s+/).filter(w => w.length > 0);
        let bestMatch = null; let bestScore = 1;

        for (let i=0; i < words.length; i++) {
            // N-Grams: Kelimeleri 1'li, 2'li ve 3'lü öbekler halinde arar (Örn: "Bilgi", "Bilgi Sarmalı")
            const ngrams = [words[i]];
            if(i < words.length - 1) ngrams.push(words[i] + " " + words[i+1]);
            if(i < words.length - 2) ngrams.push(words[i] + " " + words[i+1] + " " + words[i+2]);
            
            for (const ngram of ngrams) {
                // Kısa kelimeleri es geç (örn: ve, ama, ile)
                if (ngram.length < 3) continue; 
                
                const results = fuse.search(ngram);
                for (const res of results) {
                    const itemNumbers = extractNumbers(res.item._safeSearchKey);
                    const hasMissingNumber = itemNumbers.some(num => !transcriptNumbers.includes(num));
                    if (hasMissingNumber) continue; // Sayı uyuşmazlığı varsa (Test 1 denirken Test 2'yi bulmasın)
                    if (res.score < bestScore) { bestScore = res.score; bestMatch = res.item; }
                }
            }
        }
        return bestMatch;
    };

    const analyzeCommand = (transcript) => {
        if (!transcript || transcript.trim() === "") return;
        
        setPendingAction(null);
        setPendingSources([]);

        // Rakamları ve argo kullanımları temizle
        let text = transcript.toLocaleLowerCase('tr-TR')
                   .replace(/birinci/g, '1').replace(/ikinci/g, '2').replace(/üçüncü/g, '3')
                   .replace(/\bbir\b/g, '1').replace(/\biki\b/g, '2').replace(/\b[uü]ç\b/g, '3')
                   .replace(/testi/g, 'test').replace(/testini/g, 'test'); // Sondan ekleme temizliği
        if (text.includes('vdd')) text += " video ders defteri";

        const status = determineStatus(text);
        
        // ÖĞRENCİ ARAMA (Daha Hassas Çoklu Arama)
        const allStudents = classes.flatMap(cls => (cls.students || []).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })));
        const safeItems = allStudents.map(item => ({ ...item, _safeSearchKey: getSafeText(item.name).toLocaleLowerCase('tr-TR') }));
        const fuse = new Fuse(safeItems, { keys: ['_safeSearchKey'], threshold: 0.4, includeScore: true, ignoreLocation: true });

        const words = text.replace(/[.,!?]/g, "").split(/\s+/).filter(w => w.length > 2); // 'Ali' gibi isimleri bulmak için sınır 2'ye düşürüldü
        let candidatesMap = new Map();

        words.forEach((w, i) => {
            const ngrams = [w];
            if (i < words.length - 1) ngrams.push(w + " " + words[i+1]);
            ngrams.forEach(ngram => {
                fuse.search(ngram).forEach(res => {
                    if (!candidatesMap.has(res.item.id) || candidatesMap.get(res.item.id).score > res.score) {
                        candidatesMap.set(res.item.id, res);
                    }
                });
            });
        });

        // Tolerans artırıldı: 0.4 altındaki her şey kabul edilir
        let matches = Array.from(candidatesMap.values()).filter(c => c.score < 0.4).sort((a,b) => a.score - b.score).map(c => c.item);

        if (matches.length === 0) {
            setFoundStudents([]); setSelectedStudent(null); setFoundTopics([]);
            setJarvisFeedback("Sistemde bu komutla eşleşen bir profil bulunamadı. Tekrar dener misiniz?"); return;
        }

        // Skor farkı çok büyükse (tam eşleşme varsa) diğerlerini filtrele
        if (matches.length > 1 && matches[0].score < 0.1 && matches[1].score > 0.3) {
            matches = [matches[0]];
        }

        if (matches.length > 1) {
            setFoundStudents(matches); setSelectedStudent(null); setFoundTopics([]);
            setPendingTranscript(text);
            setJarvisFeedback(`"${matches[0].name.split(' ')[0]}" isminde ${matches.length} kişi tespit ettim. Lütfen doğru profili aşağıdan seçin.`);
            return;
        }

        processStudentAction(matches[0], text, status);
    };

    const processStudentAction = (student, text, status) => {
        setFoundStudents([student]);
        setSelectedStudent(student);
        setPendingTranscript(null);

        const targetClass = classes.find(c => c.id === student.classId); 
        const topics = targetClass?.topics || []; 
        setFoundTopics(topics);

        // Hata toleransı (threshold) 0.5 yapıldı, ufak harf hatalarını görmezden gelir
        const bestTopic = findBestMatch(topics, 'title', text, 0.5);
        let bestCol = null;
        if (bestTopic) bestCol = findBestMatch(bestTopic.subColumns || [], 'title', text, 0.5);

        if (bestTopic && bestCol && status) {
            handleDraftGradeChange(student.id, bestCol.id, status);
            const statusLabels = { 'done': 'Yapıldı', 'missing': 'Eksik', 'assigned': 'Verildi', 'exempt': 'Muaf' };
            setJarvisFeedback(`Görev Onaylandı: ${getSafeText(student.name)} / ${getSafeText(bestTopic.title)} / ${getSafeText(bestCol.title)} -> [${statusLabels[status]}]`);
        } 
        else if (bestTopic && !bestCol && status) { 
            setPendingAction({ studentId: student.id, topicId: bestTopic.id, status: status });
            setPendingSources(bestTopic.subColumns || []);
            setJarvisFeedback(`"${getSafeText(bestTopic.title)}" konusu bulundu. Lütfen bu işlemi uygulamak istediğiniz KAYNAĞI panelden seçin.`); 
        } 
        else if (bestTopic && !bestCol) {
            setJarvisFeedback(`Konuyu buldum ancak hangi kaynak olduğunu veya öğrencinin ne yaptığını (çözdü/eksik) anlayamadım.`); 
        } 
        else if (!bestTopic) { 
            setJarvisFeedback(`${getSafeText(student.name)} profili hazır. Lütfen bir konu ve durum belirtin.`); 
        } 
        else if (bestTopic && bestCol && !status) { 
            setJarvisFeedback(`Görev bulundu. Ancak öğrencinin durumu (Yapıldı/Eksik vb.) anlaşılamadı.`); 
        }
    };

    const handleStudentSelect = (student) => {
        if (pendingTranscript) {
            const status = determineStatus(pendingTranscript);
            processStudentAction(student, pendingTranscript, status);
        } else {
            setSelectedStudent(student);
            setFoundStudents([student]);
            const targetClass = classes.find(c => c.id === student.classId); 
            setFoundTopics(targetClass?.topics || []);
            setJarvisFeedback(`${getSafeText(student.name)} profili aktive edildi.`);
        }
    };

    const handleManualSourceSelect = (col) => {
        if (!pendingAction) return;
        handleDraftGradeChange(pendingAction.studentId, col.id, pendingAction.status);
        const statusLabels = { 'done': 'Yapıldı', 'missing': 'Eksik', 'assigned': 'Verildi', 'exempt': 'Muaf' };
        setJarvisFeedback(`Kaynak Seçimi Başarılı: ${getSafeText(col.title)} -> [${statusLabels[pendingAction.status]}] olarak işaretlendi.`);
        setPendingAction(null);
        setPendingSources([]);
    };

    const handleManualSubmit = () => {
        if (!textCommand.trim()) return;
        setSpeechTranscript(textCommand); 
        analyzeCommand(textCommand);
        setTextCommand(""); 
    };

    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { setJarvisFeedback("⚠️ Tarayıcınız desteklemiyor. Lütfen manuel komut kullanın."); return; }
        if (isListening) { setIsListening(false); return; }
        const recognition = new SpeechRecognition(); recognition.lang = 'tr-TR'; recognition.continuous = false;
        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); setJarvisFeedback("Sizi dinliyorum, efendim..."); };
        recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; setSpeechTranscript(transcript); analyzeCommand(transcript); };
        recognition.onerror = (event) => { setIsListening(false); setJarvisFeedback("Sinyal alamadım. Manuel giriş yapabilirsiniz."); };
        recognition.onend = () => setIsListening(false); 
        recognition.start();
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
        setDraftGrades({}); setDraftNotes({}); setJarvisFeedback("Tüm güncellemeler ana veritabanına işlendi."); setTimeout(() => onClose(), 1500);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-4 font-sans">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 md:rounded-[2rem] w-full h-full md:h-auto md:max-h-[90vh] max-w-5xl overflow-hidden flex flex-col border-0 md:border border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.1)]">
                
                {/* 1. HOLOGRAFİK RADAR VE INPUT BÖLÜMÜ (Mobilde Kompakt) */}
                <div className="relative overflow-hidden bg-slate-950 border-b border-cyan-900/50 shrink-0 flex flex-col items-center justify-center pt-8 md:pt-10 pb-4 md:pb-6 px-4">
                    {/* Dönen Radarlar: Mobilde ekranın dışına taşmaması için boyutları ayarlandı */}
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} className="absolute w-40 h-40 md:w-64 md:h-64 border border-cyan-500/10 rounded-full border-t-cyan-400/30" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} className="absolute w-24 h-24 md:w-48 md:h-48 border border-cyan-500/10 rounded-full border-b-cyan-400/40" />
                    
                    <button onClick={onClose} className="absolute top-4 right-4 text-cyan-500/50 hover:text-cyan-400 transition-colors z-20"><X size={24}/></button>
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-cyan-500/40 text-[10px] font-mono tracking-widest z-20"><TerminalSquare size={14}/> SYSTEM J.A.R.V.I.S v4.0</div>

                    {/* Mobilde görünmeyen, PC'de görünen merkez ikon */}
                    <div className="z-10 bg-slate-900 p-3 md:p-4 rounded-full border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] mb-4 md:mb-6 hidden md:block">
                        <Activity size={32} className={`text-cyan-400 ${isListening ? 'animate-pulse' : ''}`} />
                    </div>

                    <div className="w-full max-w-2xl z-10 relative flex items-center mb-2 md:mb-4 mt-2 md:mt-0">
                        <div className="absolute left-4 text-cyan-500/50 pointer-events-none"><Keyboard size={18} /></div>
                        <input 
                            ref={inputRef} type="text" placeholder="Manuel komut girin..." 
                            className="w-full bg-slate-900/80 border border-cyan-800/50 text-cyan-100 rounded-xl pl-12 pr-24 py-3 md:py-4 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all placeholder:text-slate-600 font-medium"
                            value={textCommand} onChange={(e) => setTextCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} disabled={isListening}
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                            <button onClick={toggleListening} className={`p-2 md:p-2.5 rounded-lg transition-colors ${isListening ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'hover:bg-slate-800 text-slate-400 hover:text-cyan-400'}`} title="Sesli Komut"><Mic size={20} className={isListening ? 'animate-pulse' : ''} /></button>
                            <button onClick={handleManualSubmit} className="p-2 md:p-2.5 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 rounded-lg transition-colors" disabled={!textCommand.trim() || isListening}><Send size={20} /></button>
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
                        
                        {/* ETKİLEŞİMLİ KAYNAK SEÇİMİ (Awaiting Source) */}
                        <AnimatePresence>
                            {pendingSources.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-3 md:mt-4 flex flex-wrap justify-center gap-2 max-w-3xl px-2">
                                    {pendingSources.map(col => (
                                        <button key={col.id} onClick={() => handleManualSourceSelect(col)} className="px-3 py-1.5 md:px-4 md:py-2 bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 hover:border-cyan-400 text-cyan-100 text-[10px] md:text-xs font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                                            {getSafeText(col.title)}
                                        </button>
                                    ))}
                                    <button onClick={() => { setPendingAction(null); setPendingSources([]); setJarvisFeedback("Kaynak seçimi iptal edildi. Komut bekliyorum."); }} className="px-3 py-1.5 md:px-4 md:py-2 bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-200 text-[10px] md:text-xs font-bold rounded-lg transition-all">İptal</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                
                {/* 2. LİSTELER VE İÇERİK BÖLÜMÜ */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-950 min-h-[300px]">
                    
                    {/* Sol Panel: Hedef Profiller */}
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-cyan-900/30 overflow-y-auto p-4 flex flex-row md:flex-col gap-2 h-28 md:h-auto shrink-0 md:shrink custom-scrollbar">
                        <div className="hidden md:block text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-2 px-1 sticky top-0 bg-slate-950 z-10 py-1 border-b border-cyan-900/30">Hedef Profiller</div>
                        {foundStudents.map(student => {
                            const isSelected = selectedStudent?.id === student.id; 
                            return ( 
                                <button key={student.id} onClick={() => handleStudentSelect(student)} className={`text-left p-2 md:p-3 min-w-[140px] md:min-w-0 rounded-xl border transition-all flex items-center gap-2 md:gap-3 ${isSelected ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-transparent hover:bg-slate-900 hover:border-cyan-900/30'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>{getSafeText(student.name).charAt(0)}</div>
                                    <div className="flex flex-col overflow-hidden w-full">
                                        <span className={`font-bold text-[11px] md:text-sm truncate ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>{getSafeText(student.name)}</span>
                                        <span className={`text-[9px] md:text-[10px] font-mono truncate ${isSelected ? 'text-cyan-500/70' : 'text-slate-600'}`}>{getSafeText(student.className)}</span>
                                    </div>
                                    {pendingTranscript && !isSelected && <ChevronRight size={14} className="text-cyan-600 ml-auto animate-pulse shrink-0"/>}
                                </button> 
                            );
                        })}
                        {foundStudents.length === 0 && <div className="text-xs text-cyan-800/50 text-center py-4 md:py-8 flex w-full justify-center md:flex-col items-center gap-2 font-mono"><User size={20} className="opacity-50"/> Veri Yok</div>}
                    </div>
                    
                    {/* Sağ Panel: Ödevler */}
                    <div className="w-full md:w-2/3 overflow-y-auto p-3 md:p-6 relative h-full custom-scrollbar pb-24 md:pb-6">
                        {selectedStudent ? (
                            <div className="space-y-4 md:space-y-6">
                                <div className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-3 flex justify-between sticky top-0 bg-slate-950 z-10 py-1 border-b border-cyan-900/30">
                                    <span>Atanmış Görevler</span>
                                </div>
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
                                                    <div key={col.id} id={`col-${col.id}`} className={`flex flex-col gap-2 p-3 md:p-4 rounded-xl transition-all duration-500 ${isChanged ? 'bg-cyan-900/10 border border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'bg-slate-900 border border-slate-800'}`}>
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
                                                        <div className="relative mt-1">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><StickyNote size={12} className="text-slate-600"/></div>
                                                            <input type="text" placeholder="Not ekle..." className="w-full text-[10px] md:text-xs pl-8 md:pl-9 pr-3 py-2 md:py-2.5 bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-cyan-500/50 focus:shadow-[0_0_10px_rgba(34,211,238,0.1)] transition-all font-medium text-slate-300 placeholder:text-slate-700" value={displayNote} onChange={(e) => handleDraftNoteChange(selectedStudent.id, col.id, e.target.value)}/>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {reversedFoundTopics.length === 0 && <div className="text-xs text-slate-600 font-mono text-center py-6 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">Görev veritabanı boş.</div>}
                            </div>
                        ) : ( 
                            <div className="flex flex-col h-full items-center justify-center text-cyan-800/50 p-4 md:p-8 font-mono">
                                <Activity size={32} className="mb-3 opacity-50" />
                                <p className="text-xs md:text-sm">Awaiting Target Selection...</p>
                            </div> 
                        )}
                    </div>
                </div>
                
                {/* 3. ONAY VE KAYIT BÖLÜMÜ (Mobilde Sabit Alt Bar) */}
                <div className="p-3 md:p-4 border-t border-cyan-900/50 bg-slate-950 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0 z-20 absolute md:relative bottom-0 left-0 w-full">
                    <div className="text-[10px] md:text-xs font-mono hidden md:block w-auto text-left">
                        {Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0 ? ( 
                            <span className="text-cyan-400 flex items-center gap-1.5 animate-pulse"><AlertTriangle size={14}/> Senkronizasyon bekleniyor</span> 
                        ) : ( <span className="text-slate-600">Değişiklik yok</span> )}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={onClose} className="px-4 md:px-6 py-2 md:py-2.5 font-bold text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors text-xs md:text-sm">İptal</button>
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
