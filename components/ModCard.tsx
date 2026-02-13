
import React from 'react';
import { Eye, Download, Zap, User as UserIcon, Star, Users, ThumbsUp, ThumbsDown, Layers, Hash, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Mod } from '../types';
import { useTranslation } from '../LanguageContext';

interface ModCardProps {
  mod: Mod;
  onClick: () => void;
  onPublisherClick?: (publisherId: string) => void;
  isFollowing: boolean;
  onFollow: (e: React.MouseEvent) => void;
}

const ModCard: React.FC<ModCardProps> = ({ mod, onClick, onPublisherClick, isFollowing, onFollow }) => {
  const { t, isRTL } = useTranslation();
  
  // Calculate displayed stats (Real + Fake)
  const displayViews = (mod.stats.uniqueViews || 0) + (mod.fakeStats?.views || 0);
  const displayDownloads = (mod.stats.downloads || 0) + (mod.fakeStats?.downloads || 0);
  const displayLikes = (mod.stats.likes || 0) + (mod.fakeStats?.likes || 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  return (
    <div 
      className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] overflow-hidden group hover:theme-border-primary hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img 
          src={mod.mainImage} 
          alt={mod.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
        
        <div className={`absolute bottom-4 ${isRTL ? 'left-4' : 'right-4'} flex flex-col gap-2 items-end`}>
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-2xl flex items-center gap-2">
             <Layers size={10} className="theme-text-primary" />
             <span className="text-[9px] font-black text-white tracking-widest">v{mod.minecraftVersion}</span>
          </div>
          {mod.shareCode && (
            <div className="theme-bg-primary backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-2xl flex items-center gap-1.5">
               <Hash size={10} className="text-black" />
               <span className="text-[9px] font-black text-black tracking-wider ltr">{mod.shareCode}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-5">
           <div className="flex items-center gap-2">
              <div className="theme-bg-primary-alpha theme-text-primary text-[9px] font-black px-3 py-1 rounded-lg border theme-border-primary-alpha uppercase">
                {t(`types.${mod.type}`)}
              </div>
              {mod.stats.averageRating > 0 && (
                <div className="bg-zinc-950 border border-white/5 px-2 py-1 rounded-lg flex items-center gap-1.5">
                   <Star size={10} className="fill-yellow-500 text-yellow-500" />
                   <span className="text-[10px] font-black text-white">{mod.stats.averageRating}</span>
                </div>
              )}
           </div>
           <div className="flex items-center gap-3 bg-zinc-950/50 px-3 py-1 rounded-lg border border-white/5">
              <div className="flex items-center gap-1 theme-text-primary text-[9px] font-black">
                 <ThumbsUp size={10} /> {formatNumber(displayLikes)}
              </div>
              <div className="w-px h-2.5 bg-white/10"></div>
              <div className="flex items-center gap-1 text-red-500 text-[9px] font-black">
                 <ThumbsDown size={10} /> {formatNumber(mod.stats.dislikes || 0)}
              </div>
           </div>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-xl line-clamp-1 group-hover:theme-text-primary transition-colors leading-tight text-white">{mod.title}</h3>
          <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] mt-1 block">{mod.category}</span>
        </div>
        
        <p className="text-zinc-500 text-xs line-clamp-2 mb-8 leading-relaxed flex-1 font-medium">
          {mod.description}
        </p>

        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
               <span className="text-white text-[10px] font-black flex items-center gap-1.5">
                 <Users size={12} className="text-zinc-700" />
                 {formatNumber(displayViews)}
               </span>
            </div>
            <div className="flex flex-col">
               <span className="theme-text-primary text-[10px] font-black flex items-center gap-1.5">
                 <Download size={12} />
                 {formatNumber(displayDownloads)}
               </span>
            </div>
          </div>

          <div 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={(e) => {
              if (onPublisherClick) {
                e.stopPropagation();
                onPublisherClick(mod.publisherId);
              }
            }}
          >
            <div className="text-right">
              <p className="text-[10px] font-black text-white group-hover:theme-text-primary transition-colors leading-none">{mod.publisherName}</p>
            </div>
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shadow-xl bg-zinc-900 group-hover:theme-border-primary transition-all shrink-0">
              <img src={mod.publisherAvatar} className="w-full h-full object-cover" alt="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModCard;