
import React from 'react';
import { Mod } from '../types';
import ModCard from './ModCard';
import { Download, CloudOff } from 'lucide-react';

interface DownloadsViewProps {
  mods: Mod[];
  onModClick: (mod: Mod) => void;
}

const DownloadsView: React.FC<DownloadsViewProps> = ({ mods, onModClick }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
            <Download className="text-lime-500" /> تنزيلاتي المحلية
          </h2>
          <p className="text-zinc-500">المودات المخزنة على جهازك والمتاحة للعب بلا اتصال</p>
        </div>
      </div>

      {mods.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mods.map(mod => (
            <ModCard 
              key={mod.id} 
              mod={mod} 
              onClick={() => onModClick(mod)}
              isFollowing={false}
              onFollow={() => {}} 
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 text-zinc-600">
            <CloudOff size={40} />
          </div>
          <h3 className="text-xl font-bold mb-2 text-zinc-300">لا توجد تنزيلات حالياً</h3>
          <p className="text-zinc-500 max-w-sm">
            قم بتحميل المودات عند اتصالك بالإنترنت لتتمكن من رؤيتها والوصول إليها هنا في أي وقت.
          </p>
        </div>
      )}
    </div>
  );
};

export default DownloadsView;
