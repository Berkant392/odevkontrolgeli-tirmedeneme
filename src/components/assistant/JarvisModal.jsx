import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, X, MicOff, Crown, Calendar, StickyNote, AlertTriangle, Save, User, Mic, TerminalSquare, CheckCircle2 } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import Fuse from 'fuse.js';

const AssistantModal = ({ classes, updateClassInDb, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [jarvisFeedback, setJarvisFeedback] = useState("Sistem devrede. Emirlerinizi bekliyorum...");
    const [foundStudents, setFoundStudents] = useState([]);
    const [foundTopics, setFoundTopics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [draftGrades, setDraftGrades] = useState({});
    const [draftNotes, setDraftNotes] = useState({});

    const reversedFoundTopics = [...foundTopics].reverse();

    // ------------------------------------------------------------------------
    // 🧠 J.A.R.V.I.S V2.1: GENİŞLETİLMİŞ SÖZLÜK & N-GRAM MOTORU
    // ------------------------------------------------------------------------
    const analyzeCommand = (transcript) => {
        let text = transcript.toLocaleLowerCase('tr-TR');
        
        // 1. ÖZEL SÖZLÜK (ALIAS VE RAKAM ÇEVİRİLERİ)
        text = text.replace(/birinci/g, '1')
                   .replace(/ikinci/g, '2')
                   .replace(/üçüncü/g, '3')
                   .replace(/dördüncü/g, '4')
                   .replace(/beşinci/g, '5')
                   .replace(/\bbir\b/g, '1')
                   .replace(/\biki\b/g, '2')
                   .replace(/\b[uü]ç\b/g, '3')
                   .replace(/\bd[oö]rt\b/g, '4')
                   .replace(/\bbeş\b/g, '5');

        if (text.includes('vdd') || text.includes('vedede') || text.includes('ve de de')) text += " video ders defteri";
        if (text.match(/\bsb\b/) || text.includes('se be')) text += " soru bankası";

        // 2. NİYET (INTENT) TESPİTİ (Edilgen yapılar eklendi!)
        let status = null;
        if (text.match(/çözmemiş|yapmamış|yapmadı|eksik|boş|yok|çözmüyor|yapılmadı|çözülmedi/)) status = 'missing';
        else if (text.match(/çözdü|yaptı|tamamladı|bitirdi|full|bitti|çözmüş|yapmış|yapıldı|çözüldü|tamamlandı/)) status = 'done';
        else if (text.match(/verdim|verildi|atadım|ödev ver|çözecek|yapacak/)) status = 'assigned';
        else if (text.match(/muaf|gerek yok|çözmesin/)) status = 'exempt';

        // 3. J.A.R.V.I.S ARAMA ÇEKİRDEĞİ (N-Gram + Rakam Kısıtlaması)
        const extractNumbers = (str) => { const m = str.match(/\d+/g); return m ? m : []; };
        const transcriptNumbers = extractNumbers(text); 

        const findBestMatch = (items, key, threshold = 0.4) => {
            if (!items || items.length === 0) return null;

            const exactMatch = items.find(item => text.includes(item[key].toLocaleLowerCase('tr-TR')));
            if (exactMatch) return exactMatch;

            const words = text.replace(/[.,!?]/g, "").split(/\s+/).filter(w => w.length > 0);
            const ngrams = [];
            for(let i=0; i < words.length; i++) {
                ngrams.push(words[i]); 
                if(i < words.length - 1) ngrams.push(words[i] + " " + words[i+1]); 
                if(i < words.length - 2) ngrams.push(words[i] + " " + words[i+1] + " " + words[i+2]); 
                if(i < words.length - 3) ngrams.push(words[i] + " " + words[i+1] + " " + words[i+2] + " " + words[i+3]); 
            }

            const fuse = new Fuse(items, { keys: [key], threshold: threshold, includeScore: true, ignoreLocation: true });
            let bestMatch = null;
            let bestScore = 1; 

            for (const ngram of ngrams) {
                const results = fuse.search(ngram);
                for (const res of results) {
                    const itemNumbers = extractNumbers(res.item[key]);
                    const hasMissingNumber = itemNumbers.some(num => !transcriptNumbers.includes(num));
                    if (hasMissingNumber) continue; 

                    if (res.score < bestScore) {
                        bestScore = res.score;
                        bestMatch = res.item;
                    }
                }
            }
            return bestMatch;
        };

        // --- ADIM A: ÖĞRENCİ BUL ---
        const allStudents = classes.flatMap(cls => (cls.students || []).map(std => ({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' })));
        const bestStudentMatch = findBestMatch(allStudents, 'name', 0.4);

        if (!bestStudentMatch) {
            setFoundStudents([]); setSelectedStudent(null); setFoundTopics([]);
            setJarvisFeedback("Cümlenizde kayıtlı bir öğrenci ismi tespit edemedim."); return;
        }

        setFoundStudents([bestStudentMatch]); setSelectedStudent(bestStudentMatch);
        const targetClass = classes.find(c => c.id === bestStudentMatch.classId); 
        const topics = targetClass?.topics || []; 
        setFoundTopics(topics);

        // --- ADIM B: KONU BUL ---
        const bestTopic = findBestMatch(topics, 'title', 0.4);

        // --- ADIM C: KAYNAK BUL ---
        let bestCol = null;
        if (bestTopic) bestCol = findBestMatch(bestTopic.subColumns || [], 'title', 0.4);

        // --- ADIM D: GERİ BİLDİRİM ---
        if (bestStudentMatch && bestTopic && bestCol && status) {
            handleDraftGradeChange(bestStudentMatch.id, bestCol.id, status);
            const statusLabels = { 'done': 'Yapıldı', 'missing': 'Eksik', 'assigned': 'Verildi', 'exempt': 'Muaf' };
            setJarvisFeedback(`İşlem Tamam! ${bestStudentMatch.name} -> ${bestTopic.title} -> ${bestCol.title} "${statusLabels[status]}" yapıldı.`);
        } else if (bestStudentMatch && bestTopic && !bestCol) { 
            setJarvisFeedback(`${bestTopic.title} konusunu anladım ancak hangi kaynak olduğunu çıkaramadım.`); 
        } else if (bestStudentMatch && !bestTopic) { 
            setJarvisFeedback(`${bestStudentMatch.name} bulundu, ancak hangi konudan bahsettiğinizi anlayamadım.`); 
        } else if (bestStudentMatch && bestTopic && bestCol && !status) { 
            setJarvisFeedback(`Hedefi buldum ancak ödevi ne yaptığını anlayamadım (Yaptı mı? Eksik mi?).`); 
        } else { 
            setJarvisFeedback(`${bestStudentMatch.name} profili ekrana getirildi.`); 
        }
    };

    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("⚠️ Tarayıcınız ses tanıma desteklemiyor."); return; }
        if (isListening) { setIsListening(false); return; }
        const recognition = new SpeechRecognition(); recognition.lang = 'tr-TR'; recognition.continuous = false;
        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); setJarvisFeedback("Sizi dinliyorum..."); };
        recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; setSpeechTranscript(transcript); analyzeCommand(transcript); };
        recognition.onerror = (event) => { setIsListening(false); setJarvisFeedback("Ses anlaşılamadı veya mikrofon engellendi."); };
        recognition.onend = () => setIsListening(false); recognition.start();
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
        setDraftGrades({}); setDraftNotes({}); setJarvisFeedback("Tüm değişiklikler başarıyla veritabanına işlendi efendim."); setTimeout(() => onClose(), 1500);
    };

    useEffect(() => { toggleListening(); }, []);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 md:p-4">
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.95 }} className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-slate-200">
                <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-xl shadow-sm relative">{isListening && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brandPurple opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-brandPurple"></span></span>}<Zap className="text-brandPurple" size={24}/></div><div><h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">J.A.R.V.I.S <span className="text-xs text-brandPurple bg-purple-100 px-2 py-0.5 rounded-full ml-2">NLP AI</span></h3><p className="text-xs text-slate-500 font-medium">Bulanık Arama Yapay Zekası</p></div></div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm hover-lift"><X size={20}/></button>
                </div>
                
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col items-center justify-center min-h-[140px] relative">
                    <div className="absolute top-3 left-4 flex items-center gap-2 text-slate-500 text-[10px] font-mono tracking-widest"><TerminalSquare size={14}/> SYSTEM OUTPUT</div>
                    {isListening ? ( <div className="flex flex-col items-center gap-4 mt-2"><div className="flex items-center gap-1"><div className="wave-bar wave-1 bg-brandPurple"></div><div className="wave-bar wave-2 bg-brandPurple"></div><div className="wave-bar wave-3 bg-brandPurple"></div><div className="wave-bar wave-4 bg-brandPurple"></div><div className="wave-bar wave-5 bg-brandPurple"></div></div><span className="text-xs font-bold text-white uppercase tracking-widest animate-pulse">Sizi Dinliyorum...</span></div> ) : ( <div className="flex flex-col items-center gap-3 mt-4 w-full px-4">{speechTranscript ? ( <div className="w-full text-center"><p className="text-sm font-medium text-slate-400 italic mb-2">"{speechTranscript}"</p><div className="bg-brandPurple/20 border border-brandPurple/30 text-purple-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"><CheckCircle2 size={16} className="text-brandPurple shrink-0"/> <span className="leading-tight">{jarvisFeedback}</span></div></div> ) : ( <p className="text-sm font-medium text-slate-500">{jarvisFeedback}</p> )}<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleListening} className="mt-2 flex items-center gap-2 px-5 py-2 bg-slate-800 text-white hover:bg-slate-700 shadow-sm border border-slate-700 rounded-full text-xs font-black uppercase tracking-wider"><Mic size={14} className="text-brandPurple" /> Tekrar Dinle</motion.button></div> )}
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
                    <div className="w-full md:w-1/3 border-r border-slate-200 bg-white overflow-y-auto p-4 flex flex-col gap-2 max-h-[30vh] md:max-h-none">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Eşleşen Profil</div>
                        {foundStudents.map(student => {
                            const isSelected = selectedStudent?.id === student.id; 
                            return ( <button key={student.id} onClick={() => { setSelectedStudent(student); setFoundTopics(classes.find(c => c.id === student.classId)?.topics || []); }} className={`text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 hover-lift ${isSelected ? (student.isVip ? 'bg-yellow-50 border-vipGoldAccent shadow-md' : 'bg-purple-50 border-brandPurple shadow-md') : 'border-transparent hover:bg-slate-50'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? (student.isVip ? 'bg-vipGoldAccent text-white' : 'bg-brandPurple text-white') : (student.isVip ? 'bg-yellow-100 text-vipGoldAccent' : 'bg-slate-100 text-slate-500')}`}>{student.name.charAt(0)}</div><div className="flex flex-col overflow-hidden"><span className={`font-bold text-sm truncate ${isSelected ? (student.isVip ? 'text-vipGoldAccent' : 'text-brandPurple') : 'text-slate-700'}`}>{student.name} {student.isVip && <Crown size={12} className="inline text-vipGoldAccent ml-1"/>}</span><span className="text-[10px] text-slate-400 font-bold truncate">{student.className}</span></div></button> );
                        })}
                        {foundStudents.length === 0 && <div className="text-xs text-slate-400 text-center py-4 flex flex-col items-center gap-2"><User size={24} className="opacity-20"/> Bekleniyor...</div>}
                    </div>
                    
                    <div className="w-full md:w-2/3 overflow-y-auto p-4 md:p-6 relative">
                        {selectedStudent ? (
                            <div className="space-y-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between"><span>Ödevler</span>{selectedStudent.isVip && <span className="text-vipGoldAccent font-bold">Özel Ders</span>}</div>
                                {reversedFoundTopics.map(topic => (
                                    <div key={topic.id} className={`bg-white rounded-3xl border ${selectedStudent.isVip ? 'border-yellow-200' : 'border-slate-200'} p-5 shadow-sm`}>
                                        <h4 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-100 pb-3 flex items-center gap-2 justify-between"><div className="flex items-center gap-2"><div className={`w-2 h-6 ${selectedStudent.isVip ? 'bg-vipGoldAccent' : 'bg-brandPurple'} rounded-full`}></div>{topic.title}</div>{topic.date && <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Calendar size={12}/>{formatDate(topic.date)}</span>}</h4>
                                        <div className="space-y-4">
                                            {topic.subColumns.map(col => {
                                                const targetClass = classes.find(c => c.id === selectedStudent.classId); const studentData = targetClass?.students.find(s => s.id === selectedStudent.id);
                                                const currentDbGrade = studentData?.grades?.[col.id] || 'assigned'; const currentDbNote = studentData?.assignmentNotes?.[col.id] || '';
                                                const draftGrade = draftGrades[selectedStudent.id]?.[col.id]; const draftNote = draftNotes[selectedStudent.id]?.[col.id];
                                                const displayGrade = draftGrade !== undefined ? draftGrade : currentDbGrade; const displayNote = draftNote !== undefined ? draftNote : currentDbNote;
                                                const isChanged = (draftGrade !== undefined && draftGrade !== currentDbGrade) || (draftNote !== undefined && draftNote !== currentDbNote);
                                                return (
                                                    <div key={col.id} className={`flex flex-col gap-3 p-4 rounded-2xl transition-all ${isChanged ? 'bg-purple-50/50 border-2 border-brandPurple shadow-md' : 'bg-slate-50 border-2 border-transparent'}`}>
                                                        <div className="text-sm font-bold text-slate-700 flex justify-between">{col.title}{isChanged && <span className="text-[9px] bg-brandPurple text-white px-2 py-0.5 rounded-full animate-pulse">J.A.R.V.I.S ONAYI BEKLİYOR</span>}</div>
                                                        <div className="grid grid-cols-4 gap-2">{STATUS_OPTIONS.map(opt => ( <button key={opt.id} onClick={() => handleDraftGradeChange(selectedStudent.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all hover-lift ${displayGrade === opt.id ? `${opt.bg} ${opt.color} ${opt.border} shadow-sm scale-105` : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}><opt.icon size={18} className="mb-1" strokeWidth={2.5} /><span className="text-[10px] font-black uppercase">{opt.label}</span></button> ))}</div>
                                                        <div className="relative mt-1"><div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><StickyNote size={14} className="text-slate-400"/></div><input type="text" placeholder="Öğretmen notu ekle..." className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brandPurple focus:ring-2 focus:ring-purple-100 transition-all font-medium text-slate-700 placeholder:text-slate-400" value={displayNote} onChange={(e) => handleDraftNoteChange(selectedStudent.id, col.id, e.target.value)}/></div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {reversedFoundTopics.length === 0 && <div className="text-xs text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-200">Konu bulunamadı.</div>}
                            </div>
                        ) : ( <div className="flex flex-col h-full items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300 p-8 opacity-50"><Zap size={48} className="mb-4" /><p className="text-sm font-bold">Analiz Bekleniyor...</p></div> )}
                    </div>
                </div>
                
                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xs font-bold w-full md:w-auto text-center md:text-left">{Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0 ? ( <span className="text-brandPurple bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 flex items-center justify-center md:justify-start gap-1.5"><AlertTriangle size={14}/> Onay bekleyen J.A.R.V.I.S işlemleri var</span> ) : ( <span className="text-slate-400">Veritabanı güncel</span> )}</div>
                    <div className="flex gap-3 w-full md:w-auto"><button onClick={onClose} className="hover-lift flex-1 md:flex-none px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm">İptal</button><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0 && Object.keys(draftNotes).length === 0} className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-black text-white shadow-lg transition-all text-sm flex items-center justify-center gap-2 ${(Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0) ? 'bg-brandPurple hover:bg-purple-700 shadow-glow' : 'bg-slate-300 cursor-not-allowed'} `}><Save size={18} /> DEĞİŞİKLİKLERİ KAYDET</motion.button></div>
                </div>
            </motion.div>
        </div>
    );
};
export default AssistantModal;
