import { useState, useEffect } from 'react';
import { api } from '../services/api';

const PREVIEWABLE_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  docId: string;
  fileName: string;
}

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export default function DocumentPreviewModal({ open, onClose, docId, fileName }: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ext = getExt(fileName);
  const canPreview = PREVIEWABLE_EXT.includes(ext);
  const isImage = IMAGE_EXT.includes(ext);
  const isPdf = ext === 'pdf';

  useEffect(() => {
    if (!open || !docId) return;
    setError(null);
    setBlobUrl(null);
    if (!canPreview) {
      setError('Preview is not available for this file type. Please download the document.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const load = async () => {
      try {
        const { url } = await api.get<{ url: string }>(`/documents/${docId}/download-url`);
        let blob: Blob;
        if (url.includes('/api/documents/serve')) {
          const token = localStorage.getItem('accessToken');
          const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (!res.ok) throw new Error('Failed to load');
          blob = await res.blob();
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to load');
          blob = await res.blob();
        }
        // Ensure correct MIME type for iframe rendering (server may omit Content-Type)
        if (isPdf && blob.type !== 'application/pdf') {
          blob = new Blob([blob], { type: 'application/pdf' });
        } else if (isImage && !blob.type.startsWith('image/')) {
          const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
          blob = new Blob([blob], { type: mime[ext] || blob.type });
        }
        setBlobUrl(URL.createObjectURL(blob));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, docId, canPreview]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-semibold truncate flex-1 mr-4">{fileName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-100 min-h-[400px] flex items-center justify-center">
          {loading && <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />}
          {error && (
            <p className={error.includes('not available') ? 'text-gray-600 text-center' : 'text-red-600'}>
              {error}
            </p>
          )}
          {blobUrl && !loading && (
            <>
              {isImage && (
                <img src={blobUrl} alt={fileName} className="max-w-full max-h-[70vh] object-contain" />
              )}
              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={fileName}
                  className="w-full h-[70vh] border-0 rounded"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
