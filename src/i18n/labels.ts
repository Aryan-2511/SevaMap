import { SupportedLanguage } from '../types';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeLabel: 'English' },
  { code: 'hi', name: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ta', name: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeLabel: 'বাংলা' },
];

export const BASE_UI_LABELS = {
  searchPlaceholder: 'Search city or area (e.g., Bengaluru, Mumbai, Pune)...',
  searchButton: 'Search',
  detectLocation: 'Detect My Location',
  detecting: 'Locating...',
  allCategories: 'All Organizations',
  cat_children: "Children's Homes",
  cat_animals: 'Animal Shelters',
  cat_elderly: 'Old Age Homes',
  cat_disaster_relief: 'Disaster Relief',
  cat_community: 'Social Welfare',
  verifiedLabel: 'Verified',
  kmAway: 'km away',
  urgentNeedsLabel: 'Urgent Needs',
  supportDonateBtn: 'Support & Donate',
  creativeStudioBtn: 'AI Creative Studio',
  getDirectionsBtn: 'Get Directions',
  tabSupportDonate: 'Support & Donate',
  tabCreativeStudio: 'AI Creative Studio',
  scanToDonate: 'Scan via any UPI app to donate directly',
  copyUpiId: 'Copy UPI ID',
  upiCopied: 'UPI ID copied',
  openDonationPortal: 'Open Donation Portal',
  callOrganization: 'Call Organization',
  visitWebsite: 'Visit Website',
  posterStudioTitle: 'Campaign Poster Studio',
  videoStudioTitle: 'Promo Video Ad Studio',
  generatePosterBtn: 'Generate Poster',
  downloadPosterBtn: 'Download Poster (PNG)',
  generateVideoBtn: 'Generate Video',
  downloadVideoBtn: 'Download Video (MP4)',
  showingSampleNotice: 'Showing curated local directory',
  showingLiveNotice: 'Live Google Search results for',
  emptyResultsTitle: 'No matching organizations in this filter',
  emptyResultsHint: 'Try clearing the category filter or searching another city.',
  resetFiltersBtn: 'Show All Categories',
  translatingLabel: 'Translating...',
};

export type UiLabels = typeof BASE_UI_LABELS;
