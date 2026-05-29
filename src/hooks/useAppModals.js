import { useState } from 'react';
import { db } from '../config/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { SETTINGS_COLLECTION, SETTINGS_DOC } from '../utils/constants';
import { generateId } from '../utils/helpers';

export const useAppModals = ({
    classes,
    countdownConfig,
    updateClassInDb,
    scheduleDeadlinePush
}) => {
    const [modalType, setModalType] = useState(null);
    const [modalData, setModalData] = useState(null);
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalTitleVal, setModalTitleVal] = useState("");
    const [modalDateVal, setModalDateVal] = useState("");
    const [modalPdfVal, setModalPdfVal] = useState("");
    const [modalPhoneVal, setModalPhoneVal] = useState("");

    const [modalEditUsername, setModalEditUsername] = useState("");
    const [modalEditPassword, setModalEditPassword] = useState("");

    const handleModalSubmit = async () => {
        if (modalType === 'system-settings') {
            await updateDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { 
                countdown: { 
                    targetDate: modalDateVal ? `${modalDateVal}T00:00:00` : countdownConfig.targetDate, 
                    startDate: modalTitleVal ? `${modalTitleVal}T00:00:00` : countdownConfig.startDate, 
                    label: modalPdfVal || "" 
                } 
            });
            setModalType(null); 
            setModalInputVal(""); 
            setModalTitleVal(""); 
            setModalDateVal(""); 
            setModalPdfVal("");
            return;
        }

        if (!modalInputVal.trim() && modalType !== 'edit-date') return;

        if (modalType === 'edit-class') {
            const cls = classes.find(c => c.id === modalData.classId);
            updateClassInDb({ ...cls, className: modalInputVal });
        }
        else if (modalType === 'edit-student') {
            const cls = classes.find(c => c.id === modalData.classId);
            
            let formattedPhone = "";
            if (modalPhoneVal && modalPhoneVal.trim() !== "") {
                let cleanPhone = modalPhoneVal.replace(/\D/g, "");
                if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
                if (!cleanPhone.startsWith("90")) cleanPhone = "90" + cleanPhone;
                formattedPhone = "+" + cleanPhone;
            }

            const updatedStudents = cls.students.map(s =>
                s.id === modalData.studentId ? { ...s, name: modalInputVal, phone: formattedPhone, username: modalEditUsername.trim().toLowerCase(), password: modalEditPassword.trim() } : s
            );
            updateClassInDb({ ...cls, students: updatedStudents });
        }
        else if (modalType === 'topic') {
            const cls = classes.find(c => c.id === modalData.classId);
            const newTopic = { id: generateId('top'), title: modalInputVal, date: modalDateVal, subColumns: [] };
            updateClassInDb({ ...cls, topics: [...(cls.topics || []), newTopic] });
            scheduleDeadlinePush(cls, modalInputVal, modalDateVal);
        }
        else if (modalType === 'edit-topic') {
            const cls = classes.find(c => c.id === modalData.classId);
            const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, title: modalInputVal, date: modalDateVal } : t);
            updateClassInDb({ ...cls, topics: updatedTopics });
            scheduleDeadlinePush(cls, modalInputVal, modalDateVal);
        }
        else if (modalType === 'edit-date') {
            const cls = classes.find(c => c.id === modalData.classId);
            const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, date: modalDateVal } : t);
            updateClassInDb({ ...cls, topics: updatedTopics });
            const topic = cls.topics.find(t => t.id === modalData.topicId);
            if (topic) scheduleDeadlinePush(cls, topic.title, modalDateVal);
        }
        else if (modalType === 'source') {
            const cls = classes.find(c => c.id === modalData.classId);
            const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: [...(t.subColumns || []), { id: generateId('col'), title: modalInputVal, pdfLink: modalPdfVal }] } : t);
            updateClassInDb({ ...cls, topics: updatedTopics });
        }
        else if (modalType === 'edit-source') {
            const cls = classes.find(c => c.id === modalData.classId);
            const updatedTopics = cls.topics.map(t => { 
                if (t.id === modalData.topicId) { 
                    return { 
                        ...t, 
                        subColumns: t.subColumns.map(c => c.id === modalData.colId ? { ...c, title: modalInputVal, pdfLink: modalPdfVal } : c) 
                    }; 
                } 
                return t; 
            });
            updateClassInDb({ ...cls, topics: updatedTopics });
        }

        setModalType(null);
        setModalInputVal("");
        setModalTitleVal("");
        setModalDateVal("");
        setModalPdfVal("");
        setModalEditUsername("");
        setModalEditPassword("");
    };

    return {
        modalType,
        setModalType,
        modalData,
        setModalData,
        modalInputVal,
        setModalInputVal,
        modalTitleVal,
        setModalTitleVal,
        modalDateVal,
        setModalDateVal,
        modalPdfVal,
        setModalPdfVal,
        modalPhoneVal,
        setModalPhoneVal,
        modalEditUsername,
        setModalEditUsername,
        modalEditPassword,
        setModalEditPassword,
        handleModalSubmit
    };
};
