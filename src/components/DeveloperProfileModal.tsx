import React, { useState, useEffect } from 'react';
import { X, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DeveloperProfileModal({ onClose }: { onClose: () => void }) {
  const [zoomPhoto, setZoomPhoto] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomPhoto) {
          setZoomPhoto(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [zoomPhoto, onClose]);

  return (
    <>
      <motion.div 
        key="main-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          key="main-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
          className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative border border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-20 bg-gradient-to-r from-red-700 to-red-900 relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all font-bold w-8 h-8 flex items-center justify-center z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 pb-8 -mt-12 text-center flex flex-col items-center">
            <div className="relative group mb-5">
              <div 
                className="w-28 h-28 p-1 bg-white rounded-2xl shadow-xl ring-4 ring-white overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105"
                onClick={() => setZoomPhoto(true)}
              >
                <img 
                  src="https://raw.githubusercontent.com/edibrata/image/main/FotoEdiBrata.jpg" 
                  className="w-full h-full object-cover rounded-xl" 
                  alt="Edi Brata" 
                />
                <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <span className="w-2 bg-white rounded-full animate-pulse h-2"></span>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Edi Brata</h2>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Carita, Pandeglang Banten</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2.5">
                <a href="https://www.tiktok.com/@edibrataeb" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                </a>
                <a href="https://www.instagram.com/edibrata/" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-gradient-to-tr hover:from-yellow-400 hover:to-purple-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://web.facebook.com/uebrata" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.youtube.com/@EduOnlineEB" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-red-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="mailto:edibratabanten@gmail.com" className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-indigo-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                  <Mail className="w-5 h-5 flex-shrink-0" />
                </a>
                <a href="https://wa.me/6287773949015" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-emerald-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
              
              <div className="pt-2">
                 <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] leading-relaxed">"KHAIRUNNAS ANFA'UHUM LINNAS"</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {zoomPhoto && (
          <motion.div 
            key="zoom-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
            onClick={() => setZoomPhoto(false)}
          >
            <motion.img 
              key="zoom-modal-img"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              src="https://raw.githubusercontent.com/edibrata/image/main/FotoEdiBrata.jpg" 
              className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border-4 border-white/10 cursor-zoom-out" 
              alt="Zoom Foto" 
            />
            <motion.p 
              key="zoom-modal-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-10 text-white/50 text-xs font-bold uppercase tracking-widest pointer-events-none"
            >
              Klik dimana saja untuk menutup
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
