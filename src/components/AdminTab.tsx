import React, { useState, useMemo, useEffect, useRef } from "react";
import { SubmissionData, FlatAdminRow } from "../types";
import { db } from "../lib/firebase";
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { CUSTOM_APP_ID } from "../lib/constants";
import { toProperCase, formatWA } from "../lib/pdf-utils";

import {
  executeExcelExport,
  executeRoomMappingPDF,
  executeRoomSortedPDF,
  executeTshirtRecapPDF,
  executeTshirtReceiptPDF,
  executeMasterKomisiPDF,
  executeSidangKomisiPDF,
  executeAttendancePDF,
  executePlenoAttendancePDF,
  executeMealCouponsPDF,
  executeScannedResultPDF,
  executeKuorumPDF,
} from "../lib/export-utils";
import { EVENT_AGENDA } from "../lib/constants";
import {
  downloadFullPDF,
  drawSingleCard,
  getTimestamp,
  printAllCardsA4,
  printAllCardsPVC,
  printAllCardsPVCNormal,
} from "../lib/pdf-utils";
import { getFlattenedRows } from "../lib/data-utils";

interface Props {
  submissions: SubmissionData[];
  attendanceLogs: any[];
  confirmations: any[];
  trashRecords: any[];
  isRegistrationOpen: boolean;
  activeEventId: string;
  showModal: (
    title: string,
    message: string,
    type: "success" | "error",
    showProgress?: boolean,
  ) => void;
  setModalProgress: (progress: number) => void;
  onViewPrevew: (imgData: string) => void;
  onEditEntry: (docId: string, participantIndex?: number) => void;
  onLogout: () => void;
}

export function AdminTab({
  submissions,
  attendanceLogs,
  confirmations,
  trashRecords,
  isRegistrationOpen,
  activeEventId,
  showModal,
  setModalProgress,
  onViewPrevew,
  onEditEntry,
  onLogout,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "ts", dir: -1 });
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    description?: string;
    onConfirm: () => void;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSubMenu, setExportSubMenu] = useState<string>("main");
  const [activeRowActions, setActiveRowActions] = useState<string | null>(null);

  const [showTrashModal, setShowTrashModal] = useState(false);

  const [editingRecord, setEditingRecord] = useState<{ id: string; i: number; data: any } | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupJSON = () => {
    const data = {
      submissions,
      attendanceLogs,
      confirmations,
      trashRecords,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup-Konkerkab-${getTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        setConfirmDialog({
          message: "Konfirmasi Restore",
          description: "Mengembalikan data dari file JSON akan menimpa/menambah data saat ini. Apakah Anda yakin?",
          onConfirm: async () => {
            showModal("MEMPROSES", "Sedang mengembalikan data...", "success", true);
            let done = 0;
            let total = (data.submissions?.length || 0) + (data.attendanceLogs?.length || 0) + (data.confirmations?.length || 0) + (data.trashRecords?.length || 0);
            
            if(total === 0) {
                showModal("BERHASIL", "Tidak ada data yang direstore.", "success");
                return;
            }

            if(data.submissions) {
              for (let sub of data.submissions) {
                const id = sub.id;
                const subData = {...sub};
                delete subData.id;
                await setDoc(doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar", id), subData);
                done++;
                setModalProgress((done/total)*100);
              }
            }
            if(data.attendanceLogs) {
               for (let item of data.attendanceLogs) {
                  const id = item.id;
                  const itemData = {...item};
                  delete itemData.id;
                  await setDoc(doc(db, "attendanceLogs", id), itemData);
                  done++;
                  setModalProgress((done/total)*100);
               }
            }
            if(data.confirmations) {
               for (let item of data.confirmations) {
                  const id = item.id;
                  const itemData = {...item};
                  delete itemData.id;
                  await setDoc(doc(db, "confirmations", id), itemData);
                  done++;
                  setModalProgress((done/total)*100);
               }
            }
            if(data.trashRecords) {
               for (let item of data.trashRecords) {
                  const id = item.id;
                  const itemData = {...item};
                  delete itemData.id;
                  await setDoc(doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar_trash", id), itemData);
                  done++;
                  setModalProgress((done/total)*100);
               }
            }
            showModal("BERHASIL", "Data berhasil dikembalikan dari backup JSON.", "success");
          }
        });
      } catch(err) {
        showModal("ERROR", "File JSON tidak valid.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowExportModal(false);
        setActiveRowActions(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const logout = () => {
    localStorage.removeItem("pgri_admin_pass");
    onLogout();
  };

  const toggleRegistration = async () => {
    setConfirmDialog({
      message: "Konfirmasi Status",
      description: `Ubah status pendaftaran menjadi ${isRegistrationOpen ? "TUTUP" : "BUKA"}?`,
      onConfirm: async () => {
        showModal("MEMPROSES", "Mengubah status pendaftaran...", "success");
        try {
          await setDoc(
            doc(db, "artifacts", CUSTOM_APP_ID, "public", "settings"),
            { isOpen: !isRegistrationOpen },
            { merge: true },
          );
          showModal("BERHASIL", "Status pendaftaran berhasil diubah.", "success");
        } catch (e: any) {
          showModal("ERROR", e.message, "error");
        }
      }
    });
  };

  const changeActiveEvent = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    try {
      await setDoc(
        doc(db, "artifacts", CUSTOM_APP_ID, "public", "settings"),
        { activeEventId: val },
        { merge: true },
      );
    } catch (e: any) {
      console.error(e);
      showModal("ERROR", e.message, "error");
    }
  };

  const flattenedRows = useMemo(() => {
    let rows = getFlattenedRows(submissions, sortConfig);
    
    if (filter) {
        rows = rows.filter(r => r.kategori === filter);
    }
    
    if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(r => 
           r.name.toLowerCase().includes(s) || 
           r.branch.toLowerCase().includes(s) || 
           r.kategori.toLowerCase().includes(s)
        );
    }
    
    return rows;
  }, [submissions, search, filter, sortConfig]);

  const isAllVisibleSelected =
    flattenedRows.length > 0 &&
    flattenedRows.every((r) =>
      selectedRows.has(`${r.id}|${r.i}|${r.kategori}`),
    );

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev.key === key ? { key, dir: prev.dir * -1 } : { key, dir: 1 },
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSet = new Set(selectedRows);
    if (e.target.checked) {
      flattenedRows.forEach((r) => newSet.add(`${r.id}|${r.i}|${r.kategori}`));
    } else {
      flattenedRows.forEach((r) =>
        newSet.delete(`${r.id}|${r.i}|${r.kategori}`),
      );
    }
    setSelectedRows(newSet);
  };

  const handleSelectRow = (val: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(val)) newSet.delete(val);
    else newSet.add(val);
    setSelectedRows(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    setConfirmDialog({
      message: "Hapus Data",
      description: `Hapus ${selectedRows.size} data terpilih?`,
      onConfirm: async () => {
        showModal("MEMPROSES", "Sedang menghapus data...", "success");
        try {
          const groups: Record<string, { cat: string; indices: number[] }> = {};
          selectedRows.forEach((s) => {
            const parts = s.split("|");
            const id = parts[0];
            const idx = parseInt(parts[1]);
            const cat = parts[2];
            if (!groups[id]) groups[id] = { cat, indices: [] };
            groups[id].indices.push(idx);
          });

          for (const docId in groups) {
            const group = groups[docId];
            const fullData = submissions.find((x) => x.id === docId);
            if (!fullData) continue;
            
            // Back up deleted lines individually
            for (const idx of group.indices) {
              const rowData = flattenedRows.find(r => r.id === docId && r.i === idx);
              if (rowData) {
                await setDoc(doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar_trash", `${docId}_${idx}_${Date.now()}`), {
                  deletedAt: new Date().toISOString(),
                  originalId: docId,
                  originalIndex: idx,
                  originalKategori: rowData.kategori || fullData.kategori,
                  originalBranch: rowData.branch || fullData.nama_cabang,
                  name: rowData.name,
                  jabatan: rowData.jabatan,
                  jk: rowData.jk,
                  wa: rowData.wa,
                  kaos: (fullData as any)[`p${idx}_kaos`] || "",
                  foto: rowData.foto || "",
                  komisi: rowData.kom,
                  room_override: (fullData as any)[`p${idx}_room_override`] || "",
                  fullData: fullData, // Entire snapshot of submission
                });
              }
            }

            let totalParticipantsInDoc = 0;
            for (let i = 1; i <= 4; i++)
              if ((fullData as any)[`p${i}_nama`]) totalParticipantsInDoc++;
            const isAllChecked = group.indices.length >= totalParticipantsInDoc;
            const isCollective = group.cat.includes("PESERTA");
            if (!isCollective || isAllChecked) {
              await deleteDoc(
                doc(
                  db,
                  "artifacts",
                  CUSTOM_APP_ID,
                  "public",
                  "data",
                  "pendaftar",
                  docId,
                ),
              );
        } else {
          const updateObj: any = {};
          group.indices.forEach((idx) => {
            updateObj[`p${idx}_nama`] = "";
            updateObj[`p${idx}_jabatan`] = "";
            updateObj[`p${idx}_jk`] = "";
            updateObj[`p${idx}_wa`] = "";
            updateObj[`p${idx}_kaos`] = "";
            updateObj[`p${idx}_foto`] = "";
            updateObj[`p${idx}_room_override`] = "";
            updateObj[`p${idx}_komisi`] = "";
          });
          await updateDoc(
            doc(
              db,
              "artifacts",
              CUSTOM_APP_ID,
              "public",
              "data",
              "pendaftar",
              docId,
            ),
            updateObj,
          );
        }
      }
          showModal("BERHASIL", "Data telah dihapus.", "success");
          setSelectedRows(new Set());
        } catch (e: any) {
          showModal("ERROR", e.message, "error");
        }
      }
    });
  };

  const updateRoom = async (id: string, idx: number, val: string) => {
    const updateVal = val.toUpperCase().trim();
    await updateDoc(
      doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar", id),
      { [`p${idx}_room_override`]: updateVal },
    );
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      showModal("MEMPROSES", "Menyimpan pembaruan data...", "success", true);
      const ref = doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar", editingRecord.id);
      
      const updateData: any = {};
      const { i } = editingRecord;
      
      updateData[`p${i}_nama`] = editForm.nama;
      updateData[`p${i}_jabatan`] = editForm.jabatan;
      updateData[`p${i}_jk`] = editForm.jk;
      updateData[`p${i}_komisi`] = editForm.komisi;
      updateData[`p${i}_wa`] = editForm.wa;
      updateData[`p${i}_kaos`] = editForm.kaos;
      if (editForm.foto) {
        updateData[`p${i}_foto`] = editForm.foto;
      }
      
      await updateDoc(ref, updateData);
      setEditingRecord(null);
      setModalProgress(100);
      showModal("BERHASIL", "Data berhasil diperbarui.", "success");
    } catch (e: any) {
      showModal("ERROR", "Gagal mengupdate data: " + e.message, "error");
    }
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showModal("UKURAN BESAR", "Maksimal ukuran foto adalah 20MB", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const targetWidth = 400,
          targetHeight = 533;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const imgAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;
        let drawWidth,
          drawHeight,
          offsetX = 0,
          offsetY = 0;
        if (imgAspect > targetAspect) {
          drawHeight = targetHeight;
          drawWidth = targetHeight * imgAspect;
          offsetX = -(drawWidth - targetWidth) / 2;
        } else {
          drawWidth = targetWidth;
          drawHeight = targetWidth / imgAspect;
          offsetY = -(drawHeight - targetHeight) / 2;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setEditForm((prev: any) => ({ ...prev, foto: base64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetToken = async (id: string) => {
    setConfirmDialog({
      message: "Reset Token",
      description: "Reset token revisi?",
      onConfirm: async () => {
        await updateDoc(
          doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar", id),
          {
            revision_token: Math.random()
              .toString(36)
              .substring(2, 8)
              .toUpperCase(),
          },
        );
      }
    });
  };

  const copyToken = (t: string) => {
    navigator.clipboard.writeText(t);
    showModal("BERHASIL", "Token disalin.", "success");
  };

  const downloadCardImg = async (r: FlatAdminRow) => {
    const d = await drawSingleCard(
      r.name,
      r.kategori.includes("PESERTA") ? r.branch : r.jabatan,
      r.foto,
      r.kategori,
      `${r.id}-${r.i}`
    );
    const link = document.createElement("a");
    link.href = d;
    link.download = `Konkerkab-1 ID Card ${r.name} ${getTimestamp()}.jpg`;
    link.click();
  };

  const handleWhatsApp = async (r: FlatAdminRow, waMsg: string) => {
    const waUrl = `https://wa.me/${formatWA(r.wa)}?text=${waMsg}`;
    // Buka tab / window baru di awal (synchronous) untuk menghindari pemblokiran Popup Blocker dari browser
    const newWindow = window.open('', '_blank');

    try {
      showModal("MEMPROSES", "Menyiapkan dan mengunduh gambar ID Card...", "success", true);
      await downloadCardImg(r);
      
      showModal("BERHASIL", "Gambar terunduh. Silakan lampirkan gambar secara manual di WhatsApp Web.", "success");
      
      if (newWindow) {
        newWindow.location.href = waUrl;
      } else {
        window.location.href = waUrl; // fallback jika pop-up terblokir penuh
      }
    } catch (e) {
      if (newWindow) newWindow.close();
      showModal("GAGAL", "Gagal memproses gambar WhatsApp.", "error");
    }
  };

  const handlePreview = async (r: FlatAdminRow) => {
    const d = await drawSingleCard(
      r.name,
      r.kategori.includes("PESERTA") ? r.branch : r.jabatan,
      r.foto,
      r.kategori,
      `${r.id}-${r.i}`
    );
    onViewPrevew(d);
  };

  return (
    <div
      className="space-y-6 fade-in"
      onClick={() => setActiveRowActions(null)}
    >
      <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="w-full xl:w-auto flex flex-wrap items-center justify-center xl:justify-start gap-3">
          <h2 className="text-xl font-black text-slate-800 uppercase w-full sm:w-auto text-center sm:text-left">
            Database
          </h2>
          <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full sm:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari data..."
              className="px-2 py-1 text-xs focus:outline-none bg-transparent w-full sm:w-36 font-bold"
            />
            <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-100 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
              {flattenedRows.length} DATA
            </span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded text-[10px] focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 font-bold uppercase cursor-pointer"
          >
            <option value="">SEMUA KATEGORI</option>
            <option value="PESERTA CABANG">PESERTA CABANG</option>
            <option value="PANITIA">PANITIA</option>
            <option value="PENINJAU">PENINJAU</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 xl:gap-4 w-full xl:w-auto">
          <div className="flex flex-wrap justify-center items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded-xl w-full md:w-auto">
            {selectedRows.size > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  className="h-9 px-3 flex items-center gap-2 rounded-lg bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 transition-all shadow-sm tooltip-container"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">
                    Hapus
                  </span>
                  <span className="w-5 h-5 flex items-center justify-center bg-rose-600 text-white text-[9px] font-black rounded-full leading-none">
                    {selectedRows.size}
                  </span>
                  <span className="tooltip-text" style={{ width: "auto" }}>
                    Hapus Terpilih
                  </span>
                </button>
              </>
            )}
            <button
              onClick={() =>
                printAllCardsA4(flattenedRows, showModal, setModalProgress)
              }
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all shadow-sm tooltip-container"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span className="tooltip-text" style={{ width: "auto" }}>
                Cetak Massal
              </span>
            </button>
            <button
              onClick={() => {
                setExportSubMenu("main");
                setShowExportModal(true);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm tooltip-container"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="tooltip-text" style={{ width: "auto" }}>
                Ekspor Data
              </span>
            </button>
            <button
              onClick={handleBackupJSON}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm tooltip-container"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12l-4 4-4-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4" />
              </svg>
              <span className="tooltip-text" style={{ width: "auto" }}>
                Backup Data as JSON
              </span>
            </button>
             <button
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 transition-all shadow-sm tooltip-container"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l-4-4-4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16" />
              </svg>
              <span className="tooltip-text" style={{ width: "auto" }}>
                Restore Data from JSON
              </span>
            </button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleRestoreJSON}
            />
            <button
              onClick={toggleRegistration}
              className={`h-9 px-3 flex items-center gap-2 rounded-lg border transition-all shadow-sm tooltip-container ${isRegistrationOpen ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {isRegistrationOpen ? "BUKA" : "TUTUP"}
              </span>
              <span className="tooltip-text" style={{ width: "auto" }}>
                Status Pendaftaran
              </span>
            </button>
            <div className="tooltip-container relative flex items-center">
              <select
                value={activeEventId}
                onChange={changeActiveEvent}
                className="h-9 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold uppercase outline-none shadow-sm cursor-pointer hover:border-slate-300 appearance-none max-w-[120px] md:max-w-[200px]"
              >
                <option value="">(Tutup Confirm)</option>
                {EVENT_AGENDA.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="tooltip-text" style={{ width: "auto" }}>
                Event Kuorum Aktif
              </span>
            </div>
          </div>
          <div className="flex justify-center items-center gap-1.5 p-1.5 w-full md:w-auto">
            <button
              onClick={() => setShowTrashModal(true)}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm tooltip-container relative"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {trashRecords && trashRecords.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {trashRecords.length}
                </span>
              )}
              <span className="tooltip-text" style={{ width: "auto" }}>
                Arsip Terhapus
              </span>
            </button>
            <button
              onClick={logout}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm tooltip-container"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="tooltip-text" style={{ width: "auto" }}>
              Keluar Admin
            </span>
          </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1500px]">
          <thead className="bg-slate-100 sticky top-0 z-30 border-b shadow-sm">
            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">
              <th className="px-4 py-4 w-10">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllVisibleSelected}
                  className="rounded text-red-600 focus:ring-0 cursor-pointer"
                />
              </th>
              <th
                className="px-4 py-4 w-12 sortable tooltip-container"
                onClick={() => handleSort("idx")}
              >
                No
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("ts")}
              >
                Waktu Daftar
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("kategori")}
              >
                Kategori
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("branch")}
              >
                Entitas
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th className="px-4 py-4">Foto</th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("name")}
              >
                Nama Peserta
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("jabatan")}
              >
                Jabatan
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("jk")}
              >
                JK
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("kom")}
              >
                Komisi
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("wa")}
              >
                WhatsApp
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("kaos")}
              >
                Kaos
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th
                className="px-4 py-4 sortable tooltip-container"
                onClick={() => handleSort("room")}
              >
                Kamar
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
              <th className="px-4 py-4">Surat Mandat</th>
              <th className="px-4 py-4 min-w-[150px]">Log Konfirmasi</th>
              <th className="px-4 py-4 min-w-[150px]">Log Presensi</th>
              <th
                className="px-4 py-4 w-40 sortable tooltip-container"
                onClick={() => handleSort("token")}
              >
                Token
                <span className="tooltip-text" style={{ width: "auto" }}>
                  Urutkan
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
            {flattenedRows.map((r, idx) => {
              const rowVal = `${r.id}|${r.i}|${r.kategori}`;
              const isActionActiveN = activeRowActions === `n_${r.id}_${r.i}`;
              const isActionActiveT = activeRowActions === `t_${r.id}_${r.i}`;
              const waMsg = encodeURIComponent(
                `Yth. \n${r.jk === "LAKI-LAKI" ? "Bapak" : "Ibu"} *${toProperCase(r.name)}*,\n\nBersama pesan ini, kami bermaksud melampirkan ID Card / Bukti Pendaftaran acara Konkerkab 1 milik ${r.jk === "LAKI-LAKI" ? "Bapak" : "Ibu"}.\n\nDemikian, harap maklum.\n\n------------\nAdmin Konkerkab 1\n------------`,
              );

              return (
                <tr
                  key={rowVal}
                  className="hover:bg-slate-50 border-b text-center"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowVal)}
                      onChange={() => handleSelectRow(rowVal)}
                      className="rounded text-red-600 focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-bold">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">
                    {r.ts}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-bold uppercase">
                      {r.kategori}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold uppercase text-center">
                    {r.branch}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <img
                      src={
                        r.foto ||
                        "https://via.placeholder.com/150x200?text=FOTO"
                      }
                      className="w-10 h-14 object-cover rounded border mx-auto"
                      alt=""
                    />
                  </td>

                  <td className="px-4 py-3 font-black text-slate-900 uppercase relative h-14 w-40">
                    <div
                      className="cursor-pointer hover:text-red-600 hover:underline transition-all flex items-center justify-center h-full w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveRowActions(
                          isActionActiveN ? null : `n_${r.id}_${r.i}`,
                        );
                      }}
                    >
                      <span>{r.name}</span>
                    </div>
                    {isActionActiveN && (
                      <div className="absolute inset-0 bg-white/95 z-40 flex flex-row items-center justify-evenly px-1 border-x border-slate-100 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsApp(r, waMsg);
                          }}
                          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200 transition-all hover:scale-110 tooltip-container cursor-pointer flex items-center justify-center"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "auto" }}
                          >
                            Kirim WhatsApp
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(r);
                          }}
                          className="p-1.5 bg-slate-50 text-slate-600 rounded-full border border-slate-200 transition-all hover:scale-110 tooltip-container cursor-pointer"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 010-.644C3.399 8.049 7.39 5 12 5s8.601 3.049 9.964 6.678c.07.186.07.388 0 .574-1.364 3.629-5.355 6.678-9.964 6.678s-8.601-3.049-9.964-6.678z"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "auto" }}
                          >
                            Pratinjau
                          </span>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              showModal("MEMPROSES", "Mengunduh PDF Bukti...", "success", true);
                              await downloadFullPDF(r.id, r.sD as any);
                              showModal("BERHASIL", "Berhasil diunduh", "success");
                            } catch(err: any) {
                              showModal("ERROR", err?.message || "Gagal mengunduh", "error");
                            }
                          }}
                          className="p-1.5 bg-red-50 text-red-600 rounded-full border border-red-100 transition-all hover:scale-110 tooltip-container cursor-pointer"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "auto" }}
                          >
                            Unduh PDF
                          </span>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              showModal("MEMPROSES", "Mengunduh Gambar...", "success", true);
                              await downloadCardImg(r);
                              showModal("BERHASIL", "Selesai.", "success");
                            } catch(err: any) {
                              showModal("ERROR", err?.message || "Gagal mengunduh", "error");
                            }
                          }}
                          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 transition-all hover:scale-110 tooltip-container cursor-pointer"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "auto" }}
                          >
                            Unduh Gambar
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRecord({ id: r.id, i: r.i, data: r.sD });
                            setEditForm({
                              kategori: r.sD.kategori || "",
                              nama_cabang: r.sD.nama_cabang || "",
                              nama: (r.sD as any)[`p${r.i}_nama`] || "",
                              jabatan: (r.sD as any)[`p${r.i}_jabatan`] || "",
                              jk: (r.sD as any)[`p${r.i}_jk`] || "",
                              komisi: (r.sD as any)[`p${r.i}_komisi`] || "",
                              wa: (r.sD as any)[`p${r.i}_wa`] || "",
                              kaos: (r.sD as any)[`p${r.i}_kaos`] || "",
                              foto: (r.sD as any)[`p${r.i}_foto`] || "",
                            });
                            setActiveRowActions(null);
                          }}
                          className="p-1.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100 transition-all hover:scale-110 tooltip-container cursor-pointer"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "max-content", minWidth: "100px" }}
                          >
                            Revisi Satuan
                          </span>
                        </button>
                        {r.kategori === "PESERTA CABANG" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEntry(r.id, r.i);
                            }}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 transition-all hover:scale-110 tooltip-container cursor-pointer"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span
                              className="tooltip-text"
                              style={{ width: "max-content", minWidth: "120px" }}
                            >
                              Revisi Kolektif/Form
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 uppercase text-[10px] text-slate-500 text-center">
                    {r.jabatan}
                  </td>
                  <td className="px-4 py-3 font-bold text-center">
                    {r.jk === "LAKI-LAKI" ? "L" : "P"}
                  </td>
                  <td className="px-4 py-3 font-black text-blue-600 text-[10px]">
                    {r.kom}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`https://wa.me/${formatWA(r.wa)}?text=${waMsg}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs hover:text-emerald-600 hover:underline cursor-pointer tooltip-container"
                    >
                      {r.wa}
                      <span className="tooltip-text" style={{ width: "auto" }}>
                        Pesan WA
                      </span>
                    </a>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 text-center">
                    {(r.sD as any)[`p${r.i}_kaos`] || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="group flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 hover:border-red-400 hover:bg-red-50 transition-all cursor-pointer tooltip-container">
                      <span
                        contentEditable
                        onBlur={(e) =>
                          updateRoom(r.id, r.i, e.currentTarget.innerText)
                        }
                        suppressContentEditableWarning
                        className={`font-black ${r.room === "X" ? "text-slate-300" : "text-slate-900"} outline-none min-w-[15px] inline-block leading-none`}
                      >
                        {r.room}
                      </span>
                      <svg
                        className="h-2.5 w-2.5 text-slate-300 group-hover:text-red-400 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      <span className="tooltip-text">Edit Kamar</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.mandat && r.mandat.startsWith("http") ? (
                      <a
                        href={r.mandat}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors tooltip-container"
                      >
                        <svg
                          className="h-4 w-4 inline"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        <span
                          className="tooltip-text"
                          style={{ width: "auto" }}
                        >
                          Buka Tautan
                        </span>
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[150px]">
                    <div className="grid grid-cols-5 gap-1.5 w-max mx-auto">
                      {EVENT_AGENDA.map((event, index) => {
                        const confRecord = confirmations.find(
                          (conf) => conf.participantId === `${r.id}-${r.i}` && conf.eventId === event.id
                        );
                        const hasConfirmed = !!confRecord;
                        return (
                          <div
                            key={`conf-${event.id}`}
                            onClick={async () => {
                              if (hasConfirmed && confRecord?.id) {
                                setConfirmDialog({
                                  message: "Reset Konfirmasi",
                                  description: `Batalkan konfirmasi ${event.name} untuk ${r.name}?`,
                                  onConfirm: async () => {
                                    try {
                                      await deleteDoc(doc(db, "confirmations", confRecord.id));
                                    } catch (error) {
                                      console.error(error);
                                      showModal("GAGAL", "Gagal membatalkan konfirmasi.", "error");
                                    }
                                  }
                                });
                              }
                            }}
                            className={`relative group flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-black shadow-sm transition-all duration-300 ${hasConfirmed ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:scale-105' : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-default'}`}
                          >
                            {index + 1}
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:-translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={hasConfirmed ? "text-indigo-400" : "text-slate-400"}>{event.name}</span>
                                <span className="text-[10px] font-medium text-slate-300">{hasConfirmed ? '(Klik untuk Batal)' : '(Belum Konfirmasi)'}</span>
                              </div>
                              {/* Tail triangle */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[150px]">
                    <div className="grid grid-cols-5 gap-1.5 w-max mx-auto">
                      {EVENT_AGENDA.map((event, index) => {
                        const logRecord = attendanceLogs.find(
                          (log) => log.participantId === `${r.id}-${r.i}` && log.eventId === event.id
                        );
                        const hasAttended = !!logRecord;
                        return (
                          <div
                            key={event.id}
                            onClick={async () => {
                              if (hasAttended && logRecord?.id) {
                                setConfirmDialog({
                                  message: "Reset Presensi",
                                  description: `Reset presensi ${event.name} untuk ${r.name}?`,
                                  onConfirm: async () => {
                                    try {
                                      await deleteDoc(doc(db, "attendanceLogs", logRecord.id));
                                    } catch (error) {
                                      console.error(error);
                                      showModal("GAGAL", "Gagal mereset presensi.", "error");
                                    }
                                  }
                                });
                              }
                            }}
                            className={`relative group flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-black shadow-sm transition-all duration-300 ${hasAttended ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:scale-105' : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-default'}`}
                          >
                            {index + 1}
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:-translate-y-1 transition-all duration-300 shadow-xl pointer-events-none z-[60]">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={hasAttended ? "text-emerald-400" : "text-slate-400"}>{event.name}</span>
                                <span className="text-[10px] font-medium text-slate-300">{hasAttended ? '(Klik untuk Reset)' : '(Belum Hadir)'}</span>
                              </div>
                              {/* Tail triangle */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-bold uppercase relative h-14 text-center w-40">
                    <div
                      className="cursor-pointer hover:text-red-600 hover:underline transition-all flex items-center justify-center h-full w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveRowActions(
                          isActionActiveT ? null : `t_${r.id}_${r.i}`,
                        );
                      }}
                    >
                      <span className="text-slate-300">{r.token}</span>
                    </div>
                    {isActionActiveT && (
                      <div className="absolute inset-0 bg-white/95 z-40 flex flex-row items-center justify-center gap-2 border-x border-slate-100 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToken(r.token);
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100 transition-all hover:scale-110 tooltip-container cursor-pointer"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "auto" }}
                          >
                            Salin Token
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resetToken(r.id);
                          }}
                          className="p-2 bg-amber-50 text-amber-600 rounded-full border border-amber-100 transition-all hover:scale-110 tooltip-container cursor-pointer"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "auto" }}
                          >
                            Reset Token
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const prefix =
                              r.jk === "LAKI-LAKI" ? "Bapak" : "Ibu";
                            const message = `Yth. \n${prefix} *${toProperCase(r.name)}*,\n\nBerikut kode token revisi pendaftaran PGRI *${toProperCase((r.branch || "").replace("PENINJAU - ", ""))}*:\n*${r.token}*\n\n------------\nAdmin Konkerkab-1\n------------`;
                            window.open(
                              `https://wa.me/${formatWA(r.wa)}?text=${encodeURIComponent(message)}`,
                            );
                          }}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 transition-all hover:scale-110 tooltip-container cursor-pointer"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          <span
                            className="tooltip-text"
                            style={{ width: "auto" }}
                          >
                            Token WA
                          </span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-slate-800 border border-white/20">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            {exportSubMenu === "main" ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Ekspor Data
                  </h2>
                  <p className="text-slate-400 text-[8px] font-bold uppercase mt-1 tracking-widest">
                    Pilih format unduhan
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3 w-full">
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeExcelExport(flattenedRows, attendanceLogs, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Database Excel</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeRoomMappingPDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Pemetaan Kamar</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeRoomSortedPDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Pengelompokan Kamar</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeTshirtRecapPDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Rekap Ukuran Kaos</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeTshirtReceiptPDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Tanda Terima Kaos</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeMasterKomisiPDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M6 16h.01"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Master Komisi</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeSidangKomisiPDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Peserta Sidang</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeAttendancePDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Daftar Hadir Komisi</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executePlenoAttendancePDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Daftar Hadir Pleno</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      executeMealCouponsPDF(flattenedRows, showModal);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Kupon Makan</span>
                  </div>
                  <div
                    onClick={() => {
                      setExportSubMenu("kuorum");
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="tooltip-text">Laporan Kuorum</span>
                  </div>
                  <div
                    onClick={() => {
                      setExportSubMenu("scan");
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="tooltip-text">Hasil Scan Presensi</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      printAllCardsPVC(flattenedRows, showModal, setModalProgress);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <span className="tooltip-text">ID Card PVC (Terbalik)</span>
                  </div>
                  <div
                    onClick={() => {
                      setShowExportModal(false);
                      printAllCardsPVCNormal(flattenedRows, showModal, setModalProgress);
                    }}
                    className="export-option-card group tooltip-container"
                  >
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <span className="tooltip-text">ID Card (Normal/Rapat)</span>
                  </div>
                </div>
              </>
            ) : exportSubMenu === "scan" ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Hasil Scan Presensi
                  </h2>
                  <p className="text-slate-400 text-[8px] font-bold uppercase mt-1 tracking-widest">
                    Pilih rekap kegiatan
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() => {
                      const hasData = attendanceLogs.length > 0;
                      if (!hasData) {
                        showModal("BELUM ADA DATA", "Belum ada presensi yang masuk.", "error");
                        return;
                      }
                      setShowExportModal(false);
                      executeScannedResultPDF(flattenedRows, attendanceLogs, showModal);
                      showModal("BERHASIL", "Hasil scan semua kegiatan sedang diproses.", "success");
                    }}
                    className={`col-span-2 group relative border font-bold text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${attendanceLogs.length > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_4px_0_0_#34d399] active:shadow-[0_0px_0_0_#34d399] active:translate-y-1 hover:brightness-95 cursor-pointer" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    Semua Kegiatan (Gabung)
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 transition-opacity group-hover:opacity-100 z-10">
                      <span className="block px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-md font-normal">
                        {attendanceLogs.length > 0 ? "Unduh Semua Kegiatan" : "Belum Ada Data Scan Masuk"}
                      </span>
                      <div className="w-2 h-2 mx-auto rotate-45 -mt-1 bg-slate-800"></div>
                    </div>
                  </button>
                  {EVENT_AGENDA.map((ev) => {
                    const isKomisi = ev.id === "komisi";
                    const hasData = attendanceLogs.some(l => l.eventId === ev.id);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => {
                          if (!hasData && !isKomisi) {
                            showModal("BELUM ADA DATA", `Belum ada data scan untuk ${ev.name}.`, "error");
                            return;
                          }
                          if (isKomisi) {
                            setExportSubMenu("scan_komisi");
                            return;
                          }
                          setShowExportModal(false);
                          executeScannedResultPDF(flattenedRows, attendanceLogs, showModal, ev.id);
                          showModal("BERHASIL", `Hasil scan ${ev.name} sedang diproses.`, "success");
                        }}
                        className={`group relative border font-bold text-[11px] py-2.5 px-2 rounded-xl transition-all flex items-center justify-center text-center ${hasData || isKomisi ? "border-slate-200 bg-slate-50 text-slate-700 shadow-[0_4px_0_0_#cbd5e1] active:shadow-[0_0px_0_0_#cbd5e1] active:translate-y-1 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-[0_4px_0_0_#34d399] cursor-pointer" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"}`}
                      >
                        {ev.name}
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 transition-opacity group-hover:opacity-100 z-10">
                          <span className="block px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-md font-normal">
                            {hasData || isKomisi ? `Unduh ${ev.name}` : "Belum Ada Data Scan"}
                          </span>
                          <div className="w-2 h-2 mx-auto rotate-45 -mt-1 bg-slate-800"></div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setExportSubMenu("main")}
                    className="text-xs text-slate-400 hover:text-slate-700 font-medium transition flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                  </button>
                </div>
              </>
            ) : exportSubMenu === "scan_komisi" ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Hasil Scan Sidang Komisi
                  </h2>
                  <p className="text-slate-400 text-[8px] font-bold uppercase mt-1 tracking-widest">
                    Pilih komisi
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {["KOMISI A", "KOMISI B", "KOMISI C", "KOMISI D"].map((komName) => {
                    const hasData = attendanceLogs.some(l => l.eventId === "komisi" && flattenedRows.find(r => `${r.id}-${r.i}` === l.participantId)?.kom === komName);
                    return (
                      <button
                        key={komName}
                        onClick={() => {
                          if (!hasData) {
                            showModal("BELUM ADA DATA", `Belum ada data scan untuk ${komName}.`, "error");
                            return;
                          }
                          setShowExportModal(false);
                          executeScannedResultPDF(flattenedRows, attendanceLogs, showModal, "komisi", komName);
                          showModal("BERHASIL", `Hasil scan ${komName} sedang diproses.`, "success");
                        }}
                        className={`group relative border font-bold text-[11px] py-2.5 px-2 rounded-xl transition-all flex items-center justify-center text-center ${hasData ? "border-slate-200 bg-slate-50 text-slate-700 shadow-[0_4px_0_0_#cbd5e1] active:shadow-[0_0px_0_0_#cbd5e1] active:translate-y-1 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-[0_4px_0_0_#34d399] cursor-pointer" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"}`}
                      >
                        {komName}
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 transition-opacity group-hover:opacity-100 z-10">
                          <span className="block px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-md font-normal">
                            {hasData ? `Unduh ${komName}` : "Belum Ada Data Scan"}
                          </span>
                          <div className="w-2 h-2 mx-auto rotate-45 -mt-1 bg-slate-800"></div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setExportSubMenu("scan")}
                    className="text-xs text-slate-400 hover:text-slate-700 font-medium transition flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                  </button>
                </div>
              </>
            ) : exportSubMenu === "kuorum" ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Laporan Kuorum
                  </h2>
                  <p className="text-slate-400 text-[8px] font-bold uppercase mt-1 tracking-widest">
                    Pilih kegiatan sidang
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {EVENT_AGENDA.map((ev) => {
                    const isKomisi = ev.id === "komisi";
                    const hasData = confirmations.some(c => c.eventId === ev.id) || attendanceLogs.some(l => l.eventId === ev.id);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => {
                          if (!hasData && !isKomisi) {
                            showModal("BELUM ADA DATA", `Belum ada isian masuk untuk ${ev.name}.`, "error");
                            return;
                          }
                          if (isKomisi) {
                            setExportSubMenu("kuorum_komisi");
                            return;
                          }
                          setShowExportModal(false);
                          executeKuorumPDF(flattenedRows, attendanceLogs, confirmations, ev.id);
                          showModal("BERHASIL", `Laporan Kuorum ${ev.name} berhasil diunduh.`, "success");
                        }}
                        className={`group relative border font-bold text-[11px] py-2.5 px-2 rounded-xl transition-all flex items-center justify-center text-center ${hasData || isKomisi ? "border-slate-200 bg-slate-50 text-slate-700 shadow-[0_4px_0_0_#cbd5e1] active:shadow-[0_0px_0_0_#cbd5e1] active:translate-y-1 hover:border-indigo-200 hover:text-indigo-700 hover:bg-indigo-50 hover:shadow-[0_4px_0_0_#6366f1] cursor-pointer" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"}`}
                      >
                        {ev.name}
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 transition-opacity group-hover:opacity-100 z-10">
                          <span className="block px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-md font-normal">
                            {hasData || isKomisi ? `Unduh Kuorum ${ev.name}` : "Belum Ada Isian Konfirmasi/Scan"}
                          </span>
                          <div className="w-2 h-2 mx-auto rotate-45 -mt-1 bg-slate-800"></div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setExportSubMenu("main")}
                    className="text-xs text-slate-400 hover:text-slate-700 font-medium transition flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                  </button>
                </div>
              </>
            ) : exportSubMenu === "kuorum_komisi" ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Laporan Kuorum Sidang Komisi
                  </h2>
                  <p className="text-slate-400 text-[8px] font-bold uppercase mt-1 tracking-widest">
                    Pilih komisi
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {["KOMISI A", "KOMISI B", "KOMISI C", "KOMISI D"].map((komName) => {
                    const hasData = confirmations.some(c => c.eventId === "komisi" && flattenedRows.find(r => `${r.id}-${r.i}` === c.participantId)?.kom === komName) || attendanceLogs.some(l => l.eventId === "komisi" && flattenedRows.find(r => `${r.id}-${r.i}` === l.participantId)?.kom === komName);
                    return (
                      <button
                        key={komName}
                        onClick={() => {
                          if (!hasData) {
                            showModal("BELUM ADA DATA", `Belum ada isian masuk untuk ${komName}.`, "error");
                            return;
                          }
                          setShowExportModal(false);
                          executeKuorumPDF(flattenedRows, attendanceLogs, confirmations, "komisi", komName);
                          showModal("BERHASIL", `Laporan Kuorum ${komName} berhasil diunduh.`, "success");
                        }}
                        className={`group relative border font-bold text-[11px] py-2.5 px-2 rounded-xl transition-all flex items-center justify-center text-center ${hasData ? "border-slate-200 bg-slate-50 text-slate-700 shadow-[0_4px_0_0_#cbd5e1] active:shadow-[0_0px_0_0_#cbd5e1] active:translate-y-1 hover:border-indigo-200 hover:text-indigo-700 hover:bg-indigo-50 hover:shadow-[0_4px_0_0_#6366f1] cursor-pointer" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"}`}
                      >
                        {komName}
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 transition-opacity group-hover:opacity-100 z-10">
                          <span className="block px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-md font-normal">
                            {hasData ? `Unduh Kuorum ${komName}` : "Belum Ada Isian Konfirmasi/Scan"}
                          </span>
                          <div className="w-2 h-2 mx-auto rotate-45 -mt-1 bg-slate-800"></div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setExportSubMenu("kuorum")}
                    className="text-xs text-slate-400 hover:text-slate-700 font-medium transition flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Edit Data Modal */}
      {editingRecord && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[800px] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 shrink-0 flex items-center justify-between text-white">
              <h3 className="font-black text-lg">REVISI SATUAN (QUICK EDIT)</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors relative group"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div className="absolute top-full right-0 mt-2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[60]">
                   Batal
                </div>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Kolom Kiri: Foto */}
                <div className="md:col-span-1 flex flex-col items-center gap-4">
                  <label className="text-xs font-bold text-slate-500 uppercase w-full text-center">
                    Ganti Foto
                  </label>
                  <div className="relative group cursor-pointer w-40 h-52 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300 shadow-sm transition-all hover:border-orange-500 flex-shrink-0">
                    {editForm.foto ? (
                      <img src={editForm.foto} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-slate-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white">
                      <span className="text-xs font-bold bg-orange-600 px-3 py-1 rounded-full uppercase">Pilih Foto</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleEditPhotoChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-center uppercase px-4 leading-relaxed font-semibold">
                    Klik gambar untuk mengganti foto. Maks 20MB.
                  </p>
                </div>

                {/* Kolom Kanan: Identitas Lengkap */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nama Peserta</label>
                    <input 
                      type="text" 
                      value={editForm.nama} 
                      onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 uppercase focus:border-orange-500 focus:outline-none bg-white shadow-sm"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Jabatan/Utusan</label>
                    <input 
                      type="text" 
                      value={editForm.jabatan} 
                      onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 uppercase focus:border-orange-500 focus:outline-none bg-white shadow-sm"
                      placeholder="Contoh: KETUA PC"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Jenis Kelamin</label>
                    <select 
                      value={editForm.jk} 
                      onChange={(e) => setEditForm({ ...editForm, jk: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 uppercase focus:border-orange-500 focus:outline-none bg-white shadow-sm cursor-pointer"
                    >
                      <option value="">PILIH</option>
                      <option value="LAKI-LAKI">LAKI-LAKI</option>
                      <option value="PEREMPUAN">PEREMPUAN</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Ukuran Kaos</label>
                    <select 
                      value={editForm.kaos} 
                      onChange={(e) => setEditForm({ ...editForm, kaos: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 uppercase focus:border-orange-500 focus:outline-none bg-white shadow-sm cursor-pointer"
                    >
                      <option value="">PILIH</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                      <option value="XXXL">XXXL</option>
                      <option value="XXXXL">XXXXL</option>
                      <option value="XXXXXL">XXXXXL</option>
                    </select>
                  </div>

                  {editForm.kategori === "PESERTA CABANG" && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Komisi</label>
                    <select 
                      value={editForm.komisi} 
                      onChange={(e) => setEditForm({ ...editForm, komisi: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 uppercase focus:border-orange-500 focus:outline-none bg-white shadow-sm cursor-pointer"
                    >
                      <option value="">PILIH</option>
                      <option value="KOMISI A">KOMISI A</option>
                      <option value="KOMISI B">KOMISI B</option>
                      <option value="KOMISI C">KOMISI C</option>
                      <option value="KOMISI D">KOMISI D</option>
                    </select>
                  </div>
                  )}
                  
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">No WhatsApp Aktif</label>
                    <input 
                      type="text" 
                      value={editForm.wa} 
                      onChange={(e) => setEditForm({ ...editForm, wa: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:border-orange-500 focus:outline-none bg-white shadow-sm"
                      placeholder="08..."
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-6 py-2.5 font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors uppercase text-xs tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-8 py-2.5 font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 shadow-md transition-all active:scale-95 uppercase text-xs tracking-wider cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrashModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Arsip Terhapus ({trashRecords.length})
              </h3>
              <button
                onClick={() => setShowTrashModal(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-0 bg-slate-50 overflow-y-auto grow">
              {trashRecords.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-16 h-16 mb-4 opacity-50 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <p className="font-bold">Tempat sampah kosong.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {trashRecords.map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
                      <div>
                        <p className="font-black text-slate-800 text-sm">{t.name || "Tanpa Nama"}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                          {t.originalKategori} {t.originalBranch && `• ${t.originalBranch}`}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">Dihapus pada: {new Date(t.deletedAt).toLocaleString('id-ID')}</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            showModal("MEMPROSES", "Mengembalikan data...", "success");
                            const docRef = doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar", t.originalId);
                            const updateData: any = {
                              [`p${t.originalIndex}_nama`]: t.name || "",
                              [`p${t.originalIndex}_jabatan`]: t.jabatan || "",
                              [`p${t.originalIndex}_jk`]: t.jk || "",
                              [`p${t.originalIndex}_wa`]: t.wa || "",
                              [`p${t.originalIndex}_kaos`]: t.kaos || "",
                              [`p${t.originalIndex}_foto`]: t.foto || "",
                              [`p${t.originalIndex}_room_override`]: t.room_override || "",
                              [`p${t.originalIndex}_komisi`]: t.komisi || "",
                            };

                            let needToSetDoc = false;
                            try {
                              await updateDoc(docRef, updateData);
                            } catch (e: any) {
                              needToSetDoc = true;
                            }

                            if (needToSetDoc) {
                              // If doc couldn't be updated, fall back to setting the whole fullData again
                              await setDoc(docRef, t.fullData);
                            }

                            await deleteDoc(doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar_trash", t.id));
                            showModal("BERHASIL", "Data berhasil dikembalikan.", "success");
                          } catch (e: any) {
                            showModal("GAGAL", e.message, "error");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-bold uppercase transition-colors shrink-0 tooltip-container"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restore
                        <span className="tooltip-text" style={{ width: "auto" }}>
                          Kembalikan Data
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowTrashModal(false)}
                className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors uppercase text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden scale-in-center animate-in zoom-in-95 duration-200">
             <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmDialog.message}</h3>
                 {confirmDialog.description && <p className="text-sm text-slate-500 mb-6">{confirmDialog.description}</p>}
                 
                 <div className="flex gap-3 justify-center mt-2">
                     <button
                        onClick={() => setConfirmDialog(null)}
                        className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-sm flex-1"
                     >
                         Batal
                     </button>
                     <button
                        onClick={() => {
                            confirmDialog.onConfirm();
                            setConfirmDialog(null);
                        }}
                        className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer text-sm flex-1"
                     >
                         Ya, Lanjutkan
                     </button>
                 </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
