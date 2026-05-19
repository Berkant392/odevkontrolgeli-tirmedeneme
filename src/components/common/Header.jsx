import React from 'react';
import { ChevronLeft, Library, Settings, LogOut } from 'lucide-react';

const Header = ({ currentUserRole, view, setView, goHome, isTeacherMode, setShowLibraryManager, handleOpenStudentSettings, handleLogout }) => {
    return (
        <header className={`no-print relative z-20 transition-all duration-500 ${currentUserRole === 'vip-student' ? 'bg-slate-800/90 border-b border-slate-700 shadow-md' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
            <div className="max-w-7xl mx-auto px-3 py-2.5 md:py-4 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3 w-full justify-between">
                    {currentUserRole !== 'student' && currentUserRole !== 'vip-student' && view !== 'home' ? ( 
                        <button onClick={() => view === 'student-detail' ? setView('class-detail') : goHome()} className={`p-1.5 md:p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                            <ChevronLeft size={20} />
                        </button> 
                    ) : <div className="w-8"></div>}
                    
                    <div className="text-center">
                        <h1 className={`text-md md:text-2xl font-black tracking-tight flex items-center justify-center gap-2 ${currentUserRole === 'vip-student' ? 'real-gold-text' : 'text-slate-800'}`}>
                            <div className={`p-1 md:p-1.5 rounded-lg shadow-md transition-transform hover:scale-105 hover-lift w-7 h-7 md:w-9 md:h-9 flex items-center justify-center ${currentUserRole === 'vip-student' ? 'real-gold-bg shadow-vip-glow' : 'bg-gradient-to-tr from-brandPurple to-blue-600 shadow-glow'}`}>
                                <img src="/pwa-192x192.png" alt="Mini Logo" className="w-full h-full object-contain pointer-events-none select-none" />
                            </div> 
                            BERKANT HOCA
                        </h1>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
                        {isTeacherMode && (
                            <button onClick={() => setShowLibraryManager(true)} className="p-1.5 text-slate-500 hover:text-brandPurple bg-white hover:bg-purple-50 rounded-full transition-colors shadow-sm border border-slate-200 hover-lift">
                                <Library size={16}/>
                            </button>
                        )}
                        {(currentUserRole === 'student' || currentUserRole === 'vip-student') && (
                            <button onClick={handleOpenStudentSettings} className={`p-1.5 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-slate-300 hover:text-vipGold bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-500 hover:text-brandPurple bg-white shadow-sm border border-slate-200'}`} title="Hesabım">
                                <Settings size={16}/>
                            </button>
                        )}
                        <button onClick={handleLogout} className={`p-1.5 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-rose-400 hover:text-rose-300 bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-slate-200'}`} title="Çıkış Yap">
                            <LogOut size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
