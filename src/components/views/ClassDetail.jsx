import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, ChevronRight, User, Lock, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClassDetail = ({ classData, onBack, updateClassInDb, onSelectStudent }) => {
  const [newStudentName, setNewStudentName] = useState('');
  // Düzenlenecek öğrenciyi ve form verilerini tutacak state'ler
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '' });

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const generateRandomStr = (length) => {
      const chars = '0123456789';
      return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const newStudent = {
      id: Date.now().toString(),
      name: newStudentName.trim(),
      username: generateRandomStr(7),
      password: generateRandomStr(6),
      grades: {}
    };

    const updatedClass = {
      ...classData,
      students: [...(classData.students || []), newStudent]
    };

    updateClassInDb(updatedClass);
    setNewStudentName('');
  };

  const handleDeleteStudent = (e, studentId) => {
    e.stopPropagation();
    if (window.confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) {
      const updatedClass = {
        ...classData,
        students: classData.students.filter(s => s.id !== studentId)
      };
      updateClassInDb(updatedClass);
    }
  };

  // Düzenleme modalını açar
  const openEditModal = (e, student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setEditForm({ name: student.name, username: student.username, password: student.password });
  };

  // Düzenlemeyi kaydeder
  const handleSaveEdit = () => {
    if (!editForm.name.trim() || !editForm.username.trim() || !editForm.password.trim()) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    const updatedStudents = classData.students.map(s => 
        s.id === editingStudent.id 
            ? { ...s, name: editForm.name, username: editForm.username, password: editForm.password } 
            : s
    );

    updateClassInDb({ ...classData, students: updatedStudents });
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      {/* Üst Kısım */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800">{classData.className}</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">
            {classData.type === 'vip' ? 'VIP Özel Ders' : 'Sınıf'} • {(classData.students || []).length} Öğrenci
          </p>
        </div>
      </div>

      {/* Yeni Öğrenci Ekleme */}
      <form onSubmit={handleAddStudent} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-3 shadow-sm">
        <input
          type="text"
          value={newStudentName}
          onChange={(e) => setNewStudentName(e.target.value)}
          placeholder="Yeni öğrenci adı..."
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brandPurple/20 focus:border-brandPurple font-medium text-slate-700"
        />
        <button
          type="submit"
          disabled={!newStudentName.trim()}
          className="px-6 py-3 bg-brandPurple text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md shadow-purple-200"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Ekle</span>
        </button>
      </form>

      {/* Öğrenci Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(classData.students || []).map((student) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelectStudent(student)}
            className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-brandPurple hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${classData.type === 'vip' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-brandPurple'}`}>
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-700 group-hover:text-brandPurple transition-colors">
                  {student.name}
                </h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">Ödev Detaylarını Gör</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Şifreleri göstermek yerine sadece Düzenle Butonu koyduk */}
              <button
                onClick={(e) => openEditModal(e, student)}
                className="p-2 text-slate-400 hover:text-brandPurple hover:bg-purple-50 rounded-lg transition-colors"
                title="Bilgileri Düzenle"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={(e) => handleDeleteStudent(e, student.id)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Öğrenciyi Sil"
              >
                <Trash2 size={18} />
              </button>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-brandPurple transition-transform group-hover:translate-x-1 ml-2" />
            </div>
          </motion.div>
        ))}
        {(classData.students || []).length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200 border-dashed">
            Henüz öğrenci eklenmemiş
          </div>
        )}
      </div>

      {/* ÖĞRENCİ DÜZENLEME MODALI */}
      <AnimatePresence>
        {editingStudent && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-xl"
                >
                    <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
                        <h3 className="font-black text-slate-700 flex items-center gap-2">
                            <Edit2 size={18} className="text-brandPurple"/> Öğrenci Bilgileri
                        </h3>
                        <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={20}/>
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Öğrenci Adı</label>
                            <input 
                                type="text" 
                                value={editForm.name} 
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brandPurple font-medium text-slate-700"
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Giriş Numarası (Kullanıcı Adı)</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    value={editForm.username} 
                                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brandPurple font-mono text-sm text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Şifre</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    value={editForm.password} 
                                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brandPurple font-mono text-sm text-slate-700"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
                        <button 
                            onClick={() => setEditingStudent(null)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleSaveEdit}
                            className="px-6 py-2 bg-brandPurple text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <Save size={14}/> Kaydet
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ClassDetail;
