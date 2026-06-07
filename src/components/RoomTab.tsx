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
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      {!selectedPerson ? (
        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
          
          <div className="relative z-10 text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 mb-6 shadow-sm">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Pencarian Profil Peserta</h2>
            <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
              Ketik nama lengkap atau cabang untuk melihat detail kepesertaan, alokasi kamar, dan rekan sekamar.
            </p>
          </div>
          
          <div className="relative mb-2 max-w-2xl mx-auto group z-20">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-colors z-10">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-400 sm:text-base transition-all placeholder:text-slate-400 text-slate-800 outline-none shadow-sm relative z-10"
              placeholder="Ketik nama untuk mencari profil..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />

            {/* Dropdown Suggestions */}
            {search.length > 0 && showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.08)] rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto custom-scrollbar opacity-100 transition-all z-50">
                {flattenedRows.length > 0 ? (
                  <div className="p-2 space-y-1">
                  {flattenedRows.slice(0, 10).map((r, idx) => (
                    <div 
                      key={idx}
                      onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setSelectedPerson(r);
                         setShowSuggestions(false);
                      }}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <PhotoAvatar photoStr={r.foto} name={r.name} sizeClass="w-10 h-10 md:w-12 md:h-12 ring-1 ring-slate-100" />
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-bold text-slate-900 text-sm md:text-base truncate">{r.name}</p>
                            {r.kom && r.kom !== "-" && (
                               <span className="inline-flex items-center text-[9px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded tracking-wider border border-slate-200 flex-shrink-0">
                                {r.kom}
                              </span>
                            )}
                         </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center text-xs font-medium text-slate-500">
                              <MapPin className="w-3 h-3 mr-1 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{r.branch}</span>
                            </div>
                            <div className="flex items-center text-xs font-medium text-slate-400 border-l border-slate-200 pl-3">
                              <span className="truncate uppercase text-[9px] tracking-wider font-bold mr-1.5">Kamar:</span> 
                              <span className="font-bold text-slate-700">{r.room || "-"}</span>
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {flattenedRows.length > 10 && (
                    <div className="p-3 text-center text-xs font-bold text-slate-400 bg-slate-50/50 rounded-lg mt-1">
                      Menampilkan 10 dari {flattenedRows.length} hasil. Ketik lebih spesifik...
                    </div>
                  )}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Tidak ada kecocokan untuk "{search}".</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center bg-blue-50/50 rounded-2xl p-6 border border-blue-100 max-w-2xl mx-auto">
             <BadgeInfo className="w-6 h-6 text-blue-400 mx-auto mb-3" />
             <p className="text-sm text-blue-800 font-medium">
                Pencarian profil ini memudahkan Anda untuk menemukan rekan delegasi, alokasi penginapan, serta melihat susunan teman sekamar yang telah diatur oleh panitia.
             </p>
          </div>

        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex justify-start mb-8">
              <button 
                onClick={() => setSelectedPerson(null)}
                className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-xl transition-all border border-slate-200 shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali ke Pencarian
              </button>
          </div>
          
          {/* Selected Participant Hero Card */}
          <div className="bg-white rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 mb-10 flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start group">
            <PhotoAvatar photoStr={selectedPerson.foto} name={selectedPerson.name} sizeClass="w-32 h-32 md:w-44 md:h-44 ring-4 ring-slate-50 shadow-xl shadow-slate-200/50" />
            
            <div className="flex-1 text-center md:text-left flex flex-col w-full md:mt-2">
              <div className="flex justify-center md:justify-start gap-3 mb-5 flex-wrap">
                <div className="inline-flex items-center bg-slate-900 px-4 py-1.5 rounded-lg shadow-sm">
                  <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-400 mr-2">Kamar</span>
                  <span className="text-sm md:text-base font-black text-white">{selectedPerson.room}</span>
                </div>
                {selectedPerson.kom && selectedPerson.kom !== "-" && (
                    <div className="inline-flex items-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                      <span className="text-[10px] md:text-xs font-bold tracking-wider text-slate-700 uppercase">{selectedPerson.kom}</span>
                    </div>
                )}
                {selectedPerson.kategori && (
                    <div className="inline-flex items-center bg-transparent border border-slate-200 px-3 py-1.5 rounded-lg">
                      <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-500">{selectedPerson.kategori}</span>
                    </div>
                )}
              </div>
              
              <h3 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 leading-tight tracking-tight">{selectedPerson.name}</h3>
              
              <div className="flex flex-col gap-3 items-center md:items-start text-sm md:text-base text-slate-600 font-medium">
                <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2.5 text-slate-400" />
                    <span>{selectedPerson.branch}</span>
                </div>
                {selectedPerson.jabatan && selectedPerson.jabatan !== "-" && (
                    <div className="flex items-center">
                        <BadgeInfo className="w-4 h-4 mr-2.5 text-slate-400" />
                        <span>{selectedPerson.jabatan}</span>
                    </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
               <h3 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                  <Users className="w-6 h-6 text-slate-400" />
                  Rekan Sekamar
               </h3>
               <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{roommates.length} Orang</span>
            </div>
            
            {roommates.length > 0 ? (
              <div className="grid grid-flow-row grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                {roommates.map((mate, idx) => (
                  <div key={idx} className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5 hover:shadow-lg transition-all duration-300">
                    <PhotoAvatar photoStr={mate.foto} name={mate.name} sizeClass="w-20 h-20 md:w-20 md:h-20 shadow-md ring-1 ring-slate-100" />
                    
                    <div className="flex-1 w-full text-center sm:text-left min-w-0 flex flex-col justify-between h-full">
                      <div className="mb-4 sm:mb-0">
                          <p className="font-bold text-slate-900 text-lg mx-auto sm:mx-0 truncate mb-1.5">{mate.name}</p>
                          <div className="flex flex-col items-center sm:items-start gap-1.5 relative">
                             <p className="text-xs md:text-sm font-medium text-slate-500 truncate w-full">{mate.branch}</p>
                             {mate.kom && mate.kom !== "-" && (
                                 <span className="inline-block text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 mt-1 tracking-wider whitespace-nowrap">
                                    {mate.kom}
                                 </span>
                             )}
                          </div>
                      </div>
                      
                      <div className="flex gap-2 mt-5 sm:mt-4">
                        <div className="group/tooltip relative flex-1">
                          <a 
                            href={getWaLink(mate.wa, false)} target="_blank" rel="noopener noreferrer"
                            className="bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white px-3 py-2.5 rounded-xl transition-all flex items-center justify-center w-full shadow-sm border border-transparent hover:border-[#25D366]"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                          </a>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap shadow-lg">
                            Kirim Pesan WA
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                        
                        <div className="group/tooltip relative flex-1">
                          <a 
                            href={getWaLink(mate.wa, true)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 px-3 py-2.5 rounded-xl transition-all flex items-center justify-center w-full shadow-sm border border-slate-200"
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap shadow-lg">
                            Hubungi via Telepon
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-[2rem] p-12 border border-slate-200 border-dashed text-center flex flex-col items-center justify-center">
                <Users className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-600 font-medium text-lg">Belum ada rekan sekamar yang dialokasikan.</p>
                <p className="text-slate-400 mt-2">Data teman sekamar akan muncul setelah diurutkan oleh pantia.</p>
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

