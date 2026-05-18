import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, RefreshCw, Save, User, CheckCircle2, TerminalSquare, ChevronRight, HelpCircle, Search, Lock, UserPlus } from 'lucide-react';
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
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem aktif. Öğrenci adını söyleyin.");
    
    const [foundStudents, setFoundStudents] = useState(initialStudent ? [initialStudent] : []);
    const [selectedStudent, setSelectedStudent] = useState(initialStudent || null);
    const [foundTopics, setFoundTopics] = useState([]);
    
    const [pendingAction, setPendingAction] = useState(null); 
    const [pendingSources, setPendingSources] = useState([]); 
    const [pendingStatusSelect, setPendingStatusSelect] = useState(null);
    const [pendingTopicForAll, setPendingTopicForAll] = useState(null); // 🆕 Toplu işlem için konu bekleme
    
    const [draftGrades, setDraftGrades] = useState({});
    const [commandMode, setCommandMode] = useState('student'); // 'student' | 'homework' | 'confirm'
    const recognitionRef = useRef(null);

    const sortedFoundTopics = Array.isArray(foundTopics) ? [...foundTopics].filter(Boolean).reverse() : [];

    // 🎯 TÜM ÖĞRENCİLERİ HAZIRLA (Tekrar kullanım için)
    const allStudents = React.useMemo(() => {
        const safeClasses = Array.isArray(classes) ? classes.filter(c => c && typeof c === 'object') : [];
        return safeClasses.flatMap(cls => 
            Array.isArray(cls.students) 
                ? cls.students.filter(std => std && std.name).map(std => ({ 
                    ...std, 
                    classId: cls.id, 
                    className: cls.className, 
                    isVip: cls.type === 'vip',
                    classType: cls.type || 'normal'
                })) 
                : []
        );
    }, [classes]);

    // 🎬 BAŞLANGIÇ AYARLARI
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        
        if (initialStudent) {
            const targetClass = (classes || []).find(c => c.id === initialStudent.classId);
            setFoundTopics(targetClass?.topics || []);
            setJarvisFeedback(`${initialStudent.name} profili aktif. Ödev durumunu söyleyin.`);
            setCommandMode('homework');
        } else {
            // Otomatik dinlemeye başla - öğrenci adı bekle
            const autoStartTimer = setTimeout(() => startListening(), 500);
            return () => clearTimeout(autoStartTimer);
        }

        return () => { 
            document.body.style.overflow = ''; 
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, [initialStudent, classes]);

    // 🔄 ÖĞRENCİ DEĞİŞTİR / YENİ ARAMA
    const handleResetStudent = useCallback(() => {
        setSelectedStudent(null);
        setFoundStudents([]);
        setFoundTopics([]);
        setPendingAction(null);
        setPendingSources([]);
        setPendingStatusSelect(null);
        setPendingTopicForAll(null);
        setDraftGrades({});
        setCommandMode('student');
        setJarvisFeedback("Yeni öğrenci araması. Adı söyleyin.");
        setTimeout(() => startListening(), 400);
    }, []);

    // 🧠 GELİŞMİŞ ÖĞRENCİ ARAMA MOTORU
    const findStudentsAdvanced = useCallback((inputText) => {
        if (!inputText || allStudents.length === 0) return { students: [], exactMatch: false };
        
        let text = inputText.toLocaleLowerCase('tr-TR').trim();
        
        // 1. TAM AD SOYAD ARAMA (En yüksek öncelik)
        const exactMatches = allStudents.filter(s => 
            s.name.toLocaleLowerCase('tr-TR') === text
        );
        
        if (exactMatches.length === 1) {
            return { students: exactMatches, exactMatch: true, isSingle: true };
        }
        if (exactMatches.length > 1) {
            return { students: exactMatches, exactMatch: true, isSingle: false };
        }
        
        // 2. FUSE.JS FUZZY ARAMA
        const fuse = new Fuse(allStudents, { 
            keys: ['name'], 
            threshold: 0.35, 
            includeScore: true, 
            ignoreLocation: true 
        });
        const results = fuse.search(text);
        
        if (results.length === 0) return { students: [], exactMatch: false };
        
        const bestScore = results[0].score;
        
        // Skor çok iyi ise (< 0.2) ve tek sonuç varsa direkt kabul et
        if (bestScore < 0.2 && results.length === 1) {
            return { students: [results[0].item], exactMatch: false, isSingle: true };
        }
        
        // Yakın skorluları grupla (bestScore + 0.15 tolerans)
        const matchedStudents = results
            .filter(r => r.score <= bestScore + 0.15)
            .map(r => r.item);
            
        return { 
            students: matchedStudents, 
            exactMatch: false, 
            isSingle: matchedStudents.length === 1 
        };
    }, [allStudents]);

    // 📚 KONU/KAYNAK BULMA MOTORU
    const findBestComponentLocal = useCallback((items, targetProperty, inputTranscript) => {
        if (!items || items.length === 0 || !inputTranscript) return null;
        let text = inputTranscript.toLocaleLowerCase('tr-TR');
        
        let bestItem = null;
        let highestScore = 0;
        
        items.forEach(item => {
            let targetText = getSafeText(item[targetProperty]).toLocaleLowerCase('tr-TR');
            
            // Tam eşleşme
            if (text.includes(targetText) || targetText.includes(text)) {
                highestScore = 100;
                bestItem = item;
                return;
            }
            
            // Kısaltma eşleşmeleri
            if (targetText.includes("video ders defteri") && 
                (text.includes("vdd") || text.includes("video ders") || text.includes("ve de"))) {
                highestScore = 98;
                bestItem = item;
                return;
            }
            if (targetText.includes("soru bankası") && 
                (text.includes("sb") || text.includes("soru banka") || text.includes("se be"))) {
                highestScore = 98;
                bestItem = item;
                return;
            }
            if (targetText.includes("konu anlatımı") && 
                (text.includes("ka") || text.includes("konu anlat"))) {
                highestScore = 98;
                bestItem = item;
                return;
            }
            
            // Token bazlı eşleşme
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
        
        // Fuse fallback
        if (highestScore < 50) {
            const fuse = new Fuse(items, { 
                keys: [targetProperty], 
                threshold: 0.55, 
                ignoreLocation: true 
            });
            const results = fuse.search(text);
            if (results.length > 0) bestItem = results[0].item;
        }
        
        return bestItem;
    }, []);

    // 🔬 AKILLI KOMUT ANALİZİ (Geliştirilmiş)
    const analyzeCommandLocal = useCallback((transcript, isFinalFallback = true) => {
        let text = transcript.toLocaleLowerCase('tr-TR').trim();
        
        if (isFinalFallback) {
            setPendingAction(null);
            setPendingSources([]);
            setPendingStatusSelect(null);
            setPendingTopicForAll(null);
        }
        
        // 🎯 GLOBAL KOMUTLAR (Her modda çalışır)
        if (text.match(/kaydet|onayla|sisteme işle|kaydet ve kapat/)) { 
            applyChanges(); 
            return true; 
        }
        if (text === 'kapat' || text === 'çık' || text === 'iptal') { 
            onClose(); 
            return true; 
        }
        if (text.match(/öğrenci değiştir|yeni öğrenci|öğrenci ara|başka öğrenci/)) { 
            handleResetStudent(); 
            return true; 
        }

        // Sayı dönüşümleri
        text = text.replace(/birinci/g, '1').replace(/ikinci/g, '2').replace(/üçüncü/g, '3')
                   .replace(/dördüncü/g, '4').replace(/beşinci/g, '5')
                   .replace(/\bbir\b/g, '1').replace(/\biki\b/g, '2').replace(/\b[uü]ç\b/g, '3')
                   .replace(/\bdört\b/g, '4').replace(/\bbeş\b/g, '5');

        // 🎓 ÖĞRENCİ MODU: İsim arama ve kilitleme
        if (commandMode === 'student' || !selectedStudent) {
            const searchResult = findStudentsAdvanced(text);
            
            if (searchResult.students.length === 0) {
                if (isFinalFallback) setJarvisFeedback("Öğrenci bulunamadı. Lütfen adı tekrar söyleyin.");
                return false;
            }
            
            if (searchResult.isSingle) {
                // TEK ÖĞRENCİ BULUNDU → DİREKT KİLİTLE
                const student = searchResult.students[0];
                const targetClass = (classes || []).find(c => c.id === student.classId);
                
                if (isFinalFallback) {
                    setFoundStudents([student]);
                    setSelectedStudent(student);
                    setFoundTopics(targetClass?.topics || []);
                    setCommandMode('homework');
                    setJarvisFeedback(`${student.name} (${student.isVip ? 'VIP' : student.className}) kilitlendi. Ödev durumunu söyleyin.`);
                    // Otomatik ödev dinlemesine geç
                    setTimeout(() => startListening(), 800);
                }
                return true;
            } else {
                // ÇOKLU ÖĞRENCİ BULUNDU → LİSTE GÖSTER
                if (isFinalFallback) {
                    setFoundStudents(searchResult.students);
                    setSelectedStudent(null);
                    setFoundTopics([]);
                    setJarvisFeedback(`${searchResult.students.length} öğrenci bulundu. Lütfen listeden seçin veya sınıf tipini belirtin.`);
                }
                return false;
            }
        }

        // 📝 ÖDEV MODU: Konu/Kaynak/Durum işlemleri
        if (!selectedStudent) return false;

        // Durum tespiti
        let status = null;
        if (text.match(/çözmemiş|yapmamış|yapmadı|eksik|boş|yok|çözmüyor|yapılmadı|çözülmedi|hiç|sıfır/)) status = 'missing';
        else if (text.match(/çözdü|yaptı|tamamladı|bitirdi|full|bitti|çözmüş|yapmış|yapıldı|çözüldü|yapıyoruz|tamam|hazır/)) status = 'done';
        else if (text.match(/verdim|verildi|atadım|ödev ver|ver/)) status = 'assigned';
        else if (text.match(/muaf|gerek yok|pas geç|muafiyet/)) status = 'exempt';

        // Toplu işlem anahtar kelimeleri
        const isAllSources = text.match(/tümünü|tamamını|hepsini|bütün kaynaklar|tümü|tamamı|hepsi|hepsine|tümüne/);
        const isNoneSources = text.match(/hiçbiri|hiçbirini|hiçbirine|hiç|sıfır/);
        const isAllTopics = text.match(/tüm konular|bütün konular|her konu|tümü/);

        const targetClass = (classes || []).find(c => c.id === selectedStudent.classId);
        const topics = targetClass?.topics || [];

        // 🎯 KONU ARAMA
        let targetTopic = null;
        
        // "3. konu" veya "üçüncü konu" gibi sıra no ile arama
        const topicOrderMatch = text.match(/(\d+)\.\s*(konu|ünite|ders|bölüm)/);
        if (topicOrderMatch) {
            const topicIndex = parseInt(topicOrderMatch[1]) - 1;
            if (topics[topicIndex]) targetTopic = topics[topicIndex];
        }
        
        // İsimle arama
        if (!targetTopic) {
            targetTopic = findBestComponentLocal(topics, 'title', text);
        }

        // 📦 TÜM KONULARDA TOPLU İŞLEM
        if (isAllTopics && status) {
            if (isFinalFallback) {
                topics.forEach(topic => {
                    (topic.subColumns || []).forEach(col => {
                        handleDraftGradeChange(selectedStudent.id, col.id, status);
                    });
                });
                setJarvisFeedback(`🎯 Tüm konulardaki kaynaklar "${status}" olarak işaretlendi.`);
                setTimeout(() => startListening(), 1000);
            }
            return true;
        }

        if (!targetTopic) {
            if (isFinalFallback) {
                setJarvisFeedback("Konu anlaşılmadı. Konu adını veya numarasını söyleyin.");
            }
            return false;
        }

        const subColumns = targetTopic.subColumns || [];

        // 🎯 KONUNUN TÜM KAYNAKLARINA TOPLU İŞLEM
        if ((isAllSources || isNoneSources) && status) {
            const targetStatus = isNoneSources ? 'missing' : status;
            if (isFinalFallback) {
                subColumns.forEach(col => {
                    handleDraftGradeChange(selectedStudent.id, col.id, targetStatus);
                });
                setJarvisFeedback(`✅ ${targetTopic.title}: Tüm kaynaklar "${targetStatus}" olarak güncellendi.`);
                setTimeout(() => startListening(), 1000);
            }
            return true;
        }

        // 🎯 TEK KAYNAK İŞLEMİ
        if (status) {
            const targetCol = findBestComponentLocal(subColumns, 'title', text);
            
            if (targetCol) {
                if (isFinalFallback) {
                    handleDraftGradeChange(selectedStudent.id, targetCol.id, status);
                    setJarvisFeedback(`✅ ${targetTopic.title} → ${targetCol.title}: "${status}" olarak kaydedildi.`);
                    setTimeout(() => startListening(), 1000);
                }
                return true;
            } else {
                // Kaynak bulunamadı, kullanıcıdan seçmesini iste
                if (isFinalFallback) {
                    setPendingAction({ 
                        studentId: selectedStudent.id, 
                        topicId: targetTopic.id, 
                        status: status,
                        topicTitle: targetTopic.title
                    });
                    setPendingSources(subColumns);
                    setJarvisFeedback(`"${targetTopic.title}" konusu anlaşıldı. Hangi kaynak?`);
                }
                return false;
            }
        }

        // Durum belirtilmemişse, kaynak bul ve durum bekle
        const targetCol = findBestComponentLocal(subColumns, 'title', text);
        if (targetCol && isFinalFallback) {
            setPendingStatusSelect({ 
                studentId: selectedStudent.id, 
                topicId: targetTopic.id, 
                colId: targetCol.id, 
                colTitle: targetCol.title,
                topicTitle: targetTopic.title
            });
            setJarvisFeedback(`"${targetTopic.title} → ${targetCol.title}" için durum seçin.`);
            return true;
        }

        return false;
    }, [commandMode, selectedStudent, classes, findStudentsAdvanced, findBestComponentLocal, handleResetStudent]);

    // 🎤 ALTERNATİF KOMUT İŞLEME
    const handleCommandAlternatives = useCallback((alternatives) => {
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
    }, [analyzeCommandLocal]);

    // 🎤 DİNLEME BAŞLAT/DURDUR
    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { 
            setJarvisFeedback("Ses modülü aktif değil."); 
            return; 
        }
        if (recognitionRef.current) recognitionRef.current.abort();
        
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.maxAlternatives = 5; // 🆕 5 alternatif artırıldı

        recognition.onstart = () => { 
            setIsListening(true); 
            setSpeechTranscript(""); 
            setJarvisFeedback(commandMode === 'student' ? "👂 İsim dinleniyor..." : "👂 Ödev durumu dinleniyor..."); 
        };
        
        recognition.onresult = (event) => { 
            const alternatives = Array.from(event.results[0]).map(r => r.transcript);
            handleCommandAlternatives(alternatives);
        };
        
        recognition.onerror = (e) => { 
            setIsListening(false);
            if (e.error === 'no-speech') {
                setJarvisFeedback("Ses algılanmadı. Tekrar deneyin.");
            }
        };
        
        recognition.onend = () => { 
            setIsListening(false); 
        }; 
        
        recognition.start();
    }, [commandMode, handleCommandAlternatives]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) { 
            recognitionRef.current.abort(); 
            setIsListening(false); 
        }
    }, []);

    // 🖱️ MANUEL KAYNAK SEÇİMİ
    const handleManualSourceSelect = useCallback((col) => {
        if (!pendingAction) return;
        handleDraftGradeChange(pendingAction.studentId, col.id, pendingAction.status);
        setJarvisFeedback(`✅ ${pendingAction.topicTitle} → ${getSafeText(col.title)}: "${pendingAction.status}" olarak kaydedildi.`);
        setPendingAction(null);
        setPendingSources([]);
        setTimeout(() => startListening(), 800);
    }, [pendingAction, startListening]);

    // 📝 NOT DEĞİŞİMİ
    const handleDraftGradeChange = useCallback((studentId, colId, statusId) => { 
        setDraftGrades(prev => ({ 
            ...prev, 
            [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } 
        })); 
    }, []);

    // 💾 DEĞİŞİKLİKLERİ UYGULA
    const applyChanges = useCallback(() => {
        if (!selectedStudent) { onClose(); return; }
        const targetClass = (classes || []).find(c => c.id === selectedStudent.classId); 
        if (!targetClass) return;
        
        const updatedStudents = Array.isArray(targetClass.students) 
            ? targetClass.students.filter(Boolean).map(s => {
                if (s.id === selectedStudent.id) {
                    return { ...s, grades: { ...(s.grades || {}), ...(draftGrades[s.id] || {}) } };
                } 
                return s;
            }) 
            : [];
        
        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); 
        onClose(); 
    }, [selectedStudent, classes, draftGrades, updateClassInDb, onClose]);

    // 🎯 ÖĞRENCİ MANUEL SEÇİM (Listeden tıklama)
    const handleSelectStudentFromList = useCallback((student) => {
        const targetClass = (classes || []).find(c => c.id === student.classId);
        setSelectedStudent(student);
        setFoundTopics(targetClass?.topics || []);
        setFoundStudents([student]);
        setCommandMode('homework');
        setJarvisFeedback(`${student.name} seçildi. Ödev durumunu söyleyin.`);
        setTimeout(() => startListening(), 500);
    }, [classes]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.97, y: 12 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.97, y: 12 }} 
                className="bg-white border border-slate-200 rounded-[2.2rem] w-full max-w-2xl overflow-hidden shadow-float flex flex-col max-h-[85vh]"
            >
                {/* 🎛️ ÜST RADAR VE KONTROL ALANI */}
                <div className="relative overflow-hidden bg-slate-50/70 border-b border-slate-100 p-6 flex flex-col items-center justify-center shrink-0">
                    <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors z-30">
                        <X size={20}/>
                    </button>
                    
                    <div className="absolute top-5 left-6 flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-widest z-20">
                        <TerminalSquare size={13}/> 
                        {commandMode === 'student' ? 'ÖĞRENCİ ARAMA MODU' : 'ÖDEV YÖNETİM MODU'}
                    </div>
                    
                    {/* 🎤 BEYAZ PREMIUM MIC RADAR */}
                    <div 
                        onClick={isListening ? stopListening : startListening} 
                        className="z-10 bg-white p-5 rounded-full border border-slate-200 shadow-sm mb-4 cursor-pointer relative hover:scale-102 active:scale-98 transition-all group mt-3"
                    >
                        {isListening && (
                            <>
                                <span className="absolute inset-0 rounded-full bg-brandPurple/10 animate-ping"></span>
                                <span className="absolute inset-[-8px] rounded-full border-2 border-brandPurple/30 animate-pulse"></span>
                            </>
                        )}
                        <Mic 
                            size={28} 
                            className={isListening ? 'text-brandPurple animate-pulse' : 'text-slate-400 group-hover:text-brandPurple transition-colors'} 
                        />
                    </div>

                    {/* 🎯 GELİŞMİŞ BAĞLAM / ÖĞRENCİ DEĞİŞTİRME SEKMESİ */}
                    <div className="w-full max-w-xl z-10 flex gap-2">
                        <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${selectedStudent ? 'bg-emerald-500' : 'bg-amber-400'} ${isListening ? 'animate-pulse' : ''}`}></div>
                                <span className="text-slate-400 font-medium">
                                    {commandMode === 'student' ? 'Aranan:' : 'Aktif Öğrenci:'}
                                </span>
                                <span className="text-brandPurple font-black text-base">
                                    {selectedStudent ? selectedStudent.name : "İsim bekleniyor..."}
                                </span>
                                {selectedStudent && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${selectedStudent.isVip ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}>
                                        {selectedStudent.isVip ? 'VIP' : selectedStudent.className}
                                    </span>
                                )}
                            </div>
                            
                            {/* 🆕 YENİ ÖĞRENCİ ARA BUTONU */}
                            {selectedStudent && (
                                <button 
                                    onClick={handleResetStudent}
                                    className="flex items-center gap-1.5 text-[11px] font-black bg-purple-50 text-brandPurple border border-purple-200 px-4 py-2.5 rounded-xl hover:bg-brandPurple hover:text-white transition-all shadow-sm hover:shadow-md"
                                >
                                    <UserPlus size={14}/> 
                                    YENİ ÖĞRENCİ ARA
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 📢 DİNAMİK FEEDBACK ALANI */}
                    <div className="z-10 text-center w-full px-4 min-h-[24px] flex flex-col justify-center items-center mt-3">
                        {speechTranscript && (
                            <p className="text-[11px] text-slate-400 font-medium italic mb-1">
                                "{speechTranscript}"
                            </p>
                        )}
                        <div className="flex items-center gap-1.5 justify-center font-black text-slate-700 text-sm">
                            <span className="text-brandPurple font-black">&gt;</span> 
                            {jarvisFeedback}
                        </div>

                        {/* 🎯 BEKLEYEN KAYNAK SEÇİM PANELİ */}
                        <AnimatePresence>
                            {pendingSources.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 4 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -4 }} 
                                    className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full overflow-x-auto p-2 bg-white border border-slate-100 rounded-2xl shadow-sm"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 px-2">
                                        <HelpCircle size={12}/> 
                                        Hangi Kaynak:
                                    </span>
                                    {pendingSources.map(col => (
                                        <button 
                                            key={col.id} 
                                            onClick={() => handleManualSourceSelect(col)} 
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg hover:border-brandPurple hover:bg-purple-50 hover:text-brandPurple transition-all"
                                        >
                                            {getSafeText(col?.title)}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => { 
                                            setPendingAction(null); 
                                            setPendingSources([]); 
                                            setJarvisFeedback("İptal edildi."); 
                                        }} 
                                        className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg"
                                    >
                                        İptal
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 🎯 BEKLEYEN DURUM SEÇİM PANELİ */}
                        <AnimatePresence>
                            {pendingStatusSelect && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 4 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -4 }} 
                                    className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-full p-2 bg-white border border-slate-100 rounded-2xl shadow-sm items-center"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase px-2">
                                        Durum Seçin:
                                    </span>
                                    {STATUS_OPTIONS.map(opt => (
                                        <button 
                                            key={opt.id} 
                                            onClick={() => { 
                                                handleDraftGradeChange(pendingStatusSelect.studentId, pendingStatusSelect.colId, opt.id); 
                                                setJarvisFeedback(`✅ ${pendingStatusSelect.topicTitle} → ${pendingStatusSelect.colTitle}: "${opt.label}" olarak kaydedildi.`); 
                                                setPendingStatusSelect(null);
                                                setTimeout(() => startListening(), 800);
                                            }} 
                                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 transition-all"
                                        >
                                            <opt.icon size={12} className={opt.color} /> 
                                            {opt.label}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => setPendingStatusSelect(null)} 
                                        className="text-[10px] font-bold text-slate-400 px-3 py-1.5 hover:bg-slate-50 rounded-lg"
                                    >
                                        İptal
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 📋 GÖREV VE SINIF MATRİS AKIŞI */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40 min-h-0 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    
                    {/* 🎓 ÇOKLU ÖĞRENCİ LİSTESİ (Seçim bekleniyor) */}
                    {foundStudents.length > 1 && !selectedStudent && (
                        <div className="space-y-2 animate-scale-in">
                            <h4 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-1">
                                Eşleşen Öğrenciler — Lütfen Seçin
                            </h4>
                            {foundStudents.map(student => (
                                <button 
                                    key={`${student.id}-${student.classId}`} 
                                    onClick={() => handleSelectStudentFromList(student)} 
                                    className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-brandPurple hover:bg-purple-50/20 transition-all flex items-center gap-3.5 group shadow-sm"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${student.isVip ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}>
                                        {getSafeText(student.name).charAt(0)}
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <span className="font-bold text-slate-700 group-hover:text-brandPurple transition-all">
                                            {getSafeText(student.name)}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                            {student.isVip ? 'VIP ÖZEL DERS' : getSafeText(student.className)}
                                        </span>
                                    </div>
                                    <div className={`text-[10px] px-2 py-1 rounded-full font-black ${student.isVip ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                        {student.isVip ? 'VIP' : 'SINIF'}
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brandPurple transition-transform group-hover:translate-x-1" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 📝 KİLİTLİ ÖĞRENCİ ÖDEV LİSTESİ */}
                    {selectedStudent && foundStudents.length === 1 && (
                        <div className="space-y-4 pb-6 animate-scale-in">
                            {/* 🆕 ÖDEV ÖZETİ BAŞLIK */}
                            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedStudent.isVip ? 'bg-amber-100' : 'bg-purple-100'}`}>
                                        <Lock size={18} className={selectedStudent.isVip ? 'text-amber-600' : 'text-brandPurple'} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-700 text-sm">{selectedStudent.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400">{selectedStudent.isVip ? 'VIP Özel Ders' : selectedStudent.className}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400">Değişiklik</p>
                                    <p className="text-lg font-black text-brandPurple">
                                        {Object.values(draftGrades[selectedStudent.id] || {}).length}
                                    </p>
                                </div>
                            </div>

                            {sortedFoundTopics.map(topic => (
                                <div key={topic.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                    <h4 className="font-black text-slate-700 text-xs mb-3.5 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                                        <div className={`w-1.5 h-3.5 rounded-full ${selectedStudent.isVip ? 'bg-amber-400' : 'bg-brandPurple'}`}></div>
                                        {getSafeText(topic?.title)}
                                    </h4>
                                    <div className="space-y-2.5">
                                        {(topic.subColumns || []).filter(Boolean).map(col => {
                                            const studentData = (classes || [])
                                                .find(c => c && c.id === selectedStudent.classId)
                                                ?.students?.find(s => s && s.id === selectedStudent.id);
                                                
                                            const displayGrade = draftGrades[selectedStudent.id]?.[col.id] !== undefined 
                                                ? draftGrades[selectedStudent.id]?.[col.id] 
                                                : (studentData?.grades?.[col.id] || 'assigned');
                                                
                                            const isChanged = draftGrades[selectedStudent.id]?.[col.id] !== undefined;

                                            return (
                                                <div 
                                                    key={col.id} 
                                                    className={`p-3 rounded-xl bg-slate-50/50 border transition-all ${isChanged ? 'border-purple-400 bg-purple-50/10 shadow-sm' : 'border-slate-100'} flex flex-col md:flex-row md:items-center justify-between gap-3`}
                                                >
                                                    <span className="text-xs font-bold text-slate-600 flex-1">
                                                        {getSafeText(col?.title)}
                                                    </span>
                                                    <div className="flex gap-1 overflow-x-auto">
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <button 
                                                                key={opt.id} 
                                                                onClick={() => handleDraftGradeChange(selectedStudent.id, col.id, opt.id)} 
                                                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${displayGrade === opt.id ? lightStatusStyles[opt.id] : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'}`}
                                                            >
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
                    )}
                    
                    {/* 🎯 BOŞ DURUM */}
                    {!selectedStudent && foundStudents.length <= 1 && (
                        <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 font-mono py-12">
                            <Search size={40} className="text-slate-300 mb-3 animate-pulse"/>
                            <p className="text-xs font-black text-slate-400">
                                {commandMode === 'student' 
                                    ? "Öğrenci adını söyleyin..." 
                                    : "Öğrenci seçimi bekleniyor..."}
                            </p>
                            <p className="text-[10px] text-slate-300 mt-2">
                                Örnek: "Ahmet Yılmaz" veya "3. konu soru bankası çözüldü"
                            </p>
                        </div>
                    )}
                </div>

                {/* 💾 ALT PANEL: ONAY VE KAYIT */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center gap-4 shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-400 tracking-wide ml-1">
                            {Object.keys(draftGrades).reduce((acc, key) => acc + Object.keys(draftGrades[key] || {}).length, 0)} Değişiklik
                        </span>
                        {selectedStudent && (
                            <span className="text-[10px] text-slate-300 ml-1">
                                {selectedStudent.name} için bekliyor
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { stopListening(); onClose(); }} 
                            className="px-5 py-2.5 text-xs font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={applyChanges} 
                            disabled={Object.keys(draftGrades).length === 0} 
                            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${Object.keys(draftGrades).length > 0 ? 'bg-brandPurple text-white hover:bg-purple-700 shadow-lg shadow-purple-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            <Save size={14} /> 
                            KAYDET VE KAPAT
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
