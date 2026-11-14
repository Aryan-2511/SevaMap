import { NgoOrganization } from '../types';

export const FALLBACK_NGOS: NgoOrganization[] = [
  // Bengaluru
  {
    id: 'blr-children-bosco',
    name: 'BOSCO Mane Children Home',
    category: 'children',
    address: '242, 4th Main Rd, Chamarajpet, Bengaluru, Karnataka 560018',
    lat: 12.9592,
    lng: 77.5619,
    distance_km: 3.1,
    verified: true,
    summary:
      'Provides emergency shelter, bridge schooling, vocational training, and family reunification for rescued and street-connected children in Bengaluru.',
    urgent_needs: [
      'School notebooks & geometry kits for 65 students',
      'Monthly rice, pulses & fortified milk supplies',
      'Bedding sets and winter blankets',
    ],
    phone: '+91 80 2660 2274',
    website: 'https://boscoban.org',
    donation_upi: 'boscoban@sbi',
    donation_link: 'https://boscoban.org/donate',
  },
  {
    id: 'blr-animals-cupa',
    name: 'CUPA Second Chance Adoption & Trauma Center',
    category: 'animals',
    address: 'KVAFSU Veterinary Campus, Hebbal, Bengaluru, Karnataka 560024',
    lat: 13.0418,
    lng: 77.5916,
    distance_km: 7.8,
    verified: true,
    summary:
      'Operates emergency veterinary trauma care, ABC sterilization programs, and rehabilitation kennels for injured street dogs, cats, and senior pets.',
    urgent_needs: [
      'Orthopedic surgical sutures & tick-fever medication',
      'High-protein puppy & senior dog kibble',
      'Absorbent kennel underpads & disinfectants',
    ],
    phone: '+91 80 2294 7300',
    website: 'https://cupabangalore.org',
    donation_upi: 'cupabangalore@icici',
    donation_link: 'https://cupabangalore.org/donate/',
  },
  {
    id: 'blr-elderly-nightingales',
    name: 'Nightingales Trust Elder Care & Dementia Center',
    category: 'elderly',
    address: '8th Cross, 1st Stage, Indiranagar, Bengaluru, Karnataka 560038',
    lat: 12.9784,
    lng: 77.6408,
    distance_km: 5.2,
    verified: true,
    summary:
      'Offers specialized residential dementia care, physiotherapy, nutritious meals, and day-care companionship for indigent senior citizens.',
    urgent_needs: [
      'Adult diapers & skin-barrier medical creams',
      'Wheelchair cushions & portable oxygen concentrator filters',
      'Monthly diabetic nutrition supplements',
    ],
    phone: '+91 80 4242 6565',
    website: 'https://nightingaleseldercare.com',
    donation_upi: 'nightingalestrust@hdfcbank',
    donation_link: 'https://nightingaleseldercare.com/donate',
  },
  {
    id: 'blr-relief-goonj',
    name: 'Goonj Urban Relief & Material Collection Hub',
    category: 'disaster_relief',
    address: '14th Cross, HSR Layout Sector 2, Bengaluru, Karnataka 560102',
    lat: 12.9121,
    lng: 77.6446,
    distance_km: 8.6,
    verified: true,
    summary:
      'Mobilizes rapid flood-relief family kits, tarpaulins, dry rations, and dignity supplies across Karnataka and disaster-affected districts.',
    urgent_needs: [
      'Waterproof tarpaulin sheets (12x15 ft)',
      'Solar rechargeable lanterns & dry-ration family kits',
      'Clean cotton clothing & hygiene packs',
    ],
    phone: '+91 80 2572 1900',
    website: 'https://goonj.org',
    donation_upi: 'goonj@axisbank',
    donation_link: 'https://goonj.org/donate/',
  },
  {
    id: 'blr-community-akshaya',
    name: 'Akshaya Patra & Community Kitchen Initiative',
    category: 'community',
    address: 'HK Hill, Chord Rd, Rajajinagar, Bengaluru, Karnataka 560010',
    lat: 13.0098,
    lng: 77.5511,
    distance_km: 5.9,
    verified: true,
    summary:
      'Runs centralized hygienic kitchens serving hot mid-day meals to government school children and daily-wage community clusters.',
    urgent_needs: [
      'Sponsorship for 500 daily mid-day school meals',
      'Stainless steel insulated food distribution vessels',
      'Cold-pressed cooking oil & fortified grains',
    ],
    phone: '+91 80 3014 3400',
    website: 'https://akshayapatra.org',
    donation_upi: 'akshayapatra@icici',
    donation_link: 'https://akshayapatra.org/onlinedonations',
  },
  {
    id: 'blr-animals-charlie',
    name: "Charlie's Animal Rescue Centre (CARE)",
    category: 'animals',
    address: 'Survey No. 124, Mitteganahalli, Yelahanka, Bengaluru 560064',
    lat: 13.0955,
    lng: 77.6245,
    distance_km: 14.3,
    verified: true,
    summary:
      'Sanctuary and rehabilitation clinic caring for paraplegic dogs, blind cats, donkeys, and abandoned senior animals.',
    urgent_needs: [
      'Custom canine mobility wheelchairs',
      'Wound-dressing gauze & antibiotic vials',
      'Wet cat food & recovery formula',
    ],
    phone: '+91 94839 11110',
    website: 'https://charlies-care.com',
    donation_upi: 'charliescare@sbi',
    donation_link: 'https://charlies-care.com/donate/',
  },
  {
    id: 'blr-children-snehadaan',
    name: 'Sneha Care Home for Vulnerable Children',
    category: 'children',
    address: 'Sarjapur Main Rd, Carmelaram, Bengaluru, Karnataka 560035',
    lat: 12.9082,
    lng: 77.7051,
    distance_km: 13.8,
    verified: true,
    summary:
      'Residential holistic care home providing pediatric healthcare, nutrition, and inclusive schooling for orphaned and immunocompromised children.',
    urgent_needs: [
      'Pediatric multivitamins & protein supplements',
      'Library storybooks & science lab tablets',
      'Solar water heater maintenance',
    ],
    phone: '+91 80 2843 9282',
    website: 'https://snehacarehome.org',
    donation_upi: 'snehacarehome@hdfcbank',
    donation_link: 'https://snehacarehome.org/support-us/',
  },
  {
    id: 'blr-elderly-karunashraya',
    name: 'Karunashraya Hospice & Palliative Care',
    category: 'elderly',
    address: 'Varthur Main Rd, Kundalahalli Gate, Marathahalli, Bengaluru 560037',
    lat: 12.9571,
    lng: 77.7112,
    distance_km: 12.7,
    verified: true,
    summary:
      'Provides free compassionate inpatient and home-based palliative nursing care for elderly and terminally ill patients from low-income families.',
    urgent_needs: [
      'Air-mattresses for bedridden patients',
      'Sterile IV consumables & pain-relief dressings',
      'Nutritious soft-diet grocery packs',
    ],
    phone: '+91 80 4268 5666',
    website: 'https://karunashraya.org',
    donation_upi: 'karunashraya@icici',
    donation_link: 'https://karunashraya.org/donate/',
  },
  {
    id: 'blr-community-hasirudala',
    name: 'Hasiru Dala Social Welfare Collective',
    category: 'community',
    address: '2nd Cross, Benson Town, Bengaluru, Karnataka 560046',
    lat: 13.0014,
    lng: 77.6012,
    distance_km: 4.1,
    verified: true,
    summary:
      'Supports urban waste-picker families with social security access, protective gear, healthcare camps, and children scholarship centers.',
    urgent_needs: [
      'Heavy-duty puncture-resistant work gloves & boots',
      'After-school tuition stipends for 40 children',
      'Mobile health camp diagnostic kits',
    ],
    phone: '+91 80 2333 1711',
    website: 'https://hasirudala.in',
    donation_upi: 'hasirudala@sbi',
    donation_link: 'https://hasirudala.in/donate/',
  },
  {
    id: 'blr-relief-rapidresponse',
    name: 'Rapid Response Emergency Relief Foundation',
    category: 'disaster_relief',
    address: '3rd Block, Koramangala, Bengaluru, Karnataka 560034',
    lat: 12.9279,
    lng: 77.6271,
    distance_km: 6.4,
    verified: true,
    summary:
      'Dispatches trained disaster-response volunteers, water purification tablets, and emergency shelter kits within 24 hours of regional floods or cyclones.',
    urgent_needs: [
      'Portable water filtration units (200 units)',
      'Emergency first-aid trauma backpacks',
      'Inflatable rescue vests & solar torches',
    ],
    phone: '+91 98844 09876',
    website: 'https://rapidresponse.org.in',
    donation_upi: 'rapidresponse@hdfcbank',
    donation_link: 'https://rapidresponse.org.in/donate',
  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function getFallbackNgos(lat = 12.9716, lng = 77.5946): NgoOrganization[] {
  return FALLBACK_NGOS.map((org) => ({
    ...org,
    distance_km: haversineKm(lat, lng, org.lat, org.lng),
  })).sort((a, b) => a.distance_km - b.distance_km);
}
