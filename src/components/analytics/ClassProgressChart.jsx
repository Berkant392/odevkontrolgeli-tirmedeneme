import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { calculateStats } from '../../utils/helpers';

const ClassProgressChart = ({ classes, title, color }) => {
    if (!classes || classes.length === 0) return null;

    // Sınıfların istatistiklerini hesapla
    const data = classes.map(cls => {
        const stats = calculateStats(cls.students, cls.topics);
        return {
            name: cls.className,
            percentage: stats.percentage || 0,
            type: cls.type
        };
    }).filter(item => item.percentage > 0 || item.type === 'regular'); // Sadece verisi olanları veya grup sınıflarını göster

    if (data.length === 0) return null;

    return (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm w-full h-[300px] mt-6 flex flex-col">
            <h3 className={`text-sm font-black text-slate-600 mb-4 uppercase tracking-widest pl-2 border-l-4 ${color === 'vip' ? 'border-amber-500' : 'border-brandPurple'}`}>
                {title || 'Sınıf Genel Başarı Oranları'}
            </h3>
            <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            dx={-10}
                            domain={[0, 100]}
                            tickFormatter={(value) => `%${value}`}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => [`%${value}`, 'Başarı']}
                        />
                        <Bar dataKey="percentage" radius={[6, 6, 6, 6]} barSize={40}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.type === 'vip' ? '#f59e0b' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ClassProgressChart;
