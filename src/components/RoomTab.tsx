import { useState, useMemo } from "react";
import { SubmissionData, FlatAdminRow } from "../types";
import { getFlattenedRows } from "../lib/data-utils";
import { Search, MapPin, Phone, Users, ShieldAlert, BadgeInfo } from "lucide-react";
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
      "bg-red-600", "bg-blue-600", "bg-emerald-600", "bg-amber-600", 
      "bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-teal-600"
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
        className={`${sizeClass} rounded-full overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:border-red-400 hover:shadow-md hover:scale-105 transition-all duration-300 flex-shrink-0 bg-slate-50 flex items-center justify-center relative group`}
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
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {!selectedPerson ? (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          
          <div className="relative z-10 text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">Cari Kamar Peserta</h2>
            <p className="text-slate-500 font-medium max-w-lg mx-auto">
              Silakan masukkan nama lengkap atau entitas/cabang Anda untuk mengetahui informasi alokasi kamar dan rekan sekamar Anda.
            </p>
          </div>
          
          <div className="relative mb-8 max-w-2xl mx-auto group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-red-500">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-6 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-100 focus:border-red-500 sm:text-base transition-all placeholder:text-slate-400 font-semibold shadow-sm text-slate-800 outline-none"
              placeholder="Ketik Nama Lengkap atau Cabang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {search.length > 0 && (
            <div className="max-w-2xl mx-auto space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {flattenedRows.length > 0 ? (
                flattenedRows.map((r, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPerson(r)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-red-200 hover:bg-slate-50 cursor-pointer hover:shadow-md transition-all group"
                  >
                    <PhotoAvatar photoStr={r.foto} name={r.name} sizeClass="w-12 h-12 md:w-14 md:h-14" />
                    <div className="flex-1 min-w-0">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-3 mb-1">
                          <p className="font-bold text-slate-800 text-base md:text-lg group-hover:text-red-600 transition-colors truncate">{r.name}</p>
                          {r.kom && r.kom !== "-" && (
                            <span className="inline-flex items-center text-[10px] md:text-xs font-black uppercase text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full w-max tracking-wide">
                              {r.kom}
                            </span>
                          )}
                       </div>
                      <div className="flex items-center text-xs md:text-sm font-medium text-slate-500">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{r.branch}</span>
                      </div>
                    </div>
                    <div className="pl-4 border-l border-slate-100 hidden md:flex flex-col items-center justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">KAMAR</span>
                        <span className="text-xl font-black text-slate-800">{r.room || "-"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 border-dashed">
                  <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Tidak ada peserta yang cocok dengan "{search}".</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-start mb-6">
              <button 
                onClick={() => setSelectedPerson(null)}
                className="text-sm font-bold text-slate-600 hover:text-red-600 flex items-center gap-2 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl transition-all border border-slate-200 hover:border-red-200 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali ke Pencarian
              </button>
          </div>
          
          {/* Selected Participant Hero Card */}
          <div className="bg-white rounded-3xl p-6 md:p-10 relative overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-50 to-transparent rounded-full blur-3xl -z-10 group-hover:bg-red-100 transition-colors duration-1000"></div>
            
            <PhotoAvatar photoStr={selectedPerson.foto} name={selectedPerson.name} sizeClass="w-32 h-32 md:w-40 md:h-40 ring-4 ring-white shadow-xl shadow-slate-200" />
            
            <div className="flex-1 text-center md:text-left flex flex-col w-full md:mt-2">
              <div className="flex justify-center md:justify-start gap-2 mb-4 flex-wrap">
                <div className="inline-flex items-center bg-red-50 px-3 py-1.5 rounded-full border border-red-100 shadow-sm">
                  <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-red-600 mr-2 opacity-80">KAMAR</span>
                  <span className="text-sm md:text-base font-black text-red-700">{selectedPerson.room}</span>
                </div>
                {selectedPerson.kom && selectedPerson.kom !== "-" && (
                    <div className="inline-flex items-center bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                      <span className="text-xs md:text-sm font-black text-blue-700">{selectedPerson.kom}</span>
                    </div>
                )}
                {selectedPerson.kategori && (
                    <div className="inline-flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                      <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-600">{selectedPerson.kategori}</span>
                    </div>
                )}
              </div>
              
              <h3 className="text-2xl md:text-4xl font-black text-slate-800 mb-3 leading-tight tracking-tight">{selectedPerson.name}</h3>
              
              <div className="flex flex-col gap-2 items-center md:items-start text-sm md:text-base text-slate-500 font-medium">
                <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-red-400" />
                    <span>{selectedPerson.branch}</span>
                </div>
                {selectedPerson.jabatan && selectedPerson.jabatan !== "-" && (
                    <div className="flex items-center">
                        <BadgeInfo className="w-4 h-4 mr-2 text-blue-400" />
                        <span>{selectedPerson.jabatan}</span>
                    </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
               </div>
               Rekan Sekamar
            </h3>
            
            {roommates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {roommates.map((mate, idx) => (
                  <div key={idx} className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <PhotoAvatar photoStr={mate.foto} name={mate.name} sizeClass="w-20 h-20 md:w-16 md:h-16 shadow-md" />
                    
                    <div className="flex-1 w-full text-center sm:text-left min-w-0 flex flex-col justify-between h-full">
                      <div className="mb-4 sm:mb-0">
                          <p className="font-bold text-slate-800 text-lg md:text-xl truncate leading-tight mb-1">{mate.name}</p>
                          <div className="flex flex-col items-center sm:items-start gap-1.5 relative">
                             <p className="text-xs md:text-sm font-medium text-slate-500 truncate w-full">{mate.branch}</p>
                             {mate.kom && mate.kom !== "-" && (
                                 <span className="inline-block text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 mt-1">
                                    {mate.kom}
                                 </span>
                             )}
                          </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 sm:mt-3">
                        <div className="group/tooltip relative flex-1">
                          <a 
                            href={getWaLink(mate.wa, false)} target="_blank" rel="noopener noreferrer"
                            className="bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white px-3 py-2.5 rounded-xl transition-all flex items-center justify-center w-full shadow-sm"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                          </a>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap shadow-lg">
                            Kirim Pesan WA
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                          </div>
                        </div>
                        
                        <div className="group/tooltip relative flex-1">
                          <a 
                            href={getWaLink(mate.wa, true)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl transition-all flex items-center justify-center w-full shadow-sm"
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap shadow-lg">
                            Telepon Panggilan
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-3xl p-10 border-2 border-slate-100 border-dashed text-center flex flex-col items-center justify-center h-48">
                <Users className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Belum ada rekan sekamar yang dialokasikan.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Modal Full Screen */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={previewPhoto} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/20" />
            <button 
              className="absolute -top-12 right-0 md:-right-12 w-10 h-10 bg-white/10 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors border border-white/20"
              onClick={() => setPreviewPhoto(null)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

