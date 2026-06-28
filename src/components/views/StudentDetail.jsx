import React from 'react';
import { motion } from 'framer-motion';
import { Sparkle, Layout, BookOpenCheck, Calendar, StickyNote, Info, Target, Youtube } from 'lucide-react';
import { calculateStats, formatDate, getDeadlineStatus } from '../../utils/helpers';
import { TOPIC_THEMES, STATUS_OPTIONS } from '../../utils/constants';
import StatusBadge from '../ui/StatusBadge';
import PdfDownloadButton from '../ui/PdfButton';
import CurriculumTracker from '../curriculum/CurriculumTracker';
import TrialTracker from './TrialTracker';
import PlaylistsView from './PlaylistsView';

const StudentDetail = ({ selectedStudentForView, selectedClass, currentUserRole, activeTab, setActiveTab, isTeacherMode, openCellNoteModal, updateGrade, updateClassInDb, showAlert }) => {
    
    // YENİ EKLENENLERİ EN YUKARI ALMAK İÇİN
    const reversedTopics = selectedClass.topics ? [...selectedClass.topics].reverse() : [];

    return (
        <motion.div key="student-detail" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className={`${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-100 shadow-float'} rounded-2xl md:rounded-[2.5rem] p-3.5 md:p-10 border relative z-10`}>
            
            {isTeacherMode && (
                <div className={`flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-6 md:mb-10 pb-5 md:pb-8 border-b ${currentUserRole === 'vip-student' ? 'border-slate-700' : 'border-slate-100'} text-center md:text-left`}>
                    <motion.div whileHover={{ scale: 1.05, rotate: 3 }} className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center text-2xl md:text-4xl font-black shadow-xl shrink-0 border-2 md:border-4 ${currentUserRole === 'vip-student' ? 'real-gold-bg text-slate-900 border-slate-600 shadow-vip-glow' : 'bg-gradient-to-br from-brandPurple to-blue-500 text-white border-white shadow-glow'}`}>{selectedStudentForView.name.charAt(0)}</motion.div>
                    <div>
                        <h2 className={`text-xl md:text-5xl font-black mb-1.5 md:mb-2 tracking-tight flex items-center justify-center md:justify-start gap-2 ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800'}`}>{selectedStudentForView.name}{currentUserRole === 'vip-student' && <Sparkle className="text-vipGold w-4 h-4 md:w-5 md:h-5 animate-pulse"/>}</h2>
                        <div className="flex items-center justify-center md:justify-start gap-2 text-xs">
                            <span className={`font-bold px-2.5 py-0.5 rounded-md ${currentUserRole === 'vip-student' ? 'bg-slate-700 border border-slate-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{selectedClass.className}</span>
                            <span className={`font-black px-2.5 py-0.5 rounded-md border ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold border-slate-600 shadow-sm' : 'bg-successGreen/10 text-successGreen border-successGreen/20'}`}>%{calculateStats([selectedStudentForView], selectedClass.topics).percentage} Başarı</span>
                        </div>
                    </div>
                </div>
            )}

            {isTeacherMode && (
                <div className={`flex flex-wrap gap-2 mb-6 pb-4 border-b ${currentUserRole === 'vip-student' ? 'border-slate-700' : 'border-slate-100'}`}>
                    <button 
                        onClick={() => setActiveTab('homework')} 
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            activeTab === 'homework' 
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-brandPurple text-white shadow-glow') 
                                : (currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100')
                        }`}
                    >
                        <BookOpenCheck size={14} />
                        Ödev Takibi
                    </button>
                    <button 
                        onClick={() => setActiveTab('curriculum')} 
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            activeTab === 'curriculum' 
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-brandPurple text-white shadow-glow') 
                                : (currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100')
                        }`}
                    >
                        <Layout size={14} />
                        Müfredat Durumu
                    </button>
                    <button 
                        onClick={() => setActiveTab('trials')} 
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            activeTab === 'trials' 
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-brandPurple text-white shadow-glow') 
                                : (currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100')
                        }`}
                    >
                        <Target size={14} />
                        Deneme Analizleri
                    </button>
                    <button 
                        onClick={() => setActiveTab('playlists')} 
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            activeTab === 'playlists' 
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-brandPurple text-white shadow-glow') 
                                : (currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100')
                        }`}
                    >
                        <Youtube size={14} />
                        YouTube Playlistleri
                    </button>
                </div>
            )}



            {activeTab === 'homework' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }} className="space-y-4 md:space-y-8">
                    {reversedTopics.map((topic, i) => {
                        const theme = currentUserRole === 'vip-student' ? { tag: 'bg-vipGold', text: 'text-vipGold' } : TOPIC_THEMES[i % TOPIC_THEMES.length]; 
                        const topicStats = calculateStats([selectedStudentForView], [{...topic, subColumns: topic.subColumns}]);
                        const pct = topicStats.percentage || 0;
                        
                        const deadlineInfo = getDeadlineStatus(topic.date);
                        const hasSources = topic.subColumns && topic.subColumns.length > 0;
                        const isOriginalOverdue = deadlineInfo.isOverdue;
                        
                        const isAllDone = hasSources && topic.subColumns.every(col => selectedStudentForView.grades?.[col.id] === 'done');

                        let cardColorStyle = "";
                        if (isOriginalOverdue) {
                            if (isAllDone) {
                                cardColorStyle = currentUserRole === 'vip-student'
                                    ? 'bg-emerald-950/30 border-emerald-500/30 shadow-md'
                                    : 'bg-emerald-50/60 border-emerald-100 shadow-sm';
                            } else {
                                cardColorStyle = currentUserRole === 'vip-student'
                                    ? 'bg-rose-950/30 border-rose-500/30 shadow-md'
                                    : 'bg-rose-50/60 border-rose-100 shadow-sm';
                            }
                        } else {
                            cardColorStyle = currentUserRole === 'vip-student' 
                                ? 'bg-slate-700 border-slate-600 shadow-md' 
                                : 'bg-white border-slate-200 shadow-float';
                        }

                        return (
                            <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl md:rounded-3xl p-3.5 md:p-6 border transition-all duration-300 ${cardColorStyle}`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3 md:gap-4">
                                    <div className="flex items-center gap-2"><div className={`w-1.5 h-6 rounded-full ${theme.tag}`}></div><h3 className={`text-base md:text-xl font-black uppercase tracking-wide ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800'}`}>{topic.title}</h3></div>
                                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                                        {topic.date && ( 
                                            <div className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm border ${
                                                isOriginalOverdue && !isAllDone 
                                                    ? 'bg-rose-500 text-white border-rose-600' 
                                                    : isOriginalOverdue && isAllDone
                                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                                        : (deadlineInfo.isToday ? 'bg-amber-500 text-white border-amber-600' : (currentUserRole === 'vip-student' ? 'bg-slate-800 text-vipGold/80 border-slate-600' : 'bg-slate-50 text-slate-500 border-slate-200'))
                                            }`}>
                                                <Calendar size={12}/> Son Teslim: {formatDate(topic.date)} 
                                                {deadlineInfo.text && <span className="ml-1 px-1 py-0.5 rounded bg-black/10 font-black text-[9px]">({deadlineInfo.text})</span>}
                                            </div> 
                                        )}
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm ${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}><div className={`w-12 h-1.5 rounded-full overflow-hidden ${currentUserRole === 'vip-student' ? 'bg-slate-600' : 'bg-slate-200'}`}><div className={`h-full ${theme.tag}`} style={{ width: `${pct}%` }}></div></div><span className={`text-[10px] font-black ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-700'}`}>%{pct}</span></div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                    {topic.subColumns?.map(col => {
                                        const status = selectedStudentForView.grades?.[col.id] || 'assigned'; const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[0]; const StatusIcon = statusData.icon; const note = selectedStudentForView.assignmentNotes?.[col.id]; const isMissed = isOriginalOverdue && status !== 'done' && status !== 'exempt';
                                        const cardStyle = currentUserRole === 'vip-student' ? `bg-slate-800 border-slate-600 ${isMissed ? 'border-errorRed shadow-[0_0_12px_rgba(239,68,68,0.25)]' : ''}` : `bg-white border-slate-100 ${isMissed ? 'border-errorRed/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]' : ''}`;
                                        const titleStyle = currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800';
                                        return (
                                            <motion.div key={col.id} whileHover={{ scale: 1.01, y: -2 }} className={`border rounded-xl md:rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-sm group ${cardStyle}`}>
                                                <div className="flex justify-between items-start">
                                                    <div><span className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1 mb-1 text-slate-400"><div className={`w-1.5 h-1.5 rounded-full ${theme.tag}`}></div> KAYNAK</span><span className={`text-sm md:text-lg font-bold leading-tight ${titleStyle}`}>{col.title}</span></div>
                                                    {isTeacherMode && <button onClick={() => openCellNoteModal(selectedClass.id, selectedStudentForView.id, col.id, selectedStudentForView.assignmentNotes?.[col.id] || "")} className={`p-1 rounded transition-colors ${note ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-brandPurple'}`} title="Öğretmen Notu"><StickyNote size={12} /></button>}
                                                </div>
                                                <div className="flex flex-col gap-2.5">
                                                    {isTeacherMode ? ( <div className="grid grid-cols-4 gap-0.5 bg-slate-50 p-1 rounded-xl border border-slate-100">{STATUS_OPTIONS.map(opt => ( <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={opt.id} onClick={() => updateGrade(selectedClass.id, selectedStudentForView.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${status === opt.id ? `${opt.bg} ${opt.color} shadow-sm border ${opt.border} scale-102` : 'text-slate-400 hover:bg-white'}`}><opt.icon size={14} className="mb-0.5" strokeWidth={2.5}/><span className="text-[8px] font-bold">{opt.label}</span></motion.button> ))}</div> ) : ( 
                                                        <div className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border ${currentUserRole === 'vip-student' ? 'bg-slate-700 border-slate-600 text-vipGold' : `${statusData.bg} ${statusData.border} ${statusData.color}`}`}><StatusIcon className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} /><span className="text-xs font-black uppercase tracking-widest">{statusData.label}</span></div> 
                                                    )}
                                                    
                                                    {/* 🔥 GÜNCELLEME: Uzun metinlerin ekran dışına taşmasını engelleyen "break-words" koruması */}
                                                    {note && ( 
                                                        <div className="bg-yellow-50/80 p-2 rounded-xl border border-yellow-200 flex gap-1.5 items-start text-[11px] text-yellow-900 shadow-inner w-full overflow-hidden">
                                                            <Info size={14} className="mt-0.5 shrink-0 text-yellow-500"/> 
                                                            <span className="font-medium leading-relaxed flex-1 min-w-0 break-words whitespace-pre-wrap text-justify">{note}</span>
                                                        </div> 
                                                    )}
                                                    
                                                    {col.pdfLink && <PdfDownloadButton link={col.pdfLink} isVip={currentUserRole === 'vip-student'} isTeacher={false} />}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {topic.subColumns?.length === 0 && <div className="text-[11px] text-slate-400 text-center p-1">Bu konuya ait kaynak yok.</div>}
                                </div>
                            </motion.div>
                        );
                    })}
                    {reversedTopics.length === 0 && <div className="text-center text-slate-500 py-6 text-xs font-medium">Bu sınıfa henüz ödev eklenmemiş.</div>}
                </motion.div>
            )}

            {activeTab === 'curriculum' && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><CurriculumTracker cls={selectedClass} updateClassInDb={updateClassInDb} isTeacherMode={false} /></motion.div> )}

            {activeTab === 'trials' && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><TrialTracker studentId={selectedStudentForView.id} isTeacherMode={isTeacherMode} showAlert={showAlert} currentUserRole={currentUserRole} /></motion.div> )}

            {activeTab === 'playlists' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <PlaylistsView 
                        studentId={selectedStudentForView.id} 
                        isTeacherMode={true} 
                        showAlert={showAlert} 
                        currentUserRole={selectedClass?.type === 'vip' ? 'vip-student' : currentUserRole} 
                    />
                </motion.div>
            )}
        </motion.div>
    );
};

export default StudentDetail;
