
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PageRenderer } from './components/PageRenderer';
import { db } from './db';
import { AppMetadata } from './types/sdui';
import { Loader2, Download } from 'lucide-react';
import { AdService } from './core/AdService';

const CURRENT_VERSION = "1.0.0"; 

export default function App() {
  const [metadata, setMetadata] = useState<AppMetadata | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Ads
        await AdService.initialize();
        
        const meta = await db.get('app_metadata', 'config') as AppMetadata;
        setMetadata(meta);
      } catch (e) {
        console.error("Critical: Metadata fetch failed.");
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, []);

  if (!isReady) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-lime-500" /></div>;

  if (metadata && metadata.force_update && metadata.min_version > CURRENT_VERSION) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <div className="w-20 h-20 bg-lime-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Download className="text-black" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">Update Required</h1>
          <p className="text-zinc-500 mb-8 font-medium">To continue using the app, please download the latest version from the store.</p>
          <button 
            onClick={() => window.open(metadata.update_url, '_blank')}
            className="w-full py-5 bg-lime-500 text-black rounded-2xl font-black text-lg active:scale-95 transition-all"
          >
            Update Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/:pageId" element={<PageRenderer />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<PageRenderer />} />
      </Routes>
    </Router>
  );
}
