import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, Sparkles } from 'lucide-react';
import Avatar from '../common/Avatar';

/**
 * AvatarCropModal
 * 
 * Interactive 1:1 square crop interface providing:
 * - Real-time pan & zoom with circular guide
 * - 90-degree rotation
 * - Live synchronized previews matching final ChatFlow avatars (96px and 40px)
 * - Canvas export producing a clean 1:1 square image
 */
const AvatarCropModal = ({ isOpen, imageSrc, onClose, onSave }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState('');

  const imgRef = useRef(null);
  const viewportRef = useRef(null);

  // Reset parameters when a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Generate real-time preview canvas
  const updatePreview = useCallback(() => {
    if (!imgRef.current || !imgRef.current.complete) return;

    const canvas = document.createElement('canvas');
    const OUTPUT_SIZE = 400; // Crisp square output
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    ctx.save();
    // Center of canvas
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Apply pan normalized to viewport dimensions
    const viewportSize = 280;
    const scaleFactor = OUTPUT_SIZE / viewportSize;
    ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

    // Draw image centered
    const img = imgRef.current;
    // Maintain aspect ratio cover of the viewport
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW = OUTPUT_SIZE;
    let drawH = OUTPUT_SIZE;
    if (imgAspect > 1) {
      drawW = OUTPUT_SIZE * imgAspect;
    } else {
      drawH = OUTPUT_SIZE / imgAspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    try {
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
    } catch (_) {}
  }, [zoom, rotation, pan]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  if (!isOpen || !imageSrc) return null;

  // Pointer dragging handlers for pan
  const handlePointerDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleConfirm = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const OUTPUT_SIZE = 512; // High-resolution output for avatars
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const viewportSize = 280;
    const scaleFactor = OUTPUT_SIZE / viewportSize;
    ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

    const img = imgRef.current;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW = OUTPUT_SIZE;
    let drawH = OUTPUT_SIZE;
    if (imgAspect > 1) {
      drawW = OUTPUT_SIZE * imgAspect;
    } else {
      drawH = OUTPUT_SIZE / imgAspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSave(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-base font-bold text-white">Crop Profile Picture</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Crop Viewport & Guide */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            ref={viewportRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative w-[280px] h-[280px] rounded-2xl bg-black overflow-hidden cursor-grab active:cursor-grabbing border-2 border-slate-700 shadow-inner"
          >
            {/* Manipulated Image */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              className="w-full h-full flex items-center justify-center pointer-events-none"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={updatePreview}
                className="max-w-none w-full h-full object-cover select-none"
                draggable={false}
              />
            </div>

            {/* Circular Crop Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer mask shadow ring */}
              <div className="w-[260px] h-[260px] rounded-full border-2 border-brand-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] ring-1 ring-white/30" />
            </div>

            {/* Hint overlay */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-slate-300 flex items-center space-x-1 pointer-events-none">
              <Move className="w-3 h-3" />
              <span>Drag to Pan</span>
            </div>
          </div>

          {/* Controls Bar: Zoom & Rotate */}
          <div className="w-full max-w-[320px] space-y-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            {/* Zoom Slider */}
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                className="p-1 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-brand-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="p-1 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] w-8 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Rotate & Reset Controls */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
              <button
                onClick={handleRotate}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-brand-400" />
                <span>Rotate 90°</span>
              </button>

              <button
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setPan({ x: 0, y: 0 });
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Reset Position
              </button>
            </div>
          </div>

          {/* Live Preview Multi-Size Display (Section 14) */}
          <div className="flex items-center justify-center space-x-6 pt-1">
            <div className="flex flex-col items-center space-y-1">
              <Avatar
                src={previewUrl || imageSrc}
                name="Preview"
                size="2xl"
                priority={true}
              />
              <span className="text-[10px] text-slate-400">Profile (96px)</span>
            </div>

            <div className="flex flex-col items-center space-y-1">
              <Avatar
                src={previewUrl || imageSrc}
                name="Preview"
                size="md"
                priority={true}
              />
              <span className="text-[10px] text-slate-400">Chat (40px)</span>
            </div>

            <div className="flex flex-col items-center space-y-1">
              <Avatar
                src={previewUrl || imageSrc}
                name="Preview"
                size="sm"
                priority={true}
              />
              <span className="text-[10px] text-slate-400">Feed (32px)</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-brand-600/30 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Save Avatar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
