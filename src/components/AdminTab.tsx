import React, { useState, useMemo } from 'react';
import { SubmissionData, FlatAdminRow } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { CUSTOM_APP_ID } from '../lib/constants';
import { toProperCase, formatWA } from '../lib/pdf-utils';
import { Eye, EyeOff, Download, Printer, LogOut, Search, Trash2 } from 'lucide-react';
import { 
    executeExcelExport, 
    executeRoomMappingPDF, 
    executeTshirtRecapPDF, 
    executeTshirtReceiptPDF, 
    executeMasterKomisiPDF, 
    executeSidangKomisiPDF, 
    executeAttendancePDF, 
    executePlenoAttendancePDF 
} from '../lib/export-utils';
import { downloadFullPDF, drawSingleCard, getTimestamp } from '../lib/pdf-utils';

interface Props {
    submissions: SubmissionData[];
    isRegistrationOpen: boolean;
    showModal: (title: string, message: string, type: 'success' | 'error') => void;
    onViewPrevew: (imgData: string) => void;
    onEditEntry: (docId: string) => void;
}

export function AdminTab({ submissions, isRegistrationOpen, showModal, onViewPrevew, onEditEntry }: Props) {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('pgri_admin_pass'));
    const [password, setPassword] = useState(localStorage.getItem('pgri_admin_pass') || '');
    const [showPass, setShowPass] = useState(false);
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('pgri_admin_pass'));

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'ts', dir: -1 });
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [showExportModal, setShowExportModal] = useState(false);
    const [activeRowActions, setActiveRowActions] = useState<string | null>(null);

    const checkAdmin = () => {
        if (password === 'adminpgri') {
            if (rememberMe) localStorage.setItem('pgri_admin_pass', password);
            setIsLoggedIn(true);
        } else {
            showModal("AKSES DITOLAK", "Password salah.", "error");
        }
    };

    const logout = () => {
        setIsLoggedIn(false);
        setPassword('');
        localStorage.removeItem('pgri_admin_pass');
    };

    const toggleRegistration = async () => {
        if (!confirm(`Ubah status pendaftaran menjadi ${isRegistrationOpen ? 'TUTUP' : 'BUKA'}?`)) return;
        showModal("MEMPROSES", "Mengubah status pendaftaran...", "success");
        try {
            await setDoc(doc(db, 'artifacts', CUSTOM_APP_ID, 'public', 'settings'), { isOpen: !isRegistrationOpen }, { merge: true });
            showModal("BERHASIL", "Status pendaftaran berhasil diubah.", "success");
        } catch(e: any) {
            showModal("ERROR", e.message, "error");
        }
    };

    const flattenedRows = useMemo(() => {
        let allPeserta: FlatAdminRow[] = [];
        let others: FlatAdminRow[] = [];
        
        submissions.forEach(sub => {
            const normalizedKat = sub.kategori && sub.kategori.toUpperCase().includes("PESERTA") ? "PESERTA CABANG" : (sub.kategori || "");
            for(let i=1; i<=4; i++) {
                const nm = (sub as any)[`p${i}_nama`] || ""; if(!nm) continue; 
                if(filter && normalizedKat !== filter) continue;
                if(search && ![sub.nama_cabang, nm, sub.kategori].some(x=>x?.toLowerCase().includes(search.toLowerCase()))) continue;
                
                const pData: FlatAdminRow = { 
                    id: sub.id!, sD: sub, i, branch: (normalizedKat === 'PENINJAU' ? (sub.nama_cabang || "").replace("PENINJAU - ", "") : (sub.nama_cabang || "TANPA CABANG")), 
                    name: nm, jabatan: (sub as any)[`p${i}_jabatan`] || "-", jk: (sub as any)[`p${i}_jk`] || "LAKI-LAKI", foto: (sub as any)[`p${i}_foto`], wa: (sub as any)[`p${i}_wa`] || "-", 
                    kom: (sub as any)[`p${i}_komisi`] || "-", token: sub.revision_token || "-", ts: sub.waktu_simpan || "-", 
                    kategori: normalizedKat, mandat: sub.link_mandat || "-"
                };
                
                if(normalizedKat === "PESERTA CABANG") allPeserta.push(pData);
                else others.push(pData);
            }
        });

        // Room Logic Peserta Cabang (Pooling Gender)
        const males = allPeserta.filter(p => p.jk === 'LAKI-LAKI').sort((a,b) => a.branch.localeCompare(b.branch));
        const females = allPeserta.filter(p => p.jk === 'PEREMPUAN').sort((a,b) => a.branch.localeCompare(b.branch));
        
        let currentRoom = 1;
        males.forEach((p, idx) => {
            p.room = (p.sD as any)[`p${p.i}_room_override`] || Math.floor(idx / 4) + currentRoom;
        });
        if(males.length > 0) currentRoom += Math.ceil(males.length / 4);

        females.forEach((p, idx) => {
            p.room = (p.sD as any)[`p${p.i}_room_override`] || Math.floor(idx / 4) + currentRoom;
        });

        others.forEach(p => {
            p.room = (p.sD as any)[`p${p.i}_room_override`] || "X";
        });

        const rows = [...allPeserta, ...others];
        
        rows.sort((a, b) => { 
            const key = sortConfig.key as keyof FlatAdminRow | 'kaos' | 'idx';
            let vA, vB; 
            if(key==='kaos') { vA = (a.sD as any)[`p${a.i}_kaos`] || ""; vB = (b.sD as any)[`p${b.i}_kaos`] || ""; } 
            else if(key==='idx') { vA = 0; vB = 0; }
            else { vA = a[key as keyof FlatAdminRow] || ""; vB = b[key as keyof FlatAdminRow] || ""; } 
            return (vA < vB ? -1 : 1) * sortConfig.dir; 
        });

        return rows;
    }, [submissions, search, filter, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(prev => prev.key === key ? { key, dir: prev.dir * -1 } : { key, dir: 1 });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(new Set(flattenedRows.map(r => `${r.id}|${r.i}|${r.kategori}`)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleSelectRow = (val: string) => {
        const newSet = new Set(selectedRows);
        if (newSet.has(val)) newSet.delete(val);
        else newSet.add(val);
        setSelectedRows(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return;
        if (!confirm(`Hapus ${selectedRows.size} data terpilih?`)) return;
        showModal("MEMPROSES", "Sedang menghapus data...", "success");
        try {
            const groups: Record<string, { cat: string, indices: number[] }> = {};
            selectedRows.forEach(s => {
                const parts = s.split('|'); 
                const id = parts[0]; const idx = parseInt(parts[1]); const cat = parts[2];
                if (!groups[id]) groups[id] = { cat, indices: [] };
                groups[id].indices.push(idx);
            });

            for (const docId in groups) {
                const group = groups[docId];
                const fullData = submissions.find(x => x.id === docId);
                if (!fullData) continue;
                let totalParticipantsInDoc = 0;
                for (let i = 1; i <= 4; i++) if ((fullData as any)[`p${i}_nama`]) totalParticipantsInDoc++;
                const isAllChecked = group.indices.length >= totalParticipantsInDoc;
                const isCollective = group.cat.includes("PESERTA");
                if (!isCollective || isAllChecked) {
                    await deleteDoc(doc(db, 'artifacts', CUSTOM_APP_ID, 'public', 'data', 'pendaftar', docId));
                } else {
                    const updateObj: any = {};
                    group.indices.forEach(idx => {
                        updateObj[`p${idx}_nama`] = ""; updateObj[`p${idx}_jabatan`] = "";
                        updateObj[`p${idx}_jk`] = ""; updateObj[`p${idx}_wa`] = "";
                        updateObj[`p${idx}_kaos`] = ""; updateObj[`p${idx}_foto`] = "";
                        updateObj[`p${idx}_room_override`] = ""; updateObj[`p${idx}_komisi`] = "";
                    });
                    await updateDoc(doc(db, 'artifacts', CUSTOM_APP_ID, 'public', 'data', 'pendaftar', docId), updateObj);
                }
            }
            showModal("BERHASIL", "Data telah dihapus.", "success");
            setSelectedRows(new Set());
        } catch (e: any) { showModal("ERROR", e.message, "error"); }
    };

    const updateRoom = async (id: string, idx: number, val: string) => {
        const updateVal = val.toUpperCase().trim();
        await updateDoc(doc(db, 'artifacts', CUSTOM_APP_ID, 'public', 'data', 'pendaftar', id), { [`p${idx}_room_override`]: updateVal }); 
    };

    const resetToken = async (id: string) => {
        if(confirm("Reset token revisi?")) { 
            await updateDoc(doc(db, 'artifacts', CUSTOM_APP_ID, 'public', 'data', 'pendaftar', id), { revision_token: Math.random().toString(36).substring(2, 8).toUpperCase() }); 
        }
    };

    const copyToken = (t: string) => {
        navigator.clipboard.writeText(t);
        showModal("BERHASIL", "Token disalin.", "success");
    };

    const downloadCardImg = async (r: FlatAdminRow) => {
        const d = await drawSingleCard(r.name, r.kategori.includes("PESERTA") ? r.branch : r.jabatan, r.foto, r.kategori);
        const link = document.createElement('a'); 
        link.href = d; 
        link.download = `Konkerkab-1 ID Card ${r.name} ${getTimestamp()}.jpg`; 
        link.click();
    };

    const handlePreview = async (r: FlatAdminRow) => {
        const d = await drawSingleCard(r.name, r.kategori.includes("PESERTA") ? r.branch : r.jabatan, r.foto, r.kategori);
        onViewPrevew(d);
    };

    if (!isLoggedIn) {
        return (
            <div className="max-w-md mx-auto py-10">
                <div className="bg-white p-8 rounded border shadow-lg text-center">
                    <img src="https://raw.githubusercontent.com/edibrata/image/main/Logo%20PGRI%20Official%20Full.png" alt="Logo" className="h-16 w-auto mx-auto mb-6" />
                    <h2 className="text-xl font-bold mb-6 uppercase">Akses Administrator</h2>
                    <div className="relative mb-4">
                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded border text-center font-black pr-12 text-lg tracking-widest outline-none focus:ring-2 focus:ring-slate-900" placeholder="KATA SANDI" />
                        <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-6 justify-center">
                        <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded text-red-600" />
                        <label htmlFor="rememberMe" className="text-xs font-bold uppercase text-slate-500 cursor-pointer">Ingat Saya</label>
                    </div>
                    <button onClick={checkAdmin} className="w-full bg-slate-900 text-white font-bold py-3 rounded text-xs uppercase shadow-md hover:bg-black transition-all cursor-pointer">Masuk Database</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in" onClick={() => setActiveRowActions(null)}>
            <div className="bg-white p-6 rounded-lg border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-auto flex items-center gap-3">
                    <h2 className="text-xl font-black text-slate-800 uppercase">Database</h2>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari data..." className="px-2 py-1 text-xs focus:outline-none bg-transparent w-36 font-bold" />
                        <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-100 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">{flattenedRows.length} DATA</span>
                    </div>
                    <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded text-[10px] focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 font-bold uppercase cursor-pointer">
                        <option value="">SEMUA KATEGORI</option>
                        <option value="PESERTA CABANG">PESERTA CABANG</option>
                        <option value="PANITIA">PANITIA</option>
                        <option value="PENINJAU">PENINJAU</option>
                    </select>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                        {selectedRows.size > 0 && (
                            <button onClick={handleBulkDelete} className="h-9 px-3 flex items-center gap-2 rounded-lg bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 transition-all shadow-sm tooltip-container">
                                <Trash2 className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Hapus</span>
                                <span className="w-5 h-5 flex items-center justify-center bg-rose-600 text-white text-[9px] font-black rounded-full leading-none">{selectedRows.size}</span>
                                <span className="tooltip-text" style={{width: 'auto'}}>Hapus Terpilih</span>
                            </button>
                        )}
                        <button onClick={() => showModal("Maaf", "Cetak massal dinonaktifkan di versi preview ini agar tidak membebani memori browser.", "error")} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all shadow-sm tooltip-container">
                            <Printer className="h-4 w-4" />
                            <span className="tooltip-text" style={{width: 'auto'}}>Cetak Massal</span>
                        </button>
                        <button onClick={() => setShowExportModal(true)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm tooltip-container">
                            <Download className="h-4 w-4" />
                            <span className="tooltip-text" style={{width: 'auto'}}>Ekspor Data</span>
                        </button>
                        <button onClick={toggleRegistration} className={`h-9 px-3 flex items-center gap-2 rounded-lg border transition-all shadow-sm tooltip-container ${isRegistrationOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{isRegistrationOpen ? 'BUKA' : 'TUTUP'}</span>
                            <span className="tooltip-text" style={{width: 'auto'}}>Status Pendaftaran</span>
                        </button>
                    </div>
                    <button onClick={logout} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm tooltip-container">
                        <LogOut className="h-4 w-4" />
                        <span className="tooltip-text" style={{width: 'auto'}}>Keluar</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1500px]">
                    <thead className="bg-slate-100 sticky top-0 z-30 border-b shadow-sm">
                        <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">
                            <th className="px-4 py-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={selectedRows.size > 0 && selectedRows.size === flattenedRows.length} className="rounded text-red-600 focus:ring-0 cursor-pointer" /></th>
                            <th className="px-4 py-4 w-12 sortable" onClick={() => handleSort('idx')}>No</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('ts')}>Waktu Daftar</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('kategori')}>Kategori</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('branch')}>Entitas</th>
                            <th className="px-4 py-4">Foto</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('name')}>Nama Peserta</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('jabatan')}>Jabatan</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('jk')}>JK</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('kom')}>Komisi</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('wa')}>WhatsApp</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('kaos')}>Kaos</th>
                            <th className="px-4 py-4 sortable" onClick={() => handleSort('room')}>Kamar</th>
                            <th className="px-4 py-4">Surat Mandat</th>
                            <th className="px-4 py-4 w-40 sortable" onClick={() => handleSort('token')}>Token</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
                        {flattenedRows.map((r, idx) => {
                            const rowVal = `${r.id}|${r.i}|${r.kategori}|${idx}`;
                            const isActionActiveN = activeRowActions === `n_${r.id}_${r.i}`;
                            const isActionActiveT = activeRowActions === `t_${r.id}_${r.i}`;
                            const waMsg = encodeURIComponent(`Yth. \n${r.jk === 'LAKI-LAKI' ? 'Bapak' : 'Ibu'} *${toProperCase(r.name)}*,\n\nKami sampaikan bahwa ...\n\nDemikian, harap maklum.\n\n------------\nAdmin Konkerkab-1\n------------`);

                            return (
                                <tr key={rowVal} className="hover:bg-slate-50 border-b text-center">
                                    <td className="px-4 py-3"><input type="checkbox" checked={selectedRows.has(rowVal)} onChange={() => handleSelectRow(rowVal)} className="rounded text-red-600 focus:ring-0 cursor-pointer" /></td>
                                    <td className="px-4 py-3 text-slate-300 font-bold">{idx + 1}</td>
                                    <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{r.ts}</td>
                                    <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-bold uppercase">{r.kategori}</span></td>
                                    <td className="px-4 py-3 font-bold uppercase text-center">{r.branch}</td>
                                    <td className="px-4 py-3 text-center"><img src={r.foto || 'https://via.placeholder.com/150x200?text=FOTO'} className="w-10 h-14 object-cover rounded border mx-auto" alt="" /></td>
                                    
                                    <td className="px-4 py-3 font-black text-slate-900 uppercase relative h-14">
                                        <div className="cursor-pointer hover:text-red-600 hover:underline transition-all flex items-center justify-center h-full w-full" onClick={(e) => { e.stopPropagation(); setActiveRowActions(`n_${r.id}_${r.i}`); }}>
                                           <span>{r.name}</span>
                                        </div>
                                        {isActionActiveN && (
                                            <div className="absolute inset-0 bg-white/95 z-40 flex flex-row items-center justify-center gap-2 border-x border-slate-100 transition-all">
                                                <button onClick={() => handlePreview(r)} className="p-2 bg-slate-50 text-slate-600 rounded-full border hover:scale-110 cursor-pointer">P</button>
                                                <button onClick={() => downloadFullPDF(r.id, r.sD)} className="p-2 bg-red-50 text-red-600 rounded-full border hover:scale-110 cursor-pointer">PDF</button>
                                                <button onClick={() => downloadCardImg(r)} className="p-2 bg-emerald-50 text-emerald-600 rounded-full border hover:scale-110 cursor-pointer">IMG</button>
                                                <button onClick={() => onEditEntry(r.id)} className="p-2 bg-blue-50 text-blue-600 rounded-full border hover:scale-110 cursor-pointer">EDT</button>
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 uppercase text-[10px] text-slate-500 text-center">{r.jabatan}</td>
                                    <td className="px-4 py-3 font-bold text-center">{r.jk === 'LAKI-LAKI' ? 'L' : 'P'}</td>
                                    <td className="px-4 py-3 font-black text-blue-600 text-[10px]">{r.kom}</td>
                                    <td className="px-4 py-3 text-center"><a href={`https://wa.me/${formatWA(r.wa)}?text=${waMsg}`} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-emerald-600 hover:underline cursor-pointer">{r.wa}</a></td>
                                    <td className="px-4 py-3 font-bold text-slate-900 text-center">{(r.sD as any)[`p${r.i}_kaos`] || "-"}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="group flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 hover:border-red-400 hover:bg-red-50 transition-all cursor-pointer">
                                             <span contentEditable onBlur={(e) => updateRoom(r.id, r.i, e.currentTarget.innerText)} suppressContentEditableWarning className={`font-black ${r.room === 'X' ? 'text-slate-300' : 'text-slate-900'} outline-none min-w-[15px] inline-block leading-none`}>{r.room}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">{(r.mandat && r.mandat.startsWith('http')) ? <a href={r.mandat} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a> : '-'}</td>
                                    
                                    <td className="px-4 py-3 font-bold uppercase relative h-14 text-center">
                                        <div className="cursor-pointer hover:text-red-600 hover:underline transition-all flex items-center justify-center h-full w-full" onClick={(e) => { e.stopPropagation(); setActiveRowActions(`t_${r.id}_${r.i}`); }}>
                                           <span className="text-slate-300">{r.token}</span>
                                        </div>
                                        {isActionActiveT && (
                                            <div className="absolute inset-0 bg-white/95 z-40 flex flex-row items-center justify-center gap-2 border-x border-slate-100 transition-all">
                                                <button onClick={() => copyToken(r.token)} className="p-2 bg-blue-50 text-blue-600 rounded-full border hover:scale-110 cursor-pointer">CPY</button>
                                                <button onClick={() => resetToken(r.id)} className="p-2 bg-amber-50 text-amber-600 rounded-full border hover:scale-110 cursor-pointer">RST</button>
                                                <button onClick={() => window.open(`https://wa.me/${formatWA(r.wa)}?text=Token revisi anda: ${r.token}`)} className="p-2 bg-emerald-50 text-emerald-600 rounded-full border hover:scale-110 cursor-pointer">WA</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showExportModal && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-slate-800 border border-white/20">
                        <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Ekspor Data</h2>
                            <p className="text-slate-400 text-[8px] font-bold uppercase mt-1 tracking-widest">Pilih format unduhan</p>
                        </div>
                        <div className="grid grid-cols-4 gap-3 w-full">
                            <div onClick={() => { setShowExportModal(false); executeExcelExport(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <span className="tooltip-text">Database Excel</span>
                            </div>
                            <div onClick={() => { setShowExportModal(false); executeRoomMappingPDF(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <span className="tooltip-text">Pemetaan Kamar</span>
                            </div>
                            <div onClick={() => { setShowExportModal(false); executeTshirtRecapPDF(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                </div>
                                <span className="tooltip-text">Rekap Ukuran Kaos</span>
                            </div>
                            <div onClick={() => { setShowExportModal(false); executeTshirtReceiptPDF(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </div>
                                <span className="tooltip-text">Tanda Terima Kaos</span>
                            </div>
                            <div onClick={() => { setShowExportModal(false); executeMasterKomisiPDF(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M6 16h.01" /></svg>
                                </div>
                                <span className="tooltip-text">Master Komisi</span>
                            </div>
                            <div onClick={() => { setShowExportModal(false); executeSidangKomisiPDF(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <span className="tooltip-text">Peserta Sidang</span>
                            </div>
                            <div onClick={() => { setShowExportModal(false); executeAttendancePDF(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </div>
                                <span className="tooltip-text">Daftar Hadir Komisi</span>
                            </div>
                            <div onClick={() => { setShowExportModal(false); executePlenoAttendancePDF(flattenedRows, showModal); }} className="export-option-card group tooltip-container">
                                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                </div>
                                <span className="tooltip-text">Daftar Hadir Pleno</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
