import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Map, X, Edit3, Plus, Trash2, CheckCircle2, ChevronRight, LayoutGrid
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import '../../styles/subjectStudy.css';

const EXAMS_FALLBACK = [{ id: 'tyt', label: 'TYT' }, { id: 'ayt', label: 'AYT' }];
const SUBJECTS_FALLBACK = [
    { id: 'mat', label: 'Matematik' },
    { id: 'fiz', label: 'Fizik' },
    { id: 'kim', label: 'Kimya' },
    { id: 'biy', label: 'Biyoloji' },
    { id: 'tur', label: 'Türkçe' }
];

const DEFAULT_CURRICULUM = {
    categories: {
        exams: EXAMS_FALLBACK,
        subjects: SUBJECTS_FALLBACK
    },
    tyt: {
        mat: [
            { id: "m1", title: "Temel Kavramlar", order: 1, subtopics: [{id: "s1", title: "Rakamlar"}, {id: "s2", title: "Doğal Sayılar"}] },
            { id: "m2", title: "Sayı Basamakları", order: 2, subtopics: [] },
            { id: "m3", title: "Bölme - Bölünebilme", order: 3, subtopics: [] },
            { id: "m4", title: "EBOB - EKOK", order: 4, subtopics: [] },
            { id: "m5", title: "Rasyonel Sayılar", order: 5, subtopics: [] },
            { id: "m6", title: "Basit Eşitsizlikler", order: 6, subtopics: [] },
            { id: "m7", title: "Mutlak Değer", order: 7, subtopics: [] },
            { id: "m8", title: "Üslü Sayılar", order: 8, subtopics: [] }
        ]
    },
    ayt: {}
};

const SubjectStudyView = ({ studentId, isTeacherMode, showAlert }) => {
    const [selectedExam, setSelectedExam] = useState('tyt');
    const [selectedSubject, setSelectedSubject] = useState('mat');
    
    const [curriculum, setCurriculum] = useState({});

    // Auto-sync selected categories if the defaults or current selection no longer exist
    useEffect(() => {
        if (!curriculum || !curriculum.categories) return;
        const examsList = curriculum.categories.exams || EXAMS_FALLBACK;
        const subjectsList = curriculum.categories.subjects || SUBJECTS_FALLBACK;
        
        if (examsList.length > 0 && !examsList.find(e => e.id === selectedExam)) {
            setSelectedExam(examsList[0].id);
        }
        if (subjectsList.length > 0 && !subjectsList.find(s => s.id === selectedSubject)) {
            setSelectedSubject(subjectsList[0].id);
        }
    }, [curriculum, selectedExam, selectedSubject]);

    // We store both completed main topics (if no subtopics) and completed subtopics here
    const [completedItems, setCompletedItems] = useState([]);
    
    const [loading, setLoading] = useState(true);

    const [isEditingGlobal, setIsEditingGlobal] = useState(false);
    const [activeTopic, setActiveTopic] = useState(null); // Which topic is opened in modal

    const [modalConfig, setModalConfig] = useState(null); // Custom Prompt/Confirm Modal state
    const [modalInputValue, setModalInputValue] = useState('');

    useEffect(() => {
        const unsubCurr = onSnapshot(doc(db, "settings", "globalCurriculum"), (docSnap) => {
            if (docSnap.exists()) {
                setCurriculum(docSnap.data());
            } else {
                setDoc(doc(db, "settings", "globalCurriculum"), DEFAULT_CURRICULUM);
                setCurriculum(DEFAULT_CURRICULUM);
            }
        });

        if (studentId) {
            const unsubProgress = onSnapshot(doc(db, "students", studentId), (docSnap) => {
                if (docSnap.exists()) {
                    setCompletedItems(docSnap.data().completedSubtopics || []);
                }
                setLoading(false);
            });
            return () => { unsubCurr(); unsubProgress(); };
        } else {
            setLoading(false);
            return () => unsubCurr();
        }
    }, [studentId]);

    const handleToggleItem = async (itemId) => {
        if (isTeacherMode) return;
        const isCompleted = completedItems.includes(itemId);
        const newCompleted = isCompleted 
            ? completedItems.filter(id => id !== itemId) 
            : [...completedItems, itemId];
        
        setCompletedItems(newCompleted);
        try {
            await updateDoc(doc(db, "students", studentId), { completedSubtopics: newCompleted });
        } catch (e) {
            console.error(e);
        }
    };

    // --- ADMIN ACTIONS ---
    const handleAddTopic = () => {
        setModalConfig({
            type: 'prompt', title: 'Yeni Konu Başlığı:', placeholder: 'Örn: Temel Kavramlar',
            onConfirm: async (val) => {
                const title = val?.trim();
                if (!title) return;
                const currentList = curriculum[selectedExam]?.[selectedSubject] || [];
                const newTopic = { id: `t_${Date.now()}`, title, order: currentList.length + 1, subtopics: [] };
                await updateGlobal(newTopic, 'add_topic');
            }
        });
    };

    const handleDeleteTopic = (topicId) => {
        setModalConfig({
            type: 'confirm', title: 'Konuyu Sil', message: 'Bu konuyu ve alt başlıklarını silmek istediğinize emin misiniz?',
            onConfirm: async () => {
                await updateGlobal(topicId, 'delete_topic');
                if (activeTopic?.id === topicId) setActiveTopic(null);
            }
        });
    };

    const handleAddSubtopic = (topicId) => {
        setModalConfig({
            type: 'prompt', title: 'Alt Başlık Ekle:', placeholder: 'Örn: Rakamlar',
            onConfirm: async (val) => {
                const title = val?.trim();
                if (!title) return;
                await updateGlobal({ topicId, subtopic: { id: `s_${Date.now()}`, title } }, 'add_subtopic');
            }
        });
    };

    const handleDeleteSubtopic = async (topicId, subtopicId) => {
        await updateGlobal({ topicId, subtopicId }, 'delete_subtopic');
    };

    const handleAddCategory = (type) => {
        setModalConfig({
            type: 'prompt', 
            title: type === 'exam' ? 'Yeni Sınav Adı:' : 'Yeni Ders Adı:',
            placeholder: type === 'exam' ? 'Örn: LGS, DGS' : 'Örn: Geometri',
            onConfirm: async (val) => {
                const title = val?.trim();
                if (!title) return;
                const id = title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5) + Date.now().toString().slice(-4);
                
                const currentCategories = curriculum.categories || { exams: EXAMS_FALLBACK, subjects: SUBJECTS_FALLBACK };
                const newCatList = [...(currentCategories[type === 'exam' ? 'exams' : 'subjects'] || [])];
                newCatList.push({ id, label: title });

                const newCurriculum = { ...curriculum, categories: { ...currentCategories, [type === 'exam' ? 'exams' : 'subjects']: newCatList } };
                try {
                    await updateDoc(doc(db, "settings", "globalCurriculum"), newCurriculum);
                    if (type === 'exam') setSelectedExam(id);
                    if (type === 'subject') setSelectedSubject(id);
                } catch (e) { console.error(e); }
            }
        });
    };

    const handleDeleteCategory = (type, idToDelete) => {
        setModalConfig({
            type: 'confirm', title: 'Kategoriyi Sil', message: 'Bu kategoriyi silmek istediğinize emin misiniz? İçindeki konular da kalıcı olarak silinecektir!',
            onConfirm: async () => {
                const currentCategories = curriculum.categories || { exams: EXAMS_FALLBACK, subjects: SUBJECTS_FALLBACK };
                const newCatList = (currentCategories[type === 'exam' ? 'exams' : 'subjects'] || []).filter(c => c.id !== idToDelete);
                
                // Deep copy curriculum to remove orphaned data
                const newCurriculum = { ...curriculum, categories: { ...currentCategories, [type === 'exam' ? 'exams' : 'subjects']: newCatList } };
                
                if (type === 'exam') {
                    delete newCurriculum[idToDelete];
                } else if (type === 'subject') {
                    // Remove this subject from all exams to prevent orphaned data
                    Object.keys(newCurriculum).forEach(examKey => {
                        if (examKey !== 'categories' && newCurriculum[examKey]) {
                            delete newCurriculum[examKey][idToDelete];
                        }
                    });
                }

                try {
                    await updateDoc(doc(db, "settings", "globalCurriculum"), newCurriculum);
                    if (type === 'exam' && selectedExam === idToDelete && newCatList.length > 0) setSelectedExam(newCatList[0].id);
                    if (type === 'subject' && selectedSubject === idToDelete && newCatList.length > 0) setSelectedSubject(newCatList[0].id);
                } catch (e) { console.error(e); }
            }
        });
    };

    const updateGlobal = async (payload, actionType) => {
        const currentList = [...(curriculum[selectedExam]?.[selectedSubject] || [])];
        let updatedList = currentList;

        if (actionType === 'add_topic') updatedList.push(payload);
        if (actionType === 'delete_topic') updatedList = currentList.filter(t => t.id !== payload);
        if (actionType === 'add_subtopic') {
            updatedList = currentList.map(t => {
                if (t.id === payload.topicId) return { ...t, subtopics: [...(t.subtopics||[]), payload.subtopic] };
                return t;
            });
        }
        if (actionType === 'delete_subtopic') {
            updatedList = currentList.map(t => {
                if (t.id === payload.topicId) return { ...t, subtopics: (t.subtopics||[]).filter(s => s.id !== payload.subtopicId) };
                return t;
            });
        }

        const newCurriculum = {
            ...curriculum,
            [selectedExam]: { ...(curriculum[selectedExam] || {}), [selectedSubject]: updatedList }
        };
        
        try {
            await updateDoc(doc(db, "settings", "globalCurriculum"), newCurriculum);
            // activeTopic update for UI sync
            if (activeTopic) {
                const updatedActive = updatedList.find(t => t.id === activeTopic.id);
                setActiveTopic(updatedActive || null);
            }
        } catch (e) {
            console.error(e);
        }
    };
    // ----------------------

    const examsList = curriculum.categories?.exams || EXAMS_FALLBACK;
    const subjectsList = curriculum.categories?.subjects || SUBJECTS_FALLBACK;

    const currentList = (curriculum[selectedExam]?.[selectedSubject] || []).sort((a,b) => a.order - b.order);
    
    // Calculate global progress
    let totalItemsCount = 0;
    let completedItemsCount = 0;
    
    currentList.forEach(t => {
        const subs = t.subtopics || [];
        if (subs.length === 0) {
            totalItemsCount += 1;
            if (completedItems.includes(t.id)) completedItemsCount += 1;
        } else {
            totalItemsCount += subs.length;
            subs.forEach(s => { if (completedItems.includes(s.id)) completedItemsCount += 1; });
        }
    });
    
    const globalProgress = totalItemsCount === 0 ? 0 : Math.round((completedItemsCount / totalItemsCount) * 100);

    // Honeycomb Chunking [3, 2, 3, 2...] with Placeholder padding for strict alignment
    const rows = [];
    let i = 0;
    let rowLen = 3;
    while (i < currentList.length) {
        let chunk = currentList.slice(i, i + rowLen);
        // Pad with placeholders to force correct honeycomb grid placement
        while (chunk.length < rowLen) {
            chunk.push({ id: `placeholder_${Math.random()}`, isPlaceholder: true });
        }
        rows.push(chunk);
        i += rowLen;
        rowLen = rowLen === 3 ? 2 : 3;
    }

    if (loading) return <div className="p-10 text-center font-bold text-slate-400">Arı peteği örülüyor...</div>;

    return (
        <div className="subject-study-container">
            <div className="map-header">
                <div className="map-header-top">
                    <div>
                        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <LayoutGrid className="text-primary" size={24} /> Konular
                        </h2>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">Konuları tamamla, petekleri aydınlat.</p>
                    </div>
                    {isTeacherMode && (
                        <button 
                            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${isEditingGlobal ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}
                            onClick={() => setIsEditingGlobal(!isEditingGlobal)}
                        >
                            {isEditingGlobal ? <X size={16}/> : <Edit3 size={16}/>}
                            {isEditingGlobal ? 'Kapat' : 'Düzenle'}
                        </button>
                    )}
                </div>

                <div className="map-filters mt-4 flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                        <select className="map-filter-btn outline-none m-0" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                            {examsList.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                        {isTeacherMode && isEditingGlobal && examsList.length > 1 && (
                            <button onClick={() => handleDeleteCategory('exam', selectedExam)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <select className="map-filter-btn outline-none m-0" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                            {subjectsList.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        {isTeacherMode && isEditingGlobal && subjectsList.length > 1 && (
                            <button onClick={() => handleDeleteCategory('subject', selectedSubject)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Admin Management Tools */}
                {isTeacherMode && isEditingGlobal && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/50 pt-4">
                        <button onClick={() => handleAddCategory('exam')} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 flex items-center gap-1">
                            <Plus size={14}/> Sınav Ekle
                        </button>
                        <button onClick={() => handleAddCategory('subject')} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 flex items-center gap-1">
                            <Plus size={14}/> Ders Ekle
                        </button>
                        <button onClick={handleAddTopic} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[11px] font-bold hover:bg-emerald-100 flex items-center gap-1">
                            <Plus size={14}/> Yeni Petek (Konu) Ekle
                        </button>
                    </div>
                )}

                <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1.5 px-1">
                        <span>Tamamlanan: {completedItemsCount}/{totalItemsCount}</span>
                        <span>%{globalProgress}</span>
                    </div>
                    <div className="progress-bar-wrapper">
                        <div className="progress-bar-fill" style={{ width: `${globalProgress}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="honeycomb-container">
                {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="honeycomb-row">
                        {row.map(topic => {
                            if (topic.isPlaceholder) {
                                return <div key={topic.id} style={{ width: '90px', height: '104px' }}></div>;
                            }

                            const subs = topic.subtopics || [];
                            let pct = 0;
                            if (subs.length === 0) {
                                pct = completedItems.includes(topic.id) ? 100 : 0;
                            } else {
                                const compSubs = subs.filter(s => completedItems.includes(s.id)).length;
                                pct = Math.round((compSubs / subs.length) * 100);
                            }
                            
                            const isCompleted = pct === 100;
                            
                            return (
                                <div 
                                    key={topic.id} 
                                    className={`hex-wrapper ${isCompleted ? 'status-completed' : ''} ${pct > 0 && pct < 100 ? 'status-current' : ''}`}
                                    onClick={() => setActiveTopic(topic)}
                                >
                                    <div className="hex-outer">
                                        <div className="hex-inner">
                                            {isTeacherMode && isEditingGlobal && (
                                                <button className="admin-badge" onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }}>
                                                    <Trash2 size={12}/>
                                                </button>
                                            )}
                                            
                                            <div className="hex-fill" style={{ height: `${pct}%` }}></div>
                                            
                                            <span className="hex-index">{topic.order}</span>
                                            <span className="hex-label">{topic.title}</span>
                                            {subs.length > 0 && (
                                                <span className="hex-progress-text">{pct}%</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* BOTTOM SHEET MODAL (Portal) */}
            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {activeTopic && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="bottom-sheet-backdrop"
                            onClick={() => setActiveTopic(null)}
                        >
                            <motion.div 
                                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bottom-sheet-content"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="bottom-sheet-handle" onClick={() => setActiveTopic(null)}></div>
                                
                                <h3 className="text-xl font-black text-slate-800 mb-1">{activeTopic.title}</h3>
                                <p className="text-xs font-bold text-slate-400 mb-6">Detaylar ve Alt Başlıklar</p>

                                <div className="space-y-2 mb-6">
                                    {(activeTopic.subtopics || []).length === 0 ? (
                                        <div 
                                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer"
                                            onClick={() => handleToggleItem(activeTopic.id)}
                                        >
                                            <span className="font-bold text-sm text-slate-700">Tüm konuyu tamamla</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${completedItems.includes(activeTopic.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                                {completedItems.includes(activeTopic.id) && <CheckCircle2 size={16} className="text-white"/>}
                                            </div>
                                        </div>
                                    ) : (
                                        (activeTopic.subtopics || []).map(sub => {
                                            const isDone = completedItems.includes(sub.id);
                                            return (
                                                <div 
                                                    key={sub.id} 
                                                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-colors ${isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
                                                    onClick={() => handleToggleItem(sub.id)}
                                                >
                                                    <span className={`font-bold text-sm ${isDone ? 'text-emerald-700' : 'text-slate-700'}`}>{sub.title}</span>
                                                    <div className="flex items-center gap-3">
                                                        {isTeacherMode && isEditingGlobal && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSubtopic(activeTopic.id, sub.id); }}
                                                                className="text-red-400 hover:text-red-600 p-1"
                                                            ><Trash2 size={16}/></button>
                                                        )}
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                                            {isDone && <CheckCircle2 size={16} className="text-white"/>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {isTeacherMode && isEditingGlobal && (
                                    <button 
                                        onClick={() => handleAddSubtopic(activeTopic.id)}
                                        className="w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400"
                                    >
                                        <Plus size={18}/> Alt Başlık Ekle
                                    </button>
                                )}

                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
            {/* CUSTOM PROMPT/CONFIRM MODAL (Portal) */}
            {typeof window !== 'undefined' && modalConfig && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                    >
                        <h3 className="text-xl font-black text-slate-800 mb-2">{modalConfig.title}</h3>
                        {modalConfig.type === 'confirm' && <p className="text-slate-500 font-medium mb-6 text-sm">{modalConfig.message}</p>}
                        
                        {modalConfig.type === 'prompt' && (
                            <input 
                                type="text"
                                autoFocus
                                placeholder={modalConfig.placeholder}
                                value={modalInputValue}
                                onChange={e => setModalInputValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        modalConfig.onConfirm(modalInputValue);
                                        setModalConfig(null);
                                        setModalInputValue('');
                                    }
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-primary focus:bg-white transition-all rounded-2xl px-4 py-3 mb-6 outline-none font-bold text-slate-700"
                            />
                        )}

                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={() => { setModalConfig(null); setModalInputValue(''); }}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={() => {
                                    modalConfig.onConfirm(modalInputValue);
                                    setModalConfig(null);
                                    setModalInputValue('');
                                }}
                                className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${modalConfig.type === 'confirm' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-primary hover:bg-primary/90 shadow-primary/30'}`}
                            >
                                Onayla
                            </button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SubjectStudyView;
