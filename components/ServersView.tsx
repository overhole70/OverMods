
import React, { useState } from 'react';
import { Server as ServerIcon, Globe, Layers, User as UserIcon, Copy, Check, Zap, Wifi, Shield, RefreshCcw, Search, LayoutGrid, Trash2, Edit, AlertTriangle, X, Loader2 } from 'lucide-react';
import { MinecraftServer, User } from '../types';
import { useTranslation } from '../LanguageContext';
import { db } from '../db';

interface ServersViewProps {
  servers: MinecraftServer[];
  currentUser: User | null;
  isAdmin: boolean;
  onRefresh: () => void;
  onEditServer: (server: MinecraftServer) => void;
}

const ServersView: React.FC<ServersViewProps> = ({ servers, currentUser, isAdmin, onRefresh, onEditServer }) => {
  const { t, isRTL } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [serverToDelete, setServerToDelete] = useState<MinecraftServer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const filteredServers = servers.filter(s => 
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ip?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const confirmDeleteServer = async () => {
    if (!serverToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await db.deleteServer(serverToDelete.id);
      setServerToDelete(null);
      onRefresh();
    } catch (err) {
      alert('فشل حذف السيرفر. حاول مجدداً.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      {/* Header Section */}
      <div className="py-16 px-6 text-center space-y-8 relative overflow-hidden rounded-[3rem] md:rounded-[5rem] border border-white/5 bg-[#080808] shadow-2xl">
         <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>
         <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-6 py-2 bg-zinc-900/50 border border-white/5 rounded-full theme-text-primary text-[10px] font-black uppercase tracking-[0.3em]">
              <Wifi size={14} className="animate-pulse" /> Live Servers Network
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-white leading-tight">
               اكتشف <span className="theme-text-primary">سيرفرات</span> المجتمع
            </h1>
            <p className="text-zinc-500 max-w-xl mx-auto font-medium text-lg leading-relaxed">
               تواصل مع اللاعبين العرب في عوالم مشتركة. ابحث عن السيرفر المناسب لإصدارك وابدأ اللعب الآن.
            </p>
         </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative group flex-1">
          <Search className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:theme-text-primary transition-colors`} size={20} />
          <input 
            type="text" 
            placeholder="ابحث عن اسم السيرفر أو العنوان..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-zinc-900 border border-white/5 rounded-[2rem] py-5 ${isRTL ? 'pr-16 pl-6' : 'pl-16 pr-6'} focus:theme-border-primary-alpha text-white font-bold transition-all shadow-inner outline-none`} 
          />
        </div>
        <button onClick={onRefresh} className="w-16 h-16 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center text-zinc-500 hover:theme-text-primary transition-all active:scale-90 shrink-0">
          <RefreshCcw size={24} />
        </button>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredServers.map(server => (
          <div key={server.id} className="bg-zinc-900/40 border border-white/5 rounded-[3rem] p-8 flex flex-col gap-8 group hover:theme-border-primary-alpha transition-all shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 theme-bg-primary-alpha blur-3xl pointer-events-none"></div>
             
             <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 theme-bg-primary-alpha theme-text-primary rounded-2xl flex items-center justify-center border theme-border-primary-alpha shadow-lg group-hover:scale-110 transition-transform">
                      <ServerIcon size={32} />
                   </div>
                   <div>
                      <h3 className="text-white font-black text-xl leading-tight group-hover:theme-text-primary transition-colors">{server.title}</h3>
                   </div>
                </div>
                <div className="flex gap-2">
                  {(isAdmin || server.publisherId === currentUser?.id) && (
                    <>
                       <button 
                         onClick={() => onEditServer(server)}
                         className="p-3 bg-white/10 text-white rounded-xl hover:theme-bg-primary hover:text-black transition-all shadow-lg active:scale-90"
                         title="تعديل السيرفر"
                       >
                          <Edit size={18} />
                       </button>
                       <button 
                         onClick={() => setServerToDelete(server)}
                         className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-90"
                         title="حذف السيرفر"
                       >
                          <Trash2 size={18} />
                       </button>
                    </>
                  )}
                </div>
             </div>

             <div className="space-y-3">
                <div className="bg-black/50 p-5 rounded-2xl border border-white/5 flex items-center justify-between group/row">
                   <div className="flex flex-col gap-1">
                      <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Server IP</span>
                      <span className="text-white font-black text-sm ltr">{server.ip}</span>
                   </div>
                   <button 
                    onClick={() => handleCopy(server.ip, `ip-${server.id}`)}
                    className={`p-2.5 rounded-xl transition-all ${copyFeedback === `ip-${server.id}` ? 'theme-bg-primary text-black shadow-lg' : 'bg-zinc-800 text-zinc-500 group-hover/row:text-white'}`}
                   >
                      {copyFeedback === `ip-${server.id}` ? <Check size={16} /> : <Copy size={16} />}
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-black/50 p-5 rounded-2xl border border-white/5 flex items-center justify-between group/row">
                      <div className="flex flex-col gap-1">
                         <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Port</span>
                         <span className="theme-text-primary font-black text-sm ltr">{server.port}</span>
                      </div>
                      <button 
                        onClick={() => handleCopy(server.port, `port-${server.id}`)}
                        className={`p-2 rounded-lg transition-all ${copyFeedback === `port-${server.id}` ? 'theme-bg-primary text-black' : 'text-zinc-700 hover:text-white'}`}
                      >
                         {copyFeedback === `port-${server.id}` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                   </div>
                   <div className="bg-black/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                      <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Version</span>
                      <span className="text-white font-black text-sm ltr">{server.version}</span>
                   </div>
                </div>
             </div>

             <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 px-4 py-1.5 theme-bg-primary-alpha theme-text-primary rounded-full border theme-border-primary-alpha text-[9px] font-black uppercase tracking-widest">
                   <Zap size={10} fill="currentColor" /> Online
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-[10px] font-black">{server.publisherName}</span>
                  <img src={server.publisherAvatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Deletion Confirmation Modal */}
      {serverToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => !isDeleting && setServerToDelete(null)}></div>
           <div className="bg-[#0f0f0f] border border-red-500/20 p-10 md:p-14 rounded-[4rem] w-full max-w-lg relative z-10 shadow-2xl text-center animate-in zoom-in">
              <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-xl">
                <AlertTriangle size={56} />
              </div>
              <h3 className="text-3xl font-black text-white mb-4">حذف السيرفر نهائياً؟</h3>
              
              <div className="bg-red-600/5 p-6 rounded-3xl mb-10 text-right space-y-3">
                 <p className="text-red-500 font-black text-sm">⚠️ هذا الإجراء دائم</p>
                 <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                    سيتم إزالة <span className="text-white font-black">{serverToDelete.title}</span> من القائمة ولن يتمكن اللاعبون من رؤيته بعد الآن.
                 </p>
              </div>

              <div className="flex flex-col gap-4">
                 <button 
                  onClick={confirmDeleteServer} 
                  disabled={isDeleting}
                  className="w-full py-6 bg-red-600 text-white rounded-3xl font-black text-xl active:scale-95 transition-all shadow-xl shadow-red-900/20 flex items-center justify-center gap-3"
                 >
                   {isDeleting ? <Loader2 className="animate-spin" /> : 'تأكيد الحذف النهائي'}
                 </button>
                 <button onClick={() => setServerToDelete(null)} disabled={isDeleting} className="w-full py-6 bg-zinc-900 text-zinc-500 rounded-3xl font-black text-xl hover:text-white transition-colors">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ServersView;
