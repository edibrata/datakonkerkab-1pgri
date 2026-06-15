import { useState, useEffect, lazy, Suspense } from "react";
import { useFirebaseData } from "./hooks/useFirebaseData";
import { Navigation } from "./components/Navigation";
import { SubmissionData } from "./types";

const HomeTab = lazy(() => import("./components/HomeTab").then(module => ({ default: module.HomeTab })));
const FormTab = lazy(() => import("./components/FormTab").then(module => ({ default: module.FormTab })));
const AdminTab = lazy(() => import("./components/AdminTab").then(module => ({ default: module.AdminTab })));
const ScannerTab = lazy(() => import("./components/ScannerTab").then(module => ({ default: module.ScannerTab })));
const AttendanceTab = lazy(() => import("./components/AttendanceTab").then(module => ({ default: module.AttendanceTab })));
const PeringkatTab = lazy(() => import("./components/PeringkatTab").then(module => ({ default: module.PeringkatTab })));
const KonfirmasiTab = lazy(() => import("./components/KonfirmasiTab").then(module => ({ default: module.KonfirmasiTab })));
const RoomTab = lazy(() => import("./components/RoomTab").then(module => ({ default: module.RoomTab })));
const AdminLogin = lazy(() => import("./components/AdminLogin").then(module => ({ default: module.AdminLogin })));

const DeveloperProfileModal = lazy(() => import("./components/DeveloperProfileModal"));

export default function App() {
  const { submissions, attendanceLogs, confirmations, trashRecords, isRegistrationOpen, activeEventId, loading } = useFirebaseData();
  const getInitRole = (): "full" | "scanner" | null => {
    const pass = localStorage.getItem("pgri_admin_pass");
    if (pass === "adminpgri") return "full";
    if (pass === "adminscan") return "scanner";
    return null;
  };
  const [adminRole, setAdminRole] = useState<"full" | "scanner" | null>(getInitRole());
  const [activeTab, setActiveTab] = useState(adminRole === "full" ? "beranda" : (adminRole === "scanner" ? "scanner" : "info_peserta"));

  // Modal States
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: "success" | "error";
    showProgress?: boolean;
  } | null>(null);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDeveloperProfile, setShowDeveloperProfile] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [editSubmissionData, setEditSubmissionData] = useState<SubmissionData | null>(null);
  const [editStartStep, setEditStartStep] = useState<number | undefined>(undefined);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalConfig(null);
        setShowCategoryModal(false);
        setShowInstructionModal(false);
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const showModal = (
    title: string,
    message: string,
    type: "success" | "error",
    showProgress?: boolean,
  ) => {
    setModalConfig({ title, message, type, showProgress });
    if (showProgress) setModalProgress(0);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setShowCategoryModal(false);
    if (cat === "PESERTA CABANG") {
      setShowInstructionModal(true);
    } else {
      setActiveTab("formulir");
    }
  };

  const proceedToForm = () => {
    setShowInstructionModal(false);
    setActiveTab("formulir");
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col text-sm relative">
      <Navigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        adminRole={adminRole} 
        onLogoClick={() => setShowDeveloperProfile(true)} 
      />

      <main className={`${activeTab === "data" ? "max-w-[98%]" : "max-w-7xl"} mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-grow w-full`}>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          }>
            {activeTab === "beranda" && (
              <HomeTab
                submissions={submissions}
                isRegistrationOpen={isRegistrationOpen}
                isAdminLoggedIn={!!adminRole}
                onOpenCategoryModal={() => {
                  if (!isRegistrationOpen)
                    return showModal(
                      "DITUTUP",
                      "Masa pendaftaran telah berakhir.",
                      "error",
                    );
                  setShowCategoryModal(true);
                }}
              />
            )}
            
            {(activeTab === "formulir" || activeTab === "data") && adminRole !== "full" ? (
                <AdminLogin 
                  onLoginSuccess={(role) => {
                    setAdminRole(role);
                    if (role === "scanner") setActiveTab("scanner");
                  }} 
                  showModal={showModal} 
                />
            ) : (
              <>
                {activeTab === "formulir" && (
                  <FormTab
                    submissions={submissions}
                    isRegistrationOpen={isRegistrationOpen}
                    initialCategory={selectedCategory}
                    editData={editSubmissionData}
                    startStep={editStartStep}
                    showModal={showModal}
                    onSaveSuccess={() => {
                      setActiveTab(editSubmissionData ? "data" : "beranda");
                      setEditSubmissionData(null);
                      setEditStartStep(undefined);
                    }}
                    onCancel={() => {
                      setActiveTab(editSubmissionData ? "data" : "beranda");
                      setEditSubmissionData(null);
                      setEditStartStep(undefined);
                    }}
                    onChangeCategory={() => setShowCategoryModal(true)}
                  />
                )}
                {activeTab === "data" && (
                  <AdminTab
                    submissions={submissions}
                    attendanceLogs={attendanceLogs}
                    confirmations={confirmations}
                    trashRecords={trashRecords}
                    isRegistrationOpen={isRegistrationOpen}
                    activeEventId={activeEventId}
                    showModal={showModal}
                    setModalProgress={setModalProgress}
                    onViewPrevew={setPreviewImage}
                    onLogout={() => {
                        setAdminRole(null);
                        localStorage.removeItem("pgri_admin_pass");
                        setActiveTab("beranda");
                    }}
                    onEditEntry={(id: string, participantIndex?: number) => {
                      const dataToEdit = submissions.find((s) => s.id === id);
                      if (dataToEdit) {
                        setEditSubmissionData(dataToEdit);
                        setSelectedCategory(dataToEdit.kategori || "");
                        if (participantIndex) {
                          setEditStartStep(participantIndex + 1);
                        } else {
                          setEditStartStep(undefined);
                        }
                        setActiveTab("formulir");
                      }
                    }}
                  />
                )}
                {activeTab === "scanner" && adminRole && (
                  <ScannerTab showModal={showModal} />
                )}
              </>
            )}

            {activeTab === "info_peserta" && (
              <RoomTab submissions={submissions} />
            )}
            {activeTab === "konfirmasi" && (
              <KonfirmasiTab submissions={submissions} confirmations={confirmations} activeEventId={activeEventId} showModal={showModal} />
            )}

            {activeTab === "presensi" && (
              <AttendanceTab submissions={submissions} attendanceLogs={attendanceLogs} confirmations={confirmations} />
            )}
            {activeTab === "peringkat" && (
              <PeringkatTab submissions={submissions} attendanceLogs={attendanceLogs} />
            )}
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 mt-auto py-10 bg-white">
        <div className="max-w-[96%] mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Konkerkab 1 PGRI Pandeglang 2026
          </span>
          <span 
            className="text-[11px] font-black text-red-400 uppercase tracking-[0.2em] cursor-pointer hover:text-red-500 transition-colors"
            onClick={() => setShowDeveloperProfile(true)}
          >
            DEVELOPED BY EDI BRATA
          </span>
        </div>
      </footer>

      {showDeveloperProfile && (
        <Suspense fallback={null}>
          <DeveloperProfileModal onClose={() => setShowDeveloperProfile(false)} />
        </Suspense>
      )}

      {/* Generic Alert Modal */}
      {modalConfig && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 text-center shadow-2xl relative text-slate-800">
            <div
              className={`text-3xl mb-4 ${modalConfig.type === "success" ? "text-emerald-500" : "text-red-500"}`}
            >
              {modalConfig.type === "success" ? "✅" : "❌"}
            </div>
            <h3 className="text-lg font-black uppercase mb-2">
              {modalConfig.title}
            </h3>
            <div className="overflow-auto max-h-[70vh]">
              <p className="text-sm text-slate-500 font-medium mb-6 uppercase leading-relaxed">
                {modalConfig.message}
              </p>

              {modalConfig.showProgress && (
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full gradient-bg transition-all duration-300"
                    style={{ width: `${modalProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
            <button
              onClick={() => setModalConfig(null)}
              className="w-full py-3 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-widest cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 md:p-8 shadow-2xl relative text-slate-800">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition-all"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Kategori Pendaftaran
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">
                Pilih satu kepesertaan Anda
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => handleCategorySelect("PESERTA CABANG")}
                className="category-card border border-slate-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer bg-white shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  Peserta Cabang
                </h3>
                <p className="text-[8px] font-bold text-slate-400 mt-1.5 leading-relaxed uppercase">
                  Delegasi resmi PGRI Cabang
                </p>
              </div>
              <div
                onClick={() => handleCategorySelect("PANITIA")}
                className="category-card border border-slate-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer bg-white shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  Panitia
                </h3>
                <p className="text-[8px] font-bold text-slate-400 mt-1.5 leading-relaxed uppercase">
                  Pengurus PGRI Kabupaten
                </p>
              </div>
              <div
                onClick={() => handleCategorySelect("PENINJAU")}
                className="category-card border border-slate-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer bg-white shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  Peninjau
                </h3>
                <p className="text-[8px] font-bold text-slate-400 mt-1.5 leading-relaxed uppercase">
                  Tamu resmi & utusan khusus
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instruction Modal */}
      {showInstructionModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="gradient-bg px-4 py-4 md:px-6 md:py-6 text-white text-center">
              <h2 className="text-xl font-bold uppercase">
                Petunjuk Pendaftaran
              </h2>
              <p className="text-[9px] md:text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">
                KONFERENSI KERJA 1 PGRI KABUPATEN PANDEGLANG 2026
              </p>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-grow bg-white text-slate-700 space-y-3 md:space-y-4">
              <div className="space-y-3 text-[11px] leading-relaxed">
                <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100">
                  <p className="font-black text-slate-900 mb-1.5 md:mb-2 uppercase">
                    1. Ketentuan Umum
                  </p>
                  <ul className="list-disc ml-4 space-y-1 font-medium">
                    <li>
                      Pendaftaran dilakukan secara online melalui portal resmi
                      Konkerkab 1 PGRI.
                    </li>
                    <li>
                      Pilih kategori pendaftaran{" "}
                      <span className="font-bold text-red-600">
                        Peserta Cabang
                      </span>
                      .
                    </li>
                    <li>
                      Setiap Cabang mengikutsertakan{" "}
                      <span className="font-bold">4 orang peserta</span> yang
                      dibuktikan dengan Surat Mandat resmi cabang.
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100">
                  <p className="font-black text-slate-900 mb-1.5 md:mb-2 uppercase">
                    2. Persiapan Data (Siapkan sebelum mengisi):
                  </p>
                  <ul className="list-disc ml-4 space-y-0.5 md:space-y-1 font-medium">
                    <li>Nama lengkap masing-masing delegasi (4 orang).</li>
                    <li>Nomor WhatsApp aktif masing-masing delegasi.</li>
                    <li>
                      Ukuran kaos masing-masing delegasi (S, M, L, XL, XXL,
                      XXXL).
                    </li>
                    <li>
                      Pas foto formal memakai batik PGRI (Wajah jelas, tidak
                      blur, posisi tegak).
                    </li>
                    <li>
                      Soft file{" "}
                      <span className="font-bold">Surat Mandat kolektif</span>{" "}
                      (Scan jelas, stempel resmi).
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100">
                  <p className="font-black text-slate-900 mb-1.5 md:mb-2 uppercase">
                    3. Pengaturan Google Drive (Wajib):
                  </p>
                  <ul className="list-disc ml-4 space-y-1 font-medium">
                    <li>
                      Simpan Surat Mandat di Google Drive masing-masing cabang.
                    </li>
                    <li>
                      Atur akses menjadi:{" "}
                      <span className="font-bold text-emerald-600">
                        "Siapa saja yang memiliki link dapat melihat"
                      </span>
                      .
                    </li>
                    <li>
                      Salin tautan (link) tersebut untuk diisikan pada formulir
                      pendaftaran.
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100">
                  <p className="font-black text-slate-900 mb-1.5 md:mb-2 uppercase">
                    4. Informasi Pembayaran:
                  </p>
                  <div className="p-3 bg-white border border-red-100 rounded text-center relative group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Bank BJB (Giro)
                    </p>
                    <div className="flex items-center justify-center gap-2 my-0.5">
                      <p className="text-sm font-black text-slate-900">
                        0011752268001
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("0011752268001");
                          const badge =
                            document.getElementById("copyBadgeReact");
                          if (badge) {
                            badge.classList.remove("hidden");
                            setTimeout(
                              () => badge.classList.add("hidden"),
                              2000,
                            );
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 transition-all tooltip-container cursor-pointer"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="tooltip-text">Salin No. Rek</span>
                      </button>
                    </div>
                    <p className="text-[9px] font-bold text-red-600 uppercase">
                      A.N: PGRI Kabupaten Pandeglang
                    </p>
                    <div
                      id="copyBadgeReact"
                      className="hidden absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-2 py-1 rounded shadow-lg animate-bounce"
                    >
                      TERSALIN!
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100">
                  <p className="font-black text-slate-900 mb-1.5 md:mb-2 uppercase">
                    5. Selesai Pendaftaran:
                  </p>
                  <ul className="list-disc ml-4 space-y-1 font-medium">
                    <li>
                      Pastikan data benar sebelum menekan{" "}
                      <span className="font-bold">
                        "Simpan & Cetak ID Card"
                      </span>
                      .
                    </li>
                    <li>
                      Data tersimpan dan ID Card akan terunduh otomatis dalam
                      format PDF.
                    </li>
                    <li>
                      Gunakan <span className="font-bold">Token Revisi</span>{" "}
                      pada bukti pendaftaran jika ada kesalahan data di kemudian
                      hari.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={proceedToForm}
                className="w-full py-3 md:py-4 gradient-bg text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Saya Mengerti & Siapkan Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Image Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white p-4 rounded-xl shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 text-slate-400 hover:bg-slate-100 p-2 rounded-full"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="ID Card"
              className="h-[75vh] w-auto border shadow-xl rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
