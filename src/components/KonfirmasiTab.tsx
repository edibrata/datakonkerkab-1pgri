import { useState } from "react";
import { SubmissionData } from "../types";
import { getFlattenedRows } from "../lib/data-utils";
import { EVENT_AGENDA } from "../lib/constants";
import { db } from "../lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { CheckCircle2, Search, CalendarCheck } from "lucide-react";

interface Props {
  submissions: SubmissionData[];
  confirmations: any[];
  activeEventId: string;
  showModal: (title: string, message: string, type: "success" | "error") => void;
}

export function KonfirmasiTab({ submissions, confirmations, activeEventId, showModal }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const flattenedRows = getFlattenedRows(submissions);

  const filteredParticipants = flattenedRows.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.branch && p.branch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.kategori && p.kategori.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 50);

  const activeEvent = EVENT_AGENDA.find((e) => e.id === activeEventId);

  const toggleConfirmation = async (participantId: string, eventId: string, isConfirmed: boolean) => {
    const docId = `${participantId}-${eventId}`;
    const confRef = doc(db, "confirmations", docId);
    
    try {
      if (isConfirmed) {
        // Remove confirmation
        await deleteDoc(confRef);
        showModal("Batal Konfirmasi", "Konfirmasi kehadiran berhasil dibatalkan.", "success");
      } else {
        // Add confirmation
        await setDoc(confRef, {
          participantId,
          eventId,
          timestamp: new Date().toISOString()
        });
        showModal("Berhasil", "Terima kasih telah mengkonfirmasi kehadiran awal Anda. Ini membantu penentuan kuorum.", "success");
      }
    } catch (e: any) {
      showModal("Gagal", e.message || "Terjadi kesalahan.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl md:rounded-2xl shadow-sm border border-indigo-100 px-4 py-5 md:p-6 text-center relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-4 p-4 opacity-[0.06] pointer-events-none">
          <CalendarCheck className="w-28 h-28 md:w-36 md:h-36 text-indigo-900" />
        </div>
        <div className="relative z-10 w-full max-w-lg mx-auto">
          <h2 className="text-[15px] sm:text-xl md:text-2xl font-black text-indigo-900 uppercase tracking-tight mb-1.5 md:mb-2 leading-tight">
            Konfirmasi Kehadiran (Kuorum)
            {activeEvent ? <span className="block mt-1">{`— ${activeEvent.name} —`}</span> : ""}
          </h2>
          <p className="text-indigo-700/80 font-bold text-[10.5px] sm:text-xs md:text-sm leading-snug md:leading-normal px-2">
            {activeEvent ? 
              `Bantu Panitia memastikan kuorum untuk ${activeEvent.name}. Konfirmasi kehadiran Anda di bawah ini sebelum proses scan barcode di ruangan dimulai.` 
              : "Menu konfirmasi kehadiran saat ini belum dibuka oleh panitia."
            }
          </p>
        </div>
      </div>

      {!activeEvent ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
          <CalendarCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-700 uppercase">Belum Ada Sesi Aktif</h3>
          <p className="text-slate-500 text-sm mt-2">Silakan tunggu arahan dari pimpinan sidang atau panitia.</p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 text-left">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
            placeholder="Cari Nama Lengkap Anda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {searchTerm.length < 3 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-slate-500 font-medium text-sm">
              Ketik minimal 3 huruf nama Anda untuk mencari opsi konfirmasi kehadiran.
            </p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-slate-500 font-medium text-sm">
              Peserta tidak ditemukan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredParticipants.map((p) => {
              const fullPid = `${p.id}-${p.i}`;
              return (
                <div key={fullPid} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3 hover:shadow-md transition-all">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-base">{p.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      {p.kategori} {p.branch ? `- ${p.branch}` : ""}
                    </p>
                  </div>
                  
                  <div className="mt-2">
                    {(() => {
                      const agenda = activeEvent;
                      const isConfirmed = confirmations.some(
                        (c) => c.participantId === fullPid && c.eventId === agenda.id
                      );
                      
                      return (
                        <button
                          key={agenda.id}
                          onClick={() => toggleConfirmation(fullPid, agenda.id, isConfirmed)}
                          className={`w-full flex items-center justify-between px-3 py-3 border rounded-lg text-xs font-bold uppercase transition-all ${
                            isConfirmed
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          <span>{agenda.name}</span>
                          <CheckCircle2 className={`w-5 h-5 ${isConfirmed ? "text-indigo-600" : "text-slate-300"}`} />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
