import React from 'react';
import { motion } from 'framer-motion';
import { Layout, Crown, Pencil, AlertOctagon, KeyRound, BookOpen, Plus, Trash2, Calendar, MoreVertical, UserPlus, Printer } from 'lucide-react';
import { calculateStats, formatDate } from '../../utils/helpers';
import { TOPIC_THEMES, STATUS_OPTIONS } from '../../utils/constants';
import MobileStudentCard from '../student/MobileCard';
import PdfDownloadButton from '../ui/PdfButton';
import StatusBadge from '../ui/StatusBadge';
import CurriculumTracker from '../curriculum/CurriculumTracker';

const ClassDetail = ({ selectedClass, activeTab, setActiveTab, isMobile, newStudentName, setNewStudentName, addStudent, updateGrade, openCellNoteModal, setModalData, setModalInputVal, setModalDateVal, setModalPdfVal, setModalType, deleteStudent, handlePrintStudentReport, openStudent, setActiveTopicMenu, setActiveColMenu, setActiveCell, deleteColumn, updateClassInDb, handleOpenRisk, handlePrintPasswords, deleteClass, libraryItems, saveToLibrary }) => {
    
    // YENİ EKLENENLERİ EN SOLA/YUKARIYA ALMAK İÇİN DİZİYİ TERSİNE ÇEVİRİYORUZ
    const reversedTopics = selectedClass.topics ? [...selectedClass.topics].reverse() : [];

    return (
        <motion.div key="class-detail" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="bg-white rounded-[2rem] shadow-float border border-slate-200 overflow-hidden relative z-10">
            <div className={`p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${selectedClass.type === 'vip' ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-100' : 'bg-gradient-to-r from-slate-50 to-white border-slate-100'}`}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`p-3 rounded-xl shadow-inner ${selectedClass.type === 'vip' ? 'bg-yellow-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}><Layout size={24}/></div>
                    <div><h3 className={`text-xl md:text-2xl font-black flex items-center gap-2 ${selectedClass.type === 'vip' ? 'text-amber-700' : 'text-slate-800'}`}>{selectedClass.type === 'vip' && <Crown size={20} className="text-amber-500"/>}{selectedClass.className} <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setModalData({ classId: selectedClass.id, currentName: selectedClass.className }); setModalInputVal(selectedClass.className); setModalType('edit-class'); }} className={`p-1.5 rounded-lg transition-colors ${selectedClass.type === 'vip' ? 'text-amber-500 hover:text-amber-600 hover:bg-yellow-100' : 'text-slate-400 hover:text-brandPurple hover:bg-purple-50'}`}><Pencil size={16} /></motion.button></h3><div className="text-xs text-slate-500 font-medium mt-1">{selectedClass.students?.length || 0} Öğrenci • {selectedClass.topics?.length || 0} Görev</div></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm mr-2"><div className={`w-8 h-8 rounded-full border-4 ${selectedClass.type === 'vip' ? 'border-yellow-200' : 'border-purple-100'} flex items-center justify-center relative`}><svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 36 36"><path className={selectedClass.type === 'vip' ? "text-amber-500" : "text-brandPurple"} strokeDasharray={`${calculateStats(selectedClass.students, selectedClass.topics).percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" /></svg></div><div className="flex flex-col"><span className="text-xs font-black text-slate-800">%{calculateStats(selectedClass.students, selectedClass.topics).percentage}</span><span className="text-[9px] font-bold text-slate-400 uppercase">Başarı</span></div></div>
                    {selectedClass.type !== 'vip' && <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleOpenRisk(selectedClass)} className="text-xs bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors"><AlertOctagon size={14}/> Risk</motion.button>}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handlePrintPasswords(selectedClass)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors"><KeyRound size={14}/> Şifreler</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab(activeTab === 'curriculum' ? 'homework' : 'curriculum')} className={`text-xs px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1.5 transition-colors ${activeTab === 'curriculum' ? 'bg-purple-50 text-brandPurple border border-purple-200 hover:bg-purple-100' : 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'}`}><BookOpen size={16}/> {activeTab === 'curriculum' ? 'Ödev Takibine Dön' : 'Müfredat Listesi'}</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setModalData({ classId: selectedClass.id }); setModalType('topic'); }} className={`text-xs text-white px-4 py-2 rounded-xl font-bold shadow-md flex items-center gap-1 ${selectedClass.type === 'vip' ? 'real-gold-bg text-slate-900 shadow-vip-glow' : 'bg-brandPurple hover:bg-purple-700 shadow-glow'}`}><Plus size={14}/> Ödev Ekle</motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => deleteClass(e, selectedClass.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18}/></motion.button>
                </div>
            </div>

            {activeTab === 'homework' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 ${selectedClass.type === 'vip' ? 'bg-yellow-50/30' : 'bg-slate-50/50'}`}>
                    {isMobile ? (
                        <div className="space-y-4">
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-float mb-6"><h4 className="font-black text-slate-800 mb-4 text-sm flex items-center gap-2 uppercase tracking-widest"><BookOpen size={18} className="text-brandPurple"/> Mobil Ödev Yönetimi</h4>
                                <div className="space-y-4">
                                    {reversedTopics.map(topic => (
                                        <div key={topic.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200"><span className="font-black text-slate-700 text-sm uppercase tracking-wide truncate pr-2">{topic.title}</span><div className="flex gap-1.5 shrink-0"><button onClick={() => { setModalData({ classId: selectedClass.id, topicId: topic.id, currentTitle: topic.title }); setModalInputVal(topic.title); setModalDateVal(topic.date || ''); setModalType('edit-topic'); }} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brandPurple rounded-xl shadow-sm transition-colors hover-lift"><Pencil size={16}/></button><button onClick={() => { setModalData({ classId: selectedClass.id, topicId: topic.id }); setModalType('source'); }} className="px-3 py-2 bg-brandPurple text-white rounded-xl shadow-glow flex items-center gap-1.5 text-xs font-black tracking-wider transition-colors hover-lift"><Plus size={14}/> KAYNAK</button></div></div>
                                            <div className="flex flex-col gap-2">
                                                {topic.subColumns?.map(col => (
                                                    <div key={col.id} className="flex justify-between items-center text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><span className="font-bold truncate pr-2">{col.title}</span><div className="flex gap-1 shrink-0"><button onClick={() => { setModalData({ classId: selectedClass.id, topicId: topic.id, colId: col.id, currentTitle: col.title }); setModalInputVal(col.title); setModalPdfVal(col.pdfLink || ""); setModalType('edit-source'); }} className="p-2 bg-slate-50 text-slate-500 hover:text-brandPurple rounded-lg transition-colors"><Pencil size={14}/></button><button onClick={() => deleteColumn(selectedClass.id, topic.id, col.id)} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={14}/></button></div></div>
                                                ))}
                                                {(!topic.subColumns || topic.subColumns.length === 0) && <span className="text-[11px] text-slate-400 font-bold bg-white p-2 rounded-lg border border-slate-100 text-center">Bu ödeve henüz kaynak eklenmemiş.</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {reversedTopics.length === 0 && <div className="text-sm font-bold text-slate-400 text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Sınıfa ait ödev bulunmuyor.</div>}
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-2"><input type="text" placeholder="Yeni Öğrenci Ekle..." className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 w-full focus:border-brandPurple outline-none font-medium" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addStudent(selectedClass.id); }} /><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => addStudent(selectedClass.id)} className={`text-white px-4 rounded-xl text-sm font-bold shadow-md ${selectedClass.type === 'vip' ? 'real-gold-bg text-slate-900' : 'bg-brandPurple'}`}>EKLE</motion.button></div>
                            {selectedClass.students?.map((std) => ( <MobileStudentCard key={std.id} student={std} cls={selectedClass} updateGrade={updateGrade} onOpenNote={openCellNoteModal} onEditStudent={(s) => { setModalData({ classId: selectedClass.id, studentId: s.id, currentName: s.name }); setModalInputVal(s.name); setModalType('edit-student'); }} onDeleteStudent={deleteStudent} onPrintReport={handlePrintStudentReport} /> ))}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th rowSpan={2} className="sticky-corner border-b border-r border-slate-200 min-w-[250px] shadow-sm p-4 text-xs font-black text-slate-500 uppercase tracking-widest bg-white">Öğrenci Listesi</th>
                                        {reversedTopics.map((topic, i) => {
                                            const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                            return ( 
                                                <th key={topic.id} colSpan={Math.max(1, (topic.subColumns?.length || 0) + 1)} className={`text-center p-3 border-b border-r border-slate-200 sticky-header-top ${theme.main} min-w-[280px]`}>
                                                    <div className="flex flex-col justify-center items-center gap-1.5">{topic.date && ( <motion.div whileHover={{ scale: 1.05 }} className="text-[10px] bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-slate-600 font-bold flex items-center gap-1 cursor-pointer hover:bg-white shadow-sm border border-white/50 mb-1 transition-colors" onContextMenu={(e) => { e.preventDefault(); setModalData({ classId: selectedClass.id, topicId: topic.id }); setModalDateVal(topic.date); setModalType('edit-date'); }}><Calendar size={12}/> Son Teslim: <span className={theme.text}>{formatDate(topic.date)}</span></motion.div> )}<div className={`flex items-center gap-2 text-sm font-black uppercase tracking-wider mt-1`}>{topic.title}<button onClick={(e) => { e.stopPropagation(); setActiveTopicMenu({ classId: selectedClass.id, topicId: topic.id, anchorEl: e.currentTarget }); }} className="p-1 rounded-md hover:bg-black/5 transition-colors"><MoreVertical size={16}/></button></div></div>
                                                </th> 
                                            );
                                        })}
                                    </tr>
                                    <tr>
                                        {reversedTopics.map((topic, i) => {
                                            const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                            return ( 
                                                <React.Fragment key={topic.id}>
                                                    <th className={`p-0 border-b border-r border-slate-200 w-16 text-center sticky-header-sub ${theme.sub}`}><button onClick={() => { setModalData({ classId: selectedClass.id, topicId: topic.id }); setModalType('source'); }} className={`w-full h-full flex items-center justify-center transition-colors ${theme.btn} bg-white/30 hover:bg-white`} title="Kaynak Ekle"><Plus size={20}/></button></th>
                                                    {topic.subColumns?.map(col => ( 
                                                        <th key={col.id} className={`p-3 border-b border-r border-slate-200 sticky-header-sub ${theme.sub} min-w-[150px] align-top`}><div className="flex flex-col items-center justify-between h-full min-h-[50px]"><span className="font-bold text-xs text-slate-700 whitespace-normal text-center leading-tight mb-2 break-words max-w-[140px]">{col.title}</span><div className="flex items-center gap-1 shrink-0">{col.pdfLink && <PdfDownloadButton link={col.pdfLink} isTeacher={true} />}<button onClick={(e) => { e.stopPropagation(); setActiveColMenu({ classId: selectedClass.id, topicId: topic.id, colId: col.id, anchorEl: e.currentTarget }); }} className="text-slate-400 hover:text-brandPurple bg-white/50 p-1.5 rounded-full shadow-sm transition-colors"><MoreVertical size={14}/></button></div></div></th> 
                                                    ))} 
                                                </React.Fragment> 
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedClass.students?.map((std) => (
                                        <tr key={std.id} className="border-b border-slate-100 bg-white">
                                            <td className="sticky-col-left p-4 border-r border-slate-200">
                                                <div className="flex justify-between items-center group"><div className="flex flex-col gap-1 cursor-pointer" onClick={() => openStudent(std)}><div className="flex items-center gap-3"><motion.div whileHover={{ scale: 1.1 }} className={`w-8 h-8 rounded-full ${selectedClass.type === 'vip' ? 'bg-yellow-100 text-amber-600' : 'bg-purple-100 text-brandPurple'} flex items-center justify-center font-black text-xs`}>{std.name.charAt(0)}</motion.div><span className={`text-sm font-bold text-slate-700 group-hover:${selectedClass.type === 'vip' ? 'text-amber-600' : 'text-brandPurple'} transition-colors`}>{std.name}</span><button onClick={(e) => { e.stopPropagation(); setModalData({ classId: selectedClass.id, studentId: std.id, currentName: std.name }); setModalInputVal(std.name); setModalType('edit-student'); }} className="text-slate-300 hover:text-brandPurple opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14}/></button></div>{std.username && ( <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-1 ml-11" onClick={e=>e.stopPropagation()}><span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{std.username}</span><span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"><KeyRound size={10}/> {std.password}</span></div> )}</div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handlePrintStudentReport(selectedClass, std); }} className={`p-2 rounded-lg transition-colors ${selectedClass.type === 'vip' ? 'bg-yellow-50 text-amber-500 hover:bg-yellow-100' : 'bg-purple-50 text-brandPurple hover:bg-purple-100'}`} title="Rapor Yazdır"><Printer size={16}/></motion.button><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => deleteStudent(e, selectedClass.id, std.id)} className="bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition-colors"><Trash2 size={16}/></motion.button></div></div>
                                            </td>
                                            {reversedTopics.map((topic, i) => {
                                                const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                return ( 
                                                    <React.Fragment key={topic.id}>
                                                        <td className={`border-r border-slate-100 ${theme.cell}`}></td>
                                                        {topic.subTopics?.map(col => ( 
                                                            <td key={col.id} className={`p-2 border-r border-slate-100 text-center ${theme.cell}`} onContextMenu={(e) => { e.preventDefault(); openCellNoteModal(selectedClass.id, std.id, col.id, std.assignmentNotes?.[col.id]); }}>
                                                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); setActiveCell({ classId: selectedClass.id, studentId: std.id, colId: col.id, anchorEl: e.currentTarget }); }} className="cursor-pointer inline-block"><StatusBadge status={std.grades?.[col.id] || 'assigned'} hasNote={!!std.assignmentNotes?.[col.id]} /></motion.div>
                                                            </td> 
                                                        ))}
                                                    </React.Fragment> 
                                                );
                                            })}
                                        </tr>
                                    ))}
                                    <tr>
                                        <td className="sticky-col-left p-4 border-r border-slate-200 border-t border-slate-200 bg-slate-50"><div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0"><UserPlus size={16}/></div><input type="text" placeholder="Yeni Öğrenci Ekle..." className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-700 w-full focus:border-brandPurple outline-none font-medium shadow-sm" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addStudent(selectedClass.id); }} /><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => addStudent(selectedClass.id)} className={`text-white px-3 rounded-xl text-xs font-bold shadow-md transition-colors ${selectedClass.type === 'vip' ? 'real-gold-bg text-slate-900' : 'bg-brandPurple'}`}>EKLE</motion.button></div></td>
                                        {reversedTopics.map((t, i) => <td key={i} colSpan={Math.max(1, t.subColumns.length + 1)} className="border-t border-slate-200 bg-slate-50/50"></td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {activeTab === 'curriculum' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <CurriculumTracker 
                        curriculum={selectedClass.curriculum || []} 
                        onUpdate={(newCurriculum) => {
                            updateClassInDb({ ...selectedClass, curriculum: newCurriculum });
                        }} 
                        libraryItems={libraryItems} 
                        saveToLibrary={saveToLibrary} 
                    />
                </motion.div> 
            )}
        </motion.div>
    );
};

export default ClassDetail;
