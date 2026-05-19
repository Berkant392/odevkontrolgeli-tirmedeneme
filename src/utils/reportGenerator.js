import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generateStudentReport = (student, classData) => {
    const doc = new jsPDF();
    
    // PDF Başlık Bilgileri
    doc.setFontSize(18);
    doc.text(`Ogrenci Raporu: ${student.name}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Sinif: ${classData.className}`, 14, 30);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 37);

    // Net Takip Tablosu
    if (student.netTakip && student.netTakip.length > 0) {
        doc.text("Deneme Sinavi Sonuclari", 14, 50);
        
        const tableColumn = ["Tarih", "Turkce", "Mat", "Fen", "Sosyal", "Net Ort."];
        const tableRows = student.netTakip.map(deneme => [
            deneme.tarih || "-",
            deneme.dersler?.turkce?.net || 0,
            deneme.dersler?.matematik?.net || 0,
            deneme.dersler?.fen?.net || 0,
            deneme.dersler?.sosyal?.net || 0,
            // Genel ortalama hesaplama
            (( (deneme.dersler?.turkce?.net || 0) + (deneme.dersler?.matematik?.net || 0) + 
               (deneme.dersler?.fen?.net || 0) + (deneme.dersler?.sosyal?.net || 0) ) / 4).toFixed(2)
        ]);

        doc.autoTable({
            startY: 55,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [79, 70, 229] } // BrandPurple rengi
        });
    } else {
        doc.text("Henuz girilmis deneme verisi bulunmamaktadir.", 14, 50);
    }

    // PDF'i indirme
    doc.save(`${student.name}_Rapor.pdf`);
};
