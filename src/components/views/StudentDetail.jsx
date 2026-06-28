import React, { useState } from 'react';
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
    const [homeworkFilter, setHomeworkFilter] = useState('all');
    const [expandedAssignments, setExpandedAssignments] = useState({});

    const toggleAssignment = (id) => {
        setExpandedAssignments(prev => ({...prev, [id]: !prev[id]}));
    };

    // İstatistik Hesaplama
    let totalAssignments = reversedTopics.length;
    let completedAssignments = 0;
    let waitingAssignments = 0;

    reversedTopics.forEach(topic => {
        const hasSources = topic.subColumns && topic.subColumns.length > 0;
        const isAllDone = hasSources && topic.subColumns.every(col => selectedStudentForView.grades?.[col.id] === 'done');
        if (isAllDone) {
            completedAssignments++;
        } else if (hasSources) {
            waitingAssignments++;
        }
    });

    return (
        <motion.div key="student-detail" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className={`${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-100 shadow-float'} rounded-2xl md:rounded-[2.5rem] p-3.5 md:p-10 border relative z-10`}>
            
            {isTeacherMode && (
                <div className={`flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-6 md:mb-10 pb-5 md:pb-8 border-b ${currentUserRole === 'vip-student' ? 'border-slate-700' : 'border-slate-100'} text-center md:text-left`}>
                    <motion.div whileHover={{ scale: 1.05, rotate: 3 }} className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center text-2xl md:text-4xl font-black shadow-xl shrink-0 border-2 md:border-4 ${currentUserRole === 'vip-student' ? 'real-gold-bg text-slate-900 border-slate-600 shadow-vip-glow' : 'bg-primary text-white border-white shadow-glow'}`}>{selectedStudentForView.name.charAt(0)}</motion.div>
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
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-primary text-white shadow-glow') 
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
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-primary text-white shadow-glow') 
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
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-primary text-white shadow-glow') 
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
                                ? (currentUserRole === 'vip-student' ? 'bg-vipGold text-slate-900 shadow-vip-glow' : 'bg-primary text-white shadow-glow') 
                                : (currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100')
                        }`}
                    >
                        <Youtube size={14} />
                        YouTube Playlistleri
                    </button>
                </div>
            )}

            {activeTab === 'homework' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`homework-premium-container ${currentUserRole === 'vip-student' ? 'vip-mode' : ''}`}>
                    <header className="header">
                        <div className="topline">
                            <div className="kicker"><i></i> Ödev Takibi</div>
                            <button className="icon-btn" aria-label="Filtre">
                                <svg viewBox="0 0 24 24" width="21" height="21" stroke="currentColor" strokeWidth="2.25" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 7h16"/><path d="M7 12h10"/><path d="M10 17h4"/>
                                </svg>
                            </button>
                        </div>
                        <h1>Ödevlerim</h1>
                        <p>Tüm konuları, son teslim tarihlerini ve kaynak durumlarını tek ekranda anlaşılır şekilde takip et.</p>
                        
                        <div className="stats">
                            <div className="stat">
                                <svg viewBox="0 0 24 24"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                                <strong>{totalAssignments}</strong>
                                <span>Toplam</span>
                            </div>
                            <div className="stat">
                                <svg viewBox="0 0 24 24" stroke="var(--hw-done)"><path d="M20 6 9 17l-5-5"/></svg>
                                <strong>{completedAssignments}</strong>
                                <span>Tamam</span>
                            </div>
                            <div className="stat">
                                <svg viewBox="0 0 24 24" stroke="var(--hw-wait)"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                                <strong>{waitingAssignments}</strong>
                                <span>Bekliyor</span>
                            </div>
                        </div>
                    </header>

                    <div className="filters-wrap">
                        <div className="filters">
                            <button className={`filter-btn ${homeworkFilter === 'all' ? 'active' : ''}`} onClick={() => setHomeworkFilter('all')}>Tümü</button>
                            <button className={`filter-btn missing ${homeworkFilter === 'missing' ? 'active' : ''}`} onClick={() => setHomeworkFilter('missing')}>Eksikler</button>
                            <button className={`filter-btn done ${homeworkFilter === 'done' ? 'active' : ''}`} onClick={() => setHomeworkFilter('done')}>Yapıldı</button>
                            <button className={`filter-btn waiting ${homeworkFilter === 'waiting' ? 'active' : ''}`} onClick={() => setHomeworkFilter('waiting')}>Verildi</button>
                        </div>
                    </div>

                    <div className="section-label">Aktif Ödevler</div>

                    <div className="assignment-list mb-8 md:mb-12">
                        {reversedTopics.map((topic) => {
                            const topicStats = calculateStats([selectedStudentForView], [{...topic, subColumns: topic.subColumns}]);
                            const pct = topicStats.percentage || 0;
                            const deadlineInfo = getDeadlineStatus(topic.date);
                            const hasSources = topic.subColumns && topic.subColumns.length > 0;
                            const isOriginalOverdue = deadlineInfo.isOverdue;
                            const isAllDone = hasSources && topic.subColumns.every(col => selectedStudentForView.grades?.[col.id] === 'done');
                            
                            let typeTags = [];
                            let assignmentStatusClass = "is-info";
                            let statusText = "Devam";
                            let StatusIconSVG = <><path d="M4 19.5V5.8A2.8 2.8 0 0 1 6.8 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M8 7h8"/></>;
                            let statusBadgeIcon = <i></i>;

                            if (!hasSources) {
                                typeTags.push("empty");
                                if (isOriginalOverdue) {
                                    assignmentStatusClass = "is-overdue";
                                    typeTags.push("missing");
                                    statusText = "Süresi Doldu";
                                } else {
                                    assignmentStatusClass = "is-wait";
                                    statusText = "Kaynak Bekliyor";
                                }
                            } else if (isAllDone) {
                                typeTags.push("done");
                                assignmentStatusClass = "is-done";
                                statusText = "Yapıldı";
                                StatusIconSVG = <path d="M20 6 9 17l-5-5"/>;
                            } else if (isOriginalOverdue) {
                                typeTags.push("missing");
                                assignmentStatusClass = "is-overdue";
                                statusText = "Eksik";
                                StatusIconSVG = <><path d="M15 6v12"/><path d="M9 6v12"/><path d="M4 8h16"/><path d="M4 16h16"/></>;
                            } else {
                                typeTags.push("waiting");
                                assignmentStatusClass = "is-wait";
                                statusText = "Verildi";
                            }

                            if (homeworkFilter !== 'all' && !typeTags.includes(homeworkFilter)) {
                                return null;
                            }

                            const isOpen = expandedAssignments[topic.id];

                            return (
                                <article key={topic.id} className={`assignment ${assignmentStatusClass} ${isOpen ? 'open' : ''}`}>
                                    <div className="assignment-head">
                                        <div className="assignment-title-row">
                                            <div className="assignment-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">{StatusIconSVG}</svg>
                                            </div>
                                            <div className="title-block">
                                                <h2>{topic.title}</h2>
                                                <p>{!hasSources ? 'Kaynak eklenmemiş konu' : (isAllDone ? 'Tüm kaynaklar tamamlandı' : (isOriginalOverdue ? 'Tamamlanmamış kaynaklar var' : 'Ödev verildi, tamamlanmayı bekliyor'))}</p>
                                            </div>
                                            <div className="status-badge">{statusBadgeIcon} {statusText}</div>
                                        </div>

                                        {topic.date && (
                                            <div className="meta-row">
                                                <div className={`meta ${isOriginalOverdue && !isAllDone ? 'deadline' : ''}`}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/></svg>
                                                    Son teslim: {formatDate(topic.date)} {deadlineInfo.text && `(${deadlineInfo.text})`}
                                                </div>
                                            </div>
                                        )}

                                        <div className="progress-row">
                                            <div className="progress" style={{ "--value": `${pct}%` }}><span></span></div>
                                            <div className="percent">%{pct}</div>
                                        </div>

                                        <div className="task-bottom">
                                            <div className="resource-summary">
                                                <div className="resource-count">{topic.subColumns?.length || 0}</div>
                                                {hasSources ? 'Kaynak durumu' : 'Kaynak yok'}
                                            </div>
                                            {hasSources && (
                                                <button className="details-btn" onClick={() => toggleAssignment(topic.id)}>
                                                    Detay
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="resources">
                                        {!hasSources ? (
                                            <div className="empty-note">Bu konuya ait kaynak yok.</div>
                                        ) : (
                                                topic.subColumns.map(col => {
                                                    const status = selectedStudentForView.grades?.[col.id] || 'assigned'; 
                                                    const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[0]; 
                                                    const note = selectedStudentForView.assignmentNotes?.[col.id];
                                                    
                                                    let ResourceStatusSVG = <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>;
                                                    if (status === 'done') {
                                                        ResourceStatusSVG = <path d="M20 6 9 17l-5-5"/>;
                                                    } else if (status === 'missing' || (status === 'assigned' && isOriginalOverdue)) {
                                                        ResourceStatusSVG = <><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></>;
                                                    }

                                                    return (
                                                        <div key={col.id} className="resource">
                                                            <div className="resource-top">
                                                                <div className="resource-name">
                                                                    <small>KAYNAK</small>
                                                                    <strong>{col.title}</strong>
                                                                </div>
                                                                {isTeacherMode && (
                                                                    <button onClick={() => openCellNoteModal(selectedClass.id, selectedStudentForView.id, col.id, selectedStudentForView.assignmentNotes?.[col.id] || "")} className={`p-2 rounded-xl transition-colors ${note ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-primary'}`} title="Öğretmen Notu"><StickyNote size={14} /></button>
                                                                )}
                                                            </div>

                                                            {isTeacherMode ? (
                                                                <div className="mt-3 grid grid-cols-4 gap-1 bg-slate-50/50 p-1 rounded-xl border border-slate-100">
                                                                    {STATUS_OPTIONS.map(opt => ( 
                                                                        <button key={opt.id} onClick={() => updateGrade(selectedClass.id, selectedStudentForView.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${status === opt.id ? `${opt.bg} ${opt.color} shadow-sm border ${opt.border} scale-102` : 'text-slate-400 hover:bg-white border border-transparent hover:border-slate-200'}`}>
                                                                            <opt.icon size={16} className="mb-1" strokeWidth={2.5}/>
                                                                            <span className="text-[9px] font-bold">{opt.label}</span>
                                                                        </button> 
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className={`resource-status mt-3`} style={status === 'done' ? {color: 'var(--hw-done)', background: 'var(--hw-doneSoft)', borderColor: 'rgba(19,185,129,.17)'} : (status === 'missing' || (status === 'assigned' && isOriginalOverdue)) ? {color: '#e11d48', background: '#ffe4e6', borderColor: 'rgba(225,29,72,.16)'} : {}}>
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">{ResourceStatusSVG}</svg>
                                                                    {statusData.label.toUpperCase()}
                                                                </div>
                                                            )}

                                                            {note && ( 
                                                                <div className="mt-3 bg-yellow-50/80 p-2.5 rounded-xl border border-yellow-200 flex gap-2 items-start text-xs text-yellow-900 shadow-inner w-full overflow-hidden">
                                                                    <Info size={16} className="mt-0.5 shrink-0 text-yellow-500"/> 
                                                                    <span className="font-medium leading-relaxed flex-1 min-w-0 break-all whitespace-pre-wrap">{note}</span>
                                                                </div> 
                                                            )}
                                                            {col.pdfLink && <div className="mt-2"><PdfDownloadButton link={col.pdfLink} isVip={currentUserRole === 'vip-student'} isTeacher={false} /></div>}
                                                        </div>
                                                    )
                                                })
                                        )}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
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
