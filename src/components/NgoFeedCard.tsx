import React from 'react';
import {
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { CATEGORY_META, ModalTab, NgoOrganization } from '../types';
import { UiLabels } from '../i18n/labels';

interface NgoFeedCardProps {
  org: NgoOrganization;
  labels: UiLabels;
  selected: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onOpenModal: (tab: ModalTab) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}

export function NgoFeedCard({
  org,
  labels,
  selected,
  onSelect,
  onHover,
  onOpenModal,
  cardRef,
}: NgoFeedCardProps) {
  const catMeta = CATEGORY_META[org.category];
  const categoryLabelKey = `cat_${org.category}` as keyof UiLabels;
  const localizedCategory = labels[categoryLabelKey] || catMeta.shortLabel;

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`group rounded-xl bg-white p-4 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
        selected
          ? 'border border-teal-700 ring-2 ring-teal-700/15 shadow-sm'
          : 'border border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Quiet 1-line unboxed metadata kicker */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: catMeta.color }}
            aria-hidden="true"
          />
          <span className="font-medium text-slate-700 truncate">
            {localizedCategory}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums shrink-0">
            {org.distance_km.toFixed(1)} {labels.kmAway}
          </span>
        </div>
        {org.verified && (
          <span className="inline-flex items-center gap-1 text-teal-700 font-medium shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{labels.verifiedLabel}</span>
          </span>
        )}
      </div>

      {/* Primary Organization Title */}
      <h3 className="text-base font-semibold text-slate-900 leading-snug group-hover:text-teal-800 transition-colors">
        {org.name}
      </h3>

      {/* Address */}
      <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500 leading-relaxed">
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span className="line-clamp-1">{org.address}</span>
      </p>

      {/* Summary */}
      <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">
        {org.summary}
      </p>

      {/* Urgent Needs — clean unboxed list */}
      {org.urgent_needs.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-700 mb-1">
            {labels.urgentNeedsLabel}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {org.urgent_needs.slice(0, 2).join(' · ')}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal('donate');
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>{labels.supportDonateBtn}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal('studio');
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
          <span>{labels.creativeStudioBtn}</span>
        </button>
      </div>
    </div>
  );
}
