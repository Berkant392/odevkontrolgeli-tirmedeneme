import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, GripVertical, GripHorizontal } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const CurriculumTracker = ({ curriculum = [], onUpdate }) => {
  const [localCurriculum, setLocalCurriculum] = useState([]);
  
  // Düzenleme State'leri
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editTopicName, setEditTopicName] = useState("");
  const [editingSubTopic, setEditingSubTopic] = useState({ topicId: null, subIndex: null });
  const [editSubTopicName, setEditSubTopicName] = useState("");
  
  // Ekleme State'leri
  const [newTopicName, setNewTopicName] = useState("");
  const [addingSubTo, setAddingSubTo] = useState(null);
  const [newSubName, setNewSubName] = useState("");

  // Dışarıdan gelen veriyi kontrol edip eksik ID varsa tamamlayarak local state'e alıyoruz
  useEffect(() => {
    if (curriculum && Array.isArray(curriculum)) {
      const sanitized = JSON.parse(JSON.stringify(curriculum)).map((topic, index) => ({
        ...topic,
        id: topic.id ? String(topic.id) : `topic_auto_${index}_${Date.now()}`,
        subTopics: topic.subTopics || []
      }));
      setLocalCurriculum(sanitized);
    } else {
      setLocalCurriculum([]);
    }
  }, [curriculum]);

  // ==========================================
  // SÜRÜKLE BIRAK (DND) MANTIĞI
  // ==========================================
  const handleDragEnd = (result) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newCurriculum = Array.from(localCurriculum);

    // 1. ANA BAŞLIK TAŞIMA İŞLEMİ
    if (type === 'topic') {
      const [movedTopic] = newCurriculum.splice(source.index, 1);
      newCurriculum.splice(destination.index, 0, movedTopic);
      
      setLocalCurriculum(newCurriculum);
      if (onUpdate) onUpdate(newCurriculum);
      return;
    }

    // 2. ALT BAŞLIK TAŞIMA İŞLEMİ
    if (type === 'subtopic') {
      const sourceTopicIndex = newCurriculum.findIndex(t => t.id === source.droppableId);
      const destTopicIndex = newCurriculum.findIndex(t => t.id === destination.droppableId);

      if (sourceTopicIndex === -1 || destTopicIndex === -1) return;

      const sourceTopic = newCurriculum[sourceTopicIndex];
      const destTopic = newCurriculum[destTopicIndex];

      const sourceSubTopics = Array.from(sourceTopic.subTopics || []);
      const destSubTopics = source.droppableId === destination.droppableId 
        ? sourceSubTopics 
        : Array.from(destTopic.subTopics || []);

      const [movedSub] = sourceSubTopics.splice(source.index, 1);
      destSubTopics.splice(destination.index, 0, movedSub);

      newCurriculum[sourceTopicIndex] = { ...sourceTopic, subTopics: sourceSubTopics };
      if (source.droppableId !== destination.droppableId) {
        newCurriculum[destTopicIndex] = { ...destTopic, subTopics: destSubTopics };
      }

      setLocalCurriculum(newCurriculum);
      if (onUpdate) onUpdate(newCurriculum);
    }
  };

  // ==========================================
  // CRUD İŞLEMLERİ (Ekleme, Silme, Düzenleme)
  // ==========================================
  const handleAddTopic = () => {
    if (!newTopicName.trim()) return;
    const newTopic = {
      id: `topic_${Date.now()}`,
      title: newTopicName.trim(),
      subTopics: []
    };
    const updated = [...localCurriculum, newTopic];
    setLocalCurriculum(updated);
    if (onUpdate) onUpdate(updated);
    setNewTopicName("");
  };

  const handleDeleteTopic = (topicId) => {
    if(window.confirm('Bu ana başlığı ve tüm alt başlıklarını silmek istediğinize emin misiniz?')) {
        const updated = localCurriculum.filter(t => t.id !== topicId);
        setLocalCurriculum(updated);
        if (onUpdate) onUpdate(updated);
    }
  };

  const handleSaveTopicEdit = (topicId) => {
    if (!editTopicName.trim()) return;
    const updated = localCurriculum.map(t => 
      t.id === topicId ? { ...t, title: editTopicName.trim() } : t
    );
    setLocalCurriculum(updated);
    if (onUpdate) onUpdate(updated);
    setEditingTopicId(null);
  };

  const handleAddSubTopic = (topicId) => {
    if (!newSubName.trim()) return;
    const updated = localCurriculum.map(t => {
      if (t.id === topicId) {
        return { ...t, subTopics: [...(t.subTopics || []), newSubName.trim()] };
      }
      return t;
    });
    setLocalCurriculum(updated);
    if (onUpdate) onUpdate(updated);
    setNewSubName("");
    setAddingSubTo(null);
  };

  const handleDeleteSubTopic = (topicId, subIndex) => {
    const updated = localCurriculum.map(t => {
      if (t.id === topicId) {
        const newSubs = [...t.subTopics];
        newSubs.splice(subIndex, 1);
        return { ...t, subTopics: newSubs };
      }
      return t;
    });
    setLocalCurriculum(updated);
    if (onUpdate) onUpdate(updated);
  };

  const handleSaveSubTopicEdit = (topicId, subIndex) => {
    if (!editSubTopicName.trim()) return;
    const updated = localCurriculum.map(t => {
      if (t.id === topicId) {
        const newSubs = [...t.subTopics];
        newSubs[subIndex] = editSubTopicName.trim();
        return { ...t, subTopics: newSubs };
      }
      return t;
    });
    setLocalCurriculum(updated);
    if (onUpdate) onUpdate(updated);
    setEditingSubTopic({ topicId: null, subIndex: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Yeni Ana Başlık (Örn: TYT Matematik)"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          value={newTopicName}
          onChange={(e) => setNewTopicName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
        />
        <button
          onClick={handleAddTopic}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Ekle
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="topic">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-4"
            >
              {localCurriculum.map((topic, index) => (
                <Draggable key={topic.id} draggableId={topic.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-slate-800 rounded-xl border transition-all duration-200 ${
                        snapshot.isDragging 
                          ? 'border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-[1.02] z-50' 
                          : 'border-slate-700'
                      }`}
                    >
                      <div className="p-4 border-b border-slate-700 flex items-center justify-between group">
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-indigo-400 transition-colors p-1"
                          >
                            <GripVertical size={20} />
                          </div>
                          
                          {editingTopicId === topic.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                                value={editTopicName}
                                onChange={(e) => setEditTopicName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTopicEdit(topic.id)}
                              />
                              <button onClick={() => handleSaveTopicEdit(topic.id)} className="text-green-500 hover:text-green-400 p-1">
                                <Save size={18} />
                              </button>
                              <button onClick={() => setEditingTopicId(null)} className="text-red-500 hover:text-red-400 p-1">
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-white flex-1">{topic.title}</h3>
                          )}
                        </div>

                        {!editingTopicId && (
                          <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setEditingTopicId(topic.id); setEditTopicName(topic.title); }}
                              className="text-slate-400 hover:text-indigo-400 p-1"
                              title="Başlığı Düzenle"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTopic(topic.id)}
                              className="text-slate-400 hover:text-red-400 p-1"
                              title="Başlığı Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-800/50 rounded-b-xl">
                        <Droppable droppableId={topic.id} type="subtopic">
                          {(provided, snapshot) => (
                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className={`space-y-2 min-h-[50px] transition-colors rounded-lg p-2 ${
                                snapshot.isDraggingOver ? 'bg-slate-700/50 border border-dashed border-indigo-500/50' : ''
                              }`}
                            >
                              {topic.subTopics?.map((sub, subIndex) => (
                                <Draggable 
                                  key={`${topic.id}-${subIndex}-${sub}`} 
                                  draggableId={`${topic.id}-${subIndex}-${sub}`} 
                                  index={subIndex}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 group/sub ${
                                        snapshot.isDragging 
                                          ? 'bg-indigo-900/40 border border-indigo-500 shadow-lg scale-[1.02] z-50' 
                                          : 'bg-slate-900 border border-slate-700/50 hover:border-slate-600'
                                      }`}
                                    >
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-indigo-400 p-1"
                                      >
                                        <GripHorizontal size={16} />
                                      </div>

                                      {editingSubTopic.topicId === topic.id && editingSubTopic.subIndex === subIndex ? (
                                        <div className="flex items-center gap-2 flex-1">
                                          <input
                                            type="text"
                                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                            value={editSubTopicName}
                                            onChange={(e) => setEditSubTopicName(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveSubTopicEdit(topic.id, subIndex)}
                                          />
                                          <button onClick={() => handleSaveSubTopicEdit(topic.id, subIndex)} className="text-green-500 hover:text-green-400">
                                            <Save size={16} />
                                          </button>
                                          <button onClick={() => setEditingSubTopic({ topicId: null, subIndex: null })} className="text-red-500 hover:text-red-400">
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="text-sm text-slate-300 flex-1">{sub}</span>
                                          <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                            <button 
                                              onClick={() => {
                                                setEditingSubTopic({ topicId: topic.id, subIndex });
                                                setEditSubTopicName(sub);
                                              }}
                                              className="text-slate-500 hover:text-indigo-400 p-1"
                                            >
                                              <Edit2 size={14} />
                                            </button>
                                            <button 
                                              onClick={() => handleDeleteSubTopic(topic.id, subIndex)}
                                              className="text-slate-500 hover:text-red-400 p-1"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>

                        {addingSubTo === topic.id ? (
                          <div className="mt-3 flex items-center gap-2 pl-8">
                            <input
                              type="text"
                              placeholder="Alt başlık adı..."
                              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleAddSubTopic(topic.id)}
                            />
                            <button 
                              onClick={() => handleAddSubTopic(topic.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                            <button 
                              onClick={() => { setAddingSubTo(null); setNewSubName(""); }}
                              className="bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingSubTo(topic.id)}
                            className="mt-3 ml-8 text-sm text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                          >
                            <Plus size={14} />
                            Alt Başlık Ekle
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default CurriculumTracker;
