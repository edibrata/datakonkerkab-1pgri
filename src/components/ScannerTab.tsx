import React, { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { getFirestore, doc, setDoc, getDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";

export const ScannerTab = ({ showModal }: { showModal: Function }) => {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
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

  const startScanner = () => {
    if (!selectedEvent) return showModal("ERROR", "Pilih agenda kegiatan dulu", "error");
    setScannerActive(true);
    setLastScanResult(null);

    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(async (decodedText) => {
        if (scannerRef.current) scannerRef.current.pause();
        try {
          const logId = `${selectedEvent}_${decodedText}`;
          const logRef = doc(collection(db, "attendanceLogs"), logId);
          const docSnap = await getDoc(logRef);
          
          if (docSnap.exists()) {
            showModal("INFO", `Peserta sudah terdaftar/mengambil bagian untuk kegiatan ini!`, "error");
            setLastScanResult({ status: 'already_scanned', text: decodedText });
          } else {
            await setDoc(logRef, {
              participantId: decodedText,
              eventId: selectedEvent,
              timestamp: new Date().toISOString()
            });
            showModal("BERHASIL", `Presensi/Klaim berhasil dicatat!`, "success");
            setLastScanResult({ status: 'success', text: decodedText });
          }
        } catch (error: any) {
          showModal("ERROR", error.message || "Gagal mencatat presensi", "error");
        }
        setTimeout(() => {
            if (scannerRef.current && scannerActive) scannerRef.current.resume();
        }, 3000);
      }, (error) => {
        // ignore scan failures
      });
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        setScannerActive(false);
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

        <div className={scannerActive ? 'block' : 'hidden'}>
          <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200"></div>
          {lastScanResult && (
            <div className={`mt-4 p-4 rounded text-center ${lastScanResult.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <p className="font-bold text-sm uppercase">{lastScanResult.status === 'success' ? 'Berhasil Dicatat' : 'Gagal / Sudah Dicatat'}</p>
                <p className="text-xs mt-1 font-mono">{lastScanResult.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
