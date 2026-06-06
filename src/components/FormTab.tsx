import React, { useState, useEffect } from "react";
import { SubmissionData } from "../types";
import { BRANCHES, ADMIN_WA, CUSTOM_APP_ID } from "../lib/constants";
import { db } from "../lib/firebase";
import { addDoc, collection, updateDoc, doc } from "firebase/firestore";
import { downloadFullPDF } from "../lib/pdf-utils";

interface Props {
  submissions: SubmissionData[];
  isRegistrationOpen: boolean;
  initialCategory?: string;
  showModal: (
    title: string,
    message: string,
    type: "success" | "error",
  ) => void;
  onSaveSuccess: () => void;
  onCancel: () => void;
  onChangeCategory: () => void;
}

export function FormTab({
  submissions,
  isRegistrationOpen,
  initialCategory,
  showModal,
  onSaveSuccess,
  onCancel,
  onChangeCategory,
}: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubmissionData>({
    kategori: initialCategory || "",
  });

  // For Token validation
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [inputToken, setInputToken] = useState("");
  const [pendingRevisionData, setPendingRevisionData] =
    useState<SubmissionData | null>(null);

  useEffect(() => {
    if (initialCategory && !formData.kategori) {
      setFormData((prev) => ({ ...prev, kategori: initialCategory }));
    }
  }, [initialCategory]);

  if (!isRegistrationOpen) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white p-10 rounded-2xl border shadow-xl space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-4xl border border-red-100">
            🕒
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase">
            Pendaftaran Ditutup
          </h2>
          <p className="text-slate-500 text-sm uppercase font-bold">
            Masa pendaftaran berakhir.
          </p>
        </div>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    let { name, value } = e.target;
    if (
      !name.includes("wa") &&
      !name.includes("link") &&
      name !== "revision_token"
    ) {
      value = value.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    prefix: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showModal("ERROR", "Hanya file gambar yang diizinkan.", "error");
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
        setFormData((prev) => ({ ...prev, [`${prefix}foto`]: base64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isPeserta = formData.kategori === "PESERTA CABANG";
  const totalSteps = isPeserta ? 6 : 2;

  const moveStep = (dir: number) => {
    if (!formData.kategori && dir === 1)
      return showModal("ERROR", "Pilih kategori pendaftaran.", "error");

    if (dir === 1) {
      // Validation
      if (currentStep === 1 && isPeserta && !formData.nama_cabang) {
        return showModal("ERROR", "Pilih Cabang.", "error");
      }
      if (
        currentStep > 1 &&
        currentStep < 6 &&
        formData.kategori !== "PENINJAU"
      ) {
        const idx = currentStep - 1;
        const requiredFields = ["nama", "jabatan", "jk", "wa", "kaos"];
        if (isPeserta) requiredFields.push("komisi");

        for (const field of requiredFields) {
          if (!(formData as any)[`p${idx}_${field}`]) {
            return showModal(
              "ERROR",
              `Lengkapi semua field untuk Delegasi ${idx}.`,
              "error",
            );
          }
        }
        if (!(formData as any)[`p${idx}_foto`]) {
          return showModal(
            "FOTO WAJIB",
            "Silakan unggah foto delegasi/panitia.",
            "error",
          );
        }
      }
    }

    if (currentStep + dir > totalSteps) {
      submitForm();
    } else {
      setCurrentStep((prev) => prev + dir);
    }
  };

  const submitForm = async () => {
    const finalData = { ...formData };
    finalData.waktu_simpan = new Date().toLocaleString("id-ID");

    if (finalData.kategori === "PESERTA CABANG") {
      const coms = [
        finalData.p1_komisi,
        finalData.p2_komisi,
        finalData.p3_komisi,
        finalData.p4_komisi,
      ];
      const uniqueComs = new Set(coms.filter((c) => c));
      if (uniqueComs.size < 4) {
        return showModal(
          "KOMISI DUPLIKAT",
          "Setiap delegasi harus memilih komisi yang berbeda (A, B, C, D).",
          "error",
        );
      }
    } else {
      for (let i = 2; i <= 4; i++) {
        delete (finalData as any)[`p${i}_nama`];
        delete (finalData as any)[`p${i}_jabatan`];
        delete (finalData as any)[`p${i}_jk`];
        delete (finalData as any)[`p${i}_wa`];
        delete (finalData as any)[`p${i}_kaos`];
        delete (finalData as any)[`p${i}_foto`];
        delete (finalData as any)[`p${i}_komisi`];
      }
      if (finalData.kategori === "PANITIA") finalData.nama_cabang = "PANITIA";
      else if (finalData.kategori === "PENINJAU")
        finalData.nama_cabang = "PENINJAU - " + (finalData.p1_jabatan || "");
    }

    showModal("MEMPROSES", "Menyimpan data pendaftaran...", "success");
    try {
      let docId = editingDocId;
      if (editingDocId) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            CUSTOM_APP_ID,
            "public",
            "data",
            "pendaftar",
            editingDocId,
          ),
          finalData as any,
        );
      } else {
        finalData.revision_token = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        const ref = await addDoc(
          collection(
            db,
            "artifacts",
            CUSTOM_APP_ID,
            "public",
            "data",
            "pendaftar",
          ),
          finalData as any,
        );
        docId = ref.id;
      }

      await downloadFullPDF(docId!, finalData);
      showModal(
        "BERHASIL",
        "Pendaftaran sukses disimpan. ID Card diunduh.",
        "success",
      );
      onSaveSuccess();
    } catch (e: any) {
      showModal("ERROR", e.message, "error");
    }
  };

  const handleBranchSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, nama_cabang: val }));
    if (isRevisionMode && val) {
      const match = submissions.find(
        (s) => (s.nama_cabang || "").toUpperCase() === val,
      );
      if (match) {
        setPendingRevisionData(match);
        setShowTokenModal(true);
      }
    }
  };

  const verifyToken = () => {
    if (inputToken.toUpperCase() === pendingRevisionData?.revision_token) {
      setEditingDocId(pendingRevisionData.id || null);
      setFormData({ ...pendingRevisionData });
      setShowTokenModal(false);
      showModal("BERHASIL", "Data siap direvisi.", "success");
    } else {
      showModal("ERROR", "Token salah.", "error");
    }
  };

  // Calculate options for branch dropdown based on revision mode
  const registeredBranches = new Set(
    submissions
      .filter((s) => s.kategori?.toUpperCase() === "PESERTA CABANG")
      .map((s) => s.nama_cabang?.toUpperCase()),
  );

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6 fade-in">
          <div className="border-b border-slate-100 pb-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-400 text-sm">
              1
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">
                Informasi Dasar
              </h2>
              <p className="text-[11px] mt-1 font-bold tracking-wider text-slate-500 uppercase">
                Lengkapi detail entitas pendaftar
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">
                Kategori Terpilih
              </label>
              <div className="font-bold text-slate-900 uppercase">
                {formData.kategori || "-- BELUM MEMILIH --"}
              </div>
            </div>
            {!editingDocId && (
              <button
                type="button"
                onClick={onChangeCategory}
                className="text-[10px] font-black text-red-600 uppercase bg-white px-3 py-1.5 rounded border border-red-100 shadow-sm hover:bg-red-50 transition-all cursor-pointer"
              >
                Ganti Kategori
              </button>
            )}
          </div>

          {isPeserta && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                Pilih Cabang
              </label>
              <select
                name="nama_cabang"
                value={formData.nama_cabang || ""}
                onChange={handleBranchSelect}
                className="w-full px-4 py-3 rounded border border-slate-300 bg-slate-50 text-sm font-semibold uppercase focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="">-- PILIH CABANG --</option>
                {BRANCHES.map((b) => {
                  const isR = registeredBranches.has(b.toUpperCase());
                  if ((isRevisionMode && isR) || (!isRevisionMode && !isR)) {
                    return (
                      <option key={b} value={b}>
                        {b.toUpperCase()}
                      </option>
                    );
                  }
                  return null;
                })}
              </select>
            </div>
          )}

          <div className="text-right">
            {!editingDocId && isPeserta && !isRevisionMode && (
              <button
                type="button"
                onClick={() => setIsRevisionMode(true)}
                className="text-[10px] font-bold text-red-600 hover:text-red-800 transition-colors uppercase cursor-pointer"
              >
                Revisi Pendaftaran
              </button>
            )}
            {isRevisionMode && (
              <button
                type="button"
                onClick={() => {
                  setIsRevisionMode(false);
                  setFormData({ kategori: formData.kategori });
                }}
                className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer"
              >
                Batal Revisi
              </button>
            )}
          </div>
        </div>
      );
    }

    if (currentStep > 1 && currentStep <= (isPeserta ? 5 : 2)) {
      const idx = currentStep - 1;
      const pre = `p${idx}_`;
      const val = (k: string) => (formData as any)[pre + k] || "";
      const kat = formData.kategori;

      let title = `Delegasi ${idx}${isPeserta && formData.nama_cabang ? " - " + formData.nama_cabang : ""}`;
      let labelJabatan = "Jabatan";
      let placeholderJabatan = "Pilih Jabatan";

      if (kat === "PANITIA") {
        title = "Data Personal Panitia";
        labelJabatan = "Jabatan KEPANITIAAN";
        placeholderJabatan = "Contoh: Seksi Acara";
      } else if (kat === "PENINJAU") {
        title = "Data Personal Peninjau";
        labelJabatan = "UTUSAN DARI";
        placeholderJabatan = "Contoh: PGRI Provinsi Banten";
      }

      return (
        <div className="space-y-6 fade-in">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="w-10 h-10 gradient-bg text-white rounded flex items-center justify-center font-bold text-sm">
              {currentStep}
            </div>
            <h2 className="text-xl font-bold uppercase">{title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Nama Lengkap (Tanpa Gelar)
              </label>
              <input
                type="text"
                name={`${pre}nama`}
                value={val("nama")}
                onChange={handleChange}
                required
                placeholder="Contoh: Edi Brata"
                className="w-full px-4 py-3 border rounded font-bold uppercase outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">
                {labelJabatan}
              </label>
              {isPeserta ? (
                <select
                  name={`${pre}jabatan`}
                  value={val("jabatan")}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border rounded font-bold uppercase outline-none focus:ring-1 focus:ring-red-400"
                >
                  <option value="">
                    -- {placeholderJabatan.toUpperCase()} --
                  </option>
                  <option value="KETUA">KETUA</option>
                  <option value="WAKIL KETUA">WAKIL KETUA</option>
                  <option value="SEKRETARIS">SEKRETARIS</option>
                  <option value="WAKIL SEKRETARIS">WAKIL SEKRETARIS</option>
                  <option value="BENDAHARA">BENDAHARA</option>
                  <option value="KETUA SEKSI">KETUA SEKSI</option>
                </select>
              ) : (
                <input
                  type="text"
                  name={`${pre}jabatan`}
                  value={val("jabatan")}
                  onChange={handleChange}
                  required
                  placeholder={placeholderJabatan}
                  className="w-full px-4 py-3 border rounded font-bold uppercase outline-none focus:ring-1 focus:ring-red-400"
                />
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Jenis Kelamin
              </label>
              <select
                name={`${pre}jk`}
                value={val("jk")}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border rounded font-bold uppercase outline-none focus:ring-1 focus:ring-red-400"
              >
                <option value="">-- PILIH --</option>
                <option value="LAKI-LAKI">LAKI-LAKI</option>
                <option value="PEREMPUAN">PEREMPUAN</option>
              </select>
            </div>
            {isPeserta && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Pilih Komisi
                </label>
                <select
                  name={`${pre}komisi`}
                  value={val("komisi")}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border rounded font-bold uppercase outline-none focus:ring-1 focus:ring-red-400 bg-white"
                >
                  <option value="">-- PILIH --</option>
                  <option value="KOMISI A">KOMISI A</option>
                  <option value="KOMISI B">KOMISI B</option>
                  <option value="KOMISI C">KOMISI C</option>
                  <option value="KOMISI D">KOMISI D</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">
                WhatsApp
              </label>
              <input
                type="tel"
                name={`${pre}wa`}
                value={val("wa")}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border rounded font-bold outline-none focus:ring-1 focus:ring-red-400"
                placeholder="08xx"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Ukuran Kaos
              </label>
              <select
                name={`${pre}kaos`}
                value={val("kaos")}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border rounded font-bold uppercase outline-none focus:ring-1 focus:ring-red-400"
              >
                <option value="">-- PILIH --</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="XXXL">XXXL</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                Pas Foto {kat === "PENINJAU" ? "(Opsional)" : ""}
              </label>
              <div className="flex items-center gap-4">
                <img
                  src={
                    val("foto") ||
                    "https://via.placeholder.com/150x200?text=FOTO"
                  }
                  className="w-20 h-24 object-cover rounded border bg-slate-50"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, pre)}
                  className="text-xs cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 6 && isPeserta) {
      return (
        <div className="space-y-6 fade-in">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="w-10 h-10 gradient-bg text-white rounded flex items-center justify-center font-bold text-sm">
              6
            </div>
            <h2 className="text-xl font-bold uppercase">Verifikasi Dokumen</h2>
          </div>
          <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-500 text-lg">⚠️</span>
                <h3 className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                  Panduan Unggah Surat Mandat
                </h3>
              </div>
              <ul className="text-[11px] text-amber-800 font-medium space-y-1.5 ml-1">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold">1.</span>{" "}
                  <span>Unggah file Surat Mandat ke Google Drive Anda.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold">2.</span>{" "}
                  <span>
                    Ubah akses umum menjadi{" "}
                    <span className="font-bold bg-amber-100 px-1 rounded text-amber-900 border border-amber-200">
                      "Siapa saja yang memiliki link"
                    </span>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold">3.</span>{" "}
                  <span>Salin tautan (Copy link) dan tempel di bawah.</span>
                </li>
              </ul>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                Tautan Surat Mandat (Google Drive)
              </label>
              <input
                type="url"
                name="link_mandat"
                value={formData.link_mandat || ""}
                onChange={handleChange}
                required
                placeholder="https://drive.google.com/..."
                className="w-full px-4 py-3 border rounded font-bold outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          return (
            <div key={stepNum} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${isActive ? "gradient-bg text-white scale-110 shadow-lg" : isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}
              >
                {isCompleted ? "✓" : stepNum}
              </div>
              {stepNum < totalSteps && (
                <div
                  className={`w-4 md:w-8 h-0.5 ${isCompleted ? "bg-emerald-500" : "bg-slate-100"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden p-5 md:p-8">
        {renderStepContent()}

        <div className="flex justify-between mt-10 pt-6 border-t border-slate-100 gap-2">
          <div className="flex gap-1 md:gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => moveStep(-1)}
                className="px-3 md:px-6 py-3 rounded border font-bold text-slate-400 text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Kembali
              </button>
            )}
            {isRevisionMode && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 md:px-6 py-3 border border-red-100 text-red-400 font-bold rounded text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Batal
              </button>
            )}
          </div>
          <div className="flex gap-1 md:gap-2">
            <button
              type="button"
              onClick={() => moveStep(1)}
              className="px-5 md:px-8 py-3 gradient-bg text-white font-bold rounded shadow-md text-[10px] uppercase tracking-wider transition-all cursor-pointer"
            >
              {currentStep === totalSteps ? "Simpan & Cetak" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>

      {showTokenModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 text-center shadow-2xl">
            <h3 className="text-lg font-black uppercase mb-2 text-slate-900">
              Akses Verifikasi
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mb-6 uppercase tracking-wider leading-relaxed">
              Masukkan 6 digit Kode Token Revisi untuk melanjutkan pengeditan
              data.
            </p>
            <input
              type="text"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              className="w-full px-4 py-3 border text-center font-black tracking-widest text-xl uppercase mb-4 rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
              placeholder="------"
            />
            <button
              onClick={verifyToken}
              className="w-full py-3 bg-red-600 text-white rounded font-bold text-xs uppercase shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Buka Data
            </button>
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() =>
                  window.open(
                    `https://wa.me/${ADMIN_WA}?text=Mohon dikirim kode token revisi pendaftaran.`,
                  )
                }
                className="w-full py-2 text-emerald-600 font-bold text-[10px] uppercase hover:bg-emerald-50 rounded cursor-pointer transition-all"
              >
                Minta Kode Token
              </button>
              <button
                onClick={() => {
                  setShowTokenModal(false);
                  setInputToken("");
                  setFormData({ kategori: formData.kategori });
                }}
                className="w-full py-2 text-slate-400 font-bold text-[9px] uppercase cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
