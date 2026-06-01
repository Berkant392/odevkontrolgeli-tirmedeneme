import { useState, useEffect } from 'react';

const APP_VERSION = '2.0.0';

export const useAppAuth = ({
    classes,
    dbTeacherPin,
    isStandalone,
    regularClasses,
    vipClasses,
    setView,
    setActiveTab,
    setSelectedClass,
    setSelectedStudentForView,
    updateClassInDb,
    showAlert
}) => {
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [isTeacherMode, setIsTeacherMode] = useState(false);
    const [loggedInStudent, setLoggedInStudent] = useState(null);

    // Oturum geri yüklenirken login ekranının saniyelik görünmesini engellemek için
    const [isSessionRestoring, setIsSessionRestoring] = useState(() => {
        const isStandaloneEnv = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        const hasSession = !!localStorage.getItem('bh_session');
        return isStandaloneEnv && hasSession;
    });

    // KALICI OTURUM KONTROLÜ
    useEffect(() => {
        if (classes.length > 0 && dbTeacherPin && !currentUserRole) {
            // Tarayıcıda (standalone olmayan) açıldığında oturumu geri yükleme
            if (!isStandalone) {
                localStorage.removeItem('bh_session');
                setIsSessionRestoring(false);
                return;
            }

            const savedVersion = localStorage.getItem('bh_version');
            if (savedVersion !== APP_VERSION) {
                localStorage.removeItem('bh_session');
                localStorage.setItem('bh_version', APP_VERSION);
                setIsSessionRestoring(false);
                return;
            }
            try {
                const sessionStr = localStorage.getItem('bh_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    if (session.role === 'teacher') {
                        setIsTeacherMode(true); 
                        setCurrentUserRole('teacher'); 
                        setView('home'); 
                        setActiveTab('home');
                        if (window.OneSignalDeferred) {
                            window.OneSignalDeferred.push(async function(OneSignal) {
                                await OneSignal.login('teacher_admin');
                            });
                        }
                    } else if (session.role === 'student' || session.role === 'vip-student') {
                        let foundStudent = null, foundClass = null;
                        const searchSpace = session.role === 'vip-student' ? classes.filter(c => c.type === 'vip') : classes.filter(c => c.type !== 'vip');
                        for (const cls of searchSpace) {
                            const std = cls.students?.find(s => s.id === session.studentId);
                            if (std) { foundStudent = std; foundClass = cls; break; }
                        }
                        if (foundStudent) {
                            setCurrentUserRole(session.role);
                            setLoggedInStudent(foundStudent);
                            setSelectedClass(foundClass);
                            setSelectedStudentForView(foundStudent);
                            setView('home');
                            setActiveTab('home');

                            // Sayfa yenilenmesinde OneSignal'e tekrar bildir
                            if (window.OneSignalDeferred) {
                                window.OneSignalDeferred.push(async function(OneSignal) {
                                    await OneSignal.login(foundStudent.id);
                                });
                            }
                        } else {
                            localStorage.removeItem('bh_session'); // Bulunamadıysa sil
                        }
                    }
                }
            } catch (e) {
                console.error("Oturum okuma hatası", e);
            } finally {
                setIsSessionRestoring(false);
            }
        } else if (classes.length > 0 && dbTeacherPin && currentUserRole) {
             setIsSessionRestoring(false);
        }
    }, [classes, dbTeacherPin, currentUserRole, isStandalone]);

    const verifyPin = (inputPin) => {
        if (String(inputPin).trim() === String(dbTeacherPin).trim()) {
            setIsTeacherMode(true); 
            setCurrentUserRole('teacher'); 
            setView('home'); 
            setActiveTab('home');
            localStorage.setItem('bh_session', JSON.stringify({ role: 'teacher' }));
            
            // Öğretmeni OneSignal'e tanıt
            if (window.OneSignalDeferred) {
                window.OneSignalDeferred.push(async function(OneSignal) {
                    await OneSignal.login('teacher_admin');
                });
            }
        } else {
            showAlert('error', 'Hata', 'Girdiğiniz PIN kodu hatalı! Lütfen tekrar deneyin.');
        }
    };

    const handleStudentLogin = (username, password, isVipLogin = false) => {
        let foundStudent = null, foundClass = null; 
        const classesToSearch = isVipLogin ? vipClasses : regularClasses;
        for (const cls of classesToSearch) { 
            const std = cls.students?.find(s => s.username === username.trim().toLowerCase() && s.password === password.trim()); 
            if (std) { foundStudent = std; foundClass = cls; break; } 
        }

        if (foundStudent) {
            const role = isVipLogin ? 'vip-student' : 'student';
            setCurrentUserRole(role);
            setLoggedInStudent(foundStudent);
            setSelectedClass(foundClass);
            setSelectedStudentForView(foundStudent);
            setView('home');
            setActiveTab('home');
            
            localStorage.setItem('bh_session', JSON.stringify({ role, studentId: foundStudent.id }));

            // OneSignal'e kullanıcıyı tanıt
            if (window.OneSignalDeferred) {
                window.OneSignalDeferred.push(async function(OneSignal) {
                    await OneSignal.login(foundStudent.id);
                });
            }

            const updatedStudents = foundClass.students.map(s => s.id === foundStudent.id ? { ...s, lastLogin: new Date().toISOString() } : s);
            updateClassInDb({ ...foundClass, students: updatedStudents });
        } else {
            throw new Error("Kullanıcı adı veya şifre hatalı");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('bh_session');
        setCurrentUserRole(null);
        setIsTeacherMode(false);
        setLoggedInStudent(null);
        setSelectedClass(null);
        setSelectedStudentForView(null);
        setView('home');

        // OneSignal Çıkış
        if (window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.logout();
            });
        }
    };

    return {
        currentUserRole,
        setCurrentUserRole,
        isTeacherMode,
        setIsTeacherMode,
        loggedInStudent,
        setLoggedInStudent,
        isSessionRestoring,
        verifyPin,
        handleStudentLogin,
        handleLogout
    };
};
