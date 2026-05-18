import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, RefreshCw, Save, User, CheckCircle2, TerminalSquare, ChevronRight, HelpCircle } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import Fuse from 'fuse.js';

// 🛡️ ÇÖKME ENGELLEYİCİ GÜVENLİK KALKANI
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

const lightStatusStyles = {
    'done': 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold shadow-sm',
    'missing': 'bg-rose-50 border-rose-200 text-rose-600 font-bold shadow-sm',
    'assigned': 'bg-amber-50 border-amber-200 text-amber-600 font-bold shadow-sm',
    'exempt': 'bg-slate-50 border-slate-200 text-slate-500 font-bold shadow-sm'
};

const AssistantModal = ({ classes, updateClassInDb, onClose, initialStudent }) => {
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem aktif. Komutunuzu bekliyorum efendim.");
    
    const [foundStudents, setFoundStudents] = useState(initialStudent ? [initialStudent] : []);
    const [selectedStudent, setSelectedStudent] = useState(initialStudent || null);
    const [foundTopics, setFoundTopics] = useState([]);
    
    const [pendingAction, setPendingAction] = useState(null); 
    const [pendingSources, setPendingSources] = useState([]); 
    const [pendingStatusSelect, setPendingStatusSelect] = useState(null); 
    
    const [draftGrades, setDraftGrades] = useState({});
    const recognitionRef = useRef(null);

    const sortedFoundTopics = Array.isArray(foundTopics) ? [...foundTopics].filter(Boolean).reverse() : [];

    // Başlangıç Ayarları ve Otomatik Dinleme Aktivasyonu
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        
        if (initialStudent) {
            const safeClasses = Array.isArray(classes) ? classes.filter(Boolean) : [];
            const targetClass = safeClasses.find(c => c.id === initialStudent.classId);
            setFoundTopics(targetClass?.topics || []);
            setJarvisFeedback(`${initialStudent.name} profili kilitlendi. Ödev durumunu söyleyebilirsiniz.`);
        }

        const autoStartTimer = setTimeout(() => {
            startListening();
        }, 300);

        return () => { 
            clearTimeout(autoStartTimer);
            document.body.style.overflow = ''; 
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, [initialStudent, classes]);

    // Öğrenci Sıfırlama ve Yeniden Arama Sekmesi Aktivasyonu
    const handleResetStudent = () => {
        setSelectedStudent(null);
        setFoundStudents([]);
        setFoundTopics([]);
        setPendingAction(null);
        setPendingSources([]);
        setPendingStatusSelect(null);
        setJarvisFeedback("Öğrenci bağlamı sıfırlandı. Yeni bir isim söyleyebilirsiniz.");
        setTimeout(() => startListening(), 350);
    };

    // 🧠 GELİŞMİŞ YEREL SÖZLÜK VE KELİME EŞLEŞTİRME MOTORU
    const findBestComponentLocal = (items, targetProperty, inputTranscript) => {
        if (!items || items.length === 0 || !inputTranscript) return null;
        let text = inputTranscript.toLocaleLowerCase('tr-TR');
        
        let bestItem = null;
        let highestScore = 0;
        
        items.forEach(item => {
            let targetText = getSafeText(item[targetProperty]).toLocaleLowerCase('tr-TR');
            
            if (text.includes(targetText) || targetText.includes(text)) {
                highestScore = 100;
                bestItem = item;
                return;
            }
            
            if (targetText.includes("video ders defteri") && (text.includes("vdd") || text.includes("video ders") || text.includes("ve de") || text.includes("ve d") || text.includes("bide"))) {
                highestScore = 98;
                bestItem = item;
                return;
            }
            if (targetText.includes("soru bankası") && (text.includes("sb") || text.includes("soru banka") || text.includes("se be"))) {
                highestScore = 98;
                bestItem = item;
                return;
            }
            
            let targetTokens = targetText.split(/\s+/).filter(t => t.length > 1);
            let matchedTokens = targetTokens.filter(token => {
                let strippedToken = token.replace(/ı|i|u|ü|a|e|ın|in|un|ün$/g, "");
                return text.includes(token) || text.includes(strippedToken);
            });
            
            let tokenScore = (matchedTokens.length / targetTokens.length) * 85;
            if (tokenScore > highestScore && tokenScore >= 35) {
                highestScore = tokenScore;
                bestItem = item;
            }
        });
        
        if (highestScore < 50) {
            const fuse = new Fuse(items, { keys: [targetProperty], threshold: 0.55, ignoreLocation: true });
            const results = fuse.search(text);
            if (results.length > 0) bestItem = results[0].item;
        }
        
        return bestItem;
    };

    // 🔬 AKILLI YEREL GÖREV ÇEKİRDEĞİ
    const analyzeCommandLocal = (transcript, isFinalFallback = true) => {
        let text = transcript.toLocaleLowerCase('tr-TR').trim();
        
        if (isFinalFallback) {
            setPendingAction(null);
            setPendingSources([]);
            setPendingStatusSelect(null);
        }
        
        if (text.match(/kaydet|onayla|sisteme işle/)) { applyChanges(); return true; }
        if (text === 'kapat' || text === 'çık') { onClose(); return true; }
        if (text.match(/öğrenci değiştir|yeni öğrenci|öğrenci ara/)) { handleResetStudent(); return true; }

        text = text.replace(/birinci/g, '1').replace(/ikinci/g, '2').replace(/üçüncü/g, '3')
                   .replace(/\bbir\b/g, '1').replace(/\biki\b/g, '2').replace(/\b[uü]ç\b/g, '3');

        let status = null;
        if (text.match(/çözmemiş|yapmamış|yapmadı|eksik|boş|yok|çözmüyor|yapılmadı|çözülmedi/)) status = 'missing';
        else if (text.match(/çözdü|yaptı|tamamladı|bitirdi|full|bitti|çözmüş|yapmış|yapıldı|çözüldü|yapıyoruz/)) status = 'done';
        else if (text.match(/verdim|verildi|atadım|ödev ver/)) status = 'assigned';
        else if (text.match(/muaf|gerek yok|pas geç/)) status = 'exempt';

        const isAllSources = text.match(/tümünü|tamamını|hepsini|bütün kaynaklar|tümü|tamamı|hepsi/);
        const isNoneSources = text.match(/hiçbiri|hiçbirini/);

        const safeClasses = Array.isArray(classes) ? classes.filter(c => c && typeof c === 'object') : [];
        const allStudents = safeClasses.flatMap(cls => 
            Array.isArray(cls.students) ? cls.students.filter(std => std && std.name).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })) : []
        );

        // 🔥 Gelişmiş Öğrenci Arama ve Akıllı Filtreleme Hiyerarşisi (Merve Gündüz / İrem Atış Karar Mekanizması)
        let matchedStudentsList = [];
        const fuseStudents = new Fuse(allStudents, { keys: ['name'], threshold: 0.4, includeScore: true, ignoreLocation: true });
        const searchRes = fuseStudents.search(text);
        
        if (searchRes.length > 0) {
            const bestScore = searchRes[0].score;
            
            // Eğer tam ad + soyad girildiyse (Skor kusursuzdur < 0.15)
            if (bestScore < 0.15) {
                const bestNameStr = searchRes[0].item.name.toLowerCase();
                // Sadece o tam ad soyada sahip olanları havuzda tut (İrem Atış ise 2 kişi kalır, Merve Gündüz ise tek kişi)
                matchedStudentsList = allStudents.filter(s => s.name.toLowerCase() === bestNameStr);
            } else {
                // Sadece ilk isim söylendiyse ("Merve") yakın skorluların hepsini listele
                matchedStudentsList = searchRes.filter(r => r.score <= bestScore + 0.12).map(r => r.item);
            }
        }

        let bestStudent = null;
        if (matchedStudentsList.length === 1) {
            bestStudent = matchedStudentsList[0];
        } else if (matchedStudentsList.length > 1 && isFinalFallback) {
            // İki adet "İrem Atış" veya genel "Merve" durumu varsa listeyi ekrana dök
            setFoundStudents(matchedStudentsList);
            setSelectedStudent(null);
            setFoundTopics([]);
            setJarvisFeedback(`Eşleşen ${matchedStudentsList.length} öğrenci bulundu. Lütfen aşağıdan hedefi seçin.`);
            return false;
        }

        if (!bestStudent && selectedStudent) bestStudent = selectedStudent;
        if (!bestStudent) return false;

        if (isFinalFallback) {
            setFoundStudents([bestStudent]);
            setSelectedStudent(bestStudent);
        }

        const targetClass = safeClasses.find(c => c.id === bestStudent.classId); 
        const topics = targetClass?.topics || []; 
        
        if (isFinalFallback) setFoundTopics(topics);

        const bestTopic = findBestComponentLocal(topics, 'title', text);
        if (!bestTopic) {
            if (isFinalFallback) setJarvisFeedback(`${bestStudent.name} seçildi. Ödev konusunu söyleyebilirsiniz.`);
            return false;
        }

        if ((isAllSources || isNoneSources) && (status || isNoneSources)) {
            let targetStatus = isNoneSources ? 'missing' : status;
            if (isFinalFallback) {
                (bestTopic.subColumns || []).forEach(col => {
                    handleDraftGradeChange(bestStudent.id, col.id, targetStatus);
                });
                setJarvisFeedback(`Toplu İşlem Başarılı: ${bestTopic.title} altındaki tüm kaynaklar güncellendi.`);
            }
            return true;
        } 
        
        if (status) {
            const bestCol = findBestComponentLocal(bestTopic.subColumns || [], 'title', text);
            if (bestCol) {
                if (isFinalFallback) {
                    handleDraftGradeChange(bestStudent.id, bestCol.id, status);
                    setJarvisFeedback(`Onaylandı: ${bestTopic.title} -> ${bestCol.title} güncellendi.`);
                }
                return true;
            } else if (isFinalFallback) {
                setPendingAction({ studentId: bestStudent.id, topicId: bestTopic.id, status: status });
                setPendingSources(bestTopic.subColumns || []);
                setJarvisFeedback(`"${bestTopic.title}" konusu anlaşıldı. Uygulanacak kaynağı alttan seçin.`);
            }
            return false;
        }

        const bestCol = findBestComponentLocal(bestTopic.subColumns || [], 'title', text) || bestTopic.subColumns?.[0];
        if (bestCol && isFinalFallback) {
            setPendingStatusSelect({ studentId: bestStudent.id, topicId: bestTopic.id, colId: bestCol.id, colTitle: bestCol.title });
            setJarvisFeedback(`"${bestTopic.title} -> ${bestCol.title}" için durumu alttan seçin.`);
            return true;
        }

        return false;
    };

    const handleCommandAlternatives = (alternatives) => {
        for (const transcript of alternatives) {
            let hasProcessed = analyzeCommandLocal(transcript, false);
            if (hasProcessed) {
                setSpeechTranscript(transcript);
                analyzeCommandLocal(transcript, true);
                return;
            }
        }
        setSpeechTranscript(alternatives[0]);
        analyzeCommandLocal(alternatives[0], true);
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { setJarvisFeedback("Ses modülü aktif değil."); return; }
        if (recognitionRef.current) recognitionRef.current.abort();
        
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.maxAlternatives = 3; 

        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); setJarvisFeedback("Dinliyorum..."); };
        recognition.onresult = (event) => { 
            const alternatives = Array.from(event.results[0]).map(r => r.transcript);
            handleCommandAlternatives(alternatives);
        };
        recognition.onerror = () => { setIsListening(false); };
        recognition.onend = () => { setIsListening(false); }; 
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) { recognitionRef.current.abort(); setIsListening(false); }
    };

    const handleManualSourceSelect = (col) => {
        if (!pendingAction) return;
        handleDraftGradeChange(pendingAction.studentId, col.id, pendingAction.status);
        setJarvisFeedback("Kaynak manuel onaylandı.");
        setPendingAction(null);
        setPendingSources([]);
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
            <motion.div 
                initial={{ opacity: 0, scale: 0.97, y: 12 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.97, y: 12 }} 
                className="bg-white border border-slate-200 rounded-[2.2rem] w-full max-w-2xl overflow-hidden shadow-float flex flex-col max-h-[85vh]"
            >
                {/* ÜST RADAR VE KONTROL ALANI */}
                <div className="relative overflow-hidden bg-slate-50/70 border-b border-slate-100 p-6 flex flex-col items-center justify-center shrink-0">
                    <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors z-30"><X size={20}/></button>
                    <div className="absolute top-5 left-6 flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-widest z-20"><TerminalSquare size={13}/> AKILLI İŞLEM ASİSTANI</div>
                    
                    {/* BEYAZ PREMIUM MIC RADAR */}
                    <div onClick={isListening ? stopListening : startListening} className="z-10 bg-white p-5 rounded-full border border-slate-200 shadow-sm mb-4 cursor-pointer relative hover:scale-102 active:scale-98 transition-all group mt-3">
                        {isListening && <span className="absolute inset-0 rounded-full bg-brandPurple/10 animate-ping"></span>}
                        <Mic size={28} className={isListening ? 'text-brandPurple animate-pulse' : 'text-slate-400 group-hover:text-brandPurple transition-colors'} />
                    </div>

                    {/* 🔥 Gelişmiş Öğrenci Bağlam / Değiştirme Sekmesi */}
                    <div className="w-full max-w-xl z-10 flex gap-2">
                        <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${selectedStudent ? 'bg-emerald-500' : 'bg-amber-400'} animate-pulse`}></div>
                                <span className="text-slate-400 font-medium">Aktif Bağlam:</span>
                                <span className="text-brandPurple font-black text-base">{selectedStudent ? selectedStudent.name : "Aranıyor..."}</span>
                            </div>
                            {selectedStudent && (
                                <button 
                                    onClick={handleResetStudent}
                                    className="flex items-center gap-1 text-[11px] font-black bg-purple-50 text-brandPurple border border-purple-100 px-3 py-2 rounded-xl hover:bg-brandPurple hover:text-white transition-all shadow-sm"
                                >
                                    <RefreshCw size={12}/> 🔄 ÖĞRENCİ DEĞİŞTİR / ARA
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DİNAMİK FEEDBACK ALANI */}
                    <div className="z-10 text-center w-full px-4 min-h-[24px] flex flex-col justify-center items-center mt-3">
                        {speechTranscript && <p className="text-[11px] text-slate-400 font-medium italic mb-1">"{speechTranscript}"</p>}
                        <div className="flex items-center gap-1.5 justify-center font-black text-slate-700 text-sm">
                            <span className="text-brandPurple font-black">&gt;</span> {jarvisFeedback}
                        </div>

                        {/* DİNAMİK PANEL: HANGİ KAYNAK EKSİK? */}
                        <AnimatePresence>
                            {pendingSources.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full overflow-x-auto p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 px-2"><HelpCircle size={12}/> Hangi Kaynak:</span>
                                    {pendingSources.map(col => (
                                        <button key={col.id} onClick={() => handleManualSourceSelect(col)} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg hover:border-brandPurple hover:bg-purple-50 hover:text-brandPurple transition-all">
                                            {getSafeText(col?.title)}
                                        </button>
                                    ))}
                                    <button onClick={() => { setPendingAction(null); setPendingSources([]); setJarvisFeedback("İptal edildi."); }} className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg">İptal</button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* DİNAMİK PANEL: HANGİ DURUM UYGULANSIN? */}
                        <AnimatePresence>
                            {pendingStatusSelect && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase px-2">Durum Belirtin:</span>
                                    {STATUS_OPTIONS.map(opt => (
                                        <button key={opt.id} onClick={() => { handleDraftGradeChange(pendingStatusSelect.studentId, pendingStatusSelect.colId, opt.id); setJarvisFeedback("Durum güncellendi."); setPendingStatusSelect(null); }} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1">
                                            <opt.icon size={12} className={opt.color} /> {opt.label}
                                        </button>
                                    ))}
                                    <button onClick={() => setPendingStatusSelect(null)} className="text-[10px] font-bold text-slate-400 px-2 py-1 hover:bg-slate-50 rounded-lg">İptal</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* GÖREV VE SINIF MATRİS AKIŞI */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40 min-h-0 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {foundStudents.length > 1 && !selectedStudent && (
                        <div className="space-y-2 animate-scale-in">
                            <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-1">Eşleşen Öğrenci Kayıtları</h4>
                            {foundStudents.map(student => (
                                <button key={student.id} onClick={() => { setSelectedStudent(student); setFoundTopics((classes || []).find(c=>c.id===student.classId)?.topics || []); setFoundStudents([student]); setJarvisFeedback(`${student.name} seçildi. Ödev durumunu söyleyebilirsiniz.`); }} className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-brandPurple hover:bg-purple-50/20 transition-all flex items-center gap-3.5 group shadow-sm">
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

                    {selectedStudent && foundStudents.length === 1 && (
                        <>
                            <div className="space-y-4 pb-6 animate-scale-in">
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
                        <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 font-mono py-12"><TerminalSquare size={40} className="text-slate-300 mb-3 animate-pulse"/><p className="text-xs font-black text-slate-400">Öğrenci Seçimi İçin Ses Bekleniyor...</p></div>
                    )}
                </div>

                {/* ALT PANEL: ONAY VE KAYIT SÜRECİ */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center gap-4 shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wide ml-1">{Object.keys(draftGrades).length} Adet Değişiklik Listede Sıralandı</span>
                    <div className="flex gap-2">
                        <button onClick={() => { stopListening(); onClose(); }} className="px-5 py-2.5 text-xs font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">İptal</button>
                        <button onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${Object.keys(draftGrades).length > 0 ? 'bg-brandPurple text-white hover:bg-purple-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><Save size={14} className="inline mr-1" /> DEĞİŞİKLİKLERİ KAYDET</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
