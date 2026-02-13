
import React, { useEffect } from 'react';
import * as Icons from 'lucide-react';
import { WidgetConfig } from '../types/sdui';
import { useActionHandler } from '../core/ActionHandler';
import { AdService } from '../core/AdService';

// --- ATOMS ---

export const DynamicIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return null;
  return <IconComponent size={size} className={className} />;
};

// --- WIDGETS ---

export const HeroWidget = ({ title, subtitle, imageUrl }: any) => (
  <div className="relative w-full h-64 rounded-[2rem] overflow-hidden mb-8">
    <img src={imageUrl} className="w-full h-full object-cover" alt="banner" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-8 flex flex-col justify-end">
      <h1 className="text-3xl font-black text-white">{title}</h1>
      <p className="text-zinc-300">{subtitle}</p>
    </div>
  </div>
);

export const AdBannerWidget = () => {
  useEffect(() => {
    AdService.showBanner();
    return () => { AdService.hideBanner(); };
  }, []);

  return (
    <div className="w-full py-4 flex flex-col items-center justify-center bg-zinc-900/30 border border-dashed border-white/5 rounded-3xl mb-8">
      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Sponsored Content</div>
      <div className="w-full max-w-[320px] h-[50px] bg-zinc-800 animate-pulse rounded flex items-center justify-center">
        <Icons.Monitor size={16} className="text-zinc-700 mr-2" />
        <span className="text-zinc-600 text-xs font-bold">Banner Ad Slot</span>
      </div>
    </div>
  );
};

export const ButtonGroupWidget = ({ buttons }: { buttons: any[] }) => {
  const { handleAction } = useActionHandler();
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={() => handleAction(btn.action)}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-white/5 rounded-[2rem] hover:border-lime-500 transition-all group"
        >
          <div className="mb-3 text-lime-500 group-hover:scale-110 transition-transform">
            <DynamicIcon name={btn.icon} size={32} />
          </div>
          <span className="text-sm font-bold text-white">{btn.label}</span>
        </button>
      ))}
    </div>
  );
};

export const CardWidget = ({ title, description, icon, action }: any) => {
  const { handleAction } = useActionHandler();
  return (
    <div 
      onClick={() => handleAction(action)}
      className="p-6 bg-zinc-900/50 border border-white/5 rounded-3xl flex items-center gap-6 mb-4 cursor-pointer hover:bg-zinc-800 transition-colors"
    >
      <div className="w-12 h-12 bg-lime-500/10 rounded-2xl flex items-center justify-center text-lime-500">
        <DynamicIcon name={icon} />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-white">{title}</h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <Icons.ChevronRight size={20} className="text-zinc-700" />
    </div>
  );
};

// --- REGISTRY ---

export const WidgetRegistry: Record<string, React.FC<any>> = {
  'HERO': HeroWidget,
  'BUTTON_GROUP': ButtonGroupWidget,
  'CARD': CardWidget,
  'AD_BANNER': AdBannerWidget,
};
