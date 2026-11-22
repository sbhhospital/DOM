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
  const gpsCoordsRef = useRef<{ latitude?: number; longitude?: number; accuracy?: number }>({});
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
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          };
          setGpsCoords(coords);
          gpsCoordsRef.current = coords;
          setGpsStatus('verified');
        },
        (err) => {
          console.warn('GPS location notice:', err.message);
          setGpsStatus('unavailable');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
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
          videoRef.current.play().then(() => {
            requestScanLoop();
          }).catch((err) => {
            console.warn('Video play note:', err);
          });
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Camera access error:', err);
        setHasCameraPermission(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Camera permission was denied. Please allow camera access in your browser settings to scan the boardroom QR code.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No camera device was detected on your device.');
        } else {
          setCameraError('Unable to open camera stream. Please ensure camera permissions are granted and refresh.');
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen]);

  // 3. Continuous jsQR Frame Scanner
  const requestScanLoop = () => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim().length > 0) {
          const raw = code.data.trim();
          if (raw.includes('boardroom') || raw.includes('sbhdom') || raw.includes('checkin') || raw.length > 5) {
            setIsVerifying(true);
            stopCamera();
            setTimeout(() => {
              const liveGps = gpsCoordsRef.current;
              onScanSuccess({
                scannedData: raw,
                latitude: liveGps.latitude ?? gpsCoords.latitude,
                longitude: liveGps.longitude ?? gpsCoords.longitude,
                accuracy: liveGps.accuracy ?? gpsCoords.accuracy,
              });
            }, 300);
            return;
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[30000] modal-backdrop flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#f0f1f8] relative flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Top Header matching Hope UI */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-[#f0f1f8] flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#eff0fe] text-[#7065f0] border border-indigo-200/50 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-[#7065f0]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#232d42] tracking-tight">Boardroom Scanner</h3>
              <p className="text-[10px] sm:text-[11px] text-[#8a92a6]">5th Floor Conference Hall QR</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-[#232d42] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Viewfinder Body */}
        <div className="p-3 sm:p-4 flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 text-center">
          {/* Logo & Leader Name */}
          <div className="flex items-center justify-between bg-[#f4f5fa] px-3 py-2 rounded-2xl border border-slate-200/60 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <img src={sbhLogo} alt="SBH Logo" className="h-5 sm:h-6 w-auto object-contain shrink-0" />
              <span className="font-bold text-[#232d42] truncate text-xs">{leaderName}</span>
            </div>
            <span className="text-[10px] font-bold text-[#7065f0] bg-[#eff0fe] px-2 py-0.5 rounded-full border border-indigo-200/60 shrink-0">
              In-Room Verification
            </span>
          </div>

          {/* Camera View Area */}
          <div className="relative w-full h-[200px] sm:h-[260px] bg-[#0f172a] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#7065f0] shadow-inner flex items-center justify-center">
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
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                {/* Outer Target Box with Corner Accents */}
                <div className="relative w-36 h-36 sm:w-48 sm:h-48 border-2 border-[#7065f0]/80 rounded-2xl">
                  {/* Top-Left Corner */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#7065f0] rounded-tl-lg" />
                  {/* Top-Right Corner */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#7065f0] rounded-tr-lg" />
                  {/* Bottom-Left Corner */}
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#7065f0] rounded-bl-lg" />
                  {/* Bottom-Right Corner */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#7065f0] rounded-br-lg" />

                  {/* Animated Glowing Laser Beam */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#7065f0] to-transparent shadow-[0_0_12px_#7065f0] animate-bounce" />
                </div>
              </div>
            )}

            {/* Error or Loading Overlay */}
            {hasCameraPermission === null && !cameraError && (
              <div className="absolute inset-0 bg-[#0f172a]/90 text-white flex flex-col items-center justify-center p-4">
                <RefreshCw className="w-7 h-7 text-[#7065f0] animate-spin mb-2" />
                <span className="text-xs font-bold">Initializing Rear Camera Feed...</span>
                <span className="text-[10px] text-slate-400 mt-1">Please grant camera permissions when prompted</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-[#0f172a]/95 text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                <span className="text-xs font-bold text-rose-300">Camera Access Blocked</span>
                <p className="text-[10px] sm:text-[11px] text-slate-300 mt-1 leading-relaxed">{cameraError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-3 py-1.5 bg-[#7065f0] hover:bg-[#5e52e4] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Reload Page & Retry
                </button>
              </div>
            )}
          </div>

          {/* GPS Telemetry Pill */}
          <div className="flex items-center justify-between bg-[#f4f5fa] px-3 py-2 rounded-xl sm:rounded-2xl border border-slate-200/60 text-[10px] sm:text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-[#232d42]">
              <MapPin className="w-3.5 h-3.5 text-[#7065f0]" />
              <span>Location Telemetry:</span>
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
          <div className="text-left bg-[#eff0fe]/50 border border-indigo-200/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] text-[#232d42] space-y-0.5">
            <div className="font-bold text-[#7065f0] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7065f0]" /> Physical Check-In Guideline:
            </div>
            <p className="text-slate-600 leading-relaxed text-[10px] sm:text-[11px]">
              Align viewfinder with official Boardroom QR poster in 5th Floor Conference Hall. Attendance verifies automatically upon scan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
