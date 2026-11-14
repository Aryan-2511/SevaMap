import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Navigation,
  Phone,
  Globe,
  HeartHandshake,
  Sparkles,
  Download,
  Image as ImageIcon,
  Video,
  ShieldCheck,
  Loader2,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { CATEGORY_META, ModalTab, NgoOrganization, SupportedLanguage } from '../types';
import { SUPPORTED_LANGUAGES, UiLabels } from '../i18n/labels';

interface NgoDetailModalProps {
  org: NgoOrganization;
  initialTab: ModalTab;
  language: SupportedLanguage;
  labels: UiLabels;
  onClose: () => void;
}

const POSTER_MOODS = [
  'Hopeful & Uplifting',
  'Urgent Relief Appeal',
  'Warm Community Story',
  'Minimalist Editorial Impact',
];

const VIDEO_TONES = [
  'Documentary Field Story',
  'Heartwarming Hope',
  'Urgent Call to Action',
];

const PRESET_AMOUNTS = [0, 250, 500, 1000, 2500];

export function NgoDetailModal({
  org,
  initialTab,
  language,
  labels,
  onClose,
}: NgoDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Creative Studio state
  const [studioMode, setStudioMode] = useState<'poster' | 'video'>('poster');
  const [posterMood, setPosterMood] = useState(POSTER_MOODS[0]);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [includeQrBadge, setIncludeQrBadge] = useState(true);

  const [videoTone, setVideoTone] = useState(VIDEO_TONES[0]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgressText, setVideoProgressText] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoScript, setVideoScript] = useState<{
    headline: string;
    voiceover: string;
    captions: string[];
    cta: string;
  } | null>(null);
  const [activeCaptionIdx, setActiveCaptionIdx] = useState(0);
  const [copiedScript, setCopiedScript] = useState(false);

  const qrCanvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Cycle captions over video playback
  useEffect(() => {
    if (!videoUrl || !videoScript?.captions?.length) return;
    const id = window.setInterval(() => {
      setActiveCaptionIdx(
        (prev) => (prev + 1) % videoScript.captions.length
      );
    }, 3200);
    return () => window.clearInterval(id);
  }, [videoUrl, videoScript]);

  const catMeta = CATEGORY_META[org.category];
  const langName =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || 'English';

  const qrPayload = org.donation_upi
    ? `upi://pay?pa=${encodeURIComponent(org.donation_upi)}&pn=${encodeURIComponent(org.name)}&cu=INR${donationAmount > 0 ? `&am=${donationAmount}` : ''}`
    : org.donation_link || org.website || 'https://sevamap.org';

  const handleCopyUpi = async () => {
    if (!org.donation_upi) return;
    try {
      await navigator.clipboard.writeText(org.donation_upi);
      setCopiedUpi(true);
      window.setTimeout(() => setCopiedUpi(false), 2200);
    } catch {
      // Fallback copy unavailable
    }
  };

  // Generate high-contrast local Canvas poster if user wants instant offline/fallback poster
  const generateLocalCanvasPoster = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1200);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#134E4A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 1200);

    // Accent top bar
    ctx.fillStyle = catMeta.color;
    ctx.fillRect(0, 0, 900, 18);

    // Category tag text
    ctx.fillStyle = '#99F6E4';
    ctx.font = '600 26px sans-serif';
    ctx.fillText(catMeta.label.toUpperCase(), 64, 110);

    // Organization Name (wrapped)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 54px sans-serif';
    const words = org.name.split(' ');
    let line = '';
    let y = 195;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > 760) {
        ctx.fillText(line.trim(), 64, y);
        line = word + ' ';
        y += 66;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), 64, y);

    // Urgent need block
    y += 80;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(64, y, 772, 230);
    ctx.fillStyle = '#5EEAD4';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('URGENT COMMUNITY NEED', 96, y + 52);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 34px sans-serif';
    const needText =
      org.urgent_needs[0] || 'Support monthly care and essential supplies.';
    const needWords = needText.split(' ');
    let nLine = '';
    let ny = y + 112;
    for (const w of needWords) {
      const test = nLine + w + ' ';
      if (ctx.measureText(test).width > 700) {
        ctx.fillText(nLine.trim(), 96, ny);
        nLine = w + ' ';
        ny += 44;
      } else {
        nLine = test;
      }
    }
    ctx.fillText(nLine.trim(), 96, ny);

    // Summary prose
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '400 26px sans-serif';
    const sumWords = org.summary.split(' ');
    let sLine = '';
    let sy = y + 310;
    for (const w of sumWords) {
      const test = sLine + w + ' ';
      if (ctx.measureText(test).width > 760) {
        ctx.fillText(sLine.trim(), 64, sy);
        sLine = w + ' ';
        sy += 38;
        if (sy > 840) break;
      } else {
        sLine = test;
      }
    }
    if (sy <= 840) ctx.fillText(sLine.trim(), 64, sy);

    // Bottom footer details
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 26px sans-serif';
    ctx.fillText('Direct UPI & Verification', 64, 980);
    ctx.fillStyle = '#99F6E4';
    ctx.font = '500 24px monospace';
    ctx.fillText(org.donation_upi || org.website || 'sevamap.org', 64, 1025);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '400 20px sans-serif';
    ctx.fillText(org.address.slice(0, 56), 64, 1075);

    // Dedicated bottom-right QR badge area
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(610, 890, 236, 260);
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 20px sans-serif';
    ctx.fillText('SCAN TO DONATE', 636, 1130);

    setPosterError(null);
    setPosterUrl(canvas.toDataURL('image/png'));
  };

  const handleGeneratePoster = async () => {
    setPosterLoading(true);
    setPosterError(null);
    try {
      const res = await fetch('/api/creative/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org,
          mood: posterMood,
          languageName: langName,
        }),
      });
      const data = (await res.json()) as {
        imageDataUrl?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.imageDataUrl) {
        setPosterError(
          data.error || 'Could not generate AI poster with current API key.'
        );
      } else {
        setPosterUrl(data.imageDataUrl);
      }
    } catch {
      setPosterError('Network error while generating poster.');
    } finally {
      setPosterLoading(false);
    }
  };

  const handleDownloadPoster = () => {
    if (!posterUrl) return;
    const slug = org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (!includeQrBadge) {
      const a = document.createElement('a');
      a.href = posterUrl;
      a.download = `${slug}-poster.png`;
      a.click();
      return;
    }

    // Composite generated poster with real scannable QR code badge in bottom-right
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 900;
      canvas.height = img.height || 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const qrSource = qrCanvasWrapperRef.current?.querySelector('canvas');
      if (qrSource) {
        const badgeSize = Math.round(canvas.width * 0.23);
        const pad = Math.round(canvas.width * 0.035);
        const bx = canvas.width - badgeSize - pad;
        const by = canvas.height - badgeSize - pad - 24;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bx - 10, by - 10, badgeSize + 20, badgeSize + 36);
        ctx.drawImage(qrSource, bx, by, badgeSize, badgeSize);
        ctx.fillStyle = '#0F172A';
        ctx.font = `700 ${Math.max(12, Math.round(canvas.width * 0.018))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          'SCAN TO DONATE',
          bx + badgeSize / 2,
          by + badgeSize + 18
        );
      }

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${slug}-poster.png`;
      a.click();
    };
    img.src = posterUrl;
  };

  const handleGenerateVideo = async () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);
    setVideoProgressText('Writing 15-second voiceover script & launching video render...');

    try {
      const res = await fetch('/api/creative/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org,
          tone: videoTone,
          languageName: langName,
        }),
      });
      const data = (await res.json()) as {
        script?: {
          headline: string;
          voiceover: string;
          captions: string[];
          cta: string;
        };
        interactionId?: string | null;
        status?: string;
        videoError?: string;
      };

      if (data.script) {
        setVideoScript(data.script);
      }

      if (!data.interactionId || data.status === 'error') {
        setVideoError(
          data.videoError ||
            'Video rendering requires a billing-enabled API key in Settings > Secrets.'
        );
        setVideoLoading(false);
        return;
      }

      setVideoProgressText('Rendering 16:9 HD awareness video (usually 30–90s)...');
      const interactionId = data.interactionId;
      let attempts = 0;

      pollTimerRef.current = window.setInterval(async () => {
        attempts += 1;
        if (attempts > 60) {
          if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
          setVideoError('Video rendering timed out. Please try again.');
          setVideoLoading(false);
          return;
        }
        try {
          const pollRes = await fetch(
            `/api/creative/video-status/${encodeURIComponent(interactionId)}`
          );
          const pollData = (await pollRes.json()) as {
            status: string;
            videoDataUrl?: string;
            error?: string;
          };

          if (pollData.status === 'completed' && pollData.videoDataUrl) {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            setVideoUrl(pollData.videoDataUrl);
            setVideoLoading(false);
          } else if (pollData.status === 'failed') {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            setVideoError(pollData.error || 'Video generation failed.');
            setVideoLoading(false);
          }
        } catch {
          // Continue polling on transient network blip
        }
      }, 3000);
    } catch {
      setVideoError('Network error starting video generation.');
      setVideoLoading(false);
    }
  };

  const handleCopyScript = async () => {
    if (!videoScript) return;
    const text = `${videoScript.headline}\n\nVoiceover:\n${videoScript.voiceover}\n\nCaptions:\n${videoScript.captions.join('\n')}\n\n${videoScript.cta}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ngo-modal-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: catMeta.color }}
              />
              <span className="font-medium text-slate-700">{catMeta.label}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {org.distance_km.toFixed(1)} {labels.kmAway}
              </span>
              {org.verified && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-teal-700 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {labels.verifiedLabel}
                  </span>
                </>
              )}
            </div>
            <h2
              id="ngo-modal-title"
              className="text-xl font-bold text-slate-900 truncate"
            >
              {org.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tab Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('donate')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'donate'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            {labels.tabSupportDonate}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {labels.tabCreativeStudio}
          </button>
        </div>

        {/* Hidden QR Canvas reference for poster download compositing */}
        <div ref={qrCanvasWrapperRef} className="hidden" aria-hidden="true">
          <QRCodeCanvas value={qrPayload} size={220} level="M" />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {activeTab === 'donate' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Info Column */}
              <div className="md:col-span-7 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                    About This Organization
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {org.summary}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">
                    {labels.urgentNeedsLabel}
                  </h3>
                  <ul className="space-y-2">
                    {org.urgent_needs.map((need, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-slate-700 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200/70"
                      >
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: catMeta.color }}
                        />
                        <span>{need}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2.5 text-sm text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{org.address}</span>
                  </div>
                  {org.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${org.phone.replace(/\s+/g, '')}`}
                        className="font-mono text-slate-800 hover:text-teal-700 underline-offset-2 hover:underline"
                      >
                        {org.phone}
                      </a>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-700 hover:underline truncate"
                      >
                        {org.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Links Row */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${org.lat},${org.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Navigation className="w-4 h-4" />
                    {labels.getDirectionsBtn}
                  </a>
                  {(org.donation_link || org.website) && (
                    <a
                      href={org.donation_link || org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {labels.openDonationPortal}
                    </a>
                  )}
                </div>
              </div>

              {/* Right UPI QR Donation Card */}
              <div className="md:col-span-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col items-center text-center">
                  <p className="text-xs font-semibold text-slate-800 mb-3">
                    {org.donation_upi
                      ? labels.scanToDonate
                      : 'Scan to open official donation page'}
                  </p>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <QRCodeCanvas
                      value={qrPayload}
                      size={188}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Amount quick-select for dynamic UPI QR */}
                  {org.donation_upi && (
                    <div className="w-full mt-4">
                      <p className="text-[11px] font-medium text-slate-500 mb-1.5">
                        Pre-fill Amount (Optional)
                      </p>
                      <div className="grid grid-cols-5 gap-1">
                        {PRESET_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setDonationAmount(amt)}
                            className={`py-1.5 rounded-md text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                              donationAmount === amt
                                ? 'bg-teal-700 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {amt === 0 ? 'Any' : `₹${amt}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {org.donation_upi ? (
                    <div className="w-full mt-4 pt-3.5 border-t border-slate-200">
                      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <span className="font-mono text-xs text-slate-800 truncate">
                          {org.donation_upi}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              {labels.upiCopied}
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              {labels.copyUpiId}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Direct UPI ID not listed publicly. Scan the QR code or use
                      the official portal button to contribute safely.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* AI Creative Studio Tab */
            <div className="space-y-5">
              {/* Studio Mode Toggle */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStudioMode('poster')}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      studioMode === 'poster'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {labels.posterStudioTitle}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode('video')}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      studioMode === 'video'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {labels.videoStudioTitle}
                  </button>
                </div>

                <span className="text-xs text-slate-500">
                  Active Language: <strong className="text-slate-800">{langName}</strong>
                </span>
              </div>

              {studioMode === 'poster' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Controls */}
                  <div className="md:col-span-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Campaign Visual Mood
                      </label>
                      <select
                        value={posterMood}
                        onChange={(e) => setPosterMood(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        {POSTER_MOODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1.5">
                      <p>
                        <strong className="text-slate-800">Featured Need:</strong>{' '}
                        {org.urgent_needs[0] || org.summary}
                      </p>
                      <label className="flex items-center gap-2 pt-1.5 cursor-pointer select-none text-slate-800 font-medium">
                        <input
                          type="checkbox"
                          checked={includeQrBadge}
                          onChange={(e) => setIncludeQrBadge(e.target.checked)}
                          className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                        />
                        Include scannable Donate QR badge on poster
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleGeneratePoster}
                        disabled={posterLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                      >
                        {posterLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating AI Poster...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {labels.generatePosterBtn}
                          </>
                        )}
                      </button>

                      {posterUrl && (
                        <button
                          type="button"
                          onClick={handleDownloadPoster}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          {labels.downloadPosterBtn}
                        </button>
                      )}
                    </div>

                    {posterError && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                          <span>{posterError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={generateLocalCanvasPoster}
                          className="w-full py-1.5 px-3 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-semibold transition-colors cursor-pointer"
                        >
                          Create Instant Print Poster (Canvas)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Poster 3:4 Preview Canvas */}
                  <div className="md:col-span-7 flex justify-center">
                    <div className="relative w-full max-w-[340px] aspect-[3/4] rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                      {posterLoading ? (
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                          <Loader2 className="w-8 h-8 text-teal-700 animate-spin" />
                          <p className="text-xs font-medium text-slate-600">
                            Designing custom campaign artwork for {org.name}...
                          </p>
                        </div>
                      ) : posterUrl ? (
                        <>
                          <img
                            src={posterUrl}
                            alt={`Donation campaign poster for ${org.name}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {includeQrBadge && (
                            <div className="absolute bottom-3 right-3 bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex flex-col items-center">
                              <QRCodeCanvas value={qrPayload} size={68} level="M" />
                              <span className="mt-1 text-[9px] font-bold tracking-wide text-slate-900">
                                SCAN TO DONATE
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-6 text-center space-y-2">
                          <ImageIcon className="w-9 h-9 text-slate-400 mx-auto" />
                          <p className="text-sm font-semibold text-slate-700">
                            3:4 Campaign Poster Preview
                          </p>
                          <p className="text-xs text-slate-500">
                            Select a mood and click &ldquo;{labels.generatePosterBtn}&rdquo; to create a shareable donation poster.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Promo Video Ad Studio */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Narrative & Visual Tone
                      </label>
                      <select
                        value={videoTone}
                        onChange={(e) => setVideoTone(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        {VIDEO_TONES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateVideo}
                        disabled={videoLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                      >
                        {videoLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating Promo Reel...
                          </>
                        ) : (
                          <>
                            <Video className="w-4 h-4" />
                            {labels.generateVideoBtn}
                          </>
                        )}
                      </button>

                      {videoUrl && (
                        <a
                          href={videoUrl}
                          download={`${org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-promo.mp4`}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          {labels.downloadVideoBtn}
                        </a>
                      )}
                    </div>

                    {videoScript && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            15s Voiceover & Caption Script
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyScript}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                          >
                            {copiedScript ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {videoScript.headline}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {videoScript.voiceover}
                        </p>
                      </div>
                    )}

                    {videoError && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                        <span>{videoError}</span>
                      </div>
                    )}
                  </div>

                  {/* 16:9 Video Player Preview */}
                  <div className="md:col-span-7">
                    <div className="relative w-full aspect-video rounded-xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
                      {videoLoading ? (
                        <div className="flex flex-col items-center gap-3 p-6 text-center text-white">
                          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                          <p className="text-xs font-medium text-slate-200 max-w-xs">
                            {videoProgressText}
                          </p>
                        </div>
                      ) : videoUrl ? (
                        <>
                          <video
                            src={videoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            controls
                            className="w-full h-full object-cover"
                          />
                          {videoScript?.captions?.[activeCaptionIdx] && (
                            <div className="pointer-events-none absolute bottom-12 inset-x-4 flex justify-center">
                              <span className="bg-black/75 text-white text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-lg text-center shadow-md">
                                {videoScript.captions[activeCaptionIdx]}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-6 text-center text-slate-300 space-y-2">
                          <Video className="w-9 h-9 text-slate-500 mx-auto" />
                          <p className="text-sm font-semibold text-white">
                            16:9 Awareness Video Preview
                          </p>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            Generates a custom short awareness film alongside a
                            ready-to-read 15-second voiceover script.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
