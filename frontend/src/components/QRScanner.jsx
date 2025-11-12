import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScan, onError }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const html5Ref = useRef(null); // Html5Qrcode instance
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('camera'); // 'camera' | 'image'
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    // Inject small scan animation CSS once
    const style = document.createElement('style');
    style.id = 'qr-scanner-styles';
    style.textContent = `
      @keyframes scan {
        0% { top: 0; }
        50% { top: 100%; }
        100% { top: 0; }
      }
      .animate-scan { animation: scan 3s linear infinite; box-shadow: 0 0 8px rgba(59,130,246,0.5); }
    `;
    if (!document.getElementById('qr-scanner-styles')) document.head.appendChild(style);

    // Start initialization: prompt for camera permission and start camera if allowed
    (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        await startScanner();
        if (onError) onError({ type: 'success', message: 'Camera ready to scan!' });
      } catch (err) {
        setHasPermission(false);
        if (onError) onError({ type: 'error', message: 'Please enable camera access to scan QR codes.' });
        console.debug('Camera permission or initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    })();

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseCameraId = (cameras) => {
    if (!cameras || cameras.length === 0) return null;
    // Prefer a back-facing camera if label contains 'back' or 'rear'
    const back = cameras.find(c => /back|rear|environment/i.test(c.label));
    return (back && back.id) || cameras[0].id;
  };

  const startScanner = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      const cameras = await Html5Qrcode.getCameras();
      const cameraId = chooseCameraId(cameras) || null;

      // Create Html5Qrcode instance if not already
      if (!html5Ref.current) html5Ref.current = new Html5Qrcode('qr-reader');

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5Ref.current.start(
        cameraId,
        config,
        (decodedText) => {
          if (typeof onScan === 'function') onScan(decodedText);
        },
        (errorMessage) => {
          // Non-fatal scan failure, ignore or log silently
        }
      );
    } catch (error) {
      console.error('Failed to start scanner:', error);
      if (onError) onError({ type: 'error', message: 'Failed to start camera scanner.' });
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (!html5Ref.current) return;
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      // Stop streaming
      try { await html5Ref.current.stop(); } catch (e) { /* ignore */ }
      try { await html5Ref.current.clear(); } catch (e) { /* ignore */ }
    } finally {
      html5Ref.current = null;
      isStoppingRef.current = false;
    }
  };

  const requestCameraAccess = async () => {
    setIsInitializing(true);
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      await startScanner();
      if (onError) onError({ type: 'success', message: 'Camera access granted successfully!' });
    } catch (error) {
      setHasPermission(false);
      if (onError) onError({ type: 'error', message: 'Camera access denied. Please check your browser settings.' });
      console.error('Camera permission error:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const switchToImageMode = async () => {
    // Stop camera if running and switch to image mode
    try {
      await stopScanner();
    } catch (e) {
      console.debug('Error stopping scanner while switching to image mode', e);
    }
    setMode('image');
  };

  const switchToCameraMode = async () => {
    setMode('camera');
    // Try to start camera if permission exists; otherwise request access
    if (hasPermission) {
      await startScanner();
    } else {
      await requestCameraAccess();
    }
  };

  // File / Drop handling (scans a dropped or selected image file)
  const handleFile = async (file) => {
    if (!file) return;
    setIsProcessingFile(true);
    // show preview
    try {
      const url = URL.createObjectURL(file);
      setFilePreview(url);

      // If the uploaded file is an SVG, convert it to a PNG blob for scanning
      let scanFile = file;
      if (file.type === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg')) {
        try {
          const svgText = await file.text();
          const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
          // render SVG to canvas and get a PNG blob
          const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = svgDataUrl;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 512;
          canvas.height = img.naturalHeight || 512;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) scanFile = new File([blob], file.name.replace(/\.svg$/i, '.png'), { type: 'image/png' });
        } catch (e) {
          console.warn('Failed to convert SVG to PNG for scanning:', e);
        }
      }

      // If a camera scan is currently running we must stop it before scanning from file
      let shouldRestartCamera = false;
      if (html5Ref.current) {
        shouldRestartCamera = true;
        await stopScanner();
      }

      // Prefer using html5-qrcode file scan API on a fresh instance
      let result = null;
      const tmp = new Html5Qrcode('qr-reader-file');
      try {
        if (typeof tmp.scanFile === 'function') {
          result = await tmp.scanFile(scanFile, true);
        } else if (typeof tmp.scanFileV2 === 'function') {
          result = await tmp.scanFileV2(scanFile, true);
        }
      } finally {
        try { await tmp.clear(); } catch (e) {}
      }

      if (result) {
        if (typeof onScan === 'function') onScan(result?.decodedText || result);
      } else {
        if (onError) onError({ type: 'error', message: 'No QR code detected in the provided image.' });
      }

      // restart camera scanner if it was running before
      if (shouldRestartCamera && hasPermission) {
        await startScanner();
      }
    } catch (err) {
      console.error('File scan error:', err);
      if (onError) onError({ type: 'error', message: 'Failed to scan image for QR code.' });
    } finally {
      setIsProcessingFile(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  useEffect(() => {
    return () => {
      // cleanup preview URL
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const onFileChange = (e) => {
    const f = e.target?.files?.[0];
    if (f) handleFile(f);
    // reset input so same file can be selected again
    e.target.value = '';
  };

  if (hasPermission === false) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-xl text-white mb-1">Camera Access Required</h3>
            <p className="text-gray-400 text-sm">Please enable camera access to scan QR codes.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900/50 p-4 rounded-lg text-sm text-gray-300">
            <p className="mb-2">To enable camera access:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>Click the camera icon in your browser's address bar</li>
              <li>Select "Allow" for camera access</li>
              <li>Click the "Try Again" button below</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={requestCameraAccess}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Try Again
            </button>

            <button
              onClick={() => { /* keep user on page; don't reload */ }}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Keep on Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-scanner-container">
      <div className="flex justify-end mb-3 max-w-xl mx-auto">
        {mode === 'camera' ? (
          <button
            type="button"
            onClick={switchToImageMode}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
          >
            Use Image
          </button>
        ) : (
          <button
            type="button"
            onClick={switchToCameraMode}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
          >
            Use Camera
          </button>
        )}
      </div>

      {/* Camera area (only when camera mode) */}
      {mode === 'camera' && (
        <div className="relative">
          <div className="relative">
            <div
              id="qr-reader"
              className="mx-auto overflow-hidden rounded-lg shadow-lg bg-gray-800"
              style={{ maxWidth: '100%', height: 'auto', minHeight: 300 }}
            />
            {/* Scanning animation */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-scan" />
            {/* Guide Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-500" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-500" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-500" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-500" />
                <div className="absolute inset-0 border border-blue-500/30" />
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-gray-900 opacity-50" />
              <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-gray-900 opacity-50" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-center text-gray-300 text-sm flex items-center justify-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Position QR code within the frame
            </p>
            <p className="text-center text-gray-400 text-xs">Make sure the code is well-lit and in focus</p>
          </div>
        </div>
      )}

      {/* File drop / upload area (only when image mode) */}
      {mode === 'image' && (
        <div
          className="max-w-xl mx-auto mt-4 p-4 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 text-gray-300"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm mb-2">Have an image of the QR code? Drop it here or</p>
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
              >
                Select Image
              </button>
              <span className="ml-3 text-xs text-gray-400">(jpg, png, svg)</span>
            </div>

            <div className="w-28 h-20 flex-shrink-0 flex items-center justify-center bg-gray-900 rounded-md border border-gray-700">
              {isProcessingFile ? (
                <div className="text-xs text-blue-300">Scanning...</div>
              ) : filePreview ? (
                <img src={filePreview} alt="preview" className="object-cover w-full h-full rounded-md" />
              ) : (
                <div className="text-xs text-gray-500">Preview</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden element used by temporary Html5Qrcode instances for file scanning */}
      <div id="qr-reader-file" style={{ display: 'none' }} />
    </div>
  );
};

export default QRScanner;