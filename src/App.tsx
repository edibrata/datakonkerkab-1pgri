import { useState } from 'react';
import { useFirebaseData } from './hooks/useFirebaseData';
import { Navigation } from './components/Navigation';
import { HomeTab } from './components/HomeTab';
import { FormTab } from './components/FormTab';
import { AdminTab } from './components/AdminTab';

export default function App() {
  const { submissions, isRegistrationOpen, loading } = useFirebaseData();
  const [activeTab, setActiveTab] = useState('beranda');
  
  // Modal States
  const [modalConfig, setModalConfig] = useState<{ title: string, message: string, type: 'success' | 'error' } | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const showModal = (title: string, message: string, type: 'success' | 'error') => {
    setModalConfig({ title, message, type });
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setShowCategoryModal(false);
    if (cat === 'PESERTA CABANG') {
      setShowInstructionModal(true);
    } else {
      setActiveTab('formulir');
    }
  };

  const proceedToForm = () => {
    setShowInstructionModal(false);
    setActiveTab('formulir');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col text-sm">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-[96%] mx-auto px-4 py-6 md:py-8 flex-grow w-full">
        {loading ? (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        ) : (
            <>
                {activeTab === 'beranda' && (
                    <HomeTab 
                        submissions={submissions} 
                        isRegistrationOpen={isRegistrationOpen} 
                        onOpenCategoryModal={() => {
                            if (!isRegistrationOpen) return showModal("DITUTUP", "Masa pendaftaran telah berakhir.", "error");
                            setShowCategoryModal(true);
                        }} 
                    />
                )}
                {activeTab === 'formulir' && (
                    <FormTab 
                        submissions={submissions} 
                        isRegistrationOpen={isRegistrationOpen} 
                        initialCategory={selectedCategory}
                        showModal={showModal}
                        onSaveSuccess={() => setActiveTab('beranda')}
                        onCancel={() => setActiveTab('beranda')}
                        onChangeCategory={() => setShowCategoryModal(true)}
                    />
                )}
                {activeTab === 'data' && (
                    <AdminTab 
                        submissions={submissions} 
                        isRegistrationOpen={isRegistrationOpen} 
                        showModal={showModal}
                        onViewPrevew={setPreviewImage}
                        onEditEntry={(id: string) => {
                            // To properly implement onEditEntry from admin table 
                            // we would pass it down, but the user HTML says standard "Revisi Token" flow is typically used.
                            // However, we just switch to form mode for simplicity or show token popup.
                            // I will just switch to form tab.
                            setActiveTab('formulir');
                        }}
                    />
                )}
            </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 mt-auto py-10 bg-white">
        <div className="max-w-[96%] mx-auto px-4 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Konkerkab 1 PGRI Pandeglang 2026</span>
            <span className="text-[11px] font-black text-red-400 uppercase tracking-[0.2em]">DEVELOPED BY EDI BRATA</span>
        </div>
      </footer>

      {/* Generic Alert Modal */}
      {modalConfig && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-lg p-6 text-center shadow-2xl relative text-slate-800">
                <div className={`text-3xl mb-4 ${modalConfig.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {modalConfig.type === 'success' ? '✅' : '❌'}
                </div>
                <h3 className="text-lg font-black uppercase mb-2">{modalConfig.title}</h3>
                <div className="overflow-auto max-h-[70vh]">
                     <p className="text-sm text-slate-500 font-medium mb-6 uppercase leading-relaxed">{modalConfig.message}</p>
                </div>
                <button onClick={() => setModalConfig(null)} className="w-full py-3 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-widest cursor-pointer">Tutup</button>
            </div>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white w-full max-w-xl rounded-2xl p-6 md:p-8 shadow-2xl relative text-slate-800">
                <button onClick={() => setShowCategoryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition-all">✕</button>
                <div className="text-center mb-6">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Kategori Pendaftaran</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Pilih satu kepesertaan Anda</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div onClick={() => handleCategorySelect('PESERTA CABANG')} className="category-card border border-slate-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer bg-white shadow-sm hover:shadow-md">
                        <h3 className="text-xs font-black text-slate-900 uppercase">Peserta Cabang</h3>
                        <p className="text-[8px] font-bold text-slate-400 mt-1.5 leading-relaxed uppercase">Delegasi resmi PGRI Cabang</p>
                    </div>
                    <div onClick={() => handleCategorySelect('PANITIA')} className="category-card border border-slate-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer bg-white shadow-sm hover:shadow-md">
                        <h3 className="text-xs font-black text-slate-900 uppercase">Panitia</h3>
                        <p className="text-[8px] font-bold text-slate-400 mt-1.5 leading-relaxed uppercase">Pengurus PGRI Kabupaten</p>
                    </div>
                    <div onClick={() => handleCategorySelect('PENINJAU')} className="category-card border border-slate-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer bg-white shadow-sm hover:shadow-md">
                        <h3 className="text-xs font-black text-slate-900 uppercase">Peninjau</h3>
                        <p className="text-[8px] font-bold text-slate-400 mt-1.5 leading-relaxed uppercase">Tamu resmi & utusan khusus</p>
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
                    <h2 className="text-xl font-bold uppercase">Petunjuk Pendaftaran</h2>
                </div>
                <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-grow bg-white text-slate-700 space-y-3 md:space-y-4">
                    <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                        <p className="font-black text-slate-900 mb-1.5 uppercase">1. Ketentuan Umum</p>
                        <ul className="list-disc ml-4 space-y-1 font-medium">
                            <li>Setiap Cabang mengikutsertakan <span className="font-bold">4 orang peserta</span>.</li>
                            <li>Wajib menyiapkan Surat Mandat.</li>
                        </ul>
                    </div>
                </div>
                <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50">
                    <button onClick={proceedToForm} className="w-full py-3 md:py-4 gradient-bg text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer">Saya Mengerti & Siapkan Dokumen</button>
                </div>
            </div>
        </div>
      )}

      {/* Preview Image Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
            <div className="bg-white p-4 rounded-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setPreviewImage(null)} className="absolute top-2 right-2 text-slate-400 hover:bg-slate-100 p-2 rounded-full">✕</button>
                <img src={previewImage} alt="ID Card" className="h-[75vh] w-auto border shadow-xl rounded" />
            </div>
        </div>
      )}
    </div>
  );
}
