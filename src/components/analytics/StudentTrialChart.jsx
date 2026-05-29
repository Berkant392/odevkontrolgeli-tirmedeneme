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

    const chartData = trials.map(t => ({ name: t.title, Net: t.totalNet, date: formatDate(t.date) }));

    return (
        <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border ${isVip ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-100 shadow-float'} mt-6`}>
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
    );
};

export default StudentTrialChart;
