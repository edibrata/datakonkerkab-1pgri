import { FlatAdminRow } from '../types';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import 'jspdf-autotable';
import { drawKopSurat, getTimestamp } from './pdf-utils';

export const executeExcelExport = (flattenedRows: FlatAdminRow[], showModal: (title: string, message: string, type: 'success' | 'error') => void) => {
    if (flattenedRows.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
    const wb = XLSX.utils.book_new();
    const standardMap = (r: FlatAdminRow) => ({ 
        "Waktu Daftar": r.ts, 
        "Kategori": r.kategori, 
        "Cabang/Entitas": r.branch, 
        "Nama Lengkap": r.name, 
        "Jabatan": r.jabatan, 
        "JK": r.jk, 
        "Komisi": r.kom, 
        "WhatsApp": r.wa, 
        "Ukuran Kaos": (r.sD as any)[`p${r.i}_kaos`] || "-", 
        "No. Kamar": r.room, 
        "Tautan Mandat": r.mandat, 
        "Token": r.token 
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flattenedRows.map(standardMap)), "Data Lengkap");
    XLSX.writeFile(wb, `Konkerkab-1 Data Peserta ${getTimestamp()}.xlsx`);
};

export const executeRoomMappingPDF = async (flattenedRows: FlatAdminRow[], showModal: (t: string, m: string, type: string) => void) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = [...flattenedRows];
    if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
    const priority: Record<string, number> = { "PESERTA CABANG": 1, "PANITIA": 2, "PENINJAU": 3 };
    data.sort((a, b) => (priority[a.kategori] - priority[b.kategori]) || a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name));
    const rows = data.map((r, i) => [i + 1, r.branch, r.name, r.jk === 'LAKI-LAKI' ? 'L' : 'P', r.wa, r.room]);
    
    const startYAfterKop = await drawKopSurat(doc);

    (doc as any).autoTable({
        startY: startYAfterKop + 15, head: [['No', 'Entitas', 'Nama Lengkap', 'JK', 'WhatsApp', 'Kamar']], body: rows, theme: 'striped', showHead: 'everyPage',
        headStyles: { fillColor: [185, 28, 28], fontSize: 9, halign: 'center' }, styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'center', cellWidth: 10 }, 5: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: [185, 28, 28] } },
        didDrawPage: (pageData: any) => {
            if (pageData.pageNumber === 1) {
                doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold");
                doc.text("PEMETAAN KAMAR PENGINAPAN", 105, startYAfterKop + 8, { align: "center" });
            }
            doc.setFontSize(8); doc.setTextColor(150); doc.text(`Hal. ${pageData.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    });
    doc.save(`Konkerkab-1 Pemetaan Kamar ${getTimestamp()}.pdf`);
};

export const executeTshirtRecapPDF = async (flattenedRows: FlatAdminRow[], showModal: Function) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    if (flattenedRows.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
    const sizeMap: Record<string, { L: number, P: number }> = { "S": { L: 0, P: 0 }, "M": { L: 0, P: 0 }, "L": { L: 0, P: 0 }, "XL": { L: 0, P: 0 }, "XXL": { L: 0, P: 0 }, "XXXL": { L: 0, P: 0 } };
    let totalL = 0, totalP = 0;
    flattenedRows.forEach(r => { 
        const sz = (r.sD as any)[`p${r.i}_kaos`]; const jk = r.jk === 'LAKI-LAKI' ? 'L' : 'P';
        if (sizeMap[sz]) { sizeMap[sz][jk]++; if(jk === 'L') totalL++; else totalP++; }
    });

    const startYAfterKop = await drawKopSurat(doc);

    doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold"); doc.text("REKAPITULASI UKURAN KAOS", 105, startYAfterKop + 8, { align: "center" });
    const summaryRows: any[] = Object.entries(sizeMap).map(([size, counts]) => [size, counts.L || "-", counts.P || "-", (counts.L + counts.P) || "-"]);
    summaryRows.push([{ content: 'TOTAL KESELURUHAN', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, totalL, totalP, totalL + totalP]);
    (doc as any).autoTable({ startY: startYAfterKop + 13, head: [['Ukuran', 'Laki-laki', 'Perempuan', 'Total']], body: summaryRows, theme: 'grid', headStyles: { fillColor: [185, 28, 28], halign: 'center' }, styles: { fontSize: 10, cellPadding: 5, halign: 'center' }, margin: { left: 30, right: 30 } });
    doc.save(`Konkerkab-1 Rekap Ukuran Kaos ${getTimestamp()}.pdf`);
};

export const executeTshirtReceiptPDF = async (flattenedRows: FlatAdminRow[], showModal: Function) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = [...flattenedRows];
    if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
    data.sort((a, b) => {
        const isAP = a.kategori.includes("PESERTA"), isBP = b.kategori.includes("PESERTA");
        if (isAP && !isBP) return -1; if (!isAP && isBP) return 1;
        return a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name);
    });
    const rows = data.map((r, i) => [i + 1, r.branch, r.name, (r.sD as any)[`p${r.i}_kaos`] || "-", "", ""]);

    const startYAfterKop = await drawKopSurat(doc);

    (doc as any).autoTable({
        startY: startYAfterKop + 13, head: [['No', 'Entitas', 'Nama Lengkap', 'Ukuran', 'Nama Penerima', 'Tanda Tangan']], body: rows, theme: 'grid', showHead: 'everyPage',
        headStyles: { fillColor: [185, 28, 28], fontSize: 9, halign: 'center' }, styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 3: { halign: 'center', cellWidth: 20 }, 5: { cellWidth: 35 } },
        didDrawPage: (d: any) => {
            if (d.pageNumber === 1) {
                doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold"); doc.text("TANDA TERIMA KAOS", 105, startYAfterKop + 8, { align: "center" });
            }
            doc.setFontSize(8); doc.setTextColor(150); doc.text(`Hal. ${d.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    });
    doc.save(`Konkerkab-1 Tanda Terima Kaos ${getTimestamp()}.pdf`);
};

export const executeMasterKomisiPDF = async (flattenedRows: FlatAdminRow[], showModal: Function) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = flattenedRows.filter(r => r.kategori.includes("PESERTA"));
    if (data.length === 0) return showModal("ERROR", "Tidak ada data peserta.", "error");
    data.sort((a, b) => a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name));
    const rows = data.map((r, i) => [i + 1, r.branch, r.name, r.kom]);

    const startYAfterKop = await drawKopSurat(doc);

    (doc as any).autoTable({
        startY: startYAfterKop + 13, head: [['No', 'Entitas', 'Nama Lengkap', 'Komisi']], body: rows, theme: 'grid', showHead: 'everyPage',
        headStyles: { fillColor: [185, 28, 28], fontSize: 10, halign: 'center' }, styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { halign: 'center', cellWidth: 14 }, 3: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] } },
        didDrawPage: (d: any) => {
            if (d.pageNumber === 1) {
                doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold"); doc.text("PEMBAGIAN KOMISI", 105, startYAfterKop + 8, { align: "center" });
            }
            doc.setFontSize(8); doc.setTextColor(150); doc.text(`Hal. ${d.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    });
    doc.save(`Konkerkab-1 Master Komisi ${getTimestamp()}.pdf`);
};

export const executeSidangKomisiPDF = async (flattenedRows: FlatAdminRow[], showModal: Function) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = flattenedRows.filter(r => r.kategori.includes("PESERTA"));
    if (data.length === 0) return showModal("ERROR", "Tidak ada data peserta.", "error");
    
    const coms = ["KOMISI A", "KOMISI B", "KOMISI C", "KOMISI D"];
    const pageRanges: any[] = [];
    
    for (let idx = 0; idx < coms.length; idx++) {
        const kom = coms[idx];
        if (idx > 0) doc.addPage();
        
        const startYAfterKop = await drawKopSurat(doc);
        const startPageAt = (doc as any).internal.getNumberOfPages();
        const filtered = data.filter(r => r.kom === kom).sort((a, b) => a.name.localeCompare(b.name));
        const rows = filtered.map((r, i) => [i + 1, r.name, r.branch]);
        
        (doc as any).autoTable({
            startY: startYAfterKop + 13, head: [['No', 'Nama Lengkap', 'Entitas']], body: rows, theme: 'striped', showHead: 'everyPage',
            headStyles: { fillColor: [185, 28, 28], fontSize: 10, halign: 'center' }, styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { halign: 'center', cellWidth: 14 } },
            didDrawPage: () => {
                doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold"); 
                doc.text(`PESERTA SIDANG ${kom}`, 105, startYAfterKop + 8, { align: "center" });
            }
        });
        pageRanges.push({ name: kom, start: startPageAt, end: (doc as any).internal.getNumberOfPages() });
    }

    pageRanges.forEach(range => {
        for (let i = range.start; i <= range.end; i++) {
            doc.setPage(i);
            const localCurrent = i - range.start + 1;
            const localTotal = range.end - range.start + 1;
            doc.setFontSize(8); doc.setTextColor(150); doc.setFont("helvetica", "normal");
            doc.text(`${range.name} - Hal. ${localCurrent} dari ${localTotal}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    });

    doc.save(`Konkerkab-1 Peserta Sidang Komisi ${getTimestamp()}.pdf`);
};

export const executeAttendancePDF = async (flattenedRows: FlatAdminRow[], showModal: Function) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = flattenedRows.filter(r => r.kategori.includes("PESERTA"));
    if (data.length === 0) return showModal("ERROR", "Tidak ada data peserta.", "error");
    
    const coms = ["KOMISI A", "KOMISI B", "KOMISI C", "KOMISI D"];
    const pageRanges: any[] = [];

    for (let idx = 0; idx < coms.length; idx++) {
        const kom = coms[idx];
        if (idx > 0) doc.addPage();
        
        const startYAfterKop = await drawKopSurat(doc);
        const startPageAt = (doc as any).internal.getNumberOfPages();
        const filtered = data.filter(r => r.kom === kom).sort((a, b) => a.name.localeCompare(b.name));
        const rows: any[] = filtered.map((r, i) => [i + 1, r.name, r.branch, ""]);
        for(let i=0; i<5; i++) rows.push([filtered.length + i + 1, "", "", ""]);
        
        (doc as any).autoTable({
            startY: startYAfterKop + 13, head: [['No', 'Nama Lengkap', 'Entitas', 'Tanda Tangan']], body: rows, theme: 'grid', showHead: 'everyPage',
            headStyles: { fillColor: [185, 28, 28], fontSize: 10, halign: 'center' }, styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 0: { halign: 'center', cellWidth: 18 }, 3: { cellWidth: 45 } },
            didDrawCell: (d: any) => {
                if (d.column.index === 3 && d.cell.section === 'body') {
                    const rIdx = d.row.index + 1; const text = rIdx.toString() + ".";
                    const x = d.cell.x + (rIdx % 2 === 0 ? d.cell.width / 2 : 2);
                    const y = d.cell.y + d.cell.height - 2;
                    doc.setFontSize(7); doc.setTextColor(150); doc.text(text, x, y);
                }
            },
            didDrawPage: () => {
                doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold"); 
                doc.text(`DAFTAR HADIR SIDANG ${kom}`, 105, startYAfterKop + 8, { align: "center" });
            }
        });
        pageRanges.push({ name: kom, start: startPageAt, end: (doc as any).internal.getNumberOfPages() });
    }

    pageRanges.forEach(range => {
        for (let i = range.start; i <= range.end; i++) {
            doc.setPage(i);
            const localCurrent = i - range.start + 1;
            const localTotal = range.end - range.start + 1;
            doc.setFontSize(8); doc.setTextColor(150); doc.setFont("helvetica", "normal");
            doc.text(`${range.name} - Hal. ${localCurrent} dari ${localTotal}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    });

    doc.save(`Konkerkab-1 Daftar Hadir Sidang Komisi ${getTimestamp()}.pdf`);
};

export const executePlenoAttendancePDF = async (flattenedRows: FlatAdminRow[], showModal: Function) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = [...flattenedRows];
    if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");

    const priority: Record<string, number> = { "PESERTA CABANG": 1, "PANITIA": 2, "PENINJAU": 3 };
    data.sort((a, b) => {
        if (priority[a.kategori] !== priority[b.kategori]) return priority[a.kategori] - priority[b.kategori];
        if (a.branch.localeCompare(b.branch) !== 0) return a.branch.localeCompare(b.branch);
        return a.name.localeCompare(b.name);
    });

    const rows: any[] = data.map((r, i) => [i + 1, r.branch, r.name, r.jabatan, ""]);
    for(let i=0; i<10; i++) rows.push([data.length + i + 1, "", "", "", ""]);

    const startYAfterKop = await drawKopSurat(doc);

    (doc as any).autoTable({
        startY: startYAfterKop + 22, head: [['No', 'Entitas', 'Nama', 'Jabatan', 'Tanda Tangan']], body: rows, theme: 'grid', showHead: 'everyPage',
        headStyles: { fillColor: [185, 28, 28], fontSize: 10, halign: 'center' }, styles: { fontSize: 8, cellPadding: 3 },
        margin: { top: 20 },
        columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 4: { cellWidth: 45 } },
        didDrawCell: (d: any) => {
            if (d.column.index === 4 && d.cell.section === 'body') {
                const rIdx = d.row.index + 1; const text = rIdx.toString() + ".";
                const x = d.cell.x + (rIdx % 2 === 0 ? d.cell.width / 2 : 2);
                const y = d.cell.y + d.cell.height - 2;
                doc.setFontSize(7); doc.setTextColor(150); doc.text(text, x, y);
            }
        },
        didDrawPage: (d: any) => {
            if (d.pageNumber === 1) {
                doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold");
                doc.text("DAFTAR HADIR", 105, startYAfterKop + 8, { align: "center" });
                doc.setFontSize(11); doc.setTextColor(0); doc.setFont("helvetica", "bold");
                doc.text("AGENDA ___________________________", 105, startYAfterKop + 16, { align: "center" });
            }
            doc.setFontSize(8); doc.setTextColor(150); doc.setFont("helvetica", "normal");
            let str = `Hal. ${d.pageNumber} dari {T}`;
            doc.text(str, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
    });
    if (typeof (doc as any).putTotalPages === 'function') {
        (doc as any).putTotalPages('{T}');
    }
    doc.save(`Konkerkab-1 Daftar Hadir ${getTimestamp()}.pdf`);
};
