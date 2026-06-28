import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, CheckSquare, Square, CornerDownRight, Pencil, Check, Library, Save, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { generateId } from '../../utils/helpers';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

// 🛡️ MUTLAK ZIRH: React Object Render Hatasını Sonsuza Dek Engeller
const getSafeText = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        if (val.title) return getSafeText(val.title);
        if (val.text) return getSafeText(val.text);
        if (val.name) return getSafeText(val.name);
        return "İsimsiz";
    }
    return String(val);
};

const CurriculumTracker = ({ cls, updateClassInDb, isTeacherMode, libraryItems = [], saveToLibrary }) => {
    const [localCurriculum, setLocalCurriculum] = useState([]);
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newSubTopicTitles, setNewSubTopicTitles] = useState({});
    
    // Düzenleme State'leri
    const [editingTopicId, setEditingTopicId] = useState(null);
    const [editingSubTopicId, setEditingSubTopicId] = useState(null);
    const [editVal, setEditVal] = useState("");

    const [showLibModal, setShowLibModal] = useState(false);

    const isVip = cls?.type === 'vip' && !isTeacherMode;

    // Kütüphane modalı açıkken scroll'u kilitle
    useEffect(() => {
        if (showLibModal) {
            lockScroll();
        }
        return () => {
            if (showLibModal) {
                unlockScroll();
            }
        };
    }, [showLibModal]);

    // Veri Kalkanı (Sanitizer)
    useEffect(() => {
        if (cls && cls.curriculum && Array.isArray(cls.curriculum)) {
            const sanitized = cls.curriculum.map((topic, tIdx) => {
                const topicId = (topic && topic.id && typeof topic.id !== 'object') ? String(topic.id) : `curr_${tIdx}_${Math.random().toString(36).substr(2, 9)}`;
                return {
                    ...topic,
                    id: topicId,
                    title: getSafeText(topic),
                    isCompleted: !!topic?.isCompleted,
                    subTopics: Array.isArray(topic?.subTopics) ? topic.subTopics.map((sub, sIdx) => {
                        const subId = (sub && sub.id && typeof sub.id !== 'object') ? String(sub.id) : `sub_${topicId}_${sIdx}_${Math.random().toString(36).substr(2, 9)}`;
                        return {
                            id: subId,
                            title: getSafeText(sub),
                            isCompleted: typeof sub === 'object' ? !!sub?.isCompleted : false
                        };
                    }) : []
                };
            });
            setLocalCurriculum(sanitized);
        } else {
            setLocalCurriculum([]);
        }
    }, [cls?.curriculum]);

    const calculateOverallProgress = () => {
        if (!localCurriculum.length) return 0;
        let totalItems = 0; let completedItems = 0;
        localCurriculum.forEach(t => { 
            if (t.subTopics && t.subTopics.length > 0) { 
                totalItems += t.subTopics.length; 
                completedItems += t.subTopics.filter(st => st.isCompleted).length; 
            } else { 
                totalItems += 1; 
                if (t.isCompleted) completedItems += 1; 
            } 
        });
        return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
    };

    const getTopicProgress = (topic) => {
        if (topic.subTopics && topic.subTopics.length > 0) { const comp = topic.subTopics.filter(st => st.isCompleted).length; return Math.round((comp / topic.subTopics.length) * 100); }
        return topic.isCompleted ? 100 : 0;
    };

    const overallProgress = calculateOverallProgress();

    // DND MANTIĞI
    const handleDragEnd = (result) => {
        const { source, destination, type } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const newCurriculum = Array.from(localCurriculum);

        if (type === 'topic') {
            const [movedTopic] = newCurriculum.splice(source.index, 1);
            newCurriculum.splice(destination.index, 0, movedTopic);
            setLocalCurriculum(newCurriculum);
            updateClassInDb({ ...cls, curriculum: newCurriculum });
            return;
        }

        if (type === 'subtopic') {
            const sourceTopicIndex = newCurriculum.findIndex(t => t.id === source.droppableId);
            const destTopicIndex = newCurriculum.findIndex(t => t.id === destination.droppableId);
            if (sourceTopicIndex === -1 || destTopicIndex === -1) return;

            const sourceTopic = newCurriculum[sourceTopicIndex];
            const destTopic = newCurriculum[destTopicIndex];
            const sourceSubTopics = Array.from(sourceTopic.subTopics || []);
            const destSubTopics = source.droppableId === destination.droppableId ? sourceSubTopics : Array.from(destTopic.subTopics || []);

            const [movedSub] = sourceSubTopics.splice(source.index, 1);
            destSubTopics.splice(destination.index, 0, movedSub);

            newCurriculum[sourceTopicIndex] = { ...sourceTopic, subTopics: sourceSubTopics };
            if (source.droppableId !== destination.droppableId) {
                newCurriculum[destTopicIndex] = { ...destTopic, subTopics: destSubTopics };
            }

            setLocalCurriculum(newCurriculum);
            updateClassInDb({ ...cls, curriculum: newCurriculum });
        }
    };

    // CRUD İŞLEMLERİ
    const addTopic = (title) => { 
        if(!title.trim()) return; 
        const updated = [...localCurriculum, { id: generateId('curr'), title: getSafeText(title.trim()), isCompleted: false, subTopics: [] }]; 
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); setNewTopicTitle(""); 
    };

    const addSubTopic = (topicId) => { 
        const title = newSubTopicTitles[topicId]; 
        if(!title || !title.trim()) return; 
        const updated = localCurriculum.map(t => { 
            if(t.id === topicId) return { ...t, subTopics: [...(t.subTopics||[]), { id: generateId('sub'), title: getSafeText(title.trim()), isCompleted: false }] }; 
            return t; 
        }); 
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); setNewSubTopicTitles(p => ({...p, [topicId]: ""})); 
    };

    const toggleTopic = (topicId) => { 
        if(!isTeacherMode) return; 
        const updated = localCurriculum.map(t => { 
            if(t.id === topicId) { const newStatus = !t.isCompleted; return { ...t, isCompleted: newStatus, subTopics: (t.subTopics || []).map(st => ({ ...st, isCompleted: newStatus })) }; } 
            return t; 
        }); 
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); 
    };

    const toggleSubTopic = (topicId, subTopicId) => { 
        if(!isTeacherMode) return; 
        const updated = localCurriculum.map(t => { 
            if(t.id === topicId) { 
                const newSubs = (t.subTopics || []).map(st => st.id === subTopicId ? { ...st, isCompleted: !st.isCompleted } : st); 
                const allDone = newSubs.length > 0 && newSubs.every(st => st.isCompleted); 
                return { ...t, isCompleted: allDone, subTopics: newSubs }; 
            } 
            return t; 
        }); 
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); 
    };

    const deleteTopic = (topicId) => {
        const updated = localCurriculum.filter(t => t.id !== topicId);
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated });
    };

    const deleteSubTopic = (topicId, subTopicId) => { 
        const updated = localCurriculum.map(t => { if(t.id === topicId) return { ...t, subTopics: (t.subTopics || []).filter(st => st.id !== subTopicId) }; return t; }); 
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); 
    };

    const startEditTopic = (id, title) => { setEditingTopicId(id); setEditVal(getSafeText(title)); setEditingSubTopicId(null); };
    const saveEditTopic = (id) => {
        if(!editVal.trim()) { setEditingTopicId(null); return; }
        const updated = localCurriculum.map(t => t.id === id ? { ...t, title: getSafeText(editVal.trim()) } : t);
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); setEditingTopicId(null);
    };

    const startEditSub = (id, title) => { setEditingSubTopicId(id); setEditVal(getSafeText(title)); setEditingTopicId(null); };
    const saveEditSub = (topicId, subId) => {
        if(!editVal.trim()) { setEditingSubTopicId(null); return; }
        const updated = localCurriculum.map(t => { 
            if(t.id === topicId) { return { ...t, subTopics: t.subTopics.map(st => st.id === subId ? { ...st, title: getSafeText(editVal.trim()) } : st) }; } 
            return t; 
        });
        setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); setEditingSubTopicId(null);
    };

    const getItemStyle = (isDragging, draggableStyle) => ({
        ...draggableStyle,
        ...(isDragging && { left: "auto !important", top: "auto !important" })
    });

    return (
        <div className="animate-scale-in max-w-4xl mx-auto mt-2 relative z-10">
            {/* Üst İlerleme Kartı */}
            <div className={`p-4 md:p-8 rounded-2xl md:rounded-3xl mb-4 md:mb-8 ${isVip ? 'bg-slate-700 border border-slate-600 shadow-lg' : 'bg-white border border-slate-100 shadow-float'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl ${isVip ? 'bg-slate-800 text-vipGold' : 'bg-purple-50 text-brandPurple'}`}>
                            <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <div className="text-left">
                            <h2 className={`text-lg md:text-3xl font-black tracking-tight ${isVip ? 'text-white' : 'text-slate-800'}`}>Müfredat Takibi</h2>
                            <p className={`text-[11px] md:text-base font-medium mt-0.5 ${isVip ? 'text-slate-300' : 'text-slate-500'}`}>{getSafeText(cls?.className)} sınıfı için konu listesi</p>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-64">
                        <div className="flex justify-between text-xs md:text-sm font-black mb-1 md:mb-2">
                            <span className={isVip ? 'text-slate-300' : 'text-slate-600'}>Genel İlerleme</span>
                            <span className={isVip ? 'text-vipGold' : 'text-brandPurple'}>%{overallProgress}</span>
                        </div>
                        <div className={`h-2 md:h-3 w-full rounded-full overflow-hidden ${isVip ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <div className={`h-full transition-all duration-700 ${isVip ? 'bg-gradient-to-r from-vipGold to-yellow-400 shadow-vip-glow' : 'bg-brandPurple shadow-glow'}`} style={{width: `${overallProgress}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yeni Konu Ekleme Barı */}
            {isTeacherMode && (
                <div className="flex flex-col md:flex-row gap-2 mb-4 md:mb-8">
                    <input type="text" placeholder="Yeni Ana Konu Başlığı (Örn: Türev)..." className="flex-1 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-sm md:text-lg focus:border-brandPurple outline-none font-bold text-slate-800 shadow-sm transition-all" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} onKeyDown={e => e.key==='Enter' && addTopic(newTopicTitle)}/>
                    <div className="flex gap-2">
                        <button onClick={()=>setShowLibModal(true)} className="flex-1 bg-purple-50 hover:bg-purple-100 text-brandPurple px-4 py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"><Library size={16}/> KÜTÜPHANE</button>
                        <button onClick={()=>addTopic(newTopicTitle)} className="flex-1 bg-brandPurple hover:bg-purple-700 text-white px-5 py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-black shadow-glow transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"><Plus size={18}/> EKLE</button>
                    </div>
                </div>
            )}

            {/* Ana Liste Kartı */}
            <div className={`rounded-xl md:rounded-3xl p-3.5 md:p-10 ${isVip ? 'bg-slate-700 border border-slate-600 shadow-lg' : 'bg-white border border-slate-100 shadow-float'}`}>
                {localCurriculum.length === 0 ? (
                    <div className="text-center py-6 text-xs md:text-sm font-bold text-slate-400">Henüz hiç konu eklenmemiş.</div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="curriculum-board" type="topic">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 md:space-y-8">
                                    {localCurriculum.map((topic, index) => {
                                        const tProgress = getTopicProgress(topic);
                                        const isEditingThisTopic = editingTopicId === topic.id;
                                        return (
                                            <Draggable key={topic.id} draggableId={topic.id} index={index} isDragDisabled={!isTeacherMode}>
                                                {(provided, snapshot) => (
                                                    <div 
                                                        ref={provided.innerRef} 
                                                        {...provided.draggableProps} 
                                                        style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                                        className={`flex flex-col group/topic rounded-xl transition-all ${snapshot.isDragging ? (isVip ? 'bg-slate-800/80 shadow-2xl scale-[1.01]' : 'bg-slate-50 shadow-2xl scale-[1.01] ring-1 ring-brandPurple/20') : ''}`}
                                                    >
                                                        <div className="flex items-start gap-2.5 md:gap-4 p-1.5 text-left">
                                                            {isTeacherMode && ( <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-brandPurple transition-colors"><GripVertical className="w-5 h-5 md:w-6 md:h-6" /></div> )}
                                                            <button onClick={() => toggleTopic(topic.id)} className={`mt-0.5 flex-shrink-0 transition-colors ${topic.isCompleted ? (isVip ? 'text-vipGold' : 'text-brandPurple') : (isVip ? 'text-slate-400 hover:text-vipGold' : 'text-slate-400 hover:text-brandPurple')} ${!isTeacherMode && 'cursor-default pointer-events-none'}`}>
                                                                {topic.isCompleted ? <CheckSquare className="w-5 h-5 md:w-7 md:h-7" strokeWidth={2.5} /> : <Square className="w-5 h-5 md:w-7 md:h-7" strokeWidth={2.5} />}
                                                            </button>
                                                            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                                                                <div className="flex items-center gap-2.5 w-full md:w-auto flex-1 min-w-0">
                                                                    {isEditingThisTopic ? (
                                                                        <div className="flex items-center gap-1.5 w-full max-w-md">
                                                                            <input type="text" autoFocus className="flex-1 bg-white border-2 border-brandPurple rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 outline-none shadow-sm" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditTopic(topic.id)} />
                                                                            <button onClick={() => saveEditTopic(topic.id)} className="p-2 bg-successGreen text-white rounded-xl shadow-sm"><Check size={14}/></button>
                                                                            <button onClick={() => setEditingTopicId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl"><X size={14}/></button>
                                                                        </div>
                                                                    ) : (
                                                                        <h3 className={`text-sm md:text-2xl font-black truncate tracking-wide ${topic.isCompleted ? (isVip ? 'text-slate-500 line-through decoration-2' : 'text-slate-400/50 line-through decoration-2') : (isVip ? 'text-white' : 'text-slate-800')}`}>{topic.title}</h3>
                                                                    )}
                                                                    {!isEditingThisTopic && ( <span className={`text-[9px] md:text-xs font-black px-2 py-0.5 rounded-md border shrink-0 ${topic.isCompleted ? 'bg-successGreen/10 text-successGreen border-successGreen/20' : (isVip ? 'bg-slate-800 text-vipGold border-slate-600' : 'bg-slate-100 text-slate-500 border-slate-200')}`}>%{tProgress}</span> )}
                                                                </div>
                                                                {isTeacherMode && !isEditingThisTopic && (
                                                                    <div className="opacity-0 group-hover/topic:opacity-100 flex items-center gap-0.5 transition-all">
                                                                        <button onClick={() => { if(saveToLibrary) { saveToLibrary(topic); alert("Kütüphaneye kaydedildi!"); } }} className="p-1.5 text-slate-400 hover:text-blue-500"><Save size={16}/></button>
                                                                        <button onClick={() => startEditTopic(topic.id, topic.title)} className="p-1.5 text-slate-400 hover:text-brandPurple"><Pencil size={16}/></button>
                                                                        <button onClick={() => deleteTopic(topic.id)} className="p-1.5 text-slate-400 hover:text-errorRed"><Trash2 size={16}/></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Alt Başlıklar Bölümü */}
                                                        <Droppable droppableId={topic.id} type="subtopic">
                                                            {(provided) => (
                                                                <div {...provided.droppableProps} ref={provided.innerRef} className="pl-6 md:pl-11 mt-1 space-y-1.5 min-h-[5px]">
                                                                    {topic.subTopics?.map((sub, subIndex) => {
                                                                        const isEditingThisSub = editingSubTopicId === sub.id;
                                                                        return (
                                                                            <Draggable key={sub.id} draggableId={sub.id} index={subIndex} isDragDisabled={!isTeacherMode}>
                                                                                {(provided, snapshot) => (
                                                                                    <div 
                                                                                        ref={provided.innerRef} 
                                                                                        {...provided.draggableProps} 
                                                                                        style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                                                                        className={`flex items-center gap-2 group/sub p-1 md:p-1.5 rounded-lg transition-all ${snapshot.isDragging ? (isVip ? 'bg-slate-900/50 shadow-md scale-[1.01]' : 'bg-slate-50 shadow-md scale-[1.01]') : 'hover-lift'}`}
                                                                                    >
                                                                                        {isTeacherMode && ( <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-brandPurple"><GripVertical className="w-4 h-4 md:w-4 md:h-4" /></div> )}
                                                                                        <button onClick={() => toggleSubTopic(topic.id, sub.id)} className={`mt-0.5 flex-shrink-0 transition-colors ${sub.isCompleted ? (isVip ? 'text-vipGold' : 'text-brandPurple') : (isVip ? 'text-slate-400 hover:text-vipGold' : 'text-slate-400 hover:text-brandPurple')} ${!isTeacherMode && 'cursor-default pointer-events-none'}`}>
                                                                                            {sub.isCompleted ? <CheckSquare className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} /> : <Square className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />}
                                                                                        </button>
                                                                                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                                                                            {isEditingThisSub ? (
                                                                                                <div className="flex items-center gap-1 w-full max-w-sm">
                                                                                                    <input type="text" autoFocus className="flex-1 bg-white border border-brandPurple rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditSub(topic.id, sub.id)} />
                                                                                                    <button onClick={() => saveEditSub(topic.id, sub.id)} className="p-1 bg-successGreen text-white rounded-md"><Check size={12}/></button>
                                                                                                    <button onClick={() => setEditingSubTopicId(null)} className="p-1 bg-slate-200 text-slate-600 rounded-md"><X size={12}/></button>
                                                                                                </div>
                                                                                            ) : ( 
                                                                                                <span className={`text-[11px] md:text-lg font-bold truncate leading-tight ${sub.isCompleted ? (isVip ? 'text-slate-500 line-through' : 'text-slate-400/50 line-through') : (isVip ? 'text-slate-300' : 'text-slate-600')}`}>{sub.title}</span> 
                                                                                            )}
                                                                                            {isTeacherMode && !isEditingThisSub && (
                                                                                                <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-0.5 transition-all">
                                                                                                    <button onClick={() => startEditSub(sub.id, sub.title)} className="p-1 text-slate-300 hover:text-brandPurple"><Pencil size={14}/></button>
                                                                                                    <button onClick={() => deleteSubTopic(topic.id, sub.id)} className="p-1 text-slate-300 hover:text-errorRed"><Trash2 size={14}/></button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </Draggable>
                                                                        );
                                                                    })}
                                                                    {provided.placeholder}
                                                                    {isTeacherMode && (
                                                                        <div className="flex items-center gap-2 mt-1 pl-6 opacity-50 focus-within:opacity-100 transition-opacity">
                                                                            <CornerDownRight size={14} className="text-slate-400" />
                                                                            <input type="text" placeholder="Alt başlık ekle..." className="flex-1 bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none placeholder:text-slate-400" value={newSubTopicTitles[topic.id] || ""} onChange={e => setNewSubTopicTitles(p => ({...p, [topic.id]: e.target.value}))} onKeyDown={e => e.key==='Enter' && addSubTopic(topic.id)}/>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Droppable>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>

            {/* KÜTÜPHANEDEN BLOK EKLEME MODALI */}
            {showLibModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-slate-200 animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-sm md:text-lg text-slate-800 flex items-center gap-1.5"><Library className="text-brandPurple"/> Kütüphaneden Konu Seç</h3>
                            <button onClick={() => setShowLibModal(false)} className="text-slate-400 hover:text-rose-600 bg-white p-1 rounded-full shadow-sm transition-colors"><X size={16}/></button>
                        </div>
                        <div className="p-3 overflow-y-auto bg-slate-50 flex-1 space-y-2">
                            {libraryItems.length === 0 ? (
                                <div className="text-center text-slate-400 py-6 text-xs font-medium">Kütüphane boş.</div>
                            ) : (
                                libraryItems.map(item => (
                                    <div key={item.id} className="bg-white border border-slate-200 p-3 rounded-xl flex justify-between items-center group">
                                        <div className="text-left">
                                            <h4 className="font-bold text-slate-800 text-xs md:text-base">{getSafeText(item)}</h4>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{item.subTopics?.length || 0} Alt Başlık</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newTopic = {
                                                    id: generateId('curr'),
                                                    title: getSafeText(item),
                                                    isCompleted: false,
                                                    subTopics: (item.subTopics || []).map(st => ({ id: generateId('sub'), title: getSafeText(st), isCompleted: false }))
                                                };
                                                const updated = [...localCurriculum, newTopic];
                                                setLocalCurriculum(updated); updateClassInDb({ ...cls, curriculum: updated }); setShowLibModal(false);
                                            }}
                                            className="px-3 py-1.5 bg-purple-50 text-brandPurple font-bold text-xs rounded-lg hover:bg-brandPurple hover:text-white"
                                        >Ekle</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurriculumTracker;
