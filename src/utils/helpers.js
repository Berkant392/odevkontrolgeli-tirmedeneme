export const formatDate = (dateString) => { 
    if (!dateString) return ""; 
    return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); 
};

export const generatePassword = () => { 
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; 
    let pwd = ''; 
    for (let i = 0; i < 6; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length)); 
    return pwd; 
};

export const generateUsername = (name) => { 
    const trMap = { 'ç':'c', 'ğ':'g', 'ı':'i', 'i':'i', 'ö':'o', 'ş':'s', 'ü':'u', 'Ç':'C', 'Ğ':'G', 'İ':'I', 'Ö':'O', 'Ş':'S', 'Ü':'U' }; 
    let baseName = name.toLowerCase().replace(/[çğıiöşüÇĞİÖŞÜ]/g, m => trMap[m] || m).replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, ''); 
    return `${baseName}.${Math.floor(100 + Math.random() * 900)}`; 
};

export const generateId = (p) => `${p}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const isOverdue = (d) => d ? new Date(d) < new Date(new Date().setHours(0,0,0,0)) : false;

export const formatDriveLink = (url) => {
    if (!url) return "";
    try {
        if (url.includes("drive.google.com/file/d/")) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
        return url; 
    } catch (e) { return url; }
};

export const calculateStats = (students, topics) => {
    if (!students || !topics) return { percentage: 0, atRisk: [] };
    let total = 0, completed = 0; const atRisk = [];
    const allColIds = topics.flatMap(t => t.subColumns.map(c => c.id));
    if (allColIds.length === 0) return { percentage: 0, atRisk: [] };
    students.forEach(std => {
        let sTotal = 0, sComp = 0;
        allColIds.forEach(id => { sTotal++; if (std.grades?.[id] === 'done') sComp++; });
        total += sTotal; completed += sComp;
        if (sTotal > 0 && (sComp / sTotal) < 0.5) atRisk.push({ name: std.name, rate: Math.round((sComp/sTotal)*100) });
    });
    return { percentage: total === 0 ? 0 : Math.round((completed / total) * 100), atRisk };
};
