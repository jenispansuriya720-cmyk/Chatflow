import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const MediaPreviewModal = ({ media, onClose }) => {
  if (!media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between pb-3 text-white">
          <span className="text-xs font-medium truncate max-w-md">
            {media.name || 'Media Preview'}
          </span>

          <div className="flex items-center space-x-2">
            <a
              href={media.url}
              download={media.name || 'download'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Preview Container */}
        <div className="flex items-center justify-center w-full max-h-[80vh] overflow-hidden rounded-2xl bg-black/40">
          {media.fileType === 'image' || (!media.fileType && media.url?.match(/\.(jpeg|jpg|gif|png|webp)/i)) ? (
            <img
              src={media.url}
              alt={media.name || 'Preview'}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl"
            />
          ) : media.fileType === 'video' ? (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full rounded-2xl"
            />
          ) : (
            <div className="p-12 text-center text-white space-y-3">
              <p className="text-sm font-semibold">{media.name}</p>
              <a
                href={media.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-semibold"
              >
                <span>Open in new tab</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaPreviewModal;
