import React from 'react';
import { motion } from 'framer-motion';
import { Zap, X, MicOff, RefreshCw, Crown, Calendar, StickyNote, AlertTriangle, Save, User } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const AssistantModal = ({
    isListening, speechTranscript, toggleListening,
    assistantFoundStudents, assistantFoundTopics,
    assistantSelectedStudent, setAssistantSelectedStudent,
    assistantDraftGrades, assistantDraftNotes,
    handleDraftGradeChange, handleDraftNoteChange,
    applyAssistantDrafts, onClose, classes
}) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 md:p-4">
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-slate-200"
            >
                <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm"><Zap className="text-primary" size={24}/></div>
                        <div>
                            <h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">Akıllı İşlem Asistanı</h3>
                            <p className="text-xs text-slate-500 font-medium">Tüm sınıflarda ve Özel Derslerde arama yapar</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm hover-lift"><X size={20}/></button>
                </div>
                
                <div className="p-4 bg-white border-b border-slate-100 flex flex-col items-center justify-center min-h-[100px] relative">
                    {isListening ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="wave-bar wave-1"></div><div className="wave-bar wave-2"></div><div className="wave-bar wave-3"></div><div className="wave-bar wave-4"></div><div className="wave-bar wave-5"></div><div className="wave-bar wave-1"></div>
                            </div>
                            <span className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">Sizi Dinliyorum...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-slate-100 rounded-full text-slate-400"><MicOff size={18} /></div>
                                {speechTranscript ? <p className="text-sm font-medium text-slate-700 italic px-2 text-center">"{speechTranscript}"</p> : <p className="text-sm font-medium text-slate-400">Ses algılanmadı veya durduruldu.</p>}
                            </div>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleListening} className="flex items-center gap-2 px-5 py-2 bg-purple-50 text-primary hover:bg-purple-100 shadow-sm rounded-full text-xs font-black uppercase tracking-wider">
                                <RefreshCw size={14} /> Yeniden Dinle
                            </motion.button>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
                    <div className="w-full md:w-1/3 border-r border-slate-200 bg-white overflow-y-auto p-4 flex flex-col gap-2 max-h-[30vh] md:max-h-none">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center justify-between"><span>Bulunan Öğrenciler ({assistantFoundStudents.length})</span></div>
                        {assistantFoundStudents.map(student => {
                            const isSelected = assistantSelectedStudent?.id === student.id; 
                            const baseClasses = "text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 hover-lift";
                            let stateClasses = 'border-transparent hover:bg-slate-50'; 
                            if (isSelected) stateClasses = student.isVip ? 'bg-yellow-50 border-vipGoldAccent shadow-md' : 'bg-purple-50 border-primary shadow-md';
                            let avatarClasses = 'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 '; 
                            if (isSelected) avatarClasses += student.isVip ? 'bg-vipGoldAccent text-white' : 'bg-primary text-white'; 
                            else avatarClasses += student.isVip ? 'bg-yellow-100 text-vipGoldAccent' : 'bg-slate-100 text-slate-500';
                            let nameClasses = `font-bold text-sm truncate ${isSelected ? (student.isVip ? 'text-vipGoldAccent' : 'text-primary') : 'text-slate-700'}`;
                            return (
                                <button key={student.id} onClick={() => setAssistantSelectedStudent(student)} className={`${baseClasses} ${stateClasses}`}>
                                    <div className={avatarClasses}>{student.name.charAt(0)}</div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={nameClasses}>{student.name} {student.isVip && <Crown size={12} className="inline text-vipGoldAccent ml-1"/>}</span>
                                        <span className="text-[10px] text-slate-400 font-bold truncate">{student.className} {student.matchScore > 0 && <span className="text-successGreen ml-1">({student.matchScore} Eşleşme)</span>}</span>
                                    </div>
                                </button>
                            );
                        })}
                        {assistantFoundStudents.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Öğrenci bulunamadı.</div>}
                    </div>
                    
                    <div className="w-full md:w-2/3 overflow-y-auto p-4 md:p-6">
                        {assistantSelectedStudent ? (
                            <div className="space-y-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between"><span>Ödevler</span>{assistantSelectedStudent.isVip && <span className="text-vipGoldAccent font-bold">Özel Ders</span>}</div>
                                {assistantFoundTopics.filter(t => t.classId === assistantSelectedStudent.classId).map(topic => (
                                    <div key={topic.id} className={`bg-white rounded-3xl border ${assistantSelectedStudent.isVip ? 'border-yellow-200' : 'border-slate-200'} p-5 shadow-sm`}>
                                        <h4 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-100 pb-3 flex items-center gap-2 justify-between">
                                            <div className="flex items-center gap-2"><div className={`w-2 h-6 ${assistantSelectedStudent.isVip ? 'bg-vipGoldAccent' : 'bg-primary'} rounded-full`}></div>{topic.title}</div>
                                            {topic.date && <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Calendar size={12}/>{formatDate(topic.date)}</span>}
                                        </h4>
                                        <div className="space-y-4">
                                            {topic.subColumns.map(col => {
                                                const targetClass = classes.find(c => c.id === assistantSelectedStudent.classId); 
                                                const studentData = targetClass?.students.find(s => s.id === assistantSelectedStudent.id);
                                                const currentDbGrade = studentData?.grades?.[col.id] || 'exempt'; 
                                                const currentDbNote = studentData?.assignmentNotes?.[col.id] || '';
                                                const draftGrade = assistantDraftGrades[assistantSelectedStudent.id]?.[col.id]; 
                                                const draftNote = assistantDraftNotes[assistantSelectedStudent.id]?.[col.id];
                                                const displayGrade = draftGrade !== undefined ? draftGrade : currentDbGrade; 
                                                const displayNote = draftNote !== undefined ? draftNote : currentDbNote;
                                                const isChanged = (draftGrade !== undefined && draftGrade !== currentDbGrade) || (draftNote !== undefined && draftNote !== currentDbNote);
                                                return (
                                                    <div key={col.id} className={`flex flex-col gap-3 p-4 rounded-2xl transition-all ${isChanged ? 'bg-yellow-50/50 border border-yellow-200 shadow-sm' : 'bg-slate-50 border border-slate-100'}`}>
                                                        <div className="text-sm font-bold text-slate-700">{col.title}</div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {STATUS_OPTIONS.map(opt => ( 
                                                                <button key={opt.id} onClick={() => handleDraftGradeChange(assistantSelectedStudent.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all hover-lift ${displayGrade === opt.id ? `${opt.bg} ${opt.color} ${opt.border} shadow-sm scale-105` : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                                                                    <opt.icon size={18} className="mb-1" strokeWidth={2.5} />
                                                                    <span className="text-[10px] font-black uppercase">{opt.label}</span>
                                                                </button> 
                                                            ))}
                                                        </div>
                                                        <div className="relative mt-1">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><StickyNote size={14} className="text-slate-400"/></div>
                                                            <input type="text" placeholder="Öğretmen notu ekle..." className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-purple-100 transition-all font-medium text-slate-700 placeholder:text-slate-400" value={displayNote} onChange={(e) => handleDraftNoteChange(assistantSelectedStudent.id, col.id, e.target.value)}/>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {assistantFoundTopics.filter(t => t.classId === assistantSelectedStudent.classId).length === 0 && <div className="text-xs text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-200">Konu bulunamadı.</div>}
                            </div>
                        ) : ( 
                            <div className="flex flex-col h-full items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
                                <User size={48} className="mb-4 text-slate-200" />
                                <p className="text-sm font-bold text-slate-500">Öğrenci Seçilmedi</p>
                            </div> 
                        )}
                    </div>
                </div>
                
                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xs font-bold w-full md:w-auto text-center md:text-left">
                        {Object.keys(assistantDraftGrades).length > 0 || Object.keys(assistantDraftNotes).length > 0 ? ( 
                            <span className="text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200 flex items-center justify-center md:justify-start gap-1.5"><AlertTriangle size={14}/> Kaydedilmeyi bekleyen değişiklikler var</span> 
                        ) : ( 
                            <span className="text-slate-400">Değişiklik yapılmadı</span> 
                        )}
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={onClose} className="hover-lift flex-1 md:flex-none px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm">İptal</button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={applyAssistantDrafts} disabled={Object.keys(assistantDraftGrades).length === 0 && Object.keys(assistantDraftNotes).length === 0} className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-black text-white shadow-lg transition-all text-sm flex items-center justify-center gap-2 ${(Object.keys(assistantDraftGrades).length > 0 || Object.keys(assistantDraftNotes).length > 0) ? 'bg-primary hover:bg-purple-700 shadow-glow' : 'bg-slate-300 cursor-not-allowed'}`}>
                            <Save size={18} /> DEĞİŞİKLİKLERİ KAYDET
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AssistantModal;
