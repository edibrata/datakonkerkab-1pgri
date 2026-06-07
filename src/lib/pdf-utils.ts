import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { KOP_SURAT_URL, TEMPLATE_URLS } from "./constants";
import { SubmissionData, FlatAdminRow } from "../types";

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
    tpl.onload = () => {
      cvs.width = 1240;
      cvs.height = 1980;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      const drawContent = (pImg: HTMLImageElement | null) => {
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
          resolve(cvs.toDataURL("image/jpeg", 1.0));
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
