
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../db';
import { PageConfig } from '../types/sdui';
import { WidgetRegistry } from './Renderers';
import { Loader2, AlertCircle } from 'lucide-react';

export const PageRenderer: React.FC = () => {
  const { pageId = 'home' } = useParams();
  const [config, setConfig] = useState<PageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const data = await db.get('pages', pageId);
        if (data) {
          setConfig(data as PageConfig);
        } else {
          setError(`Page "${pageId}" not found.`);
        }
      } catch (err) {
        setError("Failed to connect to UI Engine.");
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [pageId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-lime-500 mb-4" size={40} />
        <p className="text-zinc-500 font-bold">Synchronizing UI...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Connection Error</h2>
        <p className="text-zinc-500 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-zinc-800 px-8 py-3 rounded-xl font-bold">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 animate-in fade-in duration-700">
        <header className="mb-10">
          <h2 className="text-4xl font-black text-white">{config.title}</h2>
        </header>

        <div className="space-y-2 pb-20">
          {config.layout.map((widget) => {
            const Component = WidgetRegistry[widget.type];
            if (!Component) return null;
            return <Component key={widget.id} {...widget.props} action={widget.action} />;
          })}
        </div>
      </main>
    </div>
  );
};
