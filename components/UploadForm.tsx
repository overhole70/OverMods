
import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Loader2, Link as LinkIcon, Hash, Server as ServerIcon, Globe, Zap, AlertTriangle, Cloud, CheckCircle2, Youtube, Package, Map as MapIcon, Box, FileText, CheckCircle, Clock, Tag, Monitor, HardDrive, Plus, Coins } from 'lucide-react';
import { ModType, Mod, MinecraftServer } from '../types';
import { MOD_TYPES, CATEGORIES } from './constants';
import { db } from '../db';

interface UploadFormProps {
  onUpload: (data: any) => void;
  onCancel: () => void;
  onBack: () => void;
  initialData?: Mod | MinecraftServer | null;
}

const UploadForm: React.FC<UploadFormProps> = ({ onUpload, onCancel, onBack, initialData }) => {
  const isEditing = !!initialData;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ModType>('Mod');
  
  // Mod Specific State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [minecraftVersion, setMinecraftVersion] = useState('1.21');
  const [mainImage, setMainImage] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [fileSize, setFileSize] = useState('');
  // Changed to string to allow empty state for placeholder
  const [price, setPrice] = useState<string>('');
  
  // Server Specific State
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState('19132');

  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Synchronize state with initialData when it changes (editing)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setType((initialData.type as ModType) || 'Mod');

      if ('ip' in initialData) {
        // It's a server
        const s = initialData as MinecraftServer;
        setServerIp(s.ip || '');
        setServerPort(s.port || '19132');
        setMinecraftVersion(s.version || '1.21');
      } else {
        // It's a mod
        const m = initialData as Mod;
        setCategory(m.category || CATEGORIES[0]);
        setMinecraftVersion(m.minecraftVersion || '1.21');
        setMainImage(m.mainImage || '');
        setDownloadUrl(m.downloadUrl || '');
        setYoutubeUrl(m.youtubeUrl || '');
        setFileSize(m.fileSize || '');
        // Convert to string, if 0 show empty to allow placeholder if desired, or '0' if strict. 
        // Request says "not contain any number (e.g. 0)", implying empty string on init if 0.
        setPrice(m.price ? m.price.toString() : '');
      }
    }
  }, [initialData]);

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) return setError('حجم الصورة كبير (أقصى حد 2MB)');
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setMainImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const validateServerData = () => {
    if (!serverIp.trim()) return "عنوان الـ IP مطلوب";
    const ipRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(serverIp) && !ipv4Regex.test(serverIp)) return "عنوان الـ IP غير صالح";
    
    const portNum = parseInt(serverPort);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) return "رقم المنفذ (Port) غير صالح (1-65535)";
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    if (!cleanTitle) return setError('العنوان مطلوب');
    if (cleanDesc.length < 10) return setError('الوصف قصير جداً (10 أحرف على الأقل)');

    setIsUploading(true);
    try {
      let finalData: any = {
        title: cleanTitle,
        description: cleanDesc,
        type,
        createdAt: initialData?.createdAt || new Date().toISOString()
      };

      if (type === 'Server') {
        const serverErr = validateServerData();
        if (serverErr) {
          setIsUploading(false);
          return setError(serverErr);
        }
        finalData = {
          ...finalData,
          ip: serverIp.trim(),
          port: serverPort.trim(),
          version: minecraftVersion.trim(),
        };
      } else {
        if (!minecraftVersion.trim()) { setIsUploading(false); return setError('إصدار اللعبة مطلوب'); }
        if (!downloadUrl.trim()) { setIsUploading(false); return setError('رابط التحميل مطلوب'); }
        if (!fileSize.trim()) { setIsUploading(false); return setError('حجم الملف مطلوب'); }
        if (!mainImage && !imageFile) { setIsUploading(false); return setError('الصورة التعريفية مطلوبة'); }
        
        const numericPrice = price ? parseInt(price) : 0;
        if (numericPrice < 0 || numericPrice > 5000) { setIsUploading(false); return setError('السعر يجب أن يكون بين 0 و 5000 نقطة'); }

        let finalImageUrl = mainImage;
        if (imageFile) finalImageUrl = await db.resizeImage(imageFile);
        
        finalData = {
          ...finalData,
          category,
          minecraftVersion: minecraftVersion.trim(),
          mainImage: finalImageUrl,
          downloadUrl: downloadUrl.trim(),
          youtubeUrl: youtubeUrl.trim(),
          fileSize: fileSize.trim(),
          shareCode: (initialData as Mod)?.shareCode || db.generateShareCode(type),
          price: Math.floor(numericPrice) // Ensure integer
        };
      }
      
      onUpload(finalData);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء الرفع. حاول مجدداً.');
    } finally {
      setIsUploading(false);
    }
  };

  const creationOptions = [
    { value: 'Mod', label: 'مود', icon: <Box size={22} /> },
    { value: 'Resource Pack', label: 'ريسورس باك', icon: <Package size={22} /> },
    { value: 'Map', label: 'خريطة', icon: <MapIcon size={22} /> },
    { value: 'Modpack', label: 'مود باك', icon: <FileText size={22} /> },
    { value: 'Server', label: 'سيرفر', icon: <ServerIcon size={22} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="px-6 flex items-center justify-between mb-12">
        <div className="text-right">
          <h2 className="text-2xl font-black text-white">{isEditing ? 'تعديل المحتوى' : 'نشر جديد'}</h2>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-1">Creator Studio</p>
        </div>
        <button onClick={onBack} className="p-3 bg-zinc-900 rounded-2xl active:scale-90 transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 space-y-12">
        <div className="space-y-4">
           <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">نوع المنشور</label>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {creationOptions.map(opt => (
                <button key={opt.value} type="button" disabled={isEditing} onClick={()=>setType(opt.value as any)} className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all ${isEditing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} ${type === opt.value ? 'theme-bg-primary-alpha theme-border-primary theme-text-primary' : 'bg-zinc-900/40 border-white/5 text-zinc-600'}`}>
                   <div className="mb-2">{opt.icon}</div>
                   <span className="text-[10px] font-black whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
           </div>
        </div>

        <div className="space-y-8">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">
                {type === 'Server' ? 'اسم السيرفر' : 'العنوان'}
              </label>
              <input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-base outline-none focus:theme-border-primary-alpha" placeholder={type === 'Server' ? "سيرفر الأساطير..." : "مود السيوف المطورة..."} required />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">الوصف</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5} className="w-full bg-zinc-900/50 border border-white/5 rounded-3xl py-5 px-6 text-white font-medium text-base outline-none focus:theme-border-primary-alpha resize-none" placeholder="اشرح ميزات إبداعك..." required />
           </div>

           {type === 'Server' ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">إصدار السيرفر</label>
                  <input type="text" value={minecraftVersion} onChange={e=>setMinecraftVersion(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha" placeholder="1.21.x" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">عنوان الـ IP</label>
                  <input type="text" value={serverIp} onChange={e=>setServerIp(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha" placeholder="play.example.com" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">المنفذ (Port)</label>
                  <input type="text" value={serverPort} onChange={e=>setServerPort(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha" placeholder="19132" required />
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">رابط التحميل</label>
                  <input type="url" value={downloadUrl} onChange={e=>setDownloadUrl(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha" placeholder="MediaFire/Google Drive Link" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">إصدار ماين كرافت</label>
                  <input type="text" value={minecraftVersion} onChange={e=>setMinecraftVersion(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha" placeholder="1.21.x" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">حجم الملف</label>
                  <input type="text" value={fileSize} onChange={e=>setFileSize(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha" placeholder="5MB" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">رابط يوتيوب (اختياري)</label>
                  <input type="url" value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)} className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha" placeholder="https://youtube.com/..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">السعر (نقاط) - اختياري</label>
                  <input 
                    type="number" 
                    value={price} 
                    onChange={e => {
                        const val = e.target.value;
                        // Allow empty string or numbers up to 5000
                        if (val === '' || (Number(val) >= 0 && Number(val) <= 5000)) {
                            setPrice(val);
                        }
                    }} 
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary-alpha placeholder-white/20" 
                    placeholder="0" 
                    min="0"
                    max="5000"
                  />
                  <div className="flex items-center justify-between text-[9px] font-bold text-zinc-600 px-2 mt-2">
                     <span>اتركه فارغاً ليكون مجانياً. (خصم 15% عمولة)</span>
                     <span>الحد الأقصى: 5000</span>
                  </div>
                </div>
             </div>
           )}

           {type !== 'Server' && (
             <div className="space-y-2 animate-in slide-in-from-top-4">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">الصورة التعريفية</label>
                <div onClick={()=>document.getElementById('file-upload')?.click()} className="w-full aspect-video bg-zinc-950 rounded-[2.5rem] border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center cursor-pointer transition-all hover:theme-border-primary-alpha group overflow-hidden">
                   {mainImage ? (
                     <img src={mainImage} className="w-full h-full object-cover" />
                   ) : (
                     <div className="flex flex-col items-center text-zinc-800 group-hover:theme-text-primary transition-colors">
                        <ImageIcon size={48} />
                        <span className="text-[10px] font-black mt-4 uppercase">اضغط لرفع صورة</span>
                     </div>
                   )}
                </div>
                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
             </div>
           )}
        </div>

        {error && (
          <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-black animate-in shake">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <button type="submit" disabled={isUploading} className="w-full py-6 theme-bg-primary text-black rounded-3xl font-black text-xl shadow-xl theme-shadow-primary active:scale-95 transition-all flex items-center justify-center gap-3">
           {isUploading ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
           {isEditing ? 'تحديث المنشور' : 'نشر الآن'}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;
