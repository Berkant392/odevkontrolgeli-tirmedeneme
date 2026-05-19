export const generateId = (prefix) => {
    return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
};

export const calculateStats = (students, topics) => {
    if (!students || students.length === 0 || !topics || topics.length === 0) {
        return { percentage: 0, completed: 0, total: 0, atRisk: [] };
    }

    let totalTasks = 0;
    let completedTasks = 0;
    let atRisk = [];

    students.forEach(student => {
        let studentTotal = 0;
        let studentCompleted = 0;

        topics.forEach(topic => {
            topic.subColumns?.forEach(col => {
                studentTotal++;
                totalTasks++;
                if (student.grades && student.grades[col.id] === 'done') {
                    studentCompleted++;
                    completedTasks++;
                }
            });
        });

        const rate = studentTotal > 0 ? Math.round((studentCompleted / studentTotal) * 100) : 0;
        if (rate < 40 && studentTotal > 0) {
            atRisk.push({ name: student.name, rate });
        }
    });

    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { percentage, completed: completedTasks, total: totalTasks, atRisk };
};

export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Geriye dönük uyumluluk için korunan fonksiyon
export const isOverdue = (d) => d ? new Date(d) < new Date(new Date().setHours(0,0,0,0)) : false;

// Ödev Teslim Tarihi Hesaplama Fonksiyonu
export const getDeadlineStatus = (dateStr) => {
    if (!dateStr) return { isOverdue: false, text: "", isToday: false };

    const targetDate = new Date(dateStr);
    targetDate.setHours(23, 59, 59, 999);
    
    const now = new Date();
    
    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { isOverdue: true, text: "Süresi Doldu", isToday: false };
    } else if (diffDays === 0) {
        return { isOverdue: false, text: "Bugün Son", isToday: true };
    } else {
        return { isOverdue: false, text: `${diffDays} gün kaldı`, isToday: false };
    }
};

export const formatDriveLink = (url) => {
    if (!url) return "";
    try {
        if (url.includes("drive.google.com/file/d/")) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
        return url;
    } catch (e) {
        return url;
    }
};

// 🔥 YENİ: Net Takip Sistemi İçin Matematiksel Fonksiyonlar
export const calculateNet = (dogru, yanlis) => {
    const net = dogru - (yanlis / 4);
    return net > 0 ? parseFloat(net.toFixed(2)) : 0;
};

// 🔥 YENİ: Net Takip Tarih Formatlayıcı
export const formatNetDate = (date) => {
    return new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};
