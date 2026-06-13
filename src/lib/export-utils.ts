import { FlatAdminRow } from "../types";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import autoTable from "jspdf-autotable";
import { drawKopSurat, getTimestamp } from "./pdf-utils";

export const executeExcelExport = (
  flattenedRows: FlatAdminRow[],
  showModal: (
    title: string,
    message: string,
    type: "success" | "error",
  ) => void,
) => {
  if (flattenedRows.length === 0)
    return showModal("ERROR", "Tidak ada data.", "error");
  const wb = XLSX.utils.book_new();
  const standardMap = (r: FlatAdminRow) => ({
    "Waktu Daftar": r.ts,
    Kategori: r.kategori,
    "Cabang/Entitas": r.branch,
    "Nama Lengkap": r.name,
    Jabatan: r.jabatan,
    JK: r.jk,
    Komisi: r.kom,
    WhatsApp: r.wa,
    "Ukuran Kaos": (r.sD as any)[`p${r.i}_kaos`] || "-",
    "No. Kamar": r.room,
    "Tautan Mandat": r.mandat,
    Token: r.token,
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(flattenedRows.map(standardMap)),
    "Data Lengkap",
  );
  XLSX.writeFile(wb, `Konkerkab-1 Data Peserta ${getTimestamp()}.xlsx`);
};

export const executeRoomMappingPDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: (t: string, m: string, type: string) => void,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = [...flattenedRows];
  if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
  const ROOM_ORDER = [
    "ALPHA-1",
    "ALPHA-3",
    "ALPHA-5",
    "ALPHA-7",
    "ALPHA-9",
    "ALPHA-11",
    "ALPHA-15",
    "ALPHA-17",
    "ALPHA-19",
    "ALPHA-21",
    "ALPHA-23",
    "ALPHA-25",
    "ALPHA-27",
    "ALPHA-29",
    "ALPHA-31",
    "ALPHA-33",
    "ALPHA-8",
    "ALPHA-10",
    "ALPHA-12",
    "ALPHA-14",
    "ALPHA-16",
    "ALPHA-18",
    "ALPHA-20",
    "ALPHA-22",
    "ALPHA-24",
    "ALPHA-26",
    "ALPHA-28",
    "ALPHA-30",
    "SUPERIOR-14",
    "SUPERIOR-16",
    "SUPERIOR-18",
    "SUPERIOR-20",
    "SUPERIOR-22",
    "SUPERIOR-24",
    "SUPERIOR-26",
  ];

  data.sort((a, b) => {
    return a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name);
  });

  const branchCounts: Record<string, number> = {};
  data.forEach((r) => {
    const b = r.branch || "-";
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  });

  const branchSeen = new Set<string>();
  const rows: any[] = [];

  data.forEach((r, i) => {
    const branchName = r.branch || "-";
    const isFirst = !branchSeen.has(branchName);
    if (isFirst) branchSeen.add(branchName);

    const row: any[] = [i + 1];

    if (isFirst) {
      row.push({
        content: branchName,
        rowSpan: branchCounts[branchName],
        styles: { valign: "middle" }
      });
    }

    row.push(
      r.name,
      r.jk === "LAKI-LAKI" ? "L" : "P",
      r.wa,
      r.room
    );
    rows.push(row);
  });

  const startYAfterKop = await drawKopSurat(doc);

  autoTable(doc, {
    startY: startYAfterKop + 15,
    head: [["No", "Entitas", "Nama Lengkap", "JK", "WhatsApp", "Kamar"]],
    body: rows,
    theme: "grid",
    showHead: "everyPage",
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 9, halign: "center", valign: "middle", lineWidth: 0.1, lineColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      3: { halign: "center", cellWidth: 10 },
      5: {
        halign: "center",
        fontStyle: "bold",
        fontSize: 13,
        textColor: [185, 28, 28],
      },
    },
    didDrawCell: (d: any) => {
      if (d.section === "body" && d.row.index > 0 && d.row.raw.length === 6) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(d.cell.x, d.cell.y, d.cell.x + d.cell.width, d.cell.y);
      }
    },
    didDrawPage: (pageData: any) => {
      if (pageData.pageNumber === 1) {
        doc.setFontSize(16);
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.text("PEMETAAN KAMAR PENGINAPAN", 105, startYAfterKop + 8, {
          align: "center",
        });
      }
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Hal. ${pageData.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    },
  });
  doc.save(`Konkerkab-1 Pemetaan Kamar ${getTimestamp()}.pdf`);
};

export const executeRoomSortedPDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: (t: string, m: string, type: string) => void,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = [...flattenedRows];
  if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");

  const ROOM_ORDER = [
    "ALPHA-1",
    "ALPHA-3",
    "ALPHA-5",
    "ALPHA-7",
    "ALPHA-9",
    "ALPHA-11",
    "ALPHA-15",
    "ALPHA-17",
    "ALPHA-19",
    "ALPHA-21",
    "ALPHA-23",
    "ALPHA-25",
    "ALPHA-27",
    "ALPHA-29",
    "ALPHA-31",
    "ALPHA-33",
    "ALPHA-8",
    "ALPHA-10",
    "ALPHA-12",
    "ALPHA-14",
    "ALPHA-16",
    "ALPHA-18",
    "ALPHA-20",
    "ALPHA-22",
    "ALPHA-24",
    "ALPHA-26",
    "ALPHA-28",
    "ALPHA-30",
    "SUPERIOR-14",
    "SUPERIOR-16",
    "SUPERIOR-18",
    "SUPERIOR-20",
    "SUPERIOR-22",
    "SUPERIOR-24",
    "SUPERIOR-26",
  ];

  data.sort((a, b) => {
    const aRoomStr = String(a.room);
    const bRoomStr = String(b.room);
    const aIdx = ROOM_ORDER.indexOf(aRoomStr);
    const bIdx = ROOM_ORDER.indexOf(bRoomStr);
    const aOrder = aIdx === -1 ? 999 : aIdx;
    const bOrder = bIdx === -1 ? 999 : bIdx;

    if (aOrder !== bOrder) return aOrder - bOrder;
    if (aRoomStr !== bRoomStr) return aRoomStr.localeCompare(bRoomStr);
    
    // Sort by Category, then Branch, then Name if same room
    const priority: Record<string, number> = {
      "PESERTA CABANG": 1,
      PANITIA: 2,
      PENINJAU: 3,
    };
    return (
      (priority[a.kategori] || 99) - (priority[b.kategori] || 99) ||
      a.branch.localeCompare(b.branch) ||
      a.name.localeCompare(b.name)
    );
  });

  const roomCounts: Record<string, number> = {};
  data.forEach((r) => {
    roomCounts[String(r.room)] = (roomCounts[String(r.room)] || 0) + 1;
  });

  const rows: any[] = [];
  const roomSeen = new Set<string>();

  data.forEach((r, i) => {
    const rRoomStr = String(r.room);
    const isFirst = !roomSeen.has(rRoomStr);
    if (isFirst) roomSeen.add(rRoomStr);

    const row: any[] = [i + 1];

    if (isFirst) {
      row.push({
        content: r.room,
        rowSpan: roomCounts[rRoomStr],
        styles: {
          valign: "middle",
          halign: "center",
          fontStyle: "bold",
          textColor: [185, 28, 28],
        },
      });
    }

    row.push(r.branch, r.name, r.jk === "LAKI-LAKI" ? "L" : "P", r.wa);
    rows.push(row);
  });

  const startYAfterKop = await drawKopSurat(doc);

  autoTable(doc, {
    startY: startYAfterKop + 15,
    head: [["No", "Kamar", "Entitas", "Nama Lengkap", "JK", "WhatsApp"]],
    body: rows,
    theme: "grid",
    showHead: "everyPage",
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 9, halign: "center" },
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: {
        halign: "center",
        fontStyle: "bold",
        fontSize: 10,
        textColor: [185, 28, 28],
        cellWidth: 35,
      },
      4: { halign: "center", cellWidth: 10 },
    },
    didDrawPage: (pageData: any) => {
      if (pageData.pageNumber === 1) {
        doc.setFontSize(16);
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.text("PENGELOMPOKAN KAMAR PENGINAPAN", 105, startYAfterKop + 8, {
          align: "center",
        });
      }
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Hal. ${pageData.pageNumber} dari ${
          (doc as any).internal.getNumberOfPages()
        }`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    },
  });
  doc.save(`Konkerkab-1 Pengelompokan Kamar ${getTimestamp()}.pdf`);
};

export const executeTshirtRecapPDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: Function,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  if (flattenedRows.length === 0)
    return showModal("ERROR", "Tidak ada data.", "error");
  const sizeMap: Record<string, { L: number; P: number }> = {
    S: { L: 0, P: 0 },
    M: { L: 0, P: 0 },
    L: { L: 0, P: 0 },
    XL: { L: 0, P: 0 },
    XXL: { L: 0, P: 0 },
    XXXL: { L: 0, P: 0 },
  };
  let totalL = 0,
    totalP = 0;
  flattenedRows.forEach((r) => {
    const sz = (r.sD as any)[`p${r.i}_kaos`];
    const jk = r.jk === "LAKI-LAKI" ? "L" : "P";
    if (sizeMap[sz]) {
      sizeMap[sz][jk]++;
      if (jk === "L") totalL++;
      else totalP++;
    }
  });

  const startYAfterKop = await drawKopSurat(doc);

  doc.setFontSize(16);
  doc.setTextColor(185, 28, 28);
  doc.setFont("helvetica", "bold");
  doc.text("REKAPITULASI UKURAN KAOS", 105, startYAfterKop + 8, {
    align: "center",
  });
  const summaryRows: any[] = Object.entries(sizeMap).map(([size, counts]) => [
    size,
    counts.L || "-",
    counts.P || "-",
    counts.L + counts.P || "-",
  ]);
  summaryRows.push([
    {
      content: "TOTAL KESELURUHAN",
      styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
    },
    totalL,
    totalP,
    totalL + totalP,
  ]);
  autoTable(doc, {
    startY: startYAfterKop + 13,
    head: [["Ukuran", "Laki-laki", "Perempuan", "Total"]],
    body: summaryRows,
    theme: "grid",
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], halign: "center" },
    styles: { fontSize: 10, cellPadding: 5, halign: "center" },
    margin: { left: 30, right: 30 },
  });
  doc.save(`Konkerkab-1 Rekap Ukuran Kaos ${getTimestamp()}.pdf`);
};

export const executeTshirtReceiptPDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: Function,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = [...flattenedRows];
  if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
  data.sort((a, b) => {
    const isAP = a.kategori.includes("PESERTA"),
      isBP = b.kategori.includes("PESERTA");
    if (isAP && !isBP) return -1;
    if (!isAP && isBP) return 1;
    return a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name);
  });
  const branchCounts: Record<string, number> = {};
  data.forEach((r) => {
    const b = r.branch || "-";
    branchCounts[b] = (branchCounts[b] || 0) + 1;
  });

  const branchSeen = new Set<string>();

  const rows: any[] = [];
  data.forEach((r, i) => {
    let jk = r.jk?.toUpperCase() || "";
    if (jk === "L" || jk.includes("LAKI")) jk = "Lk";
    else if (jk === "P" || jk.includes("PEREMPUAN")) jk = "Pr";
    else jk = "-";

    const branchName = r.branch || "-";
    const isFirst = !branchSeen.has(branchName);
    if (isFirst) branchSeen.add(branchName);

    const row: any[] = [i + 1];

    if (isFirst) {
      row.push({
        content: branchName,
        rowSpan: branchCounts[branchName],
        styles: { valign: "middle" }
      });
    }

    row.push(
      r.name,
      jk,
      (r.sD as any)[`p${r.i}_kaos`] || "-",
      ""
    );
    rows.push(row);
  });

  const startYAfterKop = await drawKopSurat(doc);

  autoTable(doc, {
    startY: startYAfterKop + 13,
    head: [
      [
        "No",
        "Entitas",
        "Nama Lengkap",
        "L/P",
        "Ukuran",
        "Tanda Tangan\ndan Nama Penerima",
      ],
    ],
    body: rows,
    theme: "grid",
    showHead: "everyPage",
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 9, halign: "center", valign: "middle", lineWidth: 0.1, lineColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "center", cellWidth: 20 },
      5: { cellWidth: 45 },
    },
    didDrawCell: (d: any) => {
      if (d.section === "body" && d.row.index > 0 && d.row.raw.length === 6) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(d.cell.x, d.cell.y, d.cell.x + d.cell.width, d.cell.y);
      }
    },
    didDrawPage: (d: any) => {
      if (d.pageNumber === 1) {
        doc.setFontSize(16);
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.text("TANDA TERIMA KAOS", 105, startYAfterKop + 8, {
          align: "center",
        });
      }
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Hal. ${d.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    },
  });
  doc.save(`Konkerkab-1 Tanda Terima Kaos ${getTimestamp()}.pdf`);
};

export const executeMasterKomisiPDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: Function,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = flattenedRows.filter((r) => r.kategori.includes("PESERTA"));
  if (data.length === 0)
    return showModal("ERROR", "Tidak ada data peserta.", "error");
  data.sort(
    (a, b) => a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name),
  );
  const rows = data.map((r, i) => [i + 1, r.branch, r.name, r.kom]);

  const startYAfterKop = await drawKopSurat(doc);

  autoTable(doc, {
    startY: startYAfterKop + 13,
    head: [["No", "Entitas", "Nama Lengkap", "Komisi"]],
    body: rows,
    theme: "grid",
    showHead: "everyPage",
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 10, halign: "center" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      3: { halign: "center", fontStyle: "bold", textColor: [185, 28, 28] },
    },
    didDrawPage: (d: any) => {
      if (d.pageNumber === 1) {
        doc.setFontSize(16);
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.text("PEMBAGIAN KOMISI", 105, startYAfterKop + 8, {
          align: "center",
        });
      }
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Hal. ${d.pageNumber} dari ${(doc as any).internal.getNumberOfPages()}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    },
  });
  doc.save(`Konkerkab-1 Master Komisi ${getTimestamp()}.pdf`);
};

export const executeSidangKomisiPDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: Function,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = flattenedRows.filter((r) => r.kategori.includes("PESERTA"));
  if (data.length === 0)
    return showModal("ERROR", "Tidak ada data peserta.", "error");

  const coms = ["KOMISI A", "KOMISI B", "KOMISI C", "KOMISI D"];
  const pageRanges: any[] = [];

  for (let idx = 0; idx < coms.length; idx++) {
    const kom = coms[idx];
    if (idx > 0) doc.addPage();

    const startYAfterKop = await drawKopSurat(doc);
    const startPageAt = (doc as any).internal.getNumberOfPages();
    const filtered = data
      .filter((r) => r.kom === kom)
      .sort((a, b) => a.name.localeCompare(b.name));
    const rows = filtered.map((r, i) => [i + 1, r.name, r.branch]);

    autoTable(doc, {
      startY: startYAfterKop + 13,
      head: [["No", "Nama Lengkap", "Entitas"]],
      body: rows,
      theme: "striped",
      showHead: "everyPage",
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 10, halign: "center" },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { halign: "center", cellWidth: 14 } },
      didDrawPage: (d: any) => {
        if (d.pageNumber === 1) {
          doc.setFontSize(16);
          doc.setTextColor(185, 28, 28);
          doc.setFont("helvetica", "bold");
          doc.text(`PESERTA SIDANG ${kom}`, 105, startYAfterKop + 8, {
            align: "center",
          });
        }
      },
    });
    pageRanges.push({
      name: kom,
      start: startPageAt,
      end: (doc as any).internal.getNumberOfPages(),
    });
  }

  pageRanges.forEach((range) => {
    for (let i = range.start; i <= range.end; i++) {
      doc.setPage(i);
      const localCurrent = i - range.start + 1;
      const localTotal = range.end - range.start + 1;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${range.name} - Hal. ${localCurrent} dari ${localTotal}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    }
  });

  doc.save(`Konkerkab-1 Peserta Sidang Komisi ${getTimestamp()}.pdf`);
};

export const executeAttendancePDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: Function,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = flattenedRows.filter((r) => r.kategori.includes("PESERTA"));
  if (data.length === 0)
    return showModal("ERROR", "Tidak ada data peserta.", "error");

  const coms = ["KOMISI A", "KOMISI B", "KOMISI C", "KOMISI D"];
  const pageRanges: any[] = [];

  for (let idx = 0; idx < coms.length; idx++) {
    const kom = coms[idx];
    if (idx > 0) doc.addPage();

    const startYAfterKop = await drawKopSurat(doc);
    const startPageAt = (doc as any).internal.getNumberOfPages();
    const filtered = data
      .filter((r) => r.kom === kom)
      .sort((a, b) => a.name.localeCompare(b.name));
    const rows: any[] = filtered.map((r, i) => [i + 1, r.name, r.branch, ""]);
    for (let i = 0; i < 5; i++)
      rows.push([filtered.length + i + 1, "", "", ""]);

    autoTable(doc, {
      startY: startYAfterKop + 13,
      head: [["No", "Nama Lengkap", "Entitas", "Tanda Tangan"]],
      body: rows,
      theme: "grid",
      showHead: "everyPage",
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 10, halign: "center" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { halign: "center", cellWidth: 18 },
        3: { cellWidth: 45 },
      },
      didDrawCell: (d: any) => {
        if (d.column.index === 3 && d.cell.section === "body") {
          const rIdx = d.row.index + 1;
          const text = rIdx.toString() + ".";
          const x = d.cell.x + (rIdx % 2 === 0 ? d.cell.width / 2 : 2);
          const y = d.cell.y + d.cell.height - 2;
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(text, x, y);
        }
      },
      didDrawPage: (d: any) => {
        if (d.pageNumber === 1) {
          doc.setFontSize(16);
          doc.setTextColor(185, 28, 28);
          doc.setFont("helvetica", "bold");
          doc.text(`DAFTAR HADIR SIDANG ${kom}`, 105, startYAfterKop + 8, {
            align: "center",
          });
        }
      },
    });
    pageRanges.push({
      name: kom,
      start: startPageAt,
      end: (doc as any).internal.getNumberOfPages(),
    });
  }

  pageRanges.forEach((range) => {
    for (let i = range.start; i <= range.end; i++) {
      doc.setPage(i);
      const localCurrent = i - range.start + 1;
      const localTotal = range.end - range.start + 1;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${range.name} - Hal. ${localCurrent} dari ${localTotal}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      );
    }
  });

  doc.save(`Konkerkab-1 Daftar Hadir Sidang Komisi ${getTimestamp()}.pdf`);
};

export const executePlenoAttendancePDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: Function,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = [...flattenedRows];
  if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");

  const priority: Record<string, number> = {
    "PESERTA CABANG": 1,
    PANITIA: 2,
    PENINJAU: 3,
  };
  data.sort((a, b) => {
    if (priority[a.kategori] !== priority[b.kategori])
      return priority[a.kategori] - priority[b.kategori];
    if (a.branch.localeCompare(b.branch) !== 0)
      return a.branch.localeCompare(b.branch);
    return a.name.localeCompare(b.name);
  });

  const rows: any[] = data.map((r, i) => [
    i + 1,
    r.branch,
    r.name,
    r.jabatan,
    "",
  ]);
  for (let i = 0; i < 10; i++) rows.push([data.length + i + 1, "", "", "", ""]);

  const startYAfterKop = await drawKopSurat(doc);

  autoTable(doc, {
    startY: startYAfterKop + 22,
    head: [["No", "Entitas", "Nama", "Jabatan", "Tanda Tangan"]],
    body: rows,
    theme: "grid",
    showHead: "everyPage",
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 10, halign: "center" },
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { top: 20 },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      4: { cellWidth: 45 },
    },
    didDrawCell: (d: any) => {
      if (d.column.index === 4 && d.cell.section === "body") {
        const rIdx = d.row.index + 1;
        const text = rIdx.toString() + ".";
        const x = d.cell.x + (rIdx % 2 === 0 ? d.cell.width / 2 : 2);
        const y = d.cell.y + d.cell.height - 2;
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(text, x, y);
      }
    },
    didDrawPage: (d: any) => {
      if (d.pageNumber === 1) {
        doc.setFontSize(16);
        doc.setTextColor(185, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.text("DAFTAR HADIR", 105, startYAfterKop + 8, { align: "center" });
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(
          "AGENDA ___________________________",
          105,
          startYAfterKop + 16,
          { align: "center" },
        );
      }
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont("helvetica", "normal");
      let str = `Hal. ${d.pageNumber} dari {T}`;
      doc.text(str, 105, doc.internal.pageSize.height - 10, {
        align: "center",
      });
    },
  });
  if (typeof (doc as any).putTotalPages === "function") {
    (doc as any).putTotalPages("{T}");
  }
  doc.save(`Konkerkab-1 Daftar Hadir ${getTimestamp()}.pdf`);
};

export const executeMealCouponsPDF = async (
  flattenedRows: FlatAdminRow[],
  showModal: Function,
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const data = [...flattenedRows];
  if (data.length === 0) return showModal("ERROR", "Tidak ada data.", "error");

  const PRIORITY: Record<string, number> = {
    "PESERTA CABANG": 1,
    PANITIA: 2,
    PENINJAU: 3,
  };
  data.sort((a, b) => {
    if (PRIORITY[a.kategori] !== PRIORITY[b.kategori])
      return (PRIORITY[a.kategori] || 99) - (PRIORITY[b.kategori] || 99);
    if (a.branch.localeCompare(b.branch) !== 0)
      return a.branch.localeCompare(b.branch);
    return a.name.localeCompare(b.name);
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const cols = 3; 
  const rowsPerPage = 7;
  
  const couponW = pageWidth / cols;
  const couponH = pageHeight / rowsPerPage;
  
  let currentRow = 0;

  for (let i = 0; i < data.length; i++) {
    const person = data[i];

    if (currentRow >= rowsPerPage) {
      doc.addPage();
      currentRow = 0;
    }

    const startY = currentRow * couponH;
    
    for (let c = 0; c < cols; c++) {
      const startX = c * couponW;
      
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.rect(startX, startY, couponW, couponH);
      
      doc.setFillColor(185, 28, 28);
      doc.rect(startX, startY, couponW, 8, "F");
      
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("KUPON MAKAN KONKERKAB", startX + couponW / 2, startY + 5.5, { align: "center", maxWidth: couponW - 2 });

      doc.setTextColor(0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      doc.text(person.name, startX + 5, startY + 14, { maxWidth: couponW - 10 });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`${person.kategori}`, startX + 5, startY + 20, { maxWidth: couponW - 10 });
      doc.text(`${person.branch}`, startX + 5, startY + 24, { maxWidth: couponW - 10 });
      
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`Kupon ${c + 1} / 3`, startX + 5, startY + couponH - 4);
      doc.text(`Hangus stlh pakai`, startX + couponW - 5, startY + couponH - 4, { align: "right" });
      
      if (c < cols - 1) {
        doc.setDrawColor(180);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(startX + couponW, startY, startX + couponW, startY + couponH);
        doc.setLineDashPattern([], 0);
        doc.setDrawColor(200);
      }
    }
    
    currentRow++;
  }

  doc.save(`Konkerkab-1 Kupon Makan ${getTimestamp()}.pdf`);
};
