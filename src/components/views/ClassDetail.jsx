import React, { useState } from 'react';
import { DERSLER } from '../../utils/constants';
import { Plus, Layout, BookOpen, TrendingUp } from 'lucide-react';

const ClassDetail = ({ selectedClass, setModalData, setModalType }) => {
    const [activeTab, setActiveTab] = useState('homework');

    if (!selectedClass) return <div className="p-10">Sınıf seçilmedi.</div>;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black mb-6">{selectedClass.className}</h2>
            
            <div className="flex gap-2 mb-6 border-b border-slate-100 pb-4">
                <button onClick={() => setActiveTab('homework')} className={`px-4 py-2 rounded-xl font-bold ${activeTab === 'homework' ? 'bg-purple-100 text-purple-700' : 'text-slate-500'}`}>Ödevler</button>
                <button onClick={() => setActiveTab('net-takip')} className={`px-4 py-2 rounded-xl font-bold ${activeTab === 'net-takip' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Net Takip</button>
            </div>

            {activeTab === 'net-takip' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3">Öğrenci</th>
                                {DERSLER.map(d => <th key={d.id} className="p-3 text-center">{d.label}</th>)}
                                <th className="p-3">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedClass.students?.map(std => (
                                <tr key={std.id} className="border-b">
                                    <td className="p-3 font-bold">{std.name}</td>
                                    {DERSLER.map(d => (
                                        <td key={d.id} className="text-center font-black text-brandPurple">
                                            {std.netTakip?.slice(-1)[0]?.dersler?.[d.id]?.net || 0}
                                        </td>
                                    ))}
                                    <td className="text-center">
                                        <button onClick={() => { setModalData({ classId: selectedClass.id, studentId: std.id }); setModalType('net-takip-ekle'); }} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Plus size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
export default ClassDetail;
