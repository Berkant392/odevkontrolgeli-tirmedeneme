// src/components/views/ClassDetail.jsx - GÜNCEL
import React, { useState } from 'react';
import { DERSLER } from '../../utils/constants';
import { TrendingUp, Plus } from 'lucide-react';

const ClassDetail = ({ selectedClass, setModalData, setModalType }) => {
    // Tab geçişi için yerel state
    const [activeTab, setActiveTab] = useState('homework');

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm">
            {/* Tablar */}
            <div className="flex gap-2 mb-6">
                <button onClick={() => setActiveTab('homework')} className="px-4 py-2 bg-purple-100 rounded-lg">Ödevler</button>
                <button onClick={() => setActiveTab('net-takip')} className="px-4 py-2 bg-emerald-100 rounded-lg">Net Takip</button>
            </div>

            {activeTab === 'net-takip' && selectedClass.students && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th>Öğrenci</th>
                                {DERSLER.map(d => <th key={d.id}>{d.label}</th>)}
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedClass.students.map(std => (
                                <tr key={std.id}>
                                    <td>{std.name}</td>
                                    {DERSLER.map(d => (
                                        <td key={d.id} className="text-center">
                                            {std.netTakip?.slice(-1)[0]?.dersler?.[d.id]?.net || 0}
                                        </td>
                                    ))}
                                    <td>
                                        <button 
                                            onClick={() => {
                                                setModalData({ classId: selectedClass.id, studentId: std.id });
                                                setModalType('net-takip-ekle');
                                            }}
                                            className="p-2 bg-purple-50 rounded-lg"
                                        >
                                            <Plus size={16}/>
                                        </button>
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
