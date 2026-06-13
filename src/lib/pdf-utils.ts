import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { KOP_SURAT_URL, TEMPLATE_URLS } from "./constants";
import { SubmissionData, FlatAdminRow } from "../types";
import QRCode from "qrcode";

export const toProperCase = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
};

export const getTimestamp = () => {
  const now = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
};

export const formatWA = (num: string) => {
  if (!num) return "";
  let n = num.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
};

export const drawKopSurat = async (doc: jsPDF): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvasWidth = 190;
        const imgHeight = (img.height * canvasWidth) / img.width;
        doc.addImage(img, "PNG", 10, 5, canvasWidth, imgHeight);
        resolve(imgHeight + 5);
      } catch (err) {
        console.error("Error in drawKopSurat:", err);
        resolve(20);
      }
    };
    img.onerror = () => resolve(20);
    img.src = KOP_SURAT_URL;
  });
};

export const drawSingleCard = async (
  name: string,
  info: string,
  photoData: string | undefined,
  category: string,
  qrPayload?: string
): Promise<string> => {
  return new Promise((resolve) => {
    const cvs = document.createElement("canvas");
    const ctx = cvs.getContext("2d")!;
    const catKey =
      category && category.toUpperCase().includes("PESERTA")
        ? "PESERTA CABANG"
        : category || "PESERTA CABANG";
    const templateUrl =
      TEMPLATE_URLS[catKey] || TEMPLATE_URLS["PESERTA CABANG"];
    const tpl = new Image();
    tpl.crossOrigin = "anonymous";
    tpl.onload = async () => {
      cvs.width = 1240;
      cvs.height = 1980;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      const drawContent = async (pImg: HTMLImageElement | null) => {
        try {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, 1240, 1980);
          if (pImg) {
            const fX = 410,
              fY = 960,
              fW = 420,
              fH = 560;
            ctx.save();
            ctx.beginPath();
            ctx.rect(fX, fY, fW, fH);
            ctx.clip();
            const imgAsp = pImg.width / pImg.height,
              targetAsp = fW / fH;
            let sW, sH, sX, sY;
            if (imgAsp > targetAsp) {
              sH = pImg.height;
              sW = pImg.height * targetAsp;
              sX = (pImg.width - sW) / 2;
              sY = 0;
            } else {
              sW = pImg.width;
              sH = pImg.width / targetAsp;
              sX = 0;
              sY = (pImg.height - sH) / 2;
            }
            ctx.drawImage(pImg, sX, sY, sW, sH, fX, fY, fW, fH);
            ctx.restore();
          }
          ctx.drawImage(tpl, 0, 0, 1240, 1980);
          const nm = (name || "").toUpperCase();
          ctx.textAlign = "center";
          ctx.fillStyle = "#111111";
          ctx.textBaseline = "middle";
          const maxNW = 800,
            maxNH = 120;
          let nSize = 80;
          ctx.font = `bold ${nSize}px "Times New Roman", Times, serif`;
          while (
            (ctx.measureText(nm).width > maxNW || nSize > maxNH) &&
            nSize > 10
          ) {
            nSize--;
            ctx.font = `bold ${nSize}px "Times New Roman", Times, serif`;
          }
          ctx.fillText(nm, 620, 1598);
          const displayInfo = (info || "").toUpperCase();
          const maxIW = 800,
            maxIH = 150;
          let iSize = 75;
          ctx.font = `bold ${iSize}px "Times New Roman", Times, serif`;
          while (
            (ctx.measureText(displayInfo).width > maxIW || iSize > maxIH) &&
            iSize > 10
          ) {
            iSize--;
            ctx.font = `bold ${iSize}px "Times New Roman", Times, serif`;
          }
          ctx.fillText(displayInfo, 620, 1830);

          if (qrPayload) {
            try {
              const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200, color: { dark: '#000000', light: '#ffffff' } });
              const qrImg = new Image();
              qrImg.onload = () => {
                ctx.drawImage(qrImg, 1000, 1600, 200, 200);
                resolve(cvs.toDataURL("image/jpeg", 1.0));
              };
              qrImg.src = qrDataUrl;
            } catch (err) {
              console.error("QR generated failed", err);
              resolve(cvs.toDataURL("image/jpeg", 1.0));
            }
          } else {
             resolve(cvs.toDataURL("image/jpeg", 1.0));
          }
        } catch (err) {
          console.error("Error in drawContent:", err);
          const cvsFallback = document.createElement("canvas");
          cvsFallback.width = 1240;
          cvsFallback.height = 1980;
          resolve(cvsFallback.toDataURL("image/jpeg", 1.0));
        }
      };
      if (photoData) {
        const img = new Image();
        img.onload = () => drawContent(img);
        img.onerror = () => drawContent(null);
        img.src = photoData;
      } else drawContent(null);
    };
    tpl.onerror = () => {
      console.error("Failed to load template image", templateUrl);
      const cvsFallback = document.createElement("canvas");
      cvsFallback.width = 1240;
      cvsFallback.height = 1980;
      resolve(cvsFallback.toDataURL("image/jpeg", 1.0));
    };
    tpl.src = templateUrl;
  });
};

export const downloadFullPDF = async (id: string, data: SubmissionData) => {
  const doc = new jsPDF("p", "mm", "a4");
  const startY = await drawKopSurat(doc);

  doc.setFontSize(18);
  doc.setTextColor(185, 28, 28);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI PENDAFTARAN", 105, startY + 12, { align: "center" });

  doc.setTextColor(0);
  doc.setFontSize(11);
  let y = startY + 20;
  let labelEntitas = (data.nama_cabang || "").toUpperCase();
  const isPeserta =
    data.kategori && data.kategori.toUpperCase().includes("PESERTA");
  if (data.kategori === "PENINJAU")
    labelEntitas = labelEntitas.replace("PENINJAU - ", "");
  const meta = [
    ["Kategori", isPeserta ? "PESERTA CABANG" : data.kategori],
    ["Entitas", labelEntitas],
    ["Waktu Daftar", data.waktu_simpan],
    ["ID Registrasi", id],
    ["Token Revisi", data.revision_token],
  ];

  meta.forEach((m) => {
    doc.setFont("helvetica", "bold");
    doc.text(m[0] as string, 25, y);
    doc.setFont("helvetica", "normal");
    doc.text(": " + m[1], 60, y);
    y += 6;
  });

  const rows = [];
  for (let i = 1; i <= 4; i++) {
    const pNama = (data as any)[`p${i}_nama`];
    if (pNama) {
      rows.push([
        i,
        pNama,
        (data as any)[`p${i}_jabatan`],
        (data as any)[`p${i}_komisi`] || "-",
        (data as any)[`p${i}_wa`],
      ]);
    }
  }

  autoTable(doc, {
    startY: y - 1,
    head: [["No", "Nama Lengkap", "Jabatan", "Komisi", "WhatsApp"]],
    body: rows,
    headStyles: { fillColor: [185, 28, 28] },
  });

  doc.addPage();
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TANDA PESERTA", 105, 15, { align: "center" });
  const imgs = [];
  for (let i = 1; i <= 4; i++) {
    if ((data as any)[`p${i}_nama`]) {
      imgs.push(
        await drawSingleCard(
          (data as any)[`p${i}_nama`],
          isPeserta ? data.nama_cabang! : (data as any)[`p${i}_jabatan`],
          (data as any)[`p${i}_foto`],
          data.kategori!,
          `${id}-${i}`
        ),
      );
    }
  }

  const cw = 54,
    ch = 86,
    gapX = 15,
    gapY = 15,
    stX = (210 - (cw * 2 + gapX)) / 2;
  imgs.forEach((im, i) => {
    const x = stX + (i % 2) * (cw + gapX),
      yP = 30 + Math.floor(i / 2) * (ch + gapY);
    doc.addImage(im, "JPEG", x, yP, cw, ch);
  });

  const ts = getTimestamp();
  const entitasProper = toProperCase(labelEntitas);
  const namaProper = toProperCase(data.p1_nama || "");
  let filename = isPeserta
    ? `Konkerkab-1 Bukti Pendaftaran ${entitasProper} ${ts}.pdf`
    : `Konkerkab-1 Bukti Pendaftaran ${entitasProper} ${namaProper} ${ts}.pdf`;
  doc.save(filename);
};

export const printAllCardsA4 = async (
  list: FlatAdminRow[],
  showModal: Function,
  setProgress: (progress: number) => void,
) => {
  if (list.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
  const doc = new jsPDF("p", "mm", "a4");

  showModal("MEMPROSES", "Sedang menyusun kartu...", "success", true);

  const cw = 54,
    ch = 86,
    gapX = 10,
    gapY = 10;
  const stX = (210 - (cw * 3 + gapX * 2)) / 2;
  const stY = (297 - (ch * 3 + gapY * 2)) / 2;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const isPeserta = item.kategori.includes("PESERTA");
    const img = await drawSingleCard(
      item.name,
      isPeserta ? item.branch : item.jabatan,
      item.foto,
      (item.sD as any).kategori,
      `${item.id}-${item.i}`
    );

    const pIdx = i % 9;
    if (i > 0 && pIdx === 0) doc.addPage();

    const x = stX + (pIdx % 3) * (cw + gapX);
    const y = stY + Math.floor(pIdx / 3) * (ch + gapY);

    doc.addImage(img, "JPEG", x, y, cw, ch);

    setProgress(((i + 1) / list.length) * 100);
  }

  const filename = `Konkerkab-1 ID Card Massal ${getTimestamp()}.pdf`;
  doc.save(filename);
  showModal("BERHASIL", "PDF telah diunduh.", "success");
};

const mirrorImage = (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement("canvas");
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      resolve(cvs.toDataURL("image/jpeg", 1.0));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const printAllCardsPVC = async (
  list: FlatAdminRow[],
  showModal: Function,
  setProgress: (progress: number) => void,
) => {
  if (list.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
  // A4 Landscape is better for 10 cards per page (5 columns, 2 rows)
  const doc = new jsPDF("l", "mm", "a4");

  showModal("MEMPROSES", "Sedang menyusun kartu PVC...", "success", true);

  const cw = 54; // card width
  const ch = 86; // card height
  const bleed = 1; // 1mm bleed
  const gapX = 3;
  const gapY = 10;
  
  // 5 cols = 5 * 54 = 270. Gap = 4 * 3 = 12. Total = 282. Margin = 7.5
  const stX = (297 - (cw * 5 + gapX * 4)) / 2;
  // 2 rows = 2 * 86 = 172. Gap = 10. Total = 182. Margin = 14
  const stY = (210 - (ch * 2 + gapY * 1)) / 2;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const isPeserta = item.kategori.includes("PESERTA");
    const img = await drawSingleCard(
      item.name,
      isPeserta ? item.branch : item.jabatan,
      item.foto,
      (item.sD as any).kategori,
      `${item.id}-${item.i}`
    );
    
    // Mirror the image for PVC backside printing
    const mirroredImg = await mirrorImage(img);

    const pIdx = i % 10;
    if (i > 0 && pIdx === 0) doc.addPage();

    const col = pIdx % 5;
    const row = Math.floor(pIdx / 5);

    const x = stX + col * (cw + gapX);
    const y = stY + row * (ch + gapY);

    // Draw image with bleed (+1mm on all sides)
    doc.addImage(mirroredImg, "JPEG", x - bleed, y - bleed, cw + 2 * bleed, ch + 2 * bleed);

    // Draw crop marks (thin, light gray frame around 54x86 to guide Plong)
    doc.setLineWidth(0.1);
    doc.setDrawColor(200, 200, 200); 
    doc.rect(x, y, cw, ch);

    // Draw little crosses at the corners outside the bleed
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    const markLen = 3; // 3mm mark
    const offset = bleed + 0.5; // Starts 0.5mm outside the bleed

    // Top-Left
    doc.line(x - offset, y, x - offset - markLen, y);
    doc.line(x, y - offset, x, y - offset - markLen);
    
    // Top-Right
    doc.line(x + cw + offset, y, x + cw + offset + markLen, y);
    doc.line(x + cw, y - offset, x + cw, y - offset - markLen);

    // Bottom-Left
    doc.line(x - offset, y + ch, x - offset - markLen, y + ch);
    doc.line(x, y + ch + offset, x, y + ch + offset + markLen);

    // Bottom-Right
    doc.line(x + cw + offset, y + ch, x + cw + offset + markLen, y + ch);
    doc.line(x + cw, y + ch + offset, x + cw, y + ch + offset + markLen);

    setProgress(((i + 1) / list.length) * 100);
  }

  const filename = `Konkerkab-1 ID Card Cetak PVC ${getTimestamp()}.pdf`;
  doc.save(filename);
  showModal("BERHASIL", "PDF telah diunduh.", "success");
};

export const printAllCardsPVCNormal = async (
  list: FlatAdminRow[],
  showModal: Function,
  setProgress: (progress: number) => void,
) => {
  if (list.length === 0) return showModal("ERROR", "Tidak ada data.", "error");
  // A4 Landscape is better for 10 cards per page (5 columns, 2 rows)
  const doc = new jsPDF("l", "mm", "a4");

  showModal("MEMPROSES", "Sedang menyusun kartu PVC (Normal)...", "success", true);

  const cw = 54; // card width
  const ch = 86; // card height
  const gapX = 0;
  const gapY = 0;
  
  // 5 cols = 5 * 54 = 270. Total = 270. Margin = 13.5
  const stX = (297 - (cw * 5)) / 2;
  // 2 rows = 2 * 86 = 172. Total = 172. Margin = 19
  const stY = (210 - (ch * 2)) / 2;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const isPeserta = item.kategori.includes("PESERTA");
    const img = await drawSingleCard(
      item.name,
      isPeserta ? item.branch : item.jabatan,
      item.foto,
      (item.sD as any).kategori,
      `${item.id}-${item.i}`
    );
    
    const pIdx = i % 10;
    if (i > 0 && pIdx === 0) doc.addPage();

    const col = pIdx % 5;
    const row = Math.floor(pIdx / 5);

    const x = stX + col * cw;
    const y = stY + row * ch;

    // Draw image exactly at dimensions (no bleed because they touch)
    doc.addImage(img, "JPEG", x, y, cw, ch);

    // After drawing the last card of the page, or the very last card
    const isLastOfPage = pIdx === 9 || i === list.length - 1;
    if (isLastOfPage) {
      const drawnItemsOnPage = pIdx + 1;
      const colsToDraw = drawnItemsOnPage < 5 ? drawnItemsOnPage : 5;
      const rowsToDraw = Math.ceil(drawnItemsOnPage / 5);

      doc.setDrawColor(200, 200, 200); // Light gray
      doc.setLineWidth(0.1);

      const extend = 5; // Extend lines 5mm outside the grid

      // Vertical lines
      for (let c = 0; c <= colsToDraw; c++) {
        const lx = stX + c * cw;
        // determine the height based on how many rows on this specific column
        let currentRowsToDraw = rowsToDraw;
        if (drawnItemsOnPage > 5 && c > drawnItemsOnPage % 5 && drawnItemsOnPage % 5 !== 0) {
          currentRowsToDraw = 1; // second row is incomplete
        }
        
        // Always just draw full height if we want a simple grid. 
        // Wait, if incomplete page, drawing full grid might be weird, 
        // but it's simpler. Let's draw lines spanning the actual cards present.
        const lineH = currentRowsToDraw * ch;
        // Extend slightly at top and bottom
        doc.line(lx, stY - extend, lx, stY + lineH + extend);
      }

      // Horizontal lines
      for (let r = 0; r <= rowsToDraw; r++) {
        const ly = stY + r * ch;
        // determine the width based on how many columns on this specific row
        let currentColsToDraw = 5;
        if (r === rowsToDraw && drawnItemsOnPage % 5 !== 0) {
           // bottom line of incomplete row is handled below, 
           // wait, actually r loops from 0 to rowsToDraw. 
           // If r == 1, it's the middle line. Draw full 5 cols if there is a bottom row.
           // If r == 1 and rowsToDraw == 1, it's the bottom of the first row. 
           // So drawnItemsOnPage is the width.
           if (rowsToDraw === 1) currentColsToDraw = drawnItemsOnPage;
        }
        if (r === rowsToDraw && r === 2 && drawnItemsOnPage % 5 !== 0) {
           currentColsToDraw = drawnItemsOnPage % 5;
        }

        const lineW = currentColsToDraw * cw;
        // Extend slightly at left and right
        doc.line(stX - extend, ly, stX + lineW + extend, ly);
      }
    }

    setProgress(((i + 1) / list.length) * 100);
  }

  const filename = `Konkerkab-1 ID Card Cetak Rapat ${getTimestamp()}.pdf`;
  doc.save(filename);
  showModal("BERHASIL", "PDF telah diunduh.", "success");
};
