import React, { useState, useEffect, useRef } from 'react';
import { db, firestore } from '../db';
import { doc, onSnapshot } from 'firebase/firestore';
import { PopupWindowConfig, PopupButton } from '../types';
import { X, AlertTriangle, CheckCircle, Info, Gift, AlertCircle, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface GlobalPopupProps {
  onNavigate: (view: string) => void;
}

const GlobalPopup: React.FC<GlobalPopupProps> = ({ onNavigate }) => {
  const [config, setConfig] = useState<PopupWindowConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(firestore, 'settings', 'popup_window'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as PopupWindowConfig;
        if (data.isActive) {
          handleNewConfig(data);
        } else {
          setIsVisible(false);
          setConfig(null);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleNewConfig = (data: PopupWindowConfig) => {
    setConfig(data);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (data.delaySeconds > 0) {
      timerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, data.delaySeconds * 1000);
    } else {
      setIsVisible(true);
    }
  };

  const handleAction = (btn: PopupButton) => {
    if (btn.action === 'close') {
      setIsVisible(false);
    } else if (btn.action === 'navigate' && btn.payload) {
      setIsVisible(false);
      onNavigate(btn.payload);
    } else if (btn.action === 'link' && btn.payload) {
      window.open(btn.payload, '_blank');
      if (config?.dismissible) setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    if (config?.dismissible) {
      setIsVisible(false);
    }
  };

  if (!isVisible || !config) return null;

  const IconMap: Record<string, any> = {
    'Info': Info,
    'AlertTriangle': AlertTriangle,
    'CheckCircle': CheckCircle,
    'Gift': Gift,
    'ShieldAlert': ShieldAlert,
    'AlertCircle': AlertCircle
  };

  const SelectedIcon = IconMap[config.icon] || Info;

  const sizeClasses: Record<string, string> = {
    'small': 'max-w-md w-full',
    'half': 'w-full md:w-[600px] h-[50vh]',
    '70': 'w-full md:w-[800px] h-[70vh]',
    'full': 'w-full h-full rounded-none'
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={handleDismiss}
      ></div>

      {/* Window */}
      <div 
        className={`bg-[#0f0f0f] border border-white/10 rounded-[3rem] relative z-10 shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden ${sizeClasses[config.size] || 'max-w-md w-full'}`}
      >
        {/* Header */}
        <div className="p-8 flex items-start justify-between border-b border-white/5 shrink-0">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 text-white shadow-lg">
                 <SelectedIcon size={32} className="text-lime-500" />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-white leading-none mb-2">{config.title}</h3>
                 <div className="h-1 w-12 bg-lime-500 rounded-full"></div>
              </div>
           </div>
           {config.dismissible && (
             <button onClick={handleDismiss} className="p-3 bg-zinc-900 text-zinc-500 hover:text-white rounded-2xl transition-all hover:bg-zinc-800">
               <X size={24} />
             </button>
           )}
        </div>

        {/* Body */}
        <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
           <p className="text-zinc-300 text-lg font-medium leading-loose whitespace-pre-wrap">
             {config.description}
           </p>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-white/5 bg-zinc-950/50 shrink-0 flex flex-col sm:flex-row gap-4">
           {config.buttons.map((btn, idx) => (
             <button
               key={idx}
               onClick={() => handleAction(btn)}
               className={`flex-1 py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
                 btn.style === 'primary' ? 'theme-bg-primary text-black' : 
                 btn.style === 'danger' ? 'bg-red-600 text-white' : 
                 'bg-zinc-800 text-white hover:bg-zinc-700'
               }`}
             >
                {btn.action === 'close' && <X size={18} />}
                {btn.action === 'navigate' && <ArrowRight size={18} className="rotate-180" />}
                {btn.action === 'link' && <ExternalLink size={18} />}
                {btn.text}
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalPopup;