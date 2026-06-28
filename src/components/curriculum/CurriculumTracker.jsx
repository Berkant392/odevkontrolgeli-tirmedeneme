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
    const [openTopics, setOpenTopics] = useState({});

    const togglePanel = (id) => {
        setOpenTopics(prev => ({
            ...prev,
            [id]: prev[id] === false ? true : false
        }));
    };

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

    const getStats = () => {
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
        const overallProgress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
        return { totalItems, completedItems, overallProgress };
    };

    const getTopicProgress = (topic) => {
        if (topic.subTopics && topic.subTopics.length > 0) { const comp = topic.subTopics.filter(st => st.isCompleted).length; return Math.round((comp / topic.subTopics.length) * 100); }
        return topic.isCompleted ? 100 : 0;
    };

    const { totalItems, completedItems, overallProgress } = getStats();

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
        <div className={`curriculum-premium-container animate-scale-in max-w-4xl mx-auto mt-2 relative z-10 ${isVip ? 'vip-mode' : ''}`}>
            {/* HERO ALANI */}
            <section className="hero">
                <div className="hero-main">
                    <div className="hero-icon">
                        <svg viewBox="0 0 24 24"><path d="M4 19.5V5.8A2.8 2.8 0 0 1 6.8 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M8 7h8"/></svg>
                    </div>
                    <div className="hero-copy">
                        <h2>Müfredat Takibi</h2>
                        <p>{getSafeText(cls?.className)} sınıfı için konu ilerlemesini takip et.</p>
                    </div>
                </div>

                <div className="hero-progress">
                    <div className="progress-head">
                        <span>Genel ilerleme</span>
                        <strong>%{overallProgress}</strong>
                    </div>
                    <div className="progress" style={{"--value": `${overallProgress}%`}}><span></span></div>
                </div>

                <div className="summary-grid">
                    <div className="mini-stat">
                        <svg viewBox="0 0 24 24" stroke="var(--curr-purple)"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                        <strong>{totalItems}</strong>
                        <span>Konu</span>
                    </div>
                    <div className="mini-stat">
                        <svg viewBox="0 0 24 24" stroke="var(--curr-green)"><path d="M20 6 9 17l-5-5"/></svg>
                        <strong>{completedItems}</strong>
                        <span>Biten</span>
                    </div>
                    <div className="mini-stat">
                        <svg viewBox="0 0 24 24" stroke="var(--curr-orange)"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                        <strong>{totalItems - completedItems}</strong>
                        <span>Kalan</span>
                    </div>
                </div>
            </section>

            {/* Yeni Konu Ekleme Barı */}
            {isTeacherMode && (
                <div className="flex flex-col md:flex-row gap-2 mb-4 md:mb-8">
                    <input type="text" placeholder="Yeni Ana Konu Başlığı (Örn: Türev)..." className="flex-1 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-sm md:text-lg focus:border-primary outline-none font-bold text-slate-800 shadow-sm transition-all" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} onKeyDown={e => e.key==='Enter' && addTopic(newTopicTitle)}/>
                    <div className="flex gap-2">
                        <button onClick={()=>setShowLibModal(true)} className="flex-1 bg-purple-50 hover:bg-purple-100 text-primary px-4 py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"><Library size={16}/> KÜTÜPHANE</button>
                        <button onClick={()=>addTopic(newTopicTitle)} className="flex-1 bg-primary hover:bg-purple-700 text-white px-5 py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-black shadow-glow transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"><Plus size={18}/> EKLE</button>
                    </div>
                </div>
            )}

            <div className="section-head">
                <strong>Konu listesi</strong>
                <span>{localCurriculum.length} başlık</span>
            </div>

            <section className="curriculum-card">
                {localCurriculum.length === 0 ? (
                    <div className="text-center py-6 text-xs md:text-sm font-bold text-slate-400">Henüz hiç konu eklenmemiş.</div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="curriculum-board" type="topic">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="topic-stack">
                                    {localCurriculum.map((topic, index) => {
                                        const totalSubCount = topic.subTopics?.length || 0;
                                        const completedSubCount = topic.subTopics?.filter(st => st.isCompleted).length || 0;
                                        const tProgress = getTopicProgress(topic);
                                        const isEditingThisTopic = editingTopicId === topic.id;
                                        
                                        let cardStateClass = "waiting";
                                        if (tProgress === 100 || (totalSubCount === 0 && topic.isCompleted)) cardStateClass = "done";
                                        else if (tProgress > 0 || (totalSubCount === 0 && !topic.isCompleted && isTeacherMode)) cardStateClass = "active";
                                        
                                        const isOpen = openTopics[topic.id] !== false; // Default open

                                        return (
                                            <Draggable key={topic.id} draggableId={topic.id} index={index} isDragDisabled={!isTeacherMode}>
                                                {(provided, snapshot) => (
                                                    <article 
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                                        className={`topic-card ${cardStateClass} ${isOpen ? 'open' : ''} ${snapshot.isDragging ? 'shadow-xl z-50' : ''}`}
                                                    >
                                                        <div className="topic-head" onClick={(e) => {
                                                            if(!isEditingThisTopic) togglePanel(topic.id);
                                                        }}>
                                                            <div className="topic-title w-full">
                                                                {isEditingThisTopic ? (
                                                                     <div className="flex items-center gap-1.5 w-full max-w-md mb-1" onClick={e => e.stopPropagation()}>
                                                                         <input type="text" autoFocus className="curriculum-input flex-1 bg-white border-2 border-primary rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 outline-none shadow-sm" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditTopic(topic.id)} />
                                                                         <button onClick={() => saveEditTopic(topic.id)} className="p-2 bg-successGreen text-white rounded-xl shadow-sm"><Check size={14}/></button>
                                                                         <button onClick={() => setEditingTopicId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-xl"><X size={14}/></button>
                                                                     </div>
                                                                ) : (
                                                                     <div className="flex flex-col gap-1 w-full relative group/topic">
                                                                        <div className="flex items-center gap-2">
                                                                            {isTeacherMode && <div {...provided.dragHandleProps} onClick={e=>e.stopPropagation()} className="cursor-grab text-slate-300 hover:text-primary"><GripVertical size={16} /></div>}
                                                                            <h2>{topic.title}</h2>
                                                                            {isTeacherMode && (
                                                                                <div className="opacity-0 group-hover/topic:opacity-100 flex items-center gap-0.5 transition-all ml-auto absolute right-0 top-0 bg-white/80 px-2 rounded-lg backdrop-blur-sm" onClick={e=>e.stopPropagation()}>
                                                                                    <button onClick={() => { if(saveToLibrary) { saveToLibrary(topic); alert("Kütüphaneye kaydedildi!"); } }} className="p-1 text-slate-400 hover:text-blue-500"><Save size={14}/></button>
                                                                                    <button onClick={() => startEditTopic(topic.id, topic.title)} className="p-1 text-slate-400 hover:text-primary"><Pencil size={14}/></button>
                                                                                    <button onClick={() => deleteTopic(topic.id)} className="p-1 text-slate-400 hover:text-errorRed"><Trash2 size={14}/></button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {totalSubCount > 0 ? <p>{completedSubCount}/{totalSubCount} alt konu tamamlandı</p> : <p className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleTopic(topic.id); }}>{topic.isCompleted ? 'Tamamlandı (Geri al)' : 'Bekliyor (Tamamla)'}</p>}
                                                                     </div>
                                                                )}
                                                            </div>
                                                            <div className="topic-side">
                                                                <div className="topic-percent">%{tProgress}</div>
                                                                <div className="collapse-icon">
                                                                    <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {totalSubCount > 0 && (
                                                            <div className="topic-progress">
                                                                <div className="topic-bar" style={{"--value": `${tProgress}%`}}><span></span></div>
                                                                <div className="topic-count">{completedSubCount}/{totalSubCount}</div>
                                                            </div>
                                                        )}

                                                        <div className="subpanel">
                                                            <Droppable droppableId={topic.id} type="subtopic">
                                                                 {(provided) => (
                                                                      <div {...provided.droppableProps} ref={provided.innerRef} className="subpanel-inner">
                                                                          {topic.subTopics?.map((sub, subIndex) => {
                                                                              const isEditingThisSub = editingSubTopicId === sub.id;
                                                                              const topicStateClass = sub.isCompleted ? 'done' : '';
                                                                              const stateText = sub.isCompleted ? 'Bitti' : 'Bekliyor';
                                                                              return (
                                                                                   <Draggable key={sub.id} draggableId={sub.id} index={subIndex} isDragDisabled={!isTeacherMode}>
                                                                                       {(provided, snapshot) => (
                                                                                            <div 
                                                                                                ref={provided.innerRef} 
                                                                                                {...provided.draggableProps} 
                                                                                                {...provided.dragHandleProps}
                                                                                                style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                                                                                                className={`subitem group/sub ${topicStateClass} ${snapshot.isDragging ? 'shadow-md z-50 rounded-[16px]' : ''}`}
                                                                                            >
                                                                                                <div className="sub-check" onClick={() => toggleSubTopic(topic.id, sub.id)}>
                                                                                                    {sub.isCompleted && <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>}
                                                                                                </div>
                                                                                                
                                                                                                {isEditingThisSub ? (
                                                                                                    <div className="flex items-center gap-1 w-full max-w-sm col-span-2">
                                                                                                        <input type="text" autoFocus className="curriculum-input flex-1 bg-white border border-primary rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditSub(topic.id, sub.id)} />
                                                                                                        <button onClick={() => saveEditSub(topic.id, sub.id)} className="p-1 bg-successGreen text-white rounded-md"><Check size={12}/></button>
                                                                                                        <button onClick={() => setEditingSubTopicId(null)} className="p-1 bg-slate-200 text-slate-600 rounded-md"><X size={12}/></button>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <div className="subcopy">
                                                                                                            <strong>{sub.title}</strong>
                                                                                                            <span>{sub.isCompleted ? 'Kazanım tamamlandı' : 'Henüz tamamlanmadı'}</span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <div className="sub-status">{stateText}</div>
                                                                                                            {isTeacherMode && (
                                                                                                                <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-0.5 transition-all">
                                                                                                                    <button onClick={() => startEditSub(sub.id, sub.title)} className="p-1 text-slate-400 hover:text-primary"><Pencil size={14}/></button>
                                                                                                                    <button onClick={() => deleteSubTopic(topic.id, sub.id)} className="p-1 text-slate-400 hover:text-errorRed"><Trash2 size={14}/></button>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                       )}
                                                                                   </Draggable>
                                                                              );
                                                                          })}
                                                                          {provided.placeholder}
                                                                          {isTeacherMode && (
                                                                              <div className="flex items-center gap-2 mt-1 opacity-50 focus-within:opacity-100 transition-opacity ml-12">
                                                                                  <CornerDownRight size={14} className="text-slate-400" />
                                                                                  <input type="text" placeholder="Alt başlık ekle..." className="curriculum-input flex-1 text-xs font-bold focus:outline-none" value={newSubTopicTitles[topic.id] || ""} onChange={e => setNewSubTopicTitles(p => ({...p, [topic.id]: e.target.value}))} onKeyDown={e => e.key==='Enter' && addSubTopic(topic.id)}/>
                                                                              </div>
                                                                          )}
                                                                      </div>
                                                                 )}
                                                            </Droppable>
                                                        </div>
                                                    </article>
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
            </section>

            {/* KÜTÜPHANEDEN BLOK EKLEME MODALI */}
            {showLibModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-slate-200 animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-sm md:text-lg text-slate-800 flex items-center gap-1.5"><Library className="text-primary"/> Kütüphaneden Konu Seç</h3>
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
                                            className="px-3 py-1.5 bg-purple-50 text-primary font-bold text-xs rounded-lg hover:bg-primary hover:text-white"
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
