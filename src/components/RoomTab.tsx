import { useState, useMemo } from "react";
import { SubmissionData, FlatAdminRow } from "../types";
import { getFlattenedRows } from "../lib/data-utils";
import { Search, MapPin, Phone, Users, ShieldAlert, BadgeInfo, Building2, Layers } from "lucide-react";
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

  const PhotoAvatar = ({ photoStr, name, sizeClass = "w-16 h-16", roundedClass = "rounded-full" }: { photoStr: string | undefined, name: string, sizeClass?: string, roundedClass?: string }) => {
    return (
      <div 
        className={`${sizeClass} ${roundedClass} overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:border-red-400 hover:shadow-md hover:scale-105 transition-all duration-300 flex-shrink-0 bg-slate-50 flex items-center justify-center relative group`}
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
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-in fade-in pb-12">
      {!selectedPerson ? (
        <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
          
          <div className="relative z-10 text-center mb-8 md:mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 mb-4 md:mb-6 shadow-sm">
              <Search className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">Pencarian Profil Peserta</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-lg mx-auto leading-relaxed px-4 md:px-0">
              Ketik nama lengkap atau cabang untuk melihat detail kepesertaan, alokasi kamar, dan rekan sekamar.
            </p>
          </div>
          
          <div className="relative mb-2 max-w-xl mx-auto group z-20">
            <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none transition-colors z-10">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 md:pl-14 pr-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-400 text-sm md:text-base transition-all placeholder:text-slate-400 text-slate-800 outline-none shadow-sm relative z-10"
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
          
          <div className="mt-8 md:mt-10 text-center bg-blue-50/50 rounded-2xl p-5 md:p-6 border border-blue-100 max-w-xl mx-auto">
             <BadgeInfo className="w-5 h-5 md:w-6 md:h-6 text-blue-400 mx-auto mb-2.5" />
             <p className="text-xs md:text-sm text-blue-800 font-medium px-2">
                Pencarian profil ini memudahkan Anda untuk menemukan rekan delegasi, alokasi penginapan, serta melihat susunan teman sekamar yang telah diatur oleh panitia.
             </p>
          </div>

        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex justify-start mb-6 md:mb-8">
              <button 
                onClick={() => setSelectedPerson(null)}
                className="text-xs md:text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2 bg-white hover:bg-slate-50 px-4 py-2 md:px-5 md:py-2.5 rounded-xl transition-all border border-slate-200 shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali ke Pencarian
              </button>
          </div>
          
          {/* Main Content Card */}
          <div className="bg-white rounded-[1.5rem] p-5 md:p-8 relative shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col group max-w-2xl mx-auto mb-10">
            {/* Selected Participant Hero Section */}
            <div className="flex gap-4 md:gap-8 items-start mb-6 md:mb-8">
              <div className="flex-shrink-0">
                  <PhotoAvatar photoStr={selectedPerson.foto} name={selectedPerson.name} sizeClass="w-24 h-24 md:w-36 md:h-36" roundedClass="rounded-[1rem] md:rounded-[1.25rem] shadow-sm ring-1 ring-slate-100" />
              </div>
              
              <div className="flex-1 flex flex-col w-full text-left pt-0.5">
                <div className="flex items-center justify-between mb-1.5 md:mb-3">
                  <div className="inline-flex items-center bg-[#2563eb] text-white px-2.5 py-1 md:px-3 md:py-1.5 rounded-[0.5rem] md:rounded-full font-bold text-[9px] md:text-xs tracking-wider shadow-sm uppercase">
                    {selectedPerson.room && selectedPerson.room !== "X" ? `KAMAR ${selectedPerson.room}` : "BELUM ADA KAMAR"}
                  </div>
                  <span className="text-slate-300 font-extrabold text-sm md:text-xl">#{selectedPerson.id ? selectedPerson.id.slice(-4).toUpperCase() : "1"}</span>
                </div>
                
                <h3 className="text-[22px] md:text-[28px] font-black text-[#1e293b] mb-1.5 md:mb-3 leading-tight tracking-tight truncate max-w-[190px] md:max-w-none">{selectedPerson.name}</h3>
                
                <div className="flex flex-col gap-1 md:gap-1.5 text-xs md:text-[15px] font-bold text-slate-500 mb-3 md:mb-5 items-start w-full">
                  <div className="flex items-center text-[#64748b]">
                     <Building2 className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] mr-1.5 md:mr-2 text-[#94a3b8] flex-shrink-0" />
                     <span className="uppercase truncate max-w-[180px] md:max-w-none">{selectedPerson.branch}</span>
                  </div>
                  {selectedPerson.kom && selectedPerson.kom !== "-" && (
                     <div className="flex items-center text-[#2563eb]">
                        <Layers className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] mr-1.5 md:mr-2 flex-shrink-0" />
                        <span className="truncate max-w-[180px] md:max-w-none">{selectedPerson.kom}</span>
                     </div>
                  )}
                </div>
                
                {/* Pills Container */}
                <div className="flex flex-wrap gap-1.5 md:gap-2 justify-start">
                   {selectedPerson.kategori && (
                      <div className="border border-slate-200 bg-white shadow-sm rounded-lg md:rounded-[0.5rem] px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold text-slate-700 whitespace-nowrap">
                        {selectedPerson.kategori}
                      </div>
                   )}
                   {selectedPerson.jabatan && selectedPerson.jabatan !== "-" && (
                      <div className="border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg md:rounded-[0.5rem] px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold whitespace-nowrap">
                        Jabatan: {selectedPerson.jabatan}
                      </div>
                   )}
                   <a href={getWaLink(selectedPerson.wa, false)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border border-[#25D366]/30 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1da851] rounded-lg md:rounded-[0.5rem] px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold transition-colors whitespace-nowrap">
                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      Hubungi
                   </a>
                </div>
              </div>
            </div>
            
            <div className="w-full h-[1.5px] bg-slate-50 my-2"></div>
            
            {/* Roommates Section */}
            <div className="flex flex-col mt-4">
              <div className="flex items-center gap-2 mb-4 px-1">
                 <Users className="w-4 h-4 md:w-5 md:h-5 text-[#94a3b8]" />
                 <h4 className="font-extrabold text-[#94a3b8] text-sm md:text-[15px]">Teman Sekamar</h4>
              </div>
              
              {roommates.length > 0 ? (
                <div className="flex flex-col gap-2.5 md:gap-3">
                  {roommates.map((mate, idx) => (
                    <div key={idx} className="bg-[#f8fafc] rounded-[1.25rem] p-3 md:p-4 border border-slate-100 hover:border-slate-200 flex items-center gap-3 md:gap-4 transition-all duration-300">
                      <PhotoAvatar photoStr={mate.foto} name={mate.name} sizeClass="w-12 h-12 md:w-14 md:h-14" roundedClass="rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.06)] ring-2 ring-white" />
                      
                      <div className="flex-1 min-w-0 pt-0.5">
                         <p className="font-bold text-[#1e293b] text-sm md:text-[15px] truncate mb-0.5">{mate.name}</p>
                         <p className="text-[10px] md:text-xs font-bold text-[#94a3b8] truncate uppercase tracking-wide">{mate.branch}</p>
                      </div>
                      
                      <a 
                        href={getWaLink(mate.wa, false)} target="_blank" rel="noopener noreferrer"
                        className="w-[34px] h-[34px] md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white hover:bg-emerald-50 text-[#1da851] transition-colors flex-shrink-0 shadow-sm border border-emerald-100 ring-2 ring-transparent hover:ring-emerald-50"
                        title="Chat WA"
                      >
                        <svg className="w-5 h-5 md:w-[22px] md:h-[22px]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#f8fafc] rounded-[1.25rem] p-6 border border-slate-100 border-dashed text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-xs md:text-sm">Belum ada rekan sekamar.</p>
                </div>
              )}
            </div>
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

