import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Calendar, StickyNote, AlertTriangle, Save, User, CheckCircle2, Keyboard, Send, ChevronRight, HelpCircle } from 'lucide-react';
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

// Beyaz ferah tema için hafif ve şık durum stilleri
const lightStatusStyles = {
    'done': 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold',
    'missing': 'bg-rose-50 border-rose-200 text-rose-600 font-bold',
    'assigned': 'bg-amber-50 border-amber-200 text-amber-600 font-bold',
    'exempt': 'bg-slate-50 border-slate-200 text-slate-500 font-bold'
};

const AssistantModal = ({ classes, updateClassInDb, onClose, initialStudent }) => {
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [textCommand, setTextCommand] = useState("");
    
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem hazır. Komutunuzu dinliyorum.");
    
    const [foundStudents, setFoundStudents] = useState(initialStudent ? [initialStudent] : []);
    const [selectedStudent, setSelectedStudent] = useState(initialStudent || null);
    const [foundTopics, setFoundTopics] = useState([]);
    
    // Eksik bilgileri sormak için etkileşimli state'ler
    const [pendingAction, setPendingAction] = useState(null); // { studentId, topicId, status, isAll }
    const [pendingSources, setPendingSources] = useState([]); 
    const [pendingStatusSelect, setPendingStatusSelect] = useState(null); // { studentId, topicId, colId }
    
    const [draftGrades, setDraftGrades] = useState({});
    
    const recognitionRef = useRef(null);
    const inputRef = useRef(null);

    const sortedFoundTopics = Array.isArray(foundTopics) ? [...foundTopics].filter(Boolean).reverse() : [];

    // Başlangıç Ayarları ve Otomatik Dinleme Aktivasyonu
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        
        if (initialStudent) {
            const safeClasses = Array.isArray(classes) ? classes.filter(Boolean) : [];
            const targetClass = safeClasses.find(c => c.id === initialStudent.classId);
            setFoundTopics(targetClass?.topics || []);
            setJarvisFeedback(`Aktif Profil: ${initialStudent.name}.`);
        }

        // 🎙️ MİKROFONA BASAR BASMAZ OTOMATİK DİNLEME MODUNDA AÇILMA
        const autoStartTimer = setTimeout(() => {
            startListening();
        }, 400);

        return () => { 
            clearTimeout(autoStartTimer);
            document.body.style.overflow = ''; 
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, [initialStudent, classes]);

    // 🧠 Gelişmiş Yerel Kural ve Doğal Dil İşleme Motoru
    const analyzeCommandLocal = (transcript) => {
        let text = transcript.toLocaleLowerCase('tr-TR').trim();
        setPendingAction(null);
        setPendingSources([]);
        setPendingStatusSelect(null);
        
        // 1. Kaydet / Kapat Direktifleri
        if (text.match(/kaydet|onayla|sisteme işle/)) {
            applyChanges();
            return;
        }
        if (text === 'kapat' || text === 'çık') {
            onClose();
            return;
        }

        // 2. Özel Sözlük Temizliği ve Ortak Kısaltmalar
        text = text.replace(/birinci/g, '1').replace(/ikinci/g, '2').replace(/üçüncü/g, '3')
                   .replace(/\bbir\b/g, '1').replace(/\biki\b/g, '2').replace(/\b[uü]ç\b/g, '3')
                   .replace(/testi/g, 'test').replace(/testini/g, 'test');
        
        if (text.includes('vdd') || text.includes('video ders')) {
            text += " vdd video ders defteri";
        }
        if (text.includes('sb') || text.includes('soru bankası')) {
            text += " sb soru bankası";
        }

        // 3. Durum (Status) Haritalaması
        let status = null;
        if (text.match(/çözmemiş|yapmamış|yapmadı|eksik|boş|yok|çözmüyor|yapılmadı|çözülmedi|hiçbiri/)) status = 'missing';
        else if (text.match(/çözdü|yaptı|tamamladı|bitirdi|full|bitti|çözmüş|yapmış|yapıldı|çözüldü|tamamlandı|yapıyoruz/)) status = 'done';
        else if (text.match(/verdim|verildi|atadım|ödev ver|çözecek|yapacak/)) status = 'assigned';
        else if (text.match(/muaf|gerek yok|çözmesin|pas geç/)) status = 'exempt';

        // 🌟 "TÜMÜ / TAMAMI / HEPSİ" YAPILARI TESPİTİ
        const isAllSources = text.match(/tümünü|tamamını|hepsini|bütün kaynaklar|tümü|tamamı|hepsi/);

        // 4. Fuse.js Akıllı Yerel Eşleştirme Çekirdeği
        const safeClasses = Array.isArray(classes) ? classes.filter(c => c && typeof c === 'object') : [];
        const allStudents = safeClasses.flatMap(cls => 
            Array.isArray(cls.students) ? cls.students.filter(std => std && std.name).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })) : []
        );

        const fuseStudents = new Fuse(allStudents, { keys: ['name'], threshold: 0.45, ignoreLocation: true });
        const studentSearch = fuseStudents.search(text);
        
        let bestStudent = studentSearch.length > 0 ? studentSearch[0].item : null;

        // Çoklu İsim (Merve) Çakışma Yönetimi
        if (bestStudent) {
            const firstName = bestStudent.name.split(' ')[0];
            const identicalMatches = studentSearch.filter(r => r.item.name.toLowerCase().includes(firstName.toLowerCase())).map(r => r.item);
            const isExactFullMentioned = identicalMatches.some(m => text.includes(m.name.toLowerCase()));
            
            if (identicalMatches.length > 1 && !isExactFullMentioned) {
                setFoundStudents(identicalMatches);
                setSelectedStudent(null);
                setFoundTopics([]);
                setJarvisFeedback(`"${firstName}" adında birden fazla öğrenci var, lütfen listeden seçin.`);
                return;
            } else if (isExactFullMentioned) {
                bestStudent = identicalMatches.find(m => text.includes(m.name.toLowerCase())) || bestStudent;
            }
        }

        // Açık olan sayfadaki öğrenci bağlamını koruma
        if (!bestStudent && selectedStudent) {
            bestStudent = selectedStudent;
        }

        if (!bestStudent) {
            setJarvisFeedback("Öğrenci ismi anlaşılamadı. Lütfen tekrar deneyin.");
            return;
        }

        setFoundStudents([bestStudent]);
        setSelectedStudent(bestStudent);
        const targetClass = safeClasses.find(c => c.id === bestStudent.classId); 
        const topics = targetClass?.topics || []; 
        setFoundTopics(topics);

        // Konu ve Kaynak Eşleştirme
        const fuseTopics = new Fuse(topics, { keys: ['title'], threshold: 0.5, ignoreLocation: true });
        const topicSearch = fuseTopics.search(text);
        const bestTopic = topicSearch.length > 0 ? topicSearch[0].item : null;

        if (!bestTopic) {
            setJarvisFeedback(`${bestStudent.name} seçildi. Lütfen ödev konusunu belirtin.`);
            return;
        }

        // Aksiyon Karar Ağacı
        if (isAllSources && status) {
            // "Tüm kaynaklar yapıldı/eksik" senaryosu
            (bestTopic.subColumns || []).forEach(col => {
                handleDraftGradeChange(bestStudent.id, col.id, status);
            });
            setJarvisFeedback(`İşlem Başarılı: ${bestTopic.title} konusundaki tüm kaynaklar işaretlendi.`);
        } else if (status) {
            // Belirli bir kaynak arama senaryosu
            const fuseCols = new Fuse(bestTopic.subColumns || [], { keys: ['title'], threshold: 0.5, ignoreLocation: true });
            const colSearch = fuseCols.search(text);
            const bestCol = colSearch.length > 0 ? colSearch[0].item : null;

            if (bestCol) {
                handleDraftGradeChange(bestStudent.id, bestCol.id, status);
                setJarvisFeedback(`Onaylandı: ${bestTopic.title} -> ${bestCol.title} durum güncellendi.`);
            } else {
                // 🌟 UFAK ALT SORU PANELİ TETİKLEME: Kaynak bulunamadıysa alt kısımda sor
                setPendingAction({ studentId: bestStudent.id, topicId: bestTopic.id, status: status, isAll: false });
                setPendingSources(bestTopic.subColumns || []);
                setJarvisFeedback(`"${bestTopic.title}" konusu anlaşıldı. Lütfen hangi kaynak olduğunu alttan seçin.`);
            }
        } else {
            // Kaynak veya konu var ama Yapıldı/Eksik durumu söylenmediyse durum butonlarını altta aç
            const fuseCols = new Fuse(bestTopic.subColumns || [], { keys: ['title'], threshold: 0.5, ignoreLocation: true });
            const colSearch = fuseCols.search(text);
            const bestCol = colSearch.length > 0 ? colSearch[0].item : (bestTopic.subColumns?.[0] || null);

            if (bestCol) {
                setPendingStatusSelect({ studentId: bestStudent.id, topicId: bestTopic.id, colId: bestCol.id, colTitle: bestCol.title });
                setJarvisFeedback(`"${bestTopic.title} -> ${bestCol.title}" için uygulanacak durumu alttan seçin.`);
            } else {
                setJarvisFeedback(`"${bestTopic.title}" konusu seçildi. Lütfen yapılacak işlemi veya durumu belirtin.`);
            }
        }
    };

    const handleCommand = (transcript) => {
        if (!transcript.trim()) return;
        setSpeechTranscript(transcript);
        analyzeCommandLocal(transcript);
    };

    // 🎙️ PUSH TO TALK DİNLEME MANTIĞI
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { setJarvisFeedback("Ses modülü tarayıcınızda aktif değil."); return; }
        if (recognitionRef.current) recognitionRef.current.abort();
        
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'tr-TR';
        recognition.continuous = false;

        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); setJarvisFeedback("Dinliyorum..."); };
        recognition.onresult = (event) => { 
            const transcript = event.results[0][0].transcript; 
            handleCommand(transcript); 
        };
        recognition.onerror = () => { setIsListening(false); };
        recognition.onend = () => { setIsListening(false); }; 
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) { recognitionRef.current.abort(); setIsListening(false); }
    };

    const handleManualSubmit = () => {
        if (!textCommand.trim()) return;
        handleCommand(textCommand);
        setTextCommand(""); 
    };

    const handleDraftGradeChange = (studentId, colId, statusId) => { 
        setDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } })); 
    };

    const applyChanges = () => {
        if (!selectedStudent) { onClose(); return; }
        const safeClasses = Array.isArray(classes) ? classes.filter(Boolean) : [];
        const targetClass = safeClasses.find(c => c.id === selectedStudent.classId); 
        if (!targetClass) return;
        
        const updatedStudents = Array.isArray(targetClass.students) ? targetClass.students.filter(Boolean).map(s => {
            if (s.id === selectedStudent.id) {
                return { ...s, grades: { ...(s.grades || {}), ...(draftGrades[s.id] || {}) } };
            } 
            return s;
        }) : [];
        
        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); 
        onClose(); 
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            {/* 💎 UYGULAMAYA UYGUN ULTRA FERAH BEYAZ PREMIUM TASARIM */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 15 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.96, y: 15 }} 
                className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-float flex flex-col max-h-[85vh]"
            >
                
                {/* ÜST BÖLÜM: RADAR VE GİRİŞ ALANI */}
                <div className="relative overflow-hidden bg-slate-50/70 border-b border-slate-100 p-6 flex flex-col items-center justify-center shrink-0">
                    <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors z-30"><X size={20}/></button>
                    <div className="absolute top-5 left-6 flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-widest z-20"><TerminalSquare size={13}/> AKILLI İŞLEM ASİSTANI</div>
                    
                    {/* BÜYÜK MODERM SES DALGASI BUTONU */}
                    <div onClick={isListening ? stopListening : startListening} className="z-10 bg-white p-5 rounded-full border border-slate-200 shadow-sm mb-4 cursor-pointer relative hover:scale-102 active:scale-98 transition-all group mt-3">
                        {isListening && <span className="absolute inset-0 rounded-full bg-brandPurple/10 animate-ping"></span>}
                        <Mic size={30} className={isListening ? 'text-brandPurple animate-pulse' : 'text-slate-400 group-hover:text-brandPurple transition-colors'} />
                    </div>

                    <div className="w-full max-w-xl z-10 relative flex items-center mb-3">
                        <div className="absolute left-4 text-slate-400 pointer-events-none"><Keyboard size={16} /></div>
                        <input 
                            ref={inputRef} type="text" placeholder="Komut yazın veya seslendirin (Örn: Logaritma tümü yapıldı)..." 
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-24 py-3.5 text-sm focus:outline-none focus:border-brandPurple focus:ring-2 focus:ring-purple-100 shadow-sm transition-all font-bold text-slate-700 placeholder:text-slate-400"
                            value={textCommand} onChange={(e) => setTextCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} disabled={isListening}
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                            <button onClick={isListening ? stopListening : startListening} className={`p-2 rounded-xl transition-all ${isListening ? 'bg-purple-50 text-brandPurple' : 'text-slate-400 hover:bg-slate-100 hover:text-brandPurple'}`}><Mic size={16} /></button>
                            <button onClick={handleManualSubmit} className="p-2 bg-brandPurple hover:bg-purple-700 text-white rounded-xl transition-all shadow-sm" disabled={!textCommand.trim() || isListening}><Send size={16} /></button>
                        </div>
                    </div>

                    {/* DİNAMİK FEEDBACK ALANI */}
                    <div className="z-10 text-center w-full px-4 min-h-[24px] flex flex-col justify-center items-center">
                        {speechTranscript && <p className="text-[11px] text-slate-400 italic mb-1">"{speechTranscript}"</p>}
                        <div className="flex items-center gap-1.5 justify-center font-bold text-slate-700 text-sm">
                            <span className="text-brandPurple font-black">&gt;</span> {jarvisFeedback}
                        </div>

                        {/* 🌟 UFAK ALT PANEL: KAYNAK SEÇTİRME KAPSÜLLERİ */}
                        <AnimatePresence>
                            {pendingSources.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full overflow-x-auto p-1 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 px-2"><HelpCircle size={12}/> Hangi Kaynak:</span>
                                    {pendingSources.map(col => (
                                        <button key={col.id} onClick={() => handleManualSourceSelect(col)} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg hover:border-brandPurple hover:bg-purple-50 hover:text-brandPurple transition-all">
                                            {getSafeText(col?.title)}
                                        </button>
                                    ))}
                                    <button onClick={() => { setPendingAction(null); setPendingSources([]); setJarvisFeedback("İşlem iptal edildi."); }} className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg">İptal</button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 🌟 UFAK ALT PANEL: DURUM (STATUS) SEÇTİRME KAPSÜLLERİ */}
                        <AnimatePresence>
                            {pendingStatusSelect && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase px-2">Durum Seçin:</span>
                                    {STATUS_OPTIONS.map(opt => (
                                        <button key={opt.id} onClick={() => { handleDraftGradeChange(pendingStatusSelect.studentId, pendingStatusSelect.colId, opt.id); setJarvisFeedback("Durum başarıyla güncellendi."); setPendingStatusSelect(null); }} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1">
                                            <opt.icon size={12} className={opt.color} /> {opt.label}
                                        </button>
                                    ))}
                                    <button onClick={() => setPendingStatusSelect(null)} className="text-[10px] font-bold text-slate-400 px-2 py-1 hover:bg-slate-50 rounded-lg">İptal</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ORTA BÖLÜM: ÖDEV MATRİS TAKİP LİSTESİ */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40 min-h-0 custom-scrollbar">
                    
                    {/* ÇOKLU MERVE DURUMU TETİKLENİRSE */}
                    {foundStudents.length > 1 && !selectedStudent && (
                        <div className="space-y-2 animate-scale-in">
                            <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-1">Eşleşen Öğrenci Kayıtları</h4>
                            {foundStudents.map(student => (
                                <button key={student.id} onClick={() => { setSelectedStudent(student); setFoundTopics((classes || []).find(c=>c.id===student.classId)?.topics || []); setFoundStudents([student]); setJarvisFeedback(`${student.name} seçildi. Görev bekleniyor.`); }} className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-brandPurple hover:bg-purple-50/20 transition-all flex items-center gap-3.5 group shadow-sm">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${student.isVip ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}>{getSafeText(student.name).charAt(0)}</div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 group-hover:text-brandPurple transition-all">{getSafeText(student.name)}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{student.isVip ? 'VIP ÖZEL DERS' : getSafeText(student.className)}</span>
                                    </div>
                                    <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-brandPurple transition-transform group-hover:translate-x-1" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* TEK ÖĞRENCİ SEÇİLİ DURUMDA MATRİS AKIŞI */}
                    {selectedStudent && foundStudents.length === 1 && (
                        <>
                            <div className="flex items-center gap-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm animate-scale-in">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${selectedStudent.isVip ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' : 'bg-purple-50 text-brandPurple border-purple-200 shadow-sm'}`}>{getSafeText(selectedStudent?.name).charAt(0)}</div>
                                <div className="flex flex-col"><span className="text-base font-black text-slate-800">{getSafeText(selectedStudent?.name)}</span><span className="text-[10px] font-black uppercase text-slate-400 mt-0.5 tracking-wider">{selectedStudent.isVip ? 'VIP ÖZEL DERS PORTALI' : getSafeText(selectedStudent?.className)}</span></div>
                            </div>
                            
                            <div className="space-y-4 pb-6">
                                {sortedFoundTopics.map(topic => (
                                    <div key={topic.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                        <h4 className="font-black text-slate-700 text-xs mb-3.5 border-b border-slate-100 pb-2.5 flex items-center gap-2"><div className={`w-1.5 h-3.5 rounded-full ${selectedStudent.isVip ? 'bg-amber-400' : 'bg-brandPurple'}`}></div>{getSafeText(topic?.title)}</h4>
                                        <div className="space-y-2.5">
                                            {(topic.subColumns || []).filter(Boolean).map(col => {
                                                const targetClass = (classes || []).find(c => c && c.id === selectedStudent.classId);
                                                const studentData = targetClass?.students?.find(s => s && s.id === selectedStudent.id);
                                                const displayGrade = draftGrades[selectedStudent.id]?.[col.id] !== undefined ? draftGrades[selectedStudent.id]?.[col.id] : (studentData?.grades?.[col.id] || 'assigned');
                                                const isChanged = draftGrades[selectedStudent.id]?.[col.id] !== undefined;

                                                return (
                                                    <div key={col.id} className={`p-3 rounded-xl bg-slate-50/50 border transition-all ${isChanged ? 'border-purple-400 bg-purple-50/10 shadow-sm' : 'border-slate-100'} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                                                        <span className="text-xs font-bold text-slate-600 flex-1">{getSafeText(col?.title)}</span>
                                                        <div className="flex gap-1 overflow-x-auto">
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button key={opt.id} onClick={() => handleDraftGradeChange(selectedStudent.id, col.id, opt.id)} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${displayGrade === opt.id ? lightStatusStyles[opt.id] : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'}`}>
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
                        <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 font-mono py-12"><TerminalSquare size={40} className="mb-3 opacity-30 animate-pulse"/><p className="text-xs font-bold">Komut Girişi veya Ses Bekleniyor...</p></div>
                    )}
                </div>

                {/* ALT KISIM: KAYIT PANELİ */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center gap-4 shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wide ml-1">{Object.keys(draftGrades).length} Adet Değişiklik Listede Sıralandı</span>
                    <div className="flex gap-2">
                        <button onClick={() => { stopListening(); onClose(); }} className="px-5 py-2.5 text-xs font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">İptal</button>
                        <button onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${Object.keys(draftGrades).length > 0 ? 'bg-brandPurple text-white shadow-glow hover:bg-purple-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Save size={14} className="inline mr-1" /> DEĞİŞİKLİKLERİ KAYDET</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
