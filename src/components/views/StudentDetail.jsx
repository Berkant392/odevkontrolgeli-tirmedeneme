import React from 'react';
import { motion } from 'framer-motion';
import { Sparkle, Layout, BookOpenCheck, Calendar, StickyNote, Info } from 'lucide-react';
import { calculateStats, formatDate, getDeadlineStatus } from '../../utils/helpers';
import { TOPIC_THEMES, STATUS_OPTIONS } from '../../utils/constants';
import StatusBadge from '../ui/StatusBadge';
import PdfDownloadButton from '../ui/PdfButton';
import CurriculumTracker from '../curriculum/CurriculumTracker';

const StudentDetail = ({ selectedStudentForView, selectedClass, currentUserRole, activeTab, setActiveTab, isTeacherMode, openCellNoteModal, updateGrade, updateClassInDb }) => {
    
    // YENİ EKLENENLERİ EN YUKARI ALMAK İÇİN
    const reversedTopics = selectedClass.topics ? [...selectedClass.topics].reverse() : [];

    return (
        <motion.div key="student-detail" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className={`${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-100 shadow-float'} rounded-[2.5rem] p-4 md:p-10 border relative z-10`}>
            <div className={`flex flex-col md:flex-row items-center md:items-start gap-6 mb-10 pb-8 border-b ${currentUserRole === 'vip-student' ? 'border-slate-700' : 'border-slate-100'} text-center md:text-left`}>
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black shadow-xl shrink-0 border-4 ${currentUserRole === 'vip-student' ? 'real-gold-bg text-slate-900 border-slate-600 shadow-vip-glow' : 'bg-gradient-to-br from-brandPurple to-blue-500 text-white border-white shadow-glow'}`}>{selectedStudentForView.name.charAt(0)}</motion.div>
                <div><h2 className={`text-3xl md:text-5xl font-black mb-2 tracking-tight flex items-center justify-center md:justify-start gap-3 ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800'}`}>{selectedStudentForView.name}{currentUserRole === 'vip-student' && <Sparkle className="text-vipGold animate-pulse"/>}</h2><div className="flex items-center justify-center md:justify-start gap-3"><span className={`font-bold px-3 py-1 rounded-lg ${currentUserRole === 'vip-student' ? 'bg-slate-700 border border-slate-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{selectedClass.className}</span><span className={`font-black px-3 py-1 rounded-lg border ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold border-slate-600 shadow-sm' : 'bg-successGreen/10 text-successGreen border-successGreen/20'}`}>%{calculateStats([selectedStudentForView], selectedClass.topics).percentage} Genel Başarı</span></div></div>
            </div>

            <div className={`flex gap-6 mb-6 border-b ${currentUserRole === 'vip-student' ? 'border-slate-700' : 'border-slate-200'}`}>
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('homework')} className={`pb-3 font-bold text-sm border-b-[3px] transition-colors flex items-center gap-2 ${activeTab === 'homework' ? (currentUserRole === 'vip-student' ? 'border-vipGold text-vipGold bg-slate-700 rounded-t-lg' : 'border-brandPurple text-brandPurple bg-brandPurple/5 rounded-t-lg') : 'border-transparent text-slate-400 hover:text-white'}`}><Layout size={18}/> Ödevlerim</motion.button>
                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('curriculum')} className={`pb-3 font-bold text-sm border-b-[3px] transition-colors flex items-center gap-2 ${activeTab === 'curriculum' ? (currentUserRole === 'vip-student' ? 'border-vipGold text-vipGold bg-slate-700 rounded-t-lg' : 'border-brandPurple text-brandPurple bg-brandPurple/5 rounded-t-lg') : 'border-transparent text-slate-400 hover:text-white'}`}><BookOpenCheck size={18}/> Konu İlerlemem</motion.button>
            </div>

            {activeTab === 'homework' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }} className="space-y-8">
                    {reversedTopics.map((topic, i) => {
                        const theme = currentUserRole === 'vip-student' ? { tag: 'bg-vipGold', text: 'text-vipGold' } : TOPIC_THEMES[i % TOPIC_THEMES.length]; 
                        const topicStats = calculateStats([selectedStudentForView], [{...topic, subColumns: topic.subColumns}]);
                        const pct = topicStats.percentage || 0;
                        
                        // 🔥 OTOMATİK RENKLENDİRME VE DURUM MANITIĞI
                        const deadlineInfo = getDeadlineStatus(topic.date);
                        const hasSources = topic.subColumns && topic.subColumns.length > 0;
                        
                        // Ödev altındaki tüm kaynaklar 'done' (Yapıldı) olarak mı işaretlenmiş kontrolü
                        const isAllDone = hasSources && topic.subColumns.every(col => selectedStudentForView.grades?.[col.id] === 'done');

                        // Arka plan rengini belirleme kuralı
                        let cardColorStyle = "";
                        if (deadlineInfo.isOverdue) {
                            if (isAllDone) {
                                // Tarih geçti ama hepsi yapıldı -> YEŞİL
                                cardColorStyle = currentUserRole === 'vip-student'
                                    ? 'bg-emerald-950/40 border-emerald-500/40 shadow-md shadow-emerald-500/5'
                                    : 'bg-emerald-50/80 border-emerald-200 shadow-sm';
                            } else {
                                // Tarih geçti ve yapılmayanlar var -> KIRMIZI
                                cardColorStyle = currentUserRole === 'vip-student'
                                    ? 'bg-rose-950/40 border-rose-500/40 shadow-md shadow-rose-500/5'
                                    : 'bg-rose-50/80 border-rose-200 shadow-sm';
                            }
                        } else {
                            // Süre henüz geçmediyse orijinal görünüm kalır
                            cardColorStyle = currentUserRole === 'vip-student' 
                                ? 'bg-slate-700 border-slate-600 shadow-md' 
                                : 'bg-white border-slate-200 shadow-float';
                        }

                        return (
                            <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl p-4 md:p-6 border transition-all duration-300 ${cardColorStyle}`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <div className="flex items-center gap-3"><div className={`w-2 h-8 rounded-full ${theme.tag}`}></div><h3 className={`text-xl font-black uppercase tracking-wide ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800'}`}>{topic.title}</h3></div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {topic.date && ( 
                                            <div className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm border ${
                                                deadlineInfo.isOverdue && !isAllDone 
                                                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
                                                    : deadlineInfo.isOverdue && isAllDone
                                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                                        : (deadlineInfo.isToday ? 'bg-amber-500 text-white border-amber-600 animate-pulse' : (currentUserRole === 'vip-student' ? 'bg-slate-800 text-vipGold/80 border-slate-600' : 'bg-slate-50 text-slate-500 border-slate-200'))
                                            }`}>
                                                <Calendar size={14}/> Son Teslim: {formatDate(topic.date)} 
                                                {deadlineInfo.text && <span className="ml-1 px-1.5 py-0.5 rounded-md bg-black/10 font-black text-[10px]">({deadlineInfo.text})</span>}
                                            </div> 
                                        )}
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm ${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}><div className={`w-16 h-2 rounded-full overflow-hidden ${currentUserRole === 'vip-student' ? 'bg-slate-600' : 'bg-slate-200'}`}><div className={`h-full ${theme.tag} ${currentUserRole === 'vip-student' && 'shadow-vip-glow'}`} style={{ width: `${pct}%` }}></div></div><span className={`text-xs font-black ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-700'}`}>%{pct}</span></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {topic.subColumns?.map(col => {
                                        const status = selectedStudentForView.grades?.[col.id] || 'assigned'; const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[0]; const StatusIcon = statusData.icon; const note = selectedStudentForView.assignmentNotes?.[col.id]; const isMissed = deadlineInfo.isOverdue && status !== 'done' && status !== 'exempt';
                                        const cardStyle = currentUserRole === 'vip-student' ? `bg-slate-800 border-slate-600 ${isMissed ? 'border-errorRed shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''}` : `bg-white border-slate-100 ${isMissed ? 'border-errorRed/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`;
                                        const titleStyle = currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800';
                                        return (
                                            <motion.div key={col.id} whileHover={{ scale: 1.02, y: -3 }} className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm group ${cardStyle}`}>
                                                <div className="flex justify-between items-start"><div><span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2 ${currentUserRole === 'vip-student' ? 'text-slate-400' : 'text-slate-400'}`}><div className={`w-2 h-2 rounded-full ${theme.tag}`}></div> KAYNAK</span><span className={`text-lg font-bold leading-tight ${titleStyle}`}>{col.title}</span></div>{isTeacherMode && <button onClick={() => openCellNoteModal(selectedClass.id, selectedStudentForView.id, col.id, selectedStudentForView.assignmentNotes?.[col.id] || "")} className={`p-1.5 rounded-md transition-colors ${note ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-brandPurple'}`} title="Öğretmen Notu"><StickyNote size={14} /></button>}</div>
                                                <div className="flex flex-col gap-3">
                                                    {isTeacherMode ? ( <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">{STATUS_OPTIONS.map(opt => ( <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={opt.id} onClick={() => updateGrade(selectedClass.id, selectedStudentForView.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${status === opt.id ? `${opt.bg} ${opt.color} shadow-sm border ${opt.border} scale-105` : 'text-slate-400 hover:bg-white'}`}><opt.icon size={16} className="mb-1" strokeWidth={2.5}/><span className="text-[9px] font-bold">{opt.label}</span></motion.button> ))}</div> ) : ( <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${currentUserRole === 'vip-student' ? 'bg-slate-700 border-slate-600 text-vipGold' : `${statusData.bg} ${statusData.border} ${statusData.color}`}`}><StatusIcon size={20} strokeWidth={2.5} /><span className="text-sm font-black uppercase tracking-widest">{statusData.label}</span></div> )}
                                                    {note && ( <div className="bg-yellow-50/80 p-3 rounded-xl border border-yellow-200 flex gap-2 items-start text-xs text-yellow-900 shadow-inner"><Info size={16} className="mt-0.5 shrink-0 text-yellow-500"/> <span className="font-medium leading-relaxed">{note}</span></div> )}
                                                    {col.pdfLink && <PdfDownloadButton link={col.pdfLink} isVip={currentUserRole === 'vip-student'} isTeacher={false} />}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {topic.subColumns?.length === 0 && <div className="text-xs text-slate-400 text-center p-2">Bu konuya ait kaynak yok.</div>}
                                </div>
                            </motion.div>
                        );
                    })}
                    {reversedTopics.length === 0 && <div className="text-center text-slate-500 py-10 font-medium">Bu sınıfa henüz ödev eklenmemiş.</div>}
                </motion.div>
            )}

            {activeTab === 'curriculum' && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><CurriculumTracker cls={selectedClass} updateClassInDb={updateClassInDb} isTeacherMode={false} /></motion.div> )}
        </motion.div>
    );
};

export default StudentDetail;
