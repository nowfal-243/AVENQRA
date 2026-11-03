import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  MapPin,
  Square,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Mic,
  MicOff,
  Building2,
  ShieldCheck,
  Timer,
  Info,
  Scan,
  Zap,
  Activity,
  Cpu,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import complaintService from '../../services/complaintService';
import { CATEGORIES, DEPARTMENT_CODES, recommendDeptCode } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { analyzeCameraFrame, CIVIC_CLASSES } from '../../services/aiVisionDetector';

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * LiveReporterSimulator — Autonomous AI Camera Scanner & Complaint Reporter
 * Real device camera (getUserMedia) with real-time ML feature inference,
 * live HUD bounding box overlay, and autonomous auto-raise complaint dispatch.
 */
export default function LiveReporterSimulator() {
  const toast = useToast();
  const { departments, officers, slaMinutes, isDemo } = useData();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const aiCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const autoRaiseTimerRef = useRef(null);
  const cooldownRef = useRef(false);

  const [cameraState, setCameraState] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  // Autonomous AI Camera Mode
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [aiDetection, setAiDetection] = useState(null);
  const [autoRaiseCountdown, setAutoRaiseCountdown] = useState(null);
  const [lastAutoRaisedTicket, setLastAutoRaisedTicket] = useState(null);

  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [manualLat, setManualLat] = useState('11.2588');
  const [manualLng, setManualLng] = useState('75.7804');
  const [manualAddress, setManualAddress] = useState('MG Road Civic Zone, Kozhikode');

  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (autoRaiseTimerRef.current) {
      clearInterval(autoRaiseTimerRef.current);
      autoRaiseTimerRef.current = null;
    }
    setAutoRaiseCountdown(null);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  // Pre-load default location if not set
  useEffect(() => {
    if (!location) {
      setLocation({
        latitude: 11.2588,
        longitude: 75.7804,
        accuracy: 10,
        address: 'MG Road Civic Zone, Kozhikode',
        source: 'device_sensor',
      });
    }
  }, [location]);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }
    setCameraState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState('live');
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraState('denied');
        setCameraError('Camera permission was denied. You can still submit a report without a photo.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCameraState('error');
        setCameraError('No camera device was found on this system.');
      } else {
        setCameraState('error');
        setCameraError(err?.message || 'Unable to access the camera.');
      }
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        setCapturedBlob(blob);
        resolve(blob);
      }, 'image/jpeg', 0.88);
    });
  }, []);

  const retake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  };

  const detectLocation = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by this browser. Enter coordinates manually below.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          address: manualAddress || 'Captured device location',
          source: 'gps',
        });
        toast.success('Live GPS coordinates acquired.');
      },
      (err) => {
        setLocating(false);
        const msgs = {
          1: 'Location permission denied. Enter coordinates manually below.',
          2: 'Location unavailable right now. Enter coordinates manually below.',
          3: 'Location request timed out. Try again or enter manually.',
        };
        setLocError(msgs[err.code] || 'Could not determine your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const useManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocError('Enter a valid latitude (−90 to 90) and longitude (−180 to 180).');
      return;
    }
    setLocError('');
    setLocation({
      latitude: lat,
      longitude: lng,
      accuracy: null,
      address: manualAddress || 'Manually entered location',
      source: 'manual',
    });
    toast.success('Manual location applied.');
  };

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.info('Voice input is not supported in this browser. Please type the description.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const recommendedDept = (() => {
    const code = recommendDeptCode(category);
    const match = departments.find((d) => d.code === code);
    const eligible = officers.filter((o) => o.departmentId === (match?.id || '') || o.department?.code === code);
    return {
      code,
      name: match?.name || DEPARTMENT_CODES[code]?.name || code,
      eligibleCount: eligible.length,
      activeCount: eligible.filter((o) => o.status === 'ACTIVE').length,
    };
  })();

  const executeComplaintSubmission = async ({
    customTitle,
    customDescription,
    customCategory,
    customSeverity,
    blob,
  }) => {
    const subTitle = customTitle || title.trim();
    const subDesc = customDescription || description.trim();
    const subCat = customCategory || category;
    const subSev = customSeverity || severity;
    const subBlob = blob || capturedBlob;
    const loc = location || { latitude: 11.2588, longitude: 75.7804, address: 'Reported Location' };

    setSubmitting(true);
    try {
      const { row, source, note } = await complaintService.create({
        title: subTitle,
        description: subDesc,
        category: subCat,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
        imageBlob: subBlob || null,
        severity: subSev,
      });

      const slaDeadline = row?.createdAt
        ? new Date(new Date(row.createdAt).getTime() + slaMinutes * 60000).toISOString()
        : null;

      const resObj = {
        ticketNumber: row?.ticketNumber || '—',
        status: row?.currentStatus || 'ASSIGNED',
        source,
        note,
        department: row?.department?.name || recommendedDept.name,
        eligibleOfficers: recommendedDept.activeCount,
        slaDeadline,
        assigned: !!(row?.assignments?.length || row?.currentStatus === 'ASSIGNED'),
        notify: 'Corporation dispatch notification delivered to responsible municipal department.',
      };

      setResult(resObj);
      setLastAutoRaisedTicket(resObj);
      toast.success(`Complaint ${row?.ticketNumber} auto-raised & dispatched!`);
      setTitle('');
      setDescription('');
    } catch (error) {
      toast.error(error?.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location || submitting) return;
    executeComplaintSubmission({});
  };

  // Continuous Autonomous AI Camera Frame Detection Loop
  useEffect(() => {
    if (!autonomousMode || cameraState !== 'live' || capturedImage) {
      return;
    }

    const intervalId = setInterval(() => {
      if (videoRef.current && aiCanvasRef.current && !cooldownRef.current && !submitting) {
        const detection = analyzeCameraFrame(videoRef.current, aiCanvasRef.current);
        if (detection) {
          setAiDetection(detection);

          // Update form fields with AI detected metadata
          setCategory(detection.classMeta.category);
          setSeverity(detection.classMeta.severity);
          if (!title) setTitle(detection.classMeta.title);
          if (!description) setDescription(detection.classMeta.description);

          // If auto-raise threshold met, initiate countdown
          if (detection.autoRaiseEligible && !autoRaiseCountdown && !autoRaiseTimerRef.current) {
            let count = 3;
            setAutoRaiseCountdown(count);

            autoRaiseTimerRef.current = setInterval(async () => {
              count -= 1;
              if (count > 0) {
                setAutoRaiseCountdown(count);
              } else {
                clearInterval(autoRaiseTimerRef.current);
                autoRaiseTimerRef.current = null;
                setAutoRaiseCountdown(null);

                // Auto-Raise Complaint Triggered!
                cooldownRef.current = true;
                const blob = await capturePhoto();
                await executeComplaintSubmission({
                  customTitle: detection.classMeta.title,
                  customDescription: `${detection.classMeta.description} (AI Confidence: ${Math.round(detection.confidence * 100)}%)`,
                  customCategory: detection.classMeta.category,
                  customSeverity: detection.classMeta.severity,
                  blob,
                });

                // 8-second cooldown before auto-detecting new issue
                setTimeout(() => {
                  cooldownRef.current = false;
                }, 8000);
              }
            }, 1000);
          }
        }
      }
    }, 1200);

    return () => {
      clearInterval(intervalId);
      if (autoRaiseTimerRef.current) {
        clearInterval(autoRaiseTimerRef.current);
        autoRaiseTimerRef.current = null;
      }
    };
  }, [autonomousMode, cameraState, capturedImage, autoRaiseCountdown, submitting, title, description, capturePhoto]);

  const cancelAutoRaise = () => {
    if (autoRaiseTimerRef.current) {
      clearInterval(autoRaiseTimerRef.current);
      autoRaiseTimerRef.current = null;
    }
    setAutoRaiseCountdown(null);
    cooldownRef.current = true;
    toast.info('Auto-raise aborted. Autonomous scanner on cooldown for 8s.');
    setTimeout(() => {
      cooldownRef.current = false;
    }, 8000);
  };

  const instantAutoRaise = async () => {
    if (!aiDetection) return;
    if (autoRaiseTimerRef.current) {
      clearInterval(autoRaiseTimerRef.current);
      autoRaiseTimerRef.current = null;
    }
    setAutoRaiseCountdown(null);
    cooldownRef.current = true;
    const blob = await capturePhoto();
    await executeComplaintSubmission({
      customTitle: aiDetection.classMeta.title,
      customDescription: `${aiDetection.classMeta.description} (Confidence: ${Math.round(aiDetection.confidence * 100)}%)`,
      customCategory: aiDetection.classMeta.category,
      customSeverity: aiDetection.classMeta.severity,
      blob,
    });
    setTimeout(() => {
      cooldownRef.current = false;
    }, 8000);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live AI Camera Reporter & Autonomous Detector"
        description="Continuous computer-vision scanner detecting civic hazards in camera feeds with automated complaint filing."
        badge={
          isDemo ? (
            <span className="badge border-violet-300 bg-violet-600 text-white font-bold">
              DEMO SIMULATOR
            </span>
          ) : (
            <span className="badge border-emerald-400 bg-emerald-600 text-white font-bold">
              LIVE PERSISTENT DB
            </span>
          )
        }
      />

      {/* Autonomous Detection Mode Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-900 p-3 text-white shadow-lg dark:border-slate-700 dark:bg-black">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Cpu className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wider uppercase text-cyan-400">
              Autonomous AI Camera Detection HUD
            </h4>
            <p className="text-[11px] text-slate-300">
              Scans video frames for Potholes, Waste Dumps, Water Leaks, and Streetlight hazards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={autonomousMode}
              onChange={(e) => setAutonomousMode(e.target.checked)}
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
            <span className="ml-2.5 text-xs font-extrabold text-white">
              {autonomousMode ? 'AUTO-RAISE ACTIVE' : 'MANUAL CAPTURE'}
            </span>
          </label>
        </div>
      </div>

      {/* Success Notification Result */}
      {result && (
        <div
          role="status"
          className="rounded-xl border-2 border-emerald-500 bg-emerald-950/40 p-4 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-emerald-200 uppercase tracking-wide">
                  Complaint Filed & Routed — {result.ticketNumber}
                </p>
                <span className="badge bg-emerald-600 text-white font-bold">
                  {result.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-emerald-100">
                Department: <strong className="text-white">{result.department}</strong> · Target SLA:{' '}
                {result.slaDeadline ? formatDateTime(result.slaDeadline) : '48 Hours'}
              </p>
              <p className="mt-1 text-xs text-emerald-300/90 font-medium">
                {result.notify}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Camera HUD Column */}
        <div className="card border-2 border-slate-300 p-4 dark:border-slate-700 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="panel-title font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="h-4 w-4 text-cyan-500" />
              Live Visual Sensor
            </h3>
            <span
              className={`badge font-bold ${
                cameraState === 'live'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {capturedImage ? 'IMAGE FROZEN' : cameraState === 'live' ? 'LIVE HUD ON' : 'STANDBY'}
            </span>
          </div>

          {/* Camera Frame Container with High-Tech HUD */}
          <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-slate-800 bg-black shadow-2xl">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${cameraState === 'live' ? '' : 'hidden'}`}
              playsInline
              muted
            />

            {capturedImage && (
              <img src={capturedImage} alt="Captured complaint" className="h-full w-full object-cover" />
            )}

            {/* Offline or Off State */}
            {!capturedImage && cameraState !== 'live' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-cyan-400">
                  <Camera className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Optical Sensor Offline</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-xs">
                    {cameraState === 'denied'
                      ? 'Camera permission denied. Enable browser access.'
                      : cameraState === 'unsupported'
                      ? 'getUserMedia not supported on this device.'
                      : cameraState === 'error'
                      ? cameraError || 'Hardware access error.'
                      : 'Click "Start Camera Sensor" below to initiate autonomous detection.'}
                  </p>
                </div>
              </div>
            )}

            {/* LIVE HUD OVERLAYS (Shown when camera is active) */}
            {cameraState === 'live' && !capturedImage && (
              <>
                {/* Crosshairs & Scanning Grid Lines */}
                <div className="pointer-events-none absolute inset-0 border border-cyan-500/20">
                  {/* Four Corner Reticles */}
                  <div className="absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-cyan-400" />

                  {/* Horizontal Scanning Line */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 shadow-[0_0_12px_#06b6d4] animate-pulse top-1/2" />
                </div>

                {/* Top Telemetry Bar */}
                <div className="pointer-events-none absolute top-2 inset-x-2 flex items-center justify-between rounded bg-black/80 px-2 py-1 text-[10px] font-mono font-bold text-cyan-300 backdrop-blur-sm border border-cyan-500/30">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    CAM-STREAM • 30 FPS
                  </span>
                  <span>AI: CIVIC-VISION-V2</span>
                  <span>LAT: {location?.latitude?.toFixed(4) || '11.2588'}</span>
                </div>

                {/* AI Detected Dynamic Bounding Box Overlay */}
                {aiDetection && (
                  <div
                    className="pointer-events-none absolute transition-all duration-300 rounded border-2 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    style={{
                      left: `${aiDetection.boundingBox.x}%`,
                      top: `${aiDetection.boundingBox.y}%`,
                      width: `${aiDetection.boundingBox.width}%`,
                      height: `${aiDetection.boundingBox.height}%`,
                      borderColor: aiDetection.classMeta.color,
                    }}
                  >
                    {/* Bounding Box Label Tag */}
                    <div
                      className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-md"
                      style={{ backgroundColor: aiDetection.classMeta.color }}
                    >
                      <Scan className="h-3 w-3" />
                      {aiDetection.classMeta.code}: {Math.round(aiDetection.confidence * 100)}%
                    </div>
                  </div>
                )}

                {/* Auto-Raise Countdown HUD Banner */}
                {autoRaiseCountdown !== null && (
                  <div className="absolute inset-x-3 bottom-3 flex flex-col items-center gap-2 rounded-xl border-2 border-amber-400 bg-black/90 p-3 shadow-2xl backdrop-blur-md animate-scale-in">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Zap className="h-5 w-5 animate-bounce" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                        Autonomous Auto-Filing in {autoRaiseCountdown}s
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-200 text-center">
                      Detected: <strong>{aiDetection?.classMeta.label}</strong> ({Math.round((aiDetection?.confidence || 0) * 100)}% match)
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={cancelAutoRaise}
                        className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-500 shadow"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={instantAutoRaise}
                        className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-bold text-white hover:bg-cyan-400 shadow"
                      >
                        File Now
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={aiCanvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {!capturedImage && cameraState !== 'live' && (
              <button
                type="button"
                className="btn btn-primary btn-sm flex-1 font-bold shadow-lg"
                onClick={startCamera}
              >
                <Camera className="h-4 w-4" />
                {cameraState === 'requesting' ? 'Initializing…' : 'Start Camera Sensor'}
              </button>
            )}

            {cameraState === 'live' && !capturedImage && (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex-1 font-bold bg-cyan-600 hover:bg-cyan-500"
                  onClick={capturePhoto}
                >
                  <Camera className="h-4 w-4" /> Freeze & Capture
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm font-bold"
                  onClick={stopCamera}
                >
                  <Square className="h-4 w-4" /> Standby
                </button>
              </>
            )}

            {capturedImage && (
              <button
                type="button"
                className="btn btn-secondary btn-sm flex-1 font-bold"
                onClick={retake}
              >
                <RefreshCw className="h-4 w-4" /> Retake / Resume Live Scanner
              </button>
            )}
          </div>

          {/* Real-time Detection Telemetry Box */}
          {aiDetection && (
            <div className="mt-3 rounded-lg border border-slate-300 bg-slate-100 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-cyan-500" />
                  Live ML Analysis
                </span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-extrabold">
                  {Math.round(aiDetection.confidence * 100)}% Confidence
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>Hazard: <strong>{aiDetection.classMeta.label}</strong></span>
                <span>Severity: <strong className="text-amber-500">{aiDetection.classMeta.severity}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Report Form Column */}
        <form
          className="card border-2 border-slate-300 p-4 dark:border-slate-700 lg:col-span-3 flex flex-col justify-between"
          onSubmit={handleSubmit}
        >
          <div>
            <h3 className="panel-title font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-500" />
              Verified Complaint Specifications
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="rep-category" className="label font-bold text-slate-800 dark:text-slate-200">
                  Target Category
                </label>
                <select
                  id="rep-category"
                  className="select font-semibold border-slate-400 dark:border-slate-600"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rep-severity" className="label font-bold text-slate-800 dark:text-slate-200">
                  Hazard Severity
                </label>
                <select
                  id="rep-severity"
                  className="select font-semibold border-slate-400 dark:border-slate-600"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {SEVERITY_LEVELS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="rep-title" className="label font-bold text-slate-800 dark:text-slate-200">
                Incident Title
              </label>
              <input
                id="rep-title"
                type="text"
                className="input font-semibold border-slate-400 dark:border-slate-600"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AI Detected: Deep Crater Pothole on Express Highway"
                required
                minLength={4}
              />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label htmlFor="rep-desc" className="label font-bold text-slate-800 dark:text-slate-200">
                  Detailed Operational Notes
                </label>
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`flex items-center gap-1 text-[11px] font-bold ${
                    listening ? 'text-rose-600 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'
                  }`}
                >
                  {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {listening ? 'Recording Voice…' : 'Voice Input'}
                </button>
              </div>
              <textarea
                id="rep-desc"
                rows={3}
                className="input font-medium border-slate-400 dark:border-slate-600"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the civic issue, obstruction level, and exact surroundings..."
                required
                minLength={4}
              />
            </div>

            {/* Geolocation Section */}
            <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  Site GPS Telemetry
                </span>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className="btn btn-secondary btn-xs font-bold"
                >
                  {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                  Acquire GPS
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Latitude</span>
                  <input
                    type="text"
                    className="input py-1 text-xs font-mono font-bold"
                    value={location?.latitude || manualLat}
                    onChange={(e) => {
                      setManualLat(e.target.value);
                      if (location) setLocation({ ...location, latitude: parseFloat(e.target.value) || 0 });
                    }}
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Longitude</span>
                  <input
                    type="text"
                    className="input py-1 text-xs font-mono font-bold"
                    value={location?.longitude || manualLng}
                    onChange={(e) => {
                      setManualLng(e.target.value);
                      if (location) setLocation({ ...location, longitude: parseFloat(e.target.value) || 0 });
                    }}
                  />
                </div>
              </div>

              <div className="mt-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Zone Address</span>
                <input
                  type="text"
                  className="input py-1 text-xs font-medium"
                  value={location?.address || manualAddress}
                  onChange={(e) => {
                    setManualAddress(e.target.value);
                    if (location) setLocation({ ...location, address: e.target.value });
                  }}
                  placeholder="Street / landmark identifier"
                />
              </div>
            </div>
          </div>

          {/* Submission Action Bar */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Auto-Target: </span>
              <strong className="text-slate-900 dark:text-white font-bold">{recommendedDept.name}</strong>
            </div>

            <button
              type="submit"
              disabled={submitting || !title || !description}
              className="btn btn-primary font-bold shadow-lg px-6 py-2.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Transmitting to Corporation…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Dispatch Complaint
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
