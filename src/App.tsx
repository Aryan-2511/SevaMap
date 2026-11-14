import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  LocateFixed,
  Globe,
  Loader2,
  ExternalLink,
  List,
  Map as MapIcon,
  AlertTriangle,
} from 'lucide-react';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  GroundingSource,
  ModalTab,
  NgoCategory,
  NgoOrganization,
  SupportedLanguage,
} from './types';
import { getFallbackNgos } from './data/fallbackNgos';
import { SUPPORTED_LANGUAGES, UiLabels } from './i18n/labels';
import { useTranslation } from './hooks/useTranslation';
import { SevaMapCanvas } from './components/SevaMapCanvas';
import { NgoFeedCard } from './components/NgoFeedCard';
import { NgoDetailModal } from './components/NgoDetailModal';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export default function App() {
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [searchInput, setSearchInput] = useState('Bengaluru');
  const [activeLocationLabel, setActiveLocationLabel] = useState('Bengaluru');
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [organizations, setOrganizations] = useState<NgoOrganization[]>(() =>
    getFallbackNgos(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
  );
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>(
    []
  );
  const [isLiveResult, setIsLiveResult] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<NgoCategory | 'all'>(
    'all'
  );
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [hoveredOrgId, setHoveredOrgId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'list' | 'map'>('list');

  const [modalState, setModalState] = useState<{
    orgId: string;
    tab: ModalTab;
  } | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Translation hook (English, Hindi, Kannada, Tamil, Marathi, Bengali)
  const { language, setLanguage, labels, isTranslating, getTranslatedOrg } =
    useTranslation(organizations);

  // Listen for Google Maps Platform quota events
  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () =>
      window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Fetch public runtime config (Maps key if injected on server env)
  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mapsApiKey?: string } | null) => {
        if (data?.mapsApiKey && !mapsApiKey) {
          setMapsApiKey(data.mapsApiKey);
        }
      })
      .catch(() => {
        // Ignore config error
      });
  }, [mapsApiKey]);

  const runLiveNgoSearch = useCallback(
    async (
      locationQuery: string,
      coords?: { lat: number; lng: number }
    ) => {
      setIsSearching(true);
      setSearchNotice(null);
      setSelectedOrgId(null);

      try {
        const res = await fetch('/api/ngos/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: locationQuery,
            lat: coords?.lat,
            lng: coords?.lng,
            category: activeCategory === 'all' ? undefined : activeCategory,
          }),
        });

        const data = (await res.json()) as {
          resolvedLocation?: string;
          center?: { lat: number; lng: number };
          organizations?: NgoOrganization[];
          sources?: GroundingSource[];
          error?: string;
          fallbackRequired?: boolean;
        };

        if (
          res.ok &&
          Array.isArray(data.organizations) &&
          data.organizations.length > 0
        ) {
          setOrganizations(data.organizations);
          setGroundingSources(data.sources || []);
          setIsLiveResult(true);
          if (data.center?.lat && data.center?.lng) {
            setMapCenter(data.center);
          } else if (coords) {
            setMapCenter(coords);
          }
          setActiveLocationLabel(data.resolvedLocation || locationQuery);
        } else {
          const fallbackCenter = coords || DEFAULT_CENTER;
          setOrganizations(
            getFallbackNgos(fallbackCenter.lat, fallbackCenter.lng)
          );
          setGroundingSources([]);
          setIsLiveResult(false);
          setMapCenter(fallbackCenter);
          setSearchNotice(
            data.error ||
              'Live search unavailable right now. Showing curated local directory.'
          );
        }
      } catch {
        const fallbackCenter = coords || DEFAULT_CENTER;
        setOrganizations(
          getFallbackNgos(fallbackCenter.lat, fallbackCenter.lng)
        );
        setGroundingSources([]);
        setIsLiveResult(false);
        setSearchNotice(
          'Network issue while searching. Showing curated local directory.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [activeCategory]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    void runLiveNgoSearch(trimmed);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setSearchNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setSearchNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let detectedCity = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

        try {
          const geoRes = await fetch(
            `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
          );
          const geoData = (await geoRes.json()) as {
            city?: string;
            quotaExceeded?: boolean;
          };
          if (geoData.quotaExceeded) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          if (geoData.city) {
            detectedCity = geoData.city;
          }
        } catch {
          // Use coordinate fallback string
        }

        setSearchInput(detectedCity);
        setMapCenter({ lat, lng });
        setIsDetectingLocation(false);
        await runLiveNgoSearch(detectedCity, { lat, lng });
      },
      (err) => {
        setIsDetectingLocation(false);
        setSearchNotice(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enter a city name in the search bar instead.'
            : 'Unable to detect location. Please search by city name.'
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // Filtered & translated organizations
  const filteredNgos = useMemo(() => {
    const base =
      activeCategory === 'all'
        ? organizations
        : organizations.filter((o) => o.category === activeCategory);
    return base.map(getTranslatedOrg);
  }, [organizations, activeCategory, getTranslatedOrg]);

  const handleSelectOrg = useCallback(
    (id: string | null, fromMapPin = false) => {
      setSelectedOrgId(id);
      if (id && fromMapPin) {
        const cardEl = cardRefs.current[id];
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },
    []
  );

  const handleOpenModal = useCallback((org: NgoOrganization, tab: ModalTab) => {
    setSelectedOrgId(org.id);
    setModalState({ orgId: org.id, tab });
  }, []);

  const modalOrg = useMemo(() => {
    if (!modalState) return null;
    const raw = organizations.find((o) => o.id === modalState.orgId);
    return raw ? getTranslatedOrg(raw) : null;
  }, [modalState, organizations, getTranslatedOrg]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Mandatory Demo Quota Banner (only triggers when quota/auth event fires) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Navigation Bar (Clean 3-Zone Contract) */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveCategory('all');
            setSelectedOrgId(null);
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-md"
        >
          <span className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <path d="M12 12.5s-2.5-1.6-2.5-3.4a1.5 1.5 0 0 1 2.5-1.1 1.5 1.5 0 0 1 2.5 1.1c0 1.8-2.5 3.4-2.5 3.4Z" />
            </svg>
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900">
            SevaMap
          </span>
        </a>

        {/* Zone 2: Location Search & Detect My Location */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-2xl flex items-center gap-2"
        >
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={labels.searchPlaceholder}
              aria-label="Search city or neighborhood"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              labels.searchButton
            )}
          </button>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isDetectingLocation || isSearching}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title={labels.detectLocation}
          >
            {isDetectingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
            ) : (
              <LocateFixed className="w-4 h-4 text-teal-700" />
            )}
            <span className="hidden md:inline">
              {isDetectingLocation ? labels.detecting : labels.detectLocation}
            </span>
          </button>
        </form>

        {/* Zone 3: Language Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <Globe
              className="w-4 h-4 text-slate-500 absolute left-2.5 pointer-events-none"
              aria-hidden="true"
            />
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as SupportedLanguage)
              }
              aria-label="Select language"
              className="pl-8 pr-7 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeLabel} ({lang.name})
                </option>
              ))}
            </select>
          </div>
          {isTranslating && (
            <Loader2
              className="w-4 h-4 text-teal-700 animate-spin shrink-0"
              aria-label={labels.translatingLabel}
            />
          )}
        </div>
      </header>

      {/* Secondary Workspace Filter Toolbar */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {labels.allCategories}
          </button>

          {CATEGORY_ORDER.map((cat) => {
            const meta = CATEGORY_META[cat];
            const labelKey = `cat_${cat}` as keyof UiLabels;
            const isActive = activeCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden="true"
                />
                <span>{labels[labelKey] || meta.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap">
            {filteredNgos.length} results
          </span>

          {/* Mobile List/Map Toggle */}
          <div className="flex lg:hidden p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setMobilePane('list')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                mobilePane === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setMobilePane('map')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                mobilePane === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Discovery Canvas */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left NGO Feed */}
        <section
          aria-label="Nearby Organizations Feed"
          className={`${
            mobilePane === 'list' ? 'flex' : 'hidden lg:flex'
          } flex-col w-full lg:w-[440px] xl:w-[480px] h-full border-r border-slate-200 bg-slate-50 shrink-0`}
        >
          {/* Context / Grounding Banner */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-medium truncate">
                {isLiveResult
                  ? `${labels.showingLiveNotice} ${activeLocationLabel}`
                  : `${labels.showingSampleNotice} · ${activeLocationLabel}`}
              </span>
              {!isLiveResult && (
                <button
                  type="button"
                  onClick={() => void runLiveNgoSearch(searchInput || 'Bengaluru')}
                  disabled={isSearching}
                  className="text-teal-700 hover:text-teal-800 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Search Live
                </button>
              )}
            </div>

            {searchNotice && (
              <div className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{searchNotice}</span>
              </div>
            )}

            {groundingSources.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-0.5">
                <span className="text-[11px] font-medium text-slate-400 shrink-0">
                  Sources:
                </span>
                {groundingSources.slice(0, 4).map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    <span className="max-w-[140px] truncate">{src.title}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Card Feed */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {isSearching ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white border border-slate-200 p-4 space-y-3 animate-pulse"
                >
                  <div className="h-3 w-40 bg-slate-200 rounded" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 flex-1 bg-slate-200 rounded-lg" />
                    <div className="h-8 flex-1 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))
            ) : filteredNgos.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200 p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  {labels.emptyResultsTitle}
                </p>
                <p className="text-xs text-slate-500">
                  {labels.emptyResultsHint}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {labels.resetFiltersBtn}
                </button>
              </div>
            ) : (
              filteredNgos.map((org) => (
                <NgoFeedCard
                  key={org.id}
                  org={org}
                  labels={labels}
                  selected={org.id === selectedOrgId}
                  cardRef={(el) => {
                    cardRefs.current[org.id] = el;
                  }}
                  onSelect={() => handleSelectOrg(org.id, false)}
                  onHover={(hovering) =>
                    setHoveredOrgId(hovering ? org.id : null)
                  }
                  onOpenModal={(tab) => handleOpenModal(org, tab)}
                />
              ))
            )}
          </div>
        </section>

        {/* Right Interactive Map */}
        <section
          aria-label="Interactive Organization Map"
          className={`${
            mobilePane === 'map' ? 'flex' : 'hidden lg:flex'
          } flex-1 h-full min-h-[420px] relative`}
        >
          <SevaMapCanvas
            apiKey={mapsApiKey}
            quotaExceeded={quotaExceeded}
            organizations={filteredNgos}
            center={mapCenter}
            selectedOrgId={selectedOrgId}
            hoveredOrgId={hoveredOrgId}
            onSelectOrg={handleSelectOrg}
            onHoverOrg={setHoveredOrgId}
            onOpenModal={handleOpenModal}
            languageCode={language}
          />
        </section>
      </main>

      {/* Organization Support & AI Creative Studio Modal */}
      {modalState && modalOrg && (
        <NgoDetailModal
          org={modalOrg}
          initialTab={modalState.tab}
          language={language}
          labels={labels}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
