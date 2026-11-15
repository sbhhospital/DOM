import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, ShieldCheck, MapPin, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import jsQR from 'jsqr';
import sbhLogo from '../assets/sbh-logo.png';

interface LiveRoomQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scanResult: {
    scannedData: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }) => void;
  leaderName: string;
}

export const LiveRoomQrScannerModal: React.FC<LiveRoomQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  leaderName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'verified' | 'unavailable'>('acquiring');
  const [gpsCoords, setGpsCoords] = useState<{ latitude?: number; longitude?: number; accuracy?: number }>({});
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // 1. Acquire GPS Location (High Accuracy Geolocation Telemetry)
  useEffect(() => {
    if (!isOpen) return;

    if ('geolocation' in navigator) {
      setGpsStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          });
          setGpsStatus('verified');
        },
        (err) => {
          console.warn('GPS location notice:', err.message);
          setGpsStatus('unavailable');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      setGpsStatus('unavailable');
    }
  }, [isOpen]);

  // 2. Start Live Camera Feed (Rear Environment Camera Preferred)
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isCancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      setHasCameraPermission(null);

      try {
        // Attempt to get environment/back camera first
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback to any available video camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          startScanningLoop();
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Camera access error:', err);
          setHasCameraPermission(false);
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera access in your browser settings to scan the boardroom QR code.'
              : `Unable to access camera: ${err.message || 'Device camera unavailable.'}`
          );
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen]);

  // 3. Real-Time Video Frame QR Analysis Loop via jsQR
  const startScanningLoop = () => {
    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !isVerifying) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const raw = code.data.trim();
            // Validate that QR code matches SBH Boardroom
            if (
              raw.includes('boardroom-checkin') ||
              raw.includes('sbhhospital.com') ||
              raw.includes('DOM') ||
              raw.includes('localhost')
            ) {
              setIsVerifying(true);
              stopCamera();

              // Trigger success callback with GPS telemetry
              onScanSuccess({
                scannedData: raw,
                latitude: gpsCoords.latitude,
                longitude: gpsCoords.longitude,
                accuracy: gpsCoords.accuracy,
              });
              return;
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[25000] modal-backdrop flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 relative flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Boardroom Physical Scanner</h3>
              <p className="text-[10px] text-slate-400">Scan In-Room QR Code (5th Floor)</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Viewfinder Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-center">
          {/* Logo & Leader Name */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <img src={sbhLogo} alt="SBH Logo" className="h-6 w-auto object-contain" />
              <span className="font-bold text-slate-900 truncate">{leaderName}</span>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              Live In-Room Check-In
            </span>
          </div>

          {/* Camera View Area */}
          <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner flex items-center justify-center">
            {/* Live Video Stream */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Hidden Processing Canvas for jsQR */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Target Overlay (Laser Scan Effect) */}
            {hasCameraPermission && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                {/* Outer Target Box with Corner Accents */}
                <div className="relative w-52 h-52 sm:w-60 sm:h-60 border-2 border-emerald-400/80 rounded-2xl">
                  {/* Top-Left Corner */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                  {/* Top-Right Corner */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                  {/* Bottom-Left Corner */}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                  {/* Bottom-Right Corner */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />

                  {/* Animated Glowing Laser Beam */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-bounce" />
                </div>
              </div>
            )}

            {/* Error or Loading Overlay */}
            {hasCameraPermission === null && !cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 text-white flex flex-col items-center justify-center p-4">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                <span className="text-xs font-bold">Initializing Rear Camera Feed...</span>
                <span className="text-[10px] text-slate-400 mt-1">Please grant camera permissions when prompted</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 text-white flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                <span className="text-xs font-black text-rose-300">Camera Access Blocked</span>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">{cameraError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Reload Page & Retry
                </button>
              </div>
            )}
          </div>

          {/* GPS Telemetry Pill */}
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              <span>Location Security:</span>
            </div>
            <div>
              {gpsStatus === 'acquiring' && (
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Verifying GPS...
                </span>
              )}
              {gpsStatus === 'verified' && (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> GPS Verified (±{gpsCoords.accuracy}m)
                </span>
              )}
              {gpsStatus === 'unavailable' && (
                <span className="text-slate-500 font-medium">GPS Approximate</span>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-left bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl text-[11px] text-slate-700 space-y-1">
            <div className="font-black text-emerald-950 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> Physical Presence Rule:
            </div>
            <p className="text-slate-600">
              Point your camera at the official printed Boardroom QR poster placed in the 5th Floor Conference Hall. Photo uploads from gallery are strictly disallowed for compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
