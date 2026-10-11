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
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import complaintService from '../../services/complaintService';
import { CATEGORIES, DEPARTMENT_CODES, recommendDeptCode } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * LiveReporterSimulator — an in-browser complaint reporter for field staff and
 * demonstrations. It uses the REAL device camera (getUserMedia) and REAL
 * browser geolocation, and submits through the real complaintService (backend
 * in live mode, the labelled demo store otherwise).
 *
 * Nothing here fakes GPS, AI classification, dispatch or notifications: when a
 * capability is unavailable or unsupported by the backend, the UI says so.
 */
export default function LiveReporterSimulator() {
  const toast = useToast();
  const { departments, officers, slaMinutes, isDemo } = useData();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  const [cameraState, setCameraState] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => () => recognitionRef.current?.stop(), []);

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

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
    canvas.toBlob((blob) => setCapturedBlob(blob), 'image/jpeg', 0.85);
    stopCamera();
    setCameraState('idle');
  };

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

  const canSubmit = title.trim().length >= 4 && description.trim().length >= 4 && !!location && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { row, source, note } = await complaintService.create({
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        imageBlob: capturedBlob || null,
        severity,
      });
      const slaDeadline = row?.createdAt
        ? new Date(new Date(row.createdAt).getTime() + slaMinutes * 60000).toISOString()
        : null;
      setResult({
        ticketNumber: row?.ticketNumber || '—',
        status: row?.currentStatus || 'SUBMITTED',
        source,
        note,
        department: recommendedDept.name,
        eligibleOfficers: recommendedDept.activeCount,
        slaDeadline,
      });
      toast.success(`Complaint ${row?.ticketNumber || ''} submitted (${source} mode).`);
      setTitle('');
      setDescription('');
      setCapturedImage(null);
      setCapturedBlob(null);
      setSeverity('MEDIUM');
    } catch (error) {
      toast.error(error?.message || 'Failed to submit the complaint.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div>
      <PageHeader
        title="Live Camera Reporter"
        description="Capture a site photo, tag the location and file a complaint straight into the workflow."
        badge={
          isDemo ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
              demo mode
            </span>
          ) : (
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              live api
            </span>
          )
        }
      />

      {result && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/10"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                Complaint filed — {result.ticketNumber}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/90 dark:text-emerald-300/90">
                Status: <strong>{result.status}</strong> · Recommended department: <strong>{result.department}</strong>{' '}
                · SLA deadline: {result.slaDeadline ? formatDateTime(result.slaDeadline) : '—'}
              </p>
              {result.source === 'demo' && (
                <p className="mt-1 text-[11px] text-violet-600 dark:text-violet-300">
                  {result.note || 'Stored in this browser only — nothing was sent to a server.'}
                </p>
              )}
              <p className="mt-1 text-[10px] text-slate-400">
                Automatic officer dispatch depends on a backend assignment worker. Open the complaint in Triage
                to assign an officer where required.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Camera capture column */}
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="panel-title">Site capture</h3>
            <span className="badge border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-navy-850 dark:text-slate-300">
              {capturedImage ? 'Captured' : cameraState === 'live' ? 'Live' : 'Idle'}
            </span>
          </div>

          <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-700">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${cameraState === 'live' ? '' : 'hidden'}`}
              playsInline
              muted
            />
            {capturedImage && (
              <img src={capturedImage} alt="Captured complaint" className="h-full w-full object-cover" />
            )}
            {!capturedImage && cameraState !== 'live' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <Camera className="h-8 w-8 text-slate-500" aria-hidden="true" />
                <p className="text-xs text-slate-400">
                  {cameraState === 'denied'
                    ? 'Camera access denied'
                    : cameraState === 'unsupported'
                      ? 'Camera not supported here'
                      : cameraState === 'error'
                        ? cameraError || 'Camera error'
                        : 'Camera is off'}
                </p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {cameraError && cameraState !== 'live' && !capturedImage && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {cameraError}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {!capturedImage && cameraState !== 'live' && (
              <button type="button" className="btn btn-primary btn-sm" onClick={startCamera}>
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                {cameraState === 'requesting' ? 'Requesting…' : 'Start camera'}
              </button>
            )}
            {cameraState === 'live' && !capturedImage && (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={capturePhoto}>
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Capture photo
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={stopCamera}>
                  <Square className="h-3.5 w-3.5" aria-hidden="true" /> Stop
                </button>
              </>
            )}
            {capturedImage && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={retake}>
                Retake
              </button>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            The camera is only activated when you click “Start camera”, and all tracks stop when you leave this
            page. A photo is optional — reports can be filed without one.
          </p>
        </div>

        {/* Report form column */}
        <form className="card p-4 lg:col-span-3" onSubmit={handleSubmit}>
          <h3 className="panel-title">Complaint details</h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rep-category" className="label">
                Issue category (15 supported)
              </label>
              <select
                id="rep-category"
                className="select"
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
              <label htmlFor="rep-severity" className="label">
                Severity (manual — no AI classifier runs here)
              </label>
              <select
                id="rep-severity"
                className="select"
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
            <label htmlFor="rep-title" className="label">
              Title
            </label>
            <input
              id="rep-title"
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary, e.g. Deep pothole on 5th Avenue"
              required
              minLength={4}
            />
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <label htmlFor="rep-desc" className="label">
                Description
              </label>
              <button
                type="button"
                onClick={toggleVoice}
                className={`btn btn-xs ${listening ? 'btn-danger' : 'btn-ghost'}`}
                title={listening ? 'Stop dictation' : 'Dictate description'}
              >
                {listening ? <MicOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Mic className="h-3.5 w-3.5" aria-hidden="true" />}
                {listening ? 'Stop' : 'Voice'}
              </button>
            </div>
            <textarea
              id="rep-desc"
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, hazards and any landmarks…"
              required
              minLength={4}
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <MapPin className="h-4 w-4 text-cyan-500" aria-hidden="true" /> Location
              </h4>
              <button type="button" className="btn btn-secondary btn-xs" onClick={detectLocation} disabled={locating}>
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>

            {location ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] dark:bg-navy-850">
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </span>
                {location.accuracy != null && (
                  <span className="text-slate-400">±{Math.round(location.accuracy)} m accuracy</span>
                )}
                <span className="text-slate-400">{location.source === 'gps' ? 'Device GPS' : 'Manual entry'}</span>
                <span className="text-slate-400">· {location.address}</span>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">
                No location set yet. Use device GPS or enter coordinates manually below.
              </p>
            )}

            {locError && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {locError}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                type="number"
                step="any"
                className="input"
                placeholder="Latitude"
                aria-label="Manual latitude"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
              <input
                type="number"
                step="any"
                className="input"
                placeholder="Longitude"
                aria-label="Manual longitude"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
              />
              <input
                type="text"
                className="input sm:col-span-2"
                placeholder="Address / landmark (optional)"
                aria-label="Manual address"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-ghost btn-xs mt-2" onClick={useManualLocation}>
              Set manual location
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3.5 dark:border-cyan-500/30 dark:bg-cyan-500/5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-200">
              <Building2 className="h-4 w-4" aria-hidden="true" /> Recommended routing
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-cyan-600/70 dark:text-cyan-400/70">
                  Department
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{recommendedDept.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-cyan-600/70 dark:text-cyan-400/70">
                  Eligible officers
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {recommendedDept.activeCount} active / {recommendedDept.eligibleCount} total
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-cyan-600/70 dark:text-cyan-400/70">
                  SLA window
                </p>
                <p className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" /> {slaMinutes} min
                </p>
              </div>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-cyan-700/80 dark:text-cyan-300/80">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Department is inferred from the category using the same keyword routing as the backend. Officer
              assignment is a manual Triage step unless the backend auto-dispatch worker is running — this
              portal does not claim a dispatch it did not perform.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mr-auto text-[11px] text-slate-400">
              {canSubmit ? 'Ready to submit' : 'Title, description and a location are required.'}
            </p>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

