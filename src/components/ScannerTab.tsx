import React, { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { getFirestore, doc, setDoc, getDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { CUSTOM_APP_ID } from "../lib/constants";

export const ScannerTab = ({ showModal }: { showModal: Function }) => {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedKomisiGuard, setSelectedKomisiGuard] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: "success"|"error"|"warning"} | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = scannerActive;
  }, [scannerActive]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);
  
  const events = [
    { id: "pleno_1", name: "Sidang Pleno I" },
    { id: "pembukaan", name: "Pembukaan" },
    { id: "pleno_2", name: "Sidang Pleno II" },
    { id: "komisi", name: "Sidang Komisi" },
    { id: "seminar", name: "Seminar" },
    { id: "pleno_3", name: "Sidang Pleno III" },
    { id: "penutupan", name: "Penutupan" },
    { id: "makan_1", name: "Makan 1" },
    { id: "makan_2", name: "Makan 2" },
    { id: "makan_3", name: "Makan 3" }
  ];

  const playBeep = (type: "success" | "error" | "warning") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "warning") {
        osc.type = "square";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const showToastAndResume = (msg: string, type: "success"|"error"|"warning") => {
    playBeep(type);
    setToast({ message: msg, type });
    setTimeout(() => {
      setToast(null);
      if (scannerRef.current && isActiveRef.current) {
        try {
          scannerRef.current.resume();
        } catch(e) {}
      }
    }, 2000);
  };

  const startScanner = () => {
    if (!selectedEvent) return showModal("ERROR", "Pilih agenda kegiatan dulu", "error");
    if (selectedEvent === "komisi" && !selectedKomisiGuard) return showModal("ERROR", "Pilih komisi yang Anda jaga", "error");
    
    setScannerActive(true);
    setLastScanResult(null);

    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
         async (decodedText) => {
          if (scannerRef.current) scannerRef.current.pause(true);
          try {
            const parts = decodedText.split("-");
            // Assume the last part after the dash is the participant index
            const participantIndex = parseInt(parts.pop() || "1");
            const docId = parts.join("-") || decodedText;

            const subRef = doc(db, "artifacts", CUSTOM_APP_ID, "public", "data", "pendaftar", docId);
            const subSnap = await getDoc(subRef);
            if (!subSnap.exists()) {
               setLastScanResult({ status: 'error', text: `${decodedText} (Tidak Ditemukan)` });
               showToastAndResume("Data peserta tidak ditemukan!", "error");
               return;
            }

            const subData = subSnap.data();
            const list = Array.isArray(subData.peserta) ? subData.peserta : (subData.peserta?.peserta || []);
            const getField = (field: string) => {
               return subData[`p${participantIndex}_${field}`] || (list[participantIndex-1] ? list[participantIndex-1][field] : "") || "";
            }
            
            const komisiPeserta = getField("komisi") || "";
            const namaPeserta = getField("nama") || "Peserta";
            const kategoriPeserta = subData.kategori || "";

            // Validate Komisi if event is komisi
            if (selectedEvent === "komisi") {
               if (!kategoriPeserta.toUpperCase().includes("PESERTA")) {
                  setLastScanResult({ status: 'error', text: `${namaPeserta} - Bukan Peserta Utusan` });
                  showToastAndResume(`Bukan Utusan! (${kategoriPeserta})`, "error");
                  return;
               }

               if (!komisiPeserta || komisiPeserta.toUpperCase() !== selectedKomisiGuard.toUpperCase()) {
                  setLastScanResult({ status: 'error', text: `${namaPeserta} -> ${komisiPeserta || "TIDAK ADA KOMISI"}` });
                  showToastAndResume(`SALAH KOMISI! Seharusnya ${komisiPeserta || "TIDAK ADA"}`, "error");
                  return;
               }
            }

            const logId = `${selectedEvent}_${decodedText}`;
            const logRef = doc(collection(db, "attendanceLogs"), logId);
            const docSnap = await getDoc(logRef);
            
            if (docSnap.exists()) {
              setLastScanResult({ status: 'already_scanned', text: `${namaPeserta} (${decodedText})` });
              showToastAndResume(`SUDAH TERCATAT - ${namaPeserta}`, "warning");
            } else {
              await setDoc(logRef, {
                participantId: decodedText,
                nama: namaPeserta,
                eventId: selectedEvent,
                timestamp: new Date().toISOString()
              });
              setLastScanResult({ status: 'success', text: `${namaPeserta} (${decodedText})` });
              showToastAndResume(`${namaPeserta} Berhasil Masuk!`, "success");
            }
          } catch (error: any) {
             showToastAndResume(error.message || "Gagal mencatat presensi", "error");
          }
        },
        (errorMessage) => {
          // parse error, ignore
        }
      ).catch((err) => {
         showModal("ERROR", "Kamera tidak dapat diakses", "error");
         setScannerActive(false);
      });
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setScannerActive(false);
        scannerRef.current?.clear();
      }).catch(console.error);
    } else {
      setScannerActive(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Scanner QR Code</h2>
        <p className="text-xs text-slate-500 font-medium uppercase mt-1">
          Konfirmasi Kehadiran & Jatah Makan
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pilih Agenda / Kegiatan</label>
          <select 
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold uppercase p-3 rounded focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            disabled={scannerActive}
          >
            <option value="">-- PILIH AGENDA --</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        {selectedEvent === "komisi" && (
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pilih Komisi yang Dijaga</label>
            <select 
              className="w-full bg-slate-50 border border-emerald-200 text-emerald-800 text-sm font-bold uppercase p-3 rounded focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
              value={selectedKomisiGuard}
              onChange={(e) => setSelectedKomisiGuard(e.target.value)}
              disabled={scannerActive}
            >
              <option value="">-- PILIH KOMISI --</option>
              <option value="KOMISI A">KOMISI A (Sekretariat, Organisasi, SI)</option>
              <option value="KOMISI B">KOMISI B (Advokasi & Kesejahteraan)</option>
              <option value="KOMISI C">KOMISI C (Keuangan & Akademik)</option>
              <option value="KOMISI D">KOMISI D (Kelembagaan & Sosial Budaya)</option>
            </select>
          </div>
        )}

        {!scannerActive ? (
          <button 
            onClick={startScanner}
            className="w-full py-4 gradient-bg text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            Mulai Scan QR Code
          </button>
        ) : (
           <button 
            onClick={stopScanner}
            className="w-full py-4 bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            Hentikan Scanner
          </button>
        )}

        <div className={`relative ${scannerActive ? 'block' : 'hidden'}`}>
          <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200"></div>
          
          {toast && (
            <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
               <div className={`w-full max-w-[280px] p-6 rounded-2xl shadow-xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                 {toast.type === 'success' ? (
                   <CheckCircle2 className="w-16 h-16 mb-3 drop-shadow-md" />
                 ) : toast.type === 'warning' ? (
                   <AlertTriangle className="w-16 h-16 mb-3 drop-shadow-md" />
                 ) : (
                   <XCircle className="w-16 h-16 mb-3 drop-shadow-md" />
                 )}
                 <h3 className="font-bold text-lg mb-1 leading-tight">{toast.message}</h3>
                 {lastScanResult && <p className="text-sm border-t border-white/20 pt-2 pb-1 font-mono uppercase tracking-widest">{lastScanResult.text}</p>}
                 <p className="text-[10px] bg-black/20 mt-3 py-1.5 px-3 rounded-full uppercase tracking-widest font-bold">Lanjut otomatis...</p>
               </div>
            </div>
          )}

          {lastScanResult && !toast && (
            <div className={`mt-4 p-4 rounded text-center ${lastScanResult.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : lastScanResult.status === 'already_scanned' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <p className="font-bold text-sm uppercase">{lastScanResult.status === 'success' ? 'Berhasil Dicatat' : lastScanResult.status === 'already_scanned' ? 'Sudah Tercatat' : 'Gagal Dicatat'}</p>
                <p className="text-xs mt-1 font-mono">{lastScanResult.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
