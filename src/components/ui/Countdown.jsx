import React, { useState, useEffect } from 'react';
import { CalendarDays, GraduationCap } from 'lucide-react';

const CountdownTimer = ({ targetDateStr, startDateStr, targetLabel, minimalist = false }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, progressDays: 0, progressHours: 0, progressMinutes: 0, progressSeconds: 0 });
    
    useEffect(() => {
        const targetDate = new Date(targetDateStr || '2026-06-20T00:00:00'); 
        const startDate = new Date(startDateStr || '2025-06-20T00:00:00'); 
        const totalDuration = targetDate - startDate;
        
        const timer = setInterval(() => {
            const now = new Date(); const difference = targetDate - now; const elapsed = now - startDate;
            if (difference < 0) { clearInterval(timer); return; }
            const days = Math.floor(difference / (1000 * 60 * 60 * 24)); const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60); const seconds = Math.floor((difference / 1000) % 60);
            setTimeLeft({ days, hours, minutes, seconds, progressDays: Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)), progressHours: (hours / 24) * 100, progressMinutes: (minutes / 60) * 100, progressSeconds: (seconds / 60) * 100 });
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDateStr, startDateStr]);

    const CircularProgress = ({ value, max, strokeColor, label, small = false }) => {
        const radius = small ? 16 : 22; 
        const circumference = 2 * Math.PI * radius; 
        const offset = circumference - (value / 100) * circumference;
        const sizeClass = small ? "w-10 h-10 md:w-14 md:h-14" : "w-14 h-14 md:w-20 md:h-20";
        const center = small ? 20 : 25;
        const textClass = small ? "text-sm md:text-base" : "text-base md:text-xl";
        const viewBox = small ? "0 0 40 40" : "0 0 50 50";

        return (
            <div className="flex flex-col items-center">
                <div className={`relative ${sizeClass} drop-shadow-sm`}>
                    <svg className="w-full h-full transform -rotate-90" viewBox={viewBox}>
                        <circle className="text-slate-100 opacity-20" strokeWidth="3" stroke="currentColor" fill="transparent" r={radius} cx={center} cy={center}/>
                        <circle className={`${strokeColor} transition-all duration-1000 ease-linear drop-shadow-md`} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx={center} cy={center} />
                    </svg>
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center"><span className={`${textClass} font-black ${strokeColor}`}>{max}</span></div>
                </div>
                <span className={`font-black mt-1 uppercase tracking-widest ${small ? 'text-[8px] md:text-[9px] text-white/70' : 'text-[10px] md:text-xs text-slate-500 mt-2'}`}>{label}</span>
            </div>
        );
    };

    if (minimalist) {
        return (
            <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/80 bg-white/10 px-3 py-1 rounded-full border border-white/10 shadow-sm">{targetLabel || 'Sınav'}</span>
                <div className="flex justify-center gap-3 md:gap-4 mt-1">
                    <CircularProgress value={timeLeft.progressDays} max={timeLeft.days} strokeColor="text-amber-400" label="GÜN" small={true} />
                    <CircularProgress value={timeLeft.progressHours} max={timeLeft.hours} strokeColor="text-sky-400" label="SAAT" small={true} />
                    <CircularProgress value={timeLeft.progressMinutes} max={timeLeft.minutes} strokeColor="text-emerald-400" label="DK" small={true} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 mt-6 animate-fade-in-up relative z-10">
            <div className="bg-white rounded-[2rem] shadow-float border border-slate-100 p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute -right-10 -top-10 text-indigo-50/50 rotate-12"><CalendarDays size={150} /></div>
                <div className="relative z-10 flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-2 mb-2"><div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><GraduationCap size={20} /></div><h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-widest">Hedefe Kalan Zaman</h3></div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 shadow-sm">{targetLabel || 'Belirlenmedi'}</span>
                </div>
                <div className="relative z-10 flex justify-center gap-4 md:gap-8">
                    <CircularProgress value={timeLeft.progressDays} max={timeLeft.days} strokeColor="text-amber-500" label="GÜN" />
                    <CircularProgress value={timeLeft.progressHours} max={timeLeft.hours} strokeColor="text-sky-500" label="SAAT" />
                    <CircularProgress value={timeLeft.progressMinutes} max={timeLeft.minutes} strokeColor="text-emerald-500" label="DAKİKA" />
                    <CircularProgress value={timeLeft.progressSeconds} max={timeLeft.seconds} strokeColor="text-rose-500" label="SANİYE" />
                </div>
            </div>
        </div>
    );
};

export default CountdownTimer;
