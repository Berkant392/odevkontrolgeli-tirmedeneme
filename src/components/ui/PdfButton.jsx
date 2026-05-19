import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { formatDriveLink } from '../../utils/helpers';
import { generateStudentReport } from '../../utils/reportGenerator';

const PdfDownloadButton = ({ link, isVip, isTeacher, reportData }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        if (isDownloading) return;
        setIsDownloading(true);

        // 🔥 DİNAMİK RAPOR OLUŞTURMA MANTIĞI
        if (reportData) {
            try {
                generateStudentReport(reportData.student, reportData.classData);
            } catch (err) {
                console.error("PDF Oluşturma Hatası:", err);
            }
            setTimeout(() => setIsDownloading(false), 1000);
            return;
        }

        // ESKİ LİNK İNDİRME MANTIĞI
        setTimeout(() => {
            const a = document.createElement('a');
            a.href = formatDriveLink(link);
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => setIsDownloading(false), 500);
        }, 1500);
    };

    if (isTeacher) {
        return (
            <button 
                onClick={handleDownload} 
                className="text-rose-500 hover:text-rose-700 bg-white/50 hover:bg-white p-1.5 rounded-full shadow-sm transition-all" 
                title={reportData ? "Rapor İndir" : "PDF İndir"} 
                disabled={isDownloading}
            >
                {isDownloading ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <FileDown size={14} />}
            </button>
        );
    }

    return (
        <button 
            onClick={handleDownload} 
            disabled={isDownloading} 
            className={`mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black transition-all shadow-sm group/pdf overflow-hidden relative ${isVip ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200'}`}
        >
            {isDownloading ? (
                <span className="flex items-center justify-center gap-2 w-full h-full absolute inset-0 bg-white/95 backdrop-blur-sm z-10 text-indigo-600">
                    <Loader2 size={16} className="animate-spin" /> {reportData ? "RAPOR HAZIRLANIYOR" : "HAZIRLANIYOR"}
                </span>
            ) : null}
            <FileDown size={16} className="group-hover/pdf:animate-bounce" /> {reportData ? "RAPORU İNDİR (PDF)" : "KAYNAK (PDF) İNDİR"}
        </button>
    );
};

export default PdfDownloadButton;
