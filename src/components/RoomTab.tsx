import { useState, useMemo, useEffect, useRef } from "react";
import { SubmissionData, FlatAdminRow } from "../types";
import { getFlattenedRows } from "../lib/data-utils";
import { 
  Search, 
  MapPin, 
  Phone, 
  Users, 
  ShieldAlert, 
  Building2, 
  Layers, 
  X, 
  Hash, 
  ArrowLeft, 
  UserRound,
  DoorOpen,
  Plus
} from "lucide-react";
import { formatWA } from "../lib/pdf-utils";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  submissions: SubmissionData[];
}

export function RoomTab({ submissions }: Props) {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<FlatAdminRow | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Auto select if only one result
  useEffect(() => {
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
      "from-[#ef4444] to-[#f87171]", 
      "from-[#3b82f6] to-[#60a5fa]", 
      "from-[#10b981] to-[#34d399]", 
      "from-[#f59e0b] to-[#fbbf24]", 
      "from-[#6366f1] to-[#818cf8]", 
      "from-[#a855f7] to-[#c084fc]", 
      "from-[#ec4899] to-[#f472b6]", 
      "from-[#14b8a6] to-[#2dd4bf]"
    ];
    const code = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cb = colors[code % colors.length];
    return (
      <div className={`w-full h-full flex justify-center items-center text-white font-extrabold text-2xl bg-gradient-to-br ${cb}`}>
        {init}
      </div>
    );
  };

  const PhotoAvatar = ({ 
    photoStr, 
    name, 
    sizeClass = "w-16 h-16", 
    roundedClass = "rounded-full" 
  }: { 
    photoStr: string | undefined, 
    name: string, 
    sizeClass?: string, 
    roundedClass?: string 
  }) => {
    return (
      <div 
        className={`${sizeClass} ${roundedClass} overflow-hidden border-2 border-slate-150 shadow-sm cursor-pointer hover:border-red-500 hover:shadow-md transition-all duration-300 flex-shrink-0 bg-slate-50 flex items-center justify-center relative group`}
        onClick={(e) => {
          e.stopPropagation();
          if (photoStr) setPreviewPhoto(photoStr);
        }}
      >
        {photoStr ? (
          <img 
            src={photoStr} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" 
          />
        ) : (
          generateInitialPhoto(name)
        )}
        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-[1px]">Zoom</span>
        </div>
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[60] pointer-events-none">
           Klik untuk foto penuh
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

  const getCommissionBadge = (kom: string) => {
    if (!kom || kom === "-") return null;
    const cleanKom = kom.toUpperCase();
    if (cleanKom.includes("KOMISI A") || cleanKom === "A") {
      return (
        <span className="inline-flex items-center text-[9px] md:text-[10px] font-extrabold text-[#e11d48] bg-rose-50 border border-rose-100 px-2 my-0.5 py-0.5 rounded-full uppercase tracking-wider">
          {kom}
        </span>
      );
    }
    if (cleanKom.includes("KOMISI B") || cleanKom === "B") {
      return (
        <span className="inline-flex items-center text-[9px] md:text-[10px] font-extrabold text-[#d97706] bg-amber-50 border border-amber-100 px-2 my-0.5 py-0.5 rounded-full uppercase tracking-wider">
          {kom}
        </span>
      );
    }
    if (cleanKom.includes("KOMISI C") || cleanKom === "C") {
      return (
        <span className="inline-flex items-center text-[9px] md:text-[10px] font-extrabold text-[#059669] bg-emerald-50 border border-emerald-100 px-2 my-0.5 py-0.5 rounded-full uppercase tracking-wider">
          {kom}
        </span>
      );
    }
    if (cleanKom.includes("KOMISI D") || cleanKom === "D") {
      return (
        <span className="inline-flex items-center text-[9px] md:text-[10px] font-extrabold text-[#2563eb] bg-blue-50 border border-blue-100 px-2 my-0.5 py-0.5 rounded-full uppercase tracking-wider">
          {kom}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[9px] md:text-[10px] font-extrabold text-[#475569] bg-slate-50 border border-slate-100 px-2 my-0.5 py-0.5 rounded-full uppercase tracking-wider">
        {kom}
      </span>
    );
  };

  const getGenderText = (jk: string) => {
    if (!jk) return "-";
    const cleanJK = jk.toUpperCase();
    if (cleanJK === "L" || cleanJK.includes("LAKI")) return "Laki-laki";
    if (cleanJK === "P" || cleanJK.includes("PEREMPUAN") || cleanJK.includes("WANITA")) return "Perempuan";
    return jk;
  };

  // Highlights search queries in strings
  const highlightText = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    try {
      const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi"));
      return (
        <span>
          {parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() ? (
              <span key={i} className="bg-yellow-100 text-yellow-800 font-bold px-0.5 rounded">{part}</span>
            ) : (
              part
            )
          )}
        </span>
      );
    } catch (e) {
      return <span>{text}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {!selectedPerson ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 md:p-12 rounded-[2rem] shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-slate-100 relative"
        >
          {/* Decorative Elements bounded in absolute wrapper */}
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none z-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/[0.03] rounded-full blur-3xl -mr-24 -mt-24" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/[0.02] rounded-full blur-3xl -ml-28 -mb-28" />
          </div>
          
          <div className="relative z-10 text-center mb-6 md:mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="https://github.com/edibrata/image/blob/main/Logo%20PGRI%20Official%20Full.png?raw=true"
                alt="Logo PGRI"
                referrerPolicy="no-referrer"
                className="h-16 md:h-20 w-auto object-contain drop-shadow-md select-none pointer-events-none"
              />
            </div>
            <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 tracking-tight leading-tight">
              Sistem Informasi Peserta
            </h2>
            <div className="w-12 h-1 bg-red-650 mx-auto mt-4 rounded-full" />
          </div>
          
          {/* Search Bar Container */}
          <div className="relative mb-4 max-w-xl mx-auto z-30">
            <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none transition-colors z-10">
              <Search className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-[#ef4444] transition-colors" />
            </div>
            
            <input
              ref={inputRef}
              type="text"
              className="block w-full pl-11 pr-11 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-100 focus:border-red-500 text-xs md:text-sm tracking-wide transition-all placeholder:text-slate-400 text-slate-800 outline-none shadow-[0_2px_8px_rgba(0,0,0,0.01)] relative z-10 font-medium"
              placeholder="Ketik nama lengkap atau cabang utusan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 220)}
            />

            {/* Clear Search Button */}
            {search.length > 0 && (
              <button
                onClick={() => {
                  setSearch("");
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors z-20 cursor-pointer"
              >
                <X className="h-4.5 w-4.5 bg-slate-100 hover:bg-slate-200 p-0.5 rounded-full transition-colors" />
              </button>
            )}

            {/* Dropdown Suggestions popup */}
            <AnimatePresence>
              {search.length > 0 && showSuggestions && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-3.5 bg-white border border-slate-150/80 shadow-[0_12px_45px_rgba(0,0,0,0.08)] rounded-xl md:rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto custom-scrollbar z-50 text-left"
                >
                  {flattenedRows.length > 0 ? (
                    <div className="p-2 space-y-1">
                      <div className="px-3.5 py-2 border-b border-slate-50 mb-1 flex items-center justify-between bg-slate-50/50">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Delegasi Ditemukan</span>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-full">{Math.min(10, flattenedRows.length)} / {flattenedRows.length}</span>
                      </div>
                      
                      {flattenedRows.slice(0, 10).map((r, idx) => (
                        <div 
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevents input blur race condition on mobiles
                          }}
                          onClick={() => {
                            setSelectedPerson(r);
                            setShowSuggestions(false);
                          }}
                          className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all duration-200 group/item"
                        >
                          <PhotoAvatar photoStr={r.foto} name={r.name} sizeClass="w-10 h-10 md:w-11 md:h-11 ring-2 ring-white shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 pb-1 border-b border-dashed border-slate-100 mb-1">
                              <p className="font-bold text-slate-800 text-xs md:text-sm group-hover/item:text-red-650 transition-colors truncate leading-tight">
                                {highlightText(r.name, search)}
                              </p>
                              {r.kom && r.kom !== "-" && (
                                <span className="inline-flex items-center text-[8px] md:text-[9px] font-extrabold uppercase text-red-600 bg-red-50 border border-red-100/30 px-1.5 py-0.5 rounded flex-shrink-0 leading-none">
                                  {r.kom}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <div className="flex items-center text-[10px] md:text-xs font-semibold text-slate-500">
                                <MapPin className="w-3 h-3 mr-0.5 text-slate-450 flex-shrink-0" />
                                <span className="truncate max-w-[130px] md:max-w-[180px] uppercase tracking-wide">
                                  {highlightText(r.branch, search)}
                                </span>
                              </div>
                              {r.room && r.room !== "-" && r.room !== "X" && r.room !== "Waiting List" && (
                                <div className="flex items-center text-[9px] md:text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100/40 px-1.5 py-0.5 rounded-md flex-shrink-0">
                                  <DoorOpen className="w-2.5 h-2.5 mr-1 text-blue-400 flex-shrink-0" />
                                  <span className="uppercase text-[8px] tracking-wider font-extrabold text-blue-400 mr-1">KAMAR</span> 
                                  <span className="font-extrabold text-blue-700">{r.room}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {flattenedRows.length > 10 && (
                        <div className="p-3 text-center text-[10px] font-semibold text-slate-400 bg-slate-50/50 rounded-xl mt-1.5 border border-dashed border-slate-100">
                          Menampilkan 10 dari {flattenedRows.length} hasil. Ketik lebih spesifik...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4">
                      <ShieldAlert className="w-8 h-8 text-[#cbd5e1] mx-auto mb-2.5" />
                      <p className="text-slate-500 font-bold text-xs md:text-sm">Tidak ada delegasi tercatat untuk "{search}".</p>
                      <p className="text-[10px] text-slate-400/80 font-medium mt-1">Coba ketik bagian nama lengkap Anda secara terpisah.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Info Badge Container */}
          <div className="mt-6 bg-gradient-to-r from-red-50/25 to-blue-50/15 rounded-2xl p-3 md:py-3.5 md:px-5 border border-slate-100 max-w-lg mx-auto text-center shadow-[0_1px_4px_rgba(0,0,0,0.015)]">
            <p className="text-[11px] md:text-xs leading-relaxed text-slate-600 font-medium">
              Cari data delegasi, cek alokasi penginapan dan nomor kamar, serta temukan rekan sekamar Anda dengan mudah dan cepat.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, type: "spring", damping: 25 }}
          className="space-y-6"
        >
          {/* Back Action Header */}
          <div className="flex justify-start">
            <button 
              onClick={() => {
                setSelectedPerson(null);
                setSearch("");
              }}
              className="text-xs md:text-sm font-bold text-slate-650 hover:text-slate-900 flex items-center gap-2 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl transition-all border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Kembali ke Pencarian
            </button>
          </div>
          
          {/* Delegate Pass / Card */}
          <div className="bg-white rounded-[2rem] border border-slate-100 relative shadow-[0_12px_40px_rgba(15,23,42,0.04)] overflow-hidden max-w-2xl mx-auto">
            {/* Top Red-Orange elegant gradient header strip */}
            <div className="h-2.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 w-full" />
            
            <div className="p-6 md:p-10 relative">
              {/* Removed watermark */}

              {/* Header Badge */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100/80">
                <div className="flex items-center gap-2">
                  <img
                    src="https://github.com/edibrata/image/blob/main/Logo%20PGRI%20Official%20Full.png?raw=true"
                    alt="Logo Mini"
                    referrerPolicy="no-referrer"
                    className="h-6 w-auto object-contain filter grayscale opacity-80"
                  />
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] block leading-none mb-0.5">PROFIL PESERTA</span>
                    <span className="text-[10px] font-black text-red-650 tracking-wide uppercase leading-none">KONKERKAB 1 PGRI 2026</span>
                  </div>
                </div>
                {/* ID Badge */}
                <div className="bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-250">
                  <span className="font-mono text-slate-500 font-extrabold text-[10px] tracking-widest">
                    ID: #{selectedPerson.id ? selectedPerson.id.slice(-5).toUpperCase() : "10001"}
                  </span>
                </div>
              </div>

              {/* Main Content Info */}
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start relative z-10">
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <PhotoAvatar 
                    photoStr={selectedPerson.foto} 
                    name={selectedPerson.name} 
                    sizeClass="w-32 h-32 md:w-36 md:h-36" 
                    roundedClass="rounded-3xl md:rounded-2xl shadow-md ring-4 ring-slate-100/80 border border-slate-200" 
                  />
                </div>
                
                <div className="flex-1 w-full text-center md:text-left space-y-4">
                  <div>
                    <h3 className="text-xl md:text-2.5xl font-black text-slate-900 leading-tight mb-2">
                      {selectedPerson.name}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="inline-flex items-center text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-100/60 px-2 py-0.5 rounded-md">
                        {selectedPerson.kategori || "PESERTA CABANG"}
                      </span>
                      {selectedPerson.kom && getCommissionBadge(selectedPerson.kom)}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 pt-3 border-t border-b border-dashed border-slate-200/80 text-left">
                    <div className="flex items-center gap-3 p-1.5 bg-slate-50/40 rounded-xl border border-slate-100">
                      <div className="p-2 bg-white text-slate-400 rounded-lg flex-shrink-0 shadow-sm border border-slate-100">
                        <Building2 className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none mb-0.5">Utusan</span>
                        <span className="text-xs font-black text-slate-700 uppercase block truncate">
                          {selectedPerson.branch}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-1.5 bg-slate-50/40 rounded-xl border border-slate-100">
                      <div className="p-2 bg-white text-slate-400 rounded-lg flex-shrink-0 shadow-sm border border-slate-100">
                        <UserRound className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none mb-0.5">Jabatan</span>
                        <span className="text-xs font-black text-slate-705 block truncate uppercase">
                          {selectedPerson.jabatan || "UTUSAN CABANG"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-1.5 bg-slate-50/40 rounded-xl border border-slate-100">
                      <div className="p-2 bg-white text-slate-400 rounded-lg flex-shrink-0 shadow-sm border border-slate-100">
                        <Users className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none mb-0.5">Gender</span>
                        <span className="text-xs font-black text-slate-700 block transition-all capitalize block truncate">
                          {getGenderText(selectedPerson.jk)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-1.5 bg-slate-50/40 rounded-xl border border-slate-100">
                      <div className="p-2 bg-white text-slate-400 rounded-lg flex-shrink-0 shadow-sm border border-slate-100">
                        <DoorOpen className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none mb-0.5">Kamar</span>
                        <span className={`text-xs font-black block truncate ${selectedPerson.room && selectedPerson.room !== "X" && selectedPerson.room !== "Waiting List" ? "text-blue-600" : "text-amber-600 uppercase font-extrabold"}`}>
                          {selectedPerson.room && selectedPerson.room !== "X" && selectedPerson.room !== "Waiting List" ? `KAMAR ${selectedPerson.room}` : "Belum Ditentukan"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="relative group pt-2 w-full">
                    <a 
                      href={getWaLink(selectedPerson.wa, false)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fbc57] text-white rounded-xl px-5 py-3.5 text-xs font-black shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-center cursor-pointer uppercase tracking-wider select-none"
                    >
                      <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                      </svg>
                      Hubungi WhatsApp
                    </a>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-black rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 shadow-md whitespace-nowrap z-50 uppercase tracking-wider leading-none select-none pointer-events-none">
                      Hubungi {selectedPerson.name} via WhatsApp
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Roommates Card Footer section */}
            <div className="bg-[#f8fafc] border-t border-slate-100 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-4 h-4 text-blue-700" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm md:text-base">
                  Rekan Sekamar
                </h4>
                {selectedPerson.room && selectedPerson.room !== "X" && selectedPerson.room !== "Waiting List" && (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 border border-blue-200/40 rounded-full px-3 py-1 uppercase tracking-wider ml-auto">
                    Kamar {selectedPerson.room}
                  </span>
                )}
              </div>
              
              {roommates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roommates.map((mate, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedPerson(mate)}
                      className="bg-white rounded-2xl p-4 border border-slate-150 hover:border-red-400/[0.25] hover:bg-slate-50/[0.3] transition-all duration-300 shadow-[0_2px_6px_rgba(0,0,0,0.015)] flex items-center justify-between gap-3 group/mate cursor-pointer hover:shadow-md hover:-translate-y-1 active:scale-[0.98] animate-fade-in relative z-10 hover:z-20"
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 invisible group-hover/mate:opacity-100 group-hover/mate:visible transition-all whitespace-nowrap z-[60] pointer-events-none">
                         Klik untuk melihat detail {mate.name}
                      </div>

                      <div className="flex items-center gap-3 min-w-0">
                        <PhotoAvatar photoStr={mate.foto} name={mate.name} sizeClass="w-11 h-11" roundedClass="rounded-full shadow-sm ring-2 ring-white" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs md:text-sm truncate group-hover/mate:text-red-650 transition-colors">
                            {mate.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-450 mt-1 uppercase tracking-wide truncate">
                            <span className="text-slate-500 truncate max-w-[80px]">{mate.branch}</span>
                            {mate.kom && mate.kom !== "-" && (
                              <>
                                <span className="h-1 w-1 bg-slate-300 rounded-full" />
                                <span className="text-red-500 truncate">{mate.kom}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 relative group/tool">
                        <a 
                          href={getWaLink(mate.wa, false)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-150 hover:border-emerald-200 text-slate-500 hover:text-emerald-600 transition-all duration-300 hover:scale-110 shadow-sm cursor-pointer select-none"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                          </svg>
                        </a>
                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-black rounded-md opacity-0 pointer-events-none group-hover/tool:opacity-100 group-hover/tool:-translate-y-0.5 transition-all duration-200 shadow-md whitespace-nowrap z-50 select-none uppercase tracking-wide">
                          Hubungi {mate.name} via WhatsApp
                          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 border-dashed text-center flex flex-col items-center justify-center shadow-sm">
                  <div className="p-3 bg-slate-50 text-slate-300 rounded-full mb-3">
                    <ShieldAlert className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-800 font-bold text-xs md:text-sm">Belum Ada Teman Sekamar</p>
                  <p className="text-[10.5px] text-slate-400 font-medium max-w-[280px] mx-auto mt-1 leading-relaxed">
                    Delegasi sekamar untuk status Anda saat ini belum terekam, masih terisi tunggal, atau alokasi sedang diproses.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Image Modal Full Screen */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 focus:outline-none"
            onClick={() => setPreviewPhoto(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-xl w-full" 
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={previewPhoto} 
                alt="Preview" 
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10 mx-auto" 
              />
              <button 
                className="absolute -top-12 right-2 md:-right-12 w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full flex items-center justify-center transition-all border border-white/10 shadow-lg cursor-pointer hover:rotate-90 duration-300"
                onClick={() => setPreviewPhoto(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
