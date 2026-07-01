import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { formatDate } from '../../utils/helpers';
import { TrendingUp } from 'lucide-react';

const StudentTrialChart = ({ studentId, isVip }) => {
    const [trials, setTrials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) return;
        const q = query(collection(db, 'trials'), where('studentId', '==', studentId));
        const unsub = onSnapshot(q, (snap) => {
            const fetchedTrials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sadece TYT sonuçlarını gösterelim ana ekranda karmaşa olmaması için
            const tytTrials = fetchedTrials.filter(t => t.type === 'TYT').sort((a, b) => new Date(a.date) - new Date(b.date));
            setTrials(tytTrials);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [studentId]);

    if (loading) return null;
    if (trials.length === 0) return null;

    const chartData = trials.map(t => ({ 
        name: t.title, 
        Net: t.totalNet || 0, 
        turkish: t.details?.turkce || 0,
        math: t.details?.mat || 0,
        social: t.details?.sosyal || 0,
        science: t.details?.fen || 0,
        date: formatDate(t.date) 
    }));

    return (
        <div className="space-y-6 mt-6">
            <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border ${isVip ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-float'}`}>
                <h3 className={`text-sm md:text-base font-black mb-4 md:mb-6 flex items-center gap-2 ${isVip ? 'text-white' : 'text-slate-800'}`}>
                    <TrendingUp className="text-blue-500" size={20} /> TYT Net Gelişim Grafiği
                </h3>
                <div className="h-48 md:h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isVip ? '#334155' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} dx={-10} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px', padding: '12px' }} />
                            <Area type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorNet)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border ${isVip ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-float'}`}>
                <h3 className={`text-sm md:text-base font-black mb-1 flex items-center gap-2 uppercase tracking-widest ${isVip ? 'text-white' : 'text-slate-800'}`}>
                    Ders Bazlı Karşılaştırmalı Grafikler
                </h3>
                <p className={`text-xs font-medium mb-6 ${isVip ? 'text-slate-400' : 'text-slate-500'}`}>Derslerinizin gelişim seyrini eş zamanlı izleyin.</p>
                <div className="h-56 md:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isVip ? '#334155' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} dx={-10} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px', padding: '12px' }} />
                            
                            <Area type="monotone" dataKey="turkish" name="TÜRKÇE" stroke="#e11d48" strokeWidth={3} fill="none" dot={false} activeDot={{ r: 5, fill: '#e11d48', strokeWidth: 0 }} />
                            <Area type="monotone" dataKey="math" name="MATEMATİK" stroke="#2563eb" strokeWidth={3} fill="none" dot={false} activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 0 }} />
                            <Area type="monotone" dataKey="social" name="SOSYAL BİLİMLER" stroke="#d97706" strokeWidth={3} fill="none" dot={false} activeDot={{ r: 5, fill: '#d97706', strokeWidth: 0 }} />
                            <Area type="monotone" dataKey="science" name="FEN BİLİMLERİ" stroke="#059669" strokeWidth={3} fill="none" dot={false} activeDot={{ r: 5, fill: '#059669', strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-[#e11d48]"></div><span className="text-[10px] font-black uppercase text-[#e11d48]">TÜRKÇE</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-[#2563eb]"></div><span className="text-[10px] font-black uppercase text-[#2563eb]">MATEMATİK</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-[#d97706]"></div><span className="text-[10px] font-black uppercase text-[#d97706]">SOSYAL BİLİMLER</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-[#059669]"></div><span className="text-[10px] font-black uppercase text-[#059669]">FEN BİLİMLERİ</span></div>
                </div>
            </div>
        </div>
    );
};

export default StudentTrialChart;
