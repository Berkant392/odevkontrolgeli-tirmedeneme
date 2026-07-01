import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../config/firebase';
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Check, Edit3, X, Plus, Trash2, LayoutGrid, Hexagon, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import '../../styles/subjectStudy.css';
import TopicManagerModal from '../modals/TopicManagerModal';
import CategoryManagerModal from '../modals/CategoryManagerModal';

const EXAMS_FALLBACK = [{ id: 'tyt', label: 'TYT' }, { id: 'ayt', label: 'AYT' }];
const SUBJECTS_FALLBACK = [
    { id: 'mat', label: 'Matematik' },
    { id: 'fiz', label: 'Fizik' },
    { id: 'kim', label: 'Kimya' },
    { id: 'biy', label: 'Biyoloji' },
    { id: 'tur', label: 'Türkçe' }
];

const DEFAULT_CURRICULUM = {
    categories: { exams: EXAMS_FALLBACK, subjects: SUBJECTS_FALLBACK },
    tyt: { mat: [] } // Boş başlar, yönetici paneli üzerinden eklenebilir
};

// Layout generator for any number of topics
function generateLayout(count) {
    const layout = [];
    const xPattern = [204, 104, 304, 104, 304];
    
    let currentY = 0;
    
    for (let idx = 0; idx < count; idx++) {
        let patternIdx = idx % 5;
        let x = xPattern[patternIdx];
        let r = (idx % 2 === 0) ? -2 : 2;
        if (patternIdx === 0) r = 0;
        
        layout.push({ x, y: currentY, r });
        
        if (patternIdx === 0) currentY -= 100;
        else if (patternIdx === 2 || patternIdx === 4) currentY -= 110;
    }
    
    if (layout.length > 0) {
        const minY = layout[layout.length - 1].y;
        const offset = 120 - minY;
        layout.forEach(item => {
            item.y += offset;
        });
    }
    
    return layout;
}

function hexPoints(r = 48, dx = 0, dy = 0) {
    const pts = [[-.5, -.866], [.5, -.866], [1, 0], [.5, .866], [-.5, .866], [-1, 0]];
    return pts.map(([x, y]) => `${(x * r + dx).toFixed(2)},${(y * r + dy).toFixed(2)}`).join(" ");
}

function smoothPath(points) {
    if (!points || !points.length) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`;
    }
    return d;
}

function wrapText(text, max = 11) {
    const words = text.split(" ");
    const lines = [];
    let cur = "";
    words.forEach(word => {
        const test = cur ? `${cur} ${word}` : word;
        if (test.length > max && cur) {
            lines.push(cur);
            cur = word;
        } else cur = test;
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
}

const HexagonNode = React.memo(({ topic, index, status, progress, pos, isUnlockingThis, honeyY, onNodeClick }) => {
    return (
        <g 
           className={`node ${status === 'locked' ? 'is-locked' : ''} ${status === 'open' ? 'is-open' : ''} ${status === 'in-progress' ? 'in-progress' : ''} ${status === 'done' ? 'is-done' : ''} ${isUnlockingThis ? 'is-unlocking' : ''}`} 
           transform={`translate(${pos.x} ${pos.y}) rotate(${pos.r})`}
           onClick={() => onNodeClick(topic, status)}>
            
            <g className="node-body">
                <circle className="aura" cx="0" cy="0" r="68" />
                <polygon className="cell-shadow" points={hexPoints(48,0,15)} />
                <polygon className="cell-side" points={hexPoints(48,0,9)} />
                <polygon className="cell-face" points={hexPoints(48)} />
                <polygon className="cell-core" points={hexPoints(42,-2,-3)} />
                <polygon className="cell-inner" points={hexPoints(43,-1,-1)} />
                <polygon className="cell-noise" points={hexPoints(48)} />
                
                <g className="honey-clip-layer" style={{ opacity: progress > 0 ? 1 : 0, transition: 'opacity 0.4s ease' }} clipPath="url(#hexClip)">
                    <g className="honey-rise" style={{ transform: `translateY(${honeyY}px)` }}>
                        <use href="#honeyLiquid" />
                    </g>
                </g>

                <polygon className="cell-glint" points="-18,-30 22,-30 7,-2 -27,-6" />
                <polygon className="cell-rim" points={hexPoints(43,-2,-2)} />
                <polygon className="cell-bevel" points={hexPoints(48)} />

                {status === 'locked' && (
                    <use href="#lockChain" />
                )}

                <circle className="index-bg" cx="0" cy="-34" r="12" />
                <text className="index" x="0" y="-34">{index + 1}</text>
                
                <rect className="label-bg" x="-38" y="-13" width="76" height="28" rx="12" />
                <text className="honey-label" x="0" y="2">
                    {wrapText(topic.title).map((line, li) => (
                        <tspan key={li} x="0" y={-5 + (li * 13)}>{line}</tspan>
                    ))}
                </text>
                
                <circle className="state-bg" cx="40" cy="38" r="12" />
                {status === 'done' ? (
                    <path className="state-icon" d="M31.5 35.5 L36.5 40.5 L45.5 30.8" />
                ) : status === 'open' ? (
                    <path className="state-icon" d="M36 30 L42 36 L36 42" />
                ) : (
                    <g>
                        <path className="state-icon" d="M33.5 35 V32.8 C33.5 29.8 35.6 27.6 38.5 27.6 C41.4 27.6 43.5 29.8 43.5 32.8 V35" />
                        <rect className="state-icon" x="32" y="35" width="13" height="10" rx="2.5" />
                    </g>
                )}
            </g>
        </g>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.status === nextProps.status &&
        prevProps.progress === nextProps.progress &&
        prevProps.isUnlockingThis === nextProps.isUnlockingThis &&
        prevProps.topic.id === nextProps.topic.id &&
        prevProps.topic.title === nextProps.topic.title
    );
});

const SubjectStudyView = ({ studentId, isTeacherMode, showAlert }) => {
    const [selectedExam, setSelectedExam] = useState('tyt');
    const [selectedSubject, setSelectedSubject] = useState('mat');
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    
    // Inline subtopic addition state
    const [isAddingSubtopic, setIsAddingSubtopic] = useState(false);
    const [newSubtopicTitle, setNewSubtopicTitle] = useState('');
    
    const [curriculum, setCurriculum] = useState({});
    const [completedItems, setCompletedItems] = useState([]);
    const [openedTopics, setOpenedTopics] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isEditingGlobal, setIsEditingGlobal] = useState(false);
    const [activeTopic, setActiveTopic] = useState(null);
    const [isUnlocking, setIsUnlocking] = useState(null);

    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
    const scrollContainerRef = useRef(null);

    // Toggle body modal-open class when activeTopic changes
    useEffect(() => {
        if (activeTopic) document.body.classList.add('modal-open');
        else {
            // Only remove if no other modals are open
            const hasOtherModals = document.querySelectorAll('.fixed.inset-0, .modal-overlay').length > 0;
            if (!hasOtherModals) document.body.classList.remove('modal-open');
        }
        
        return () => {
            const hasOtherModals = document.querySelectorAll('.fixed.inset-0, .modal-overlay').length > 0;
            if (!hasOtherModals) document.body.classList.remove('modal-open');
        };
    }, [activeTopic]);

    useEffect(() => {
        const unsubCurr = onSnapshot(doc(db, "settings", "globalCurriculum"), (docSnap) => {
            if (docSnap.exists()) {
                setCurriculum(docSnap.data());
            } else {
                setDoc(doc(db, "settings", "globalCurriculum"), DEFAULT_CURRICULUM);
                setCurriculum(DEFAULT_CURRICULUM);
            }
            if (!studentId) setLoading(false);
        });

        if (studentId) {
            const unsubProgress = onSnapshot(doc(db, "students", studentId), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCompletedItems(data.completedSubtopics || []);
                    setOpenedTopics(data.openedTopics || []);
                }
                setLoading(false);
            });
            return () => { unsubCurr(); unsubProgress(); };
        } else {
            return () => unsubCurr();
        }
    }, [studentId]);

    const examsList = curriculum.categories?.exams || EXAMS_FALLBACK;
    const subjectsList = curriculum.categories?.subjects || SUBJECTS_FALLBACK;

    useEffect(() => {
        if (examsList.length > 0 && !examsList.find(e => e.id === selectedExam)) {
            setSelectedExam(examsList[0].id);
        }
    }, [examsList, selectedExam]);

    const filteredSubjects = subjectsList.filter(su => !su.examIds || su.examIds.length === 0 || su.examIds.includes(selectedExam));
    
    useEffect(() => {
        if (filteredSubjects.length > 0 && !filteredSubjects.find(s => s.id === selectedSubject)) {
            setSelectedSubject(filteredSubjects[0].id);
        }
    }, [filteredSubjects, selectedSubject]);

    const currentList = [...(curriculum[selectedExam]?.[selectedSubject] || [])].sort((a,b) => a.order - b.order);

    // Auto-scroll to bottom on mount or when subject changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [selectedExam, selectedSubject, currentList.length]);

    const layout = useMemo(() => generateLayout(currentList.length), [currentList.length]);
    const roadmapPath = useMemo(() => smoothPath(layout), [layout]);
    const maxSvgHeight = layout.length > 0 ? layout[0].y + 150 : 500;

    const getTopicProgress = (topic) => {
        const subs = topic.subtopics || [];
        if (subs.length === 0) return completedItems.includes(topic.id) ? 100 : 0;
        const completedCount = subs.filter(s => completedItems.includes(s.id)).length;
        return (completedCount / subs.length) * 100;
    };

    const getTopicStatus = (topic) => {
        const progress = getTopicProgress(topic);
        if (progress === 0) return "locked";
        if (progress === 100) return "done";
        return "in-progress";
    };

    let doneCount = 0;
    currentList.forEach((t) => {
        if (getTopicStatus(t) === 'done') doneCount++;
    });
    const percent = currentList.length ? Math.round((doneCount / currentList.length) * 100) : 0;

    const handleNodeClick = (topic, status) => {
        if (isTeacherMode) {
            setActiveTopic({ topic, status });
            return;
        }

        // Fast-track completion for topics with no subtopics
        if (!topic.subtopics || topic.subtopics.length === 0) {
            if (status !== 'done') {
                markTopicDone(topic);
            }
        } else {
            setActiveTopic({ topic, status });
        }
    };

    const handleUnlock = async () => {
        if (!activeTopic || isTeacherMode) return;
        setIsUnlocking(activeTopic.topic.id);
        setTimeout(async () => {
            const newOpened = [...openedTopics, activeTopic.topic.id];
            setOpenedTopics(newOpened);
            await setDoc(doc(db, "students", studentId), { openedTopics: newOpened }, { merge: true });
            setActiveTopic({ ...activeTopic, status: 'open' });
            setIsUnlocking(null);
        }, 430);
    };

    const toggleSubtopic = async (subId) => {
        if (isTeacherMode) return;
        const isCompleted = completedItems.includes(subId);
        const newCompleted = isCompleted 
            ? completedItems.filter(id => id !== subId) 
            : [...completedItems, subId];
        
        const oldProgress = activeTopic ? getTopicProgress(activeTopic.topic) : 0;
        
        setCompletedItems(newCompleted);
        await setDoc(doc(db, "students", studentId), { completedSubtopics: newCompleted }, { merge: true });

        if (!isCompleted && activeTopic) {
            const subs = activeTopic.topic.subtopics || [];
            const newProgress = (subs.filter(s => newCompleted.includes(s.id)).length / subs.length) * 100;
            
            // Eğer %0'dan büyük bir değere geçtiyse zinciri kır (animasyon)
            if (oldProgress === 0 && newProgress > 0) {
                setIsUnlocking(activeTopic.topic.id);
                setTimeout(() => setIsUnlocking(null), 430);
            }

            if (newProgress === 100) {
                setActiveTopic(null); // Tamamen bitince menüyü kapat
            }
        }
    };

    const markTopicDone = async (topic) => {
        if (isTeacherMode) return;
        const newCompleted = [...completedItems, topic.id];
        setCompletedItems(newCompleted);
        await setDoc(doc(db, "students", studentId), { completedSubtopics: newCompleted }, { merge: true });
        
        // Kendi zincirini kır ve tamamla
        setIsUnlocking(topic.id);
        setTimeout(() => setIsUnlocking(null), 430);
        
        setActiveTopic(null); // Menüyü kapat
    };

    const updateGlobal = async (payload, actionType) => {
        const list = [...(curriculum[selectedExam]?.[selectedSubject] || [])];
        let updatedList = list;

        if (actionType === 'add_topic') updatedList.push(payload);
        if (actionType === 'delete_topic') updatedList = list.filter(t => t.id !== payload);
        if (actionType === 'add_subtopic') {
            updatedList = list.map(t => t.id === payload.topicId ? { ...t, subtopics: [...(t.subtopics||[]), payload.subtopic] } : t);
        }
        if (actionType === 'delete_subtopic') {
            updatedList = list.map(t => t.id === payload.topicId ? { ...t, subtopics: (t.subtopics||[]).filter(s => s.id !== payload.subtopicId) } : t);
        }
        if (actionType === 'add_bulk_topics') {
            updatedList = [...updatedList, ...payload];
        }

        const newCurriculum = { ...curriculum, [selectedExam]: { ...(curriculum[selectedExam] || {}), [selectedSubject]: updatedList } };
        
        // Lokal state'i anında güncelleyerek (Latency Compensation) UI'ın hemen tepki vermesini sağla
        setCurriculum(newCurriculum);

        try {
            await setDoc(doc(db, "settings", "globalCurriculum"), newCurriculum, { merge: true });
        } catch (error) {
            console.error("Müfredat güncellenirken hata:", error);
            alert("Değişiklik kaydedilemedi. Lütfen bağlantınızı kontrol edin.");
        }
        
        if (activeTopic) {
            if (actionType === 'delete_topic') {
                setActiveTopic(null);
            } else {
                const updatedActive = updatedList.find(t => t.id === activeTopic.topic.id);
                if (updatedActive) setActiveTopic({ ...activeTopic, topic: updatedActive });
                else setActiveTopic(null);
            }
        }
    };

    const handleAddSingleTopic = (title) => {
        const maxOrder = currentList.reduce((max, t) => Math.max(max, t.order || 0), 0);
        updateGlobal({ id: `t_${Date.now()}`, title, order: maxOrder + 1, subtopics: [] }, 'add_topic');
    };

    const handleAddBulkTopics = (parsedData) => {
        const maxOrder = currentList.reduce((max, t) => Math.max(max, t.order || 0), 0);
        const payload = parsedData.map((pt, idx) => ({
            id: `t_${Date.now()}_${idx}`,
            title: pt.title,
            order: maxOrder + 1 + idx,
            subtopics: pt.subtopics.map((st, sidx) => ({
                id: `s_${Date.now()}_${idx}_${sidx}`,
                title: st
            }))
        }));
        updateGlobal(payload, 'add_bulk_topics');
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-400">Arı peteği örülüyor...</div>;

    return (
        <div className="honey-quest-container">
            {/* SVG Defs */}
            <svg style={{ width: 0, height: 0, position: 'absolute' }}>
                <defs>
                    <linearGradient id="waxFace" x1="15%" y1="0%" x2="85%" y2="100%">
                        <stop offset="0%" stopColor="#ffeebb"/><stop offset="24%" stopColor="#efb64c"/><stop offset="56%" stopColor="#bd7419"/><stop offset="86%" stopColor="#80460c"/><stop offset="100%" stopColor="#542b05"/>
                    </linearGradient>
                    <linearGradient id="openFace" x1="15%" y1="0%" x2="85%" y2="100%">
                        <stop offset="0%" stopColor="#fff2c7"/><stop offset="28%" stopColor="#f1be5f"/><stop offset="62%" stopColor="#b96d1c"/><stop offset="100%" stopColor="#6a3709"/>
                    </linearGradient>
                    <linearGradient id="doneFace" x1="15%" y1="0%" x2="85%" y2="100%">
                        <stop offset="0%" stopColor="#fff9dc"/><stop offset="30%" stopColor="#f6d36b"/><stop offset="70%" stopColor="#d49a16"/><stop offset="100%" stopColor="#87580d"/>
                    </linearGradient>
                    <linearGradient id="lockedFace" x1="15%" y1="0%" x2="85%" y2="100%">
                        <stop offset="0%" stopColor="#6b4423"/><stop offset="42%" stopColor="#472812"/><stop offset="100%" stopColor="#241107"/>
                    </linearGradient>
                    <linearGradient id="sideAmber" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#9a5e14"/><stop offset="100%" stopColor="#321704"/>
                    </linearGradient>
                    <linearGradient id="sideDark" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4a2810"/><stop offset="100%" stopColor="#160904"/>
                    </linearGradient>
                    <linearGradient id="bevelStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff1bd"/><stop offset="46%" stopColor="#c1771a"/><stop offset="100%" stopColor="#4d2405"/>
                    </linearGradient>
                    <radialGradient id="honeyCore" cx="35%" cy="24%" r="75%">
                        <stop offset="0%" stopColor="#fff0be" stopOpacity=".92"/><stop offset="36%" stopColor="#ffc850" stopOpacity=".58"/><stop offset="72%" stopColor="#f59e0b" stopOpacity=".18"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                    </radialGradient>
                    <linearGradient id="liquidHoney" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff4bd"/><stop offset="34%" stopColor="#f6bd3f"/><stop offset="72%" stopColor="#c87812"/><stop offset="100%" stopColor="#8b4b09"/>
                    </linearGradient>
                    <linearGradient id="liquidHoneyDeep" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffd66a"/><stop offset="100%" stopColor="#9c5709"/>
                    </linearGradient>
                    <linearGradient id="glint" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff" stopOpacity=".62"/><stop offset="42%" stopColor="#fff" stopOpacity=".16"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/>
                    </linearGradient>
                    <radialGradient id="aura">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity=".50"/><stop offset="62%" stopColor="#f59e0b" stopOpacity=".13"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                    </radialGradient>
                    <linearGradient id="chainMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc"/><stop offset="25%" stopColor="#9ca3af"/><stop offset="52%" stopColor="#ffffff"/><stop offset="78%" stopColor="#6b7280"/><stop offset="100%" stopColor="#d1d5db"/>
                    </linearGradient>
                    <linearGradient id="chainInner" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,.88)"/><stop offset="100%" stopColor="rgba(255,255,255,.22)"/>
                    </linearGradient>
                    <linearGradient id="lockBadge" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6b4423"/><stop offset="50%" stopColor="#3a1f0b"/><stop offset="100%" stopColor="#211006"/>
                    </linearGradient>
                    <pattern id="cellPattern" width="18" height="16" patternUnits="userSpaceOnUse">
                        <path d="M4.5 0 L13.5 0 L18 8 L13.5 16 L4.5 16 L0 8 Z" fill="none" stroke="rgba(255,255,255,.48)" strokeWidth="1"/>
                    </pattern>
                    <clipPath id="hexClip"><polygon points="-24,-39.88 24,-39.88 48,0 24,39.88 -24,39.88 -48,0"/></clipPath>
                    
                    <g id="honeyLiquid">
                        <rect className="honey-rect" x="-48" y="-3" width="96" height="100" rx="10" />
                        <path className="honey-wave" d="M -47 -3 C -35 -10 -24 2 -12 -3 C 1 -9 11 4 24 -2 C 33 -6 41 -4 48 0 L 48 9 L -48 9 Z" />
                        <path className="honey-shine" d="M -34 8 C -18 2 -5 11 11 5" />
                        <path className="honey-drop" d="M 27 13 C 33 22 29 32 23 33 C 16 32 14 22 20 14 C 22 11 24 10 27 13 Z" />
                        <circle className="honey-bubble" cx="-24" cy="18" r="3.2" />
                        <circle className="honey-bubble" cx="4" cy="25" r="2.2" />
                        <circle className="honey-bubble" cx="18" cy="13" r="1.9" />
                    </g>
                    
                    <g id="lockChain" className="chain">
                        <g className="chain-left">
                            {[...Array(5)].map((_, i) => {
                                const p = [{x:-30,y:-28},{x:-15,y:-13},{x:0,y:2},{x:15,y:17},{x:30,y:32}][i];
                                return <rect key={i} className="chain-link" x={p.x-5} y={p.y-9} width={10} height={18} rx="5" transform={`rotate(-45 ${p.x} ${p.y})`} />
                            })}
                        </g>
                        <g className="chain-right">
                            {[...Array(5)].map((_, i) => {
                                const p = [{x:30,y:-28},{x:15,y:-13},{x:0,y:2},{x:-15,y:17},{x:-30,y:32}][i];
                                return <rect key={i} className="chain-link" x={p.x-5} y={p.y-9} width={10} height={18} rx="5" transform={`rotate(45 ${p.x} ${p.y})`} />
                            })}
                        </g>
                        <g className="lock-piece">
                            <circle className="lock-badge" cx="0" cy="4" r="15" />
                            <path className="lock-line" d="M -6 1 V -2.5 C -6 -7.5 -2.5 -11 0 -11 C 2.5 -11 6 -7.5 6 -2.5 V 1" />
                            <rect className="lock-line" x="-7.5" y="1" width="15" height="12" rx="3.5" />
                            <circle className="lock-hole" cx="0" cy="7" r="1.8" />
                        </g>
                    </g>
                    
                    <filter id="waxTexture" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="3" seed="14"/>
                        <feColorMatrix type="saturate" values="0"/>
                        <feComponentTransfer><feFuncA type="table" tableValues="0 .20"/></feComponentTransfer>
                    </filter>
                    <filter id="blurShadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
                    <filter id="tinyShadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#2a1508" floodOpacity=".22"/></filter>
                    <filter id="textShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.6" floodColor="#140904" floodOpacity=".90"/></filter>
                    <filter id="plaqueShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1a0c04" floodOpacity=".52"/></filter>
                    <filter id="chainHighlight" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
                        <feSpecularLighting in="blur" surfaceScale="3" specularConstant="1.25" specularExponent="13" result="spec" lightingColor="#ffffff">
                            <fePointLight x="-50" y="-100" z="80"/>
                        </feSpecularLighting>
                        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut"/>
                        <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3=".72" k4="0"/>
                    </filter>
                </defs>
            </svg>
            {/* Desktop Layout Wrapper */}
            <div className="desktop-layout">
              <div className="desktop-sidebar">

            {/* Header */}
            <section className="top-card transition-all duration-300">
                <div 
                    className="card-head cursor-pointer select-none hover:opacity-80 active:scale-[0.98] transition-transform" 
                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                >
                    <div className="card-head-title flex items-center gap-2">
                        <Hexagon size={16} strokeWidth={2.5} className="text-primary opacity-60" />
                        <h1>Konular <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold ml-1">{examsList.find(e => e.id === selectedExam)?.label} {filteredSubjects.find(s => s.id === selectedSubject)?.label}</span></h1>
                        {isHeaderCollapsed ? <ChevronDown size={18} className="text-slate-400 ml-1" /> : <ChevronUp size={18} className="text-slate-400 ml-1" />}
                    </div>
                    <div className="card-stat">
                        <strong>{doneCount}/{currentList.length}</strong>
                        <span>Bitti</span>
                    </div>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isHeaderCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                    <div className="flex gap-2 mt-3 flex-wrap w-full">
                        {examsList.map(ex => (
                            <button 
                                key={ex.id}
                                onClick={() => { setSelectedExam(ex.id); setIsHeaderCollapsed(true); }}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-[12px] md:text-sm transition-all ${selectedExam === ex.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white/80 text-slate-500 hover:bg-white border border-slate-200 hover:border-primary/30 hover:shadow-sm'}`}
                            >
                                {ex.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap w-full">
                        {filteredSubjects.map(su => (
                            <button 
                                key={su.id}
                                onClick={() => { setSelectedSubject(su.id); setIsHeaderCollapsed(true); }}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-[12px] md:text-sm transition-all flex items-center gap-1 ${selectedSubject === su.id ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm' : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200 hover:border-primary/20'}`}
                            >
                                {su.label}
                            </button>
                        ))}
                        {isTeacherMode && (
                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200/60 w-full">
                                <button className="flex-1 py-2.5 rounded-xl font-bold text-[12px] md:text-sm transition-all flex items-center justify-center gap-2 text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20" onClick={() => setIsEditingGlobal(!isEditingGlobal)} title={isEditingGlobal ? "Düzenlemeyi Bitir" : "Konuları Düzenle"}>
                                    {isEditingGlobal ? <X size={16} strokeWidth={2.5} /> : <Edit3 size={16} strokeWidth={2.5} />}
                                    <span>{isEditingGlobal ? "Kapat" : "Düzenle"}</span>
                                </button>
                                <button className="flex-1 py-2.5 rounded-xl font-bold text-[12px] md:text-sm transition-all flex items-center justify-center gap-2 text-amber-600 bg-amber-100 border border-amber-200 hover:bg-amber-200 shadow-sm" onClick={() => setIsCategoryModalOpen(true)} title="Sınav ve Dersleri Yönet">
                                    <Settings size={16} strokeWidth={2.5} /> 
                                    <span>Yönet</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="progress">
                    <div className="progress-meta">
                        <span>TAMAMLANAN: {doneCount}/{currentList.length}</span>
                        <span>%{percent}</span>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            </section>

              </div>{/* end desktop-sidebar */}
              <div className="desktop-map">

            {/* Map */}
            <section className="quest flex-1 h-0 flex justify-center mt-[14px]">
                <div 
                    ref={scrollContainerRef}
                    className="quest-scroll w-full h-full overflow-x-hidden overflow-y-auto pb-[120px] hide-scrollbar" 
                    style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
                >
                    {currentList.length === 0 && (
                        <div className="w-full flex justify-center mt-12 px-6">
                            <div className="bg-white/90 backdrop-blur-md px-6 py-8 rounded-3xl shadow-xl border border-white/50 text-center flex flex-col items-center w-full max-w-sm">
                                <div className="w-16 h-16 mb-3 flex items-center justify-center bg-primary/10 rounded-full text-primary">
                                    <Hexagon size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Henüz Konu Yok</h3>
                                <p className="text-sm font-bold text-slate-500 mt-2 max-w-xs">
                                    Bu derse ait konular eklendiğinde burada efsanevi bir petek haritası belirecek.
                                </p>
                                {isTeacherMode && isEditingGlobal ? (
                                    <button onClick={() => setIsTopicModalOpen(true)} className="mt-6 px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all w-full flex items-center justify-center gap-2">
                                        <Plus size={20} /> İlk Konuyu Ekle
                                    </button>
                                ) : isTeacherMode && (
                                    <p className="text-xs font-bold text-primary mt-4 opacity-80">
                                        Sağ üstteki düzenle butonuna (kalem/çarpı ikonu) tıklayarak konu ekleyebilirsiniz.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {currentList.length > 0 && (
                        <svg className="quest-svg w-full block overflow-visible" style={{ height: maxSvgHeight }} viewBox={`0 0 408 ${maxSvgHeight}`}>
                        <g id="roadLayer">
                            <path className="road-shadow" d={roadmapPath} />
                            <path className="road" d={roadmapPath} />
                            <path className="road-flow" d={roadmapPath} />
                        </g>
                        <g id="nodeLayer">
                            {currentList.map((topic, index) => {
                                const status = getTopicStatus(topic);
                                const progress = getTopicProgress(topic);
                                const pos = layout[index];
                                const isUnlockingThis = isUnlocking === topic.id;
                                const honeyY = 40 - (80 * (progress / 100));
                                
                                return (
                                    <HexagonNode 
                                        key={topic.id}
                                        topic={topic}
                                        index={index}
                                        status={status}
                                        progress={progress}
                                        pos={pos}
                                        isUnlockingThis={isUnlockingThis}
                                        honeyY={honeyY}
                                        onNodeClick={handleNodeClick}
                                    />
                                );
                            })}
                        </g>
                    </svg>
                    )}
                    
                    {/* Add Topic button for Teachers - Only show if there is already a list */}
                    {isTeacherMode && isEditingGlobal && currentList.length > 0 && (
                        <div className="flex justify-center mt-12 pb-24">
                            <button onClick={() => setIsTopicModalOpen(true)} className="px-6 py-3 bg-white text-slate-800 font-bold rounded-2xl shadow-xl flex items-center gap-2 border border-slate-200">
                                <Plus size={20} className="text-primary"/> Yeni Petek (Konu) Ekle
                            </button>
                        </div>
                    )}
                </div>
            </section>

              </div>{/* end desktop-map */}
            </div>{/* end desktop-layout */}

            {/* Bottom Sheet */}
            <div className={`honey-backdrop ${activeTopic ? 'open' : ''}`} onClick={() => setActiveTopic(null)}>
                <aside className="honey-sheet" onClick={e => e.stopPropagation()}>
                    {activeTopic && (
                        <>
                            <div className="honey-sheet-top">
                                <div>
                                    <h2>{activeTopic.topic.title}</h2>
                                    <p>{activeTopic.topic.subtopics?.length > 0 ? "Konuya ait alt başlıkları tamamlayın." : "Konuya ait alt başlık bulunmuyor."}</p>
                                </div>
                                <button className="honey-close" onClick={() => setActiveTopic(null)}>×</button>
                            </div>

                            {/* Teacher Mode Edit Headers */}
                            {isTeacherMode && isEditingGlobal && (
                                <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                                    <span className="text-sm font-bold text-red-900">Bu konuyu tamamen sil:</span>
                                    <button className="teacher-btn danger" onClick={() => { updateGlobal(activeTopic.topic.id, 'delete_topic'); setActiveTopic(null); }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Subtopics List */}
                            {activeTopic.topic.subtopics?.length > 0 && (
                                <div className="subtopics-list">
                                    {activeTopic.topic.subtopics.map(sub => {
                                        const isDone = completedItems.includes(sub.id);
                                        return (
                                            <div key={sub.id} className={`subtopic-item ${isDone ? 'completed' : ''}`} onClick={() => toggleSubtopic(sub.id)}>
                                                <div className="subtopic-title">
                                                    <div className="checkbox-circle">{isDone && <Check size={14}/>}</div>
                                                    {sub.title}
                                                </div>
                                                {isTeacherMode && isEditingGlobal && (
                                                    <button className="teacher-btn danger" onClick={(e) => { e.stopPropagation(); updateGlobal({ topicId: activeTopic.topic.id, subtopicId: sub.id }, 'delete_subtopic'); }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                    
                                    {isTeacherMode && isEditingGlobal && (
                                        <div className="mt-2">
                                            {isAddingSubtopic ? (
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        autoFocus
                                                        value={newSubtopicTitle}
                                                        onChange={(e) => setNewSubtopicTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && newSubtopicTitle.trim()) {
                                                                updateGlobal({ topicId: activeTopic.topic.id, subtopic: { id: `s_${Date.now()}`, title: newSubtopicTitle.trim() } }, 'add_subtopic');
                                                                setNewSubtopicTitle('');
                                                                setIsAddingSubtopic(false);
                                                            } else if (e.key === 'Escape') {
                                                                setIsAddingSubtopic(false);
                                                                setNewSubtopicTitle('');
                                                            }
                                                        }}
                                                        placeholder="Alt başlık ismi..."
                                                        className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-primary"
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            if (newSubtopicTitle.trim()) {
                                                                updateGlobal({ topicId: activeTopic.topic.id, subtopic: { id: `s_${Date.now()}`, title: newSubtopicTitle.trim() } }, 'add_subtopic');
                                                                setNewSubtopicTitle('');
                                                                setIsAddingSubtopic(false);
                                                            }
                                                        }}
                                                        className="bg-primary text-white px-3 rounded-xl font-bold hover:bg-primary-dark transition-colors"
                                                    >
                                                        Ekle
                                                    </button>
                                                    <button 
                                                        onClick={() => { setIsAddingSubtopic(false); setNewSubtopicTitle(''); }}
                                                        className="bg-slate-200 text-slate-600 px-3 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                                                    >
                                                        İptal
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-bold text-sm hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
                                                    onClick={() => setIsAddingSubtopic(true)}>
                                                    <Plus size={16} /> Yeni Alt Başlık Ekle
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="honey-actions">
                                <button className="honey-action secondary" onClick={() => setActiveTopic(null)}>Kapat</button>
                                
                                {(!activeTopic.topic.subtopics || activeTopic.topic.subtopics.length === 0) && !isTeacherMode && (
                                    <button 
                                        className="honey-action primary" 
                                        disabled={completedItems.includes(activeTopic.topic.id)}
                                        onClick={() => markTopicDone(activeTopic.topic)}>
                                        {completedItems.includes(activeTopic.topic.id) ? "Tamamlandı" : "Konuyu Bitir"}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </aside>
            </div>

            {/* Modal */}
            <TopicManagerModal 
                isOpen={isTopicModalOpen} 
                onClose={() => setIsTopicModalOpen(false)} 
                onAddSingle={handleAddSingleTopic}
                onAddBulk={handleAddBulkTopics}
                existingCount={currentList.length}
            />

            <CategoryManagerModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                curriculum={curriculum}
                setCurriculum={setCurriculum}
                examsList={examsList}
                subjectsList={subjectsList}
                showAlert={showAlert}
            />
        </div>
    );
};

export default SubjectStudyView;
