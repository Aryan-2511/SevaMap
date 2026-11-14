export type NgoCategory =
  | 'children'
  | 'animals'
  | 'elderly'
  | 'disaster_relief'
  | 'community';

export interface NgoOrganization {
  id: string;
  name: string;
  category: NgoCategory;
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
  verified: boolean;
  summary: string;
  urgent_needs: string[];
  phone: string;
  website: string;
  donation_upi: string;
  donation_link: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export type SupportedLanguage = 'en' | 'hi' | 'kn' | 'ta' | 'mr' | 'bn';

export interface CategoryMeta {
  id: NgoCategory;
  label: string;
  shortLabel: string;
  color: string;
  ringColor: string;
  surfaceTint: string;
}

export const CATEGORY_META: Record<NgoCategory, CategoryMeta> = {
  children: {
    id: 'children',
    label: "Orphanages & Children's Homes",
    shortLabel: 'Children',
    color: '#2563EB',
    ringColor: 'rgba(37, 99, 235, 0.22)',
    surfaceTint: '#EFF6FF',
  },
  animals: {
    id: 'animals',
    label: 'Pet & Animal Shelters',
    shortLabel: 'Animals',
    color: '#EA580C',
    ringColor: 'rgba(234, 88, 12, 0.22)',
    surfaceTint: '#FFF7ED',
  },
  elderly: {
    id: 'elderly',
    label: 'Old Age Homes',
    shortLabel: 'Elderly',
    color: '#7C3AED',
    ringColor: 'rgba(124, 58, 237, 0.22)',
    surfaceTint: '#F5F3FF',
  },
  disaster_relief: {
    id: 'disaster_relief',
    label: 'Disaster Relief',
    shortLabel: 'Relief',
    color: '#DC2626',
    ringColor: 'rgba(220, 38, 38, 0.22)',
    surfaceTint: '#FEF2F2',
  },
  community: {
    id: 'community',
    label: 'Social Welfare NGOs',
    shortLabel: 'Community',
    color: '#059669',
    ringColor: 'rgba(5, 150, 105, 0.22)',
    surfaceTint: '#ECFDF5',
  },
};

export const CATEGORY_ORDER: NgoCategory[] = [
  'children',
  'animals',
  'elderly',
  'disaster_relief',
  'community',
];

export type ModalTab = 'donate' | 'studio';
