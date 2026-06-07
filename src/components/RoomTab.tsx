import { useState, useMemo } from "react";
import { SubmissionData, FlatAdminRow } from "../types";
import { getFlattenedRows } from "../lib/data-utils";
import { Search, MapPin, Phone, MessageCircle } from "lucide-react";
import { formatWA } from "../lib/pdf-utils";

interface Props {
  submissions: SubmissionData[];
}

export function RoomTab({ submissions }: Props) {
  const [search, setSearch] = useState("");

  const flattenedRows = useMemo(() => {
    let rows = getFlattenedRows(submissions, { key: "name", dir: 1 });
    if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(r => 
           r.name.toLowerCase().includes(s) || 
           r.branch.toLowerCase().includes(s) || 
           r.kategori.toLowerCase().includes(s) ||
           (r.kom && r.kom.toLowerCase().includes(s))
        );
    }
    return rows;
  }, [submissions, search]);

  const [selectedPerson, setSelectedPerson] = useState<FlatAdminRow | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Auto select if only one result
  useMemo(() => {
    if (search.length > 2 && flattenedRows.length === 1) {
      setSelectedPerson(flattenedRows[0]);
    }
  }, [flattenedRows, search]);

  const roommates = useMemo(() => {
    if (!selectedPerson || !selectedPerson.room || selectedPerson.room === "X" || selectedPerson.room === "Waiting List") return [];
    const allRows = getFlattenedRows(submissions, { key: "name", dir: 1 });
    return allRows.filter(
      (r) => r.room === selectedPerson.room && r.id + r.i !== selectedPerson.id + selectedPerson.i
    );
  }, [selectedPerson, submissions]);

  const generateInitialPhoto = (name: string) => {
    const init = name.charAt(0).toUpperCase() || "?";
    const colors = [
      "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", 
      "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-teal-500"
    ];
    const code = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cb = colors[code % colors.length];
    return (
      <div className={`w-full h-full flex justify-center items-center text-white font-bold text-2xl ${cb}`}>
        {init}
      </div>
    );
  };

  const PhotoAvatar = ({ photoStr, name, sizeClass = "w-16 h-16" }: { photoStr: string | undefined, name: string, sizeClass?: string }) => {
    return (
      <div 
        className={`${sizeClass} rounded-full overflow-hidden border-2 border-slate-200 shadow-sm cursor-pointer hover:border-red-400 transition-all flex-shrink-0 bg-slate-100 flex items-center justify-center relative group`}
        onClick={(e) => {
          e.stopPropagation();
          if (photoStr) setPreviewPhoto(photoStr);
        }}
      >
        {photoStr ? (
          <img src={photoStr} alt={name} className="w-full h-full object-cover" />
        ) : (
          generateInitialPhoto(name)
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Search className="text-white w-4 h-4" />
        </div>
      </div>
    );
  };

  const getWaLink = (phone: string, isCall: boolean) => {
    const formatted = formatWA(phone);
    if (!formatted || formatted === "-") return "#";
    if (isCall) return `tel:+${formatted}`;
    return `https://wa.me/${formatted}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Pencarian Kamar Peserta</h2>
        <p className="text-slate-500 mb-6 font-medium">Cari nama Anda atau entitas/cabang Anda untuk mengetahui informasi alokasi kamar dan teman sekamar.</p>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-base transition-all placeholder:text-slate-400 font-medium shadow-inner text-slate-800"
            placeholder="Ketik Nama Lengkap atau Cabang..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedPerson(null);
            }}
          />
        </div>

        {search.length > 0 && !selectedPerson && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {flattenedRows.length > 0 ? (
              flattenedRows.map((r, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedPerson(r)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 cursor-pointer transition-all shadow-sm group"
                >
                  <PhotoAvatar photoStr={r.foto} name={r.name} sizeClass="w-10 h-10 md:w-12 md:h-12" />
                  <div className="flex-1 min-w-0">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-0.5 md:gap-2">
                        <p className="font-bold text-slate-800 text-base md:text-lg group-hover:text-red-700 truncate">{r.name}</p>
                        {r.kom && r.kom !== "-" && (
                          <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-max">
                            {r.kom}
                          </span>
                        )}
                     </div>
                    <div className="flex items-center text-xs md:text-sm font-medium text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">{r.branch}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 font-medium">Tidak menemukan peserta dengan kata kunci tersebut.</div>
            )}
          </div>
        )}

        {selectedPerson && (
          <div className="mt-6 md:mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={() => setSelectedPerson(null)}
              className="text-xs md:text-sm font-bold text-slate-500 hover:text-red-600 mb-4 inline-flex items-center gap-1 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
            >
              &larr; Kembali ke pencarian
            </button>
            
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 md:p-8 text-white relative overflow-hidden shadow-xl mb-6 md:mb-8">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-red-500/20 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-stretch">
                <PhotoAvatar photoStr={selectedPerson.foto} name={selectedPerson.name} sizeClass="w-20 h-20 md:w-32 md:h-32 border-4 border-white/20" />
                <div className="flex-1 text-center md:text-left flex flex-col justify-center w-full">
                  <div className="flex justify-center md:justify-start gap-2 mb-2 md:mb-3 flex-wrap">
                    <div className="inline-block bg-white/10 px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase border border-white/10">
                      KAMAR: <span className="text-red-400 ml-1">{selectedPerson.room}</span>
                    </div>
                    {selectedPerson.kom && selectedPerson.kom !== "-" && (
                        <div className="inline-block bg-blue-500/20 px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase border border-blue-400/30 text-blue-200">
                          {selectedPerson.kom}
                        </div>
                    )}
                  </div>
                  <h3 className="text-xl md:text-3xl font-black mb-1 md:mb-2 leading-tight">{selectedPerson.name}</h3>
                  <div className="flex items-center justify-center md:justify-start text-xs md:text-sm text-slate-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{selectedPerson.branch}</span>
                  </div>
                </div>
              </div>
            </div>

            {roommates.length > 0 ? (
              <div className="mt-6 md:mt-8">
                <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center">
                  <span className="w-1.5 md:w-2 h-5 md:h-6 bg-red-600 rounded-full mr-2"></span>
                  Teman Sekamar ({selectedPerson.room})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {roommates.map((mate, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 hover:shadow-md hover:border-slate-300 transition-all">
                      <PhotoAvatar photoStr={mate.foto} name={mate.name} sizeClass="w-12 h-12 md:w-14 md:h-14" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                            <p className="font-bold text-slate-800 text-sm md:text-base truncate leading-tight">{mate.name}</p>
                            {mate.kom && mate.kom !== "-" && (
                                <span className="text-[8px] md:text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                {mate.kom.replace("KOMISI ", "")}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] md:text-xs font-semibold text-slate-500 truncate mb-1.5 md:mb-2">{mate.branch}</p>
                        <div className="flex gap-1.5 md:gap-2">
                          <a 
                            href={getWaLink(mate.wa, false)} target="_blank" rel="noopener noreferrer"
                            className="bg-green-50 hover:bg-green-100 text-green-700 p-1.5 md:p-2 rounded-lg transition-colors tooltip-container flex-1 flex justify-center border border-green-200"
                          >
                            <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="tooltip-text hidden md:block">Chat WhatsApp</span>
                          </a>
                          <a 
                            href={getWaLink(mate.wa, true)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-1.5 md:p-2 rounded-lg transition-colors tooltip-container flex-1 flex justify-center border border-slate-200"
                          >
                            <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="tooltip-text hidden md:block">Telepon Biasa/WA Call</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-8 bg-slate-50 rounded-2xl p-6 border border-slate-200 border-dashed text-center">
                <p className="text-slate-500 font-medium">Belum ada informasi teman sekamar.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {previewPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={previewPhoto} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            <button 
              className="absolute -top-12 right-0 md:-right-12 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
              onClick={() => setPreviewPhoto(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
