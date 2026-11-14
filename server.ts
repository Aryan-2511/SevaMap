import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getMapsApiKey(): string {
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  );
}

function extractGeminiError(err: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const rawMessage =
    err instanceof Error ? err.message : String(err || 'Unknown error');
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('403') ||
    lower.includes('permission_denied') ||
    lower.includes('billing') ||
    lower.includes('paid')
  ) {
    return {
      status: 403,
      code: 'PAID_KEY_REQUIRED',
      message:
        'This generative media model requires a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (lower.includes('429') || lower.includes('resource_exhausted')) {
    return {
      status: 429,
      code: 'QUOTA_EXCEEDED',
      message:
        'API rate limit or quota reached. Please wait a moment or select a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (lower.includes('api_key_invalid') || lower.includes('400')) {
    return {
      status: 400,
      code: 'API_ERROR',
      message: rawMessage,
    };
  }
  return {
    status: 500,
    code: 'API_ERROR',
    message: rawMessage,
  };
}

const VALID_CATEGORIES = new Set([
  'children',
  'animals',
  'elderly',
  'disaster_relief',
  'community',
]);

function extractJsonPayload(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : text;
  const objMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!objMatch) {
    throw new Error('Could not extract structured JSON from model response.');
  }
  return JSON.parse(objMatch[1]);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Public runtime config (never exposes GEMINI_API_KEY)
  app.get('/api/config', (_req: Request, res: Response) => {
    res.json({
      mapsApiKey: getMapsApiKey(),
      hasGeminiKey: Boolean(getAiClient()),
      hasTranslateKey: Boolean(process.env.GOOGLE_TRANSLATE_API_KEY),
    });
  });

  // Reverse geocoding endpoint (server-side proxy avoids CORS issues)
  app.get('/api/geocode/reverse', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: 'Valid lat and lng query params required.' });
      return;
    }

    const mapsApiKey = getMapsApiKey();
    let quotaExceeded = false;

    if (mapsApiKey) {
      try {
        const url = new URL(
          'https://geocode.googleapis.com/v4/geocode/location'
        );
        url.searchParams.append('location.latitude', String(lat));
        url.searchParams.append('location.longitude', String(lng));
        url.searchParams.append('languageCode', 'en');

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-FieldMask':
              'results.placeId,results.formattedAddress,results.addressComponents',
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
          },
        });

        if (response.status === 429) {
          quotaExceeded = true;
        } else if (response.ok) {
          const data = (await response.json()) as {
            results?: Array<{
              formattedAddress?: string;
              addressComponents?: Array<{
                longText?: string;
                types?: string[];
              }>;
            }>;
          };
          const first = data.results?.[0];
          if (first) {
            const locality =
              first.addressComponents?.find((c) =>
                c.types?.includes('locality')
              )?.longText ||
              first.addressComponents?.find((c) =>
                c.types?.includes('administrative_area_level_2')
              )?.longText ||
              first.formattedAddress ||
              `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

            res.json({
              city: locality,
              formattedAddress: first.formattedAddress || locality,
              quotaExceeded: false,
            });
            return;
          }
        } else {
          const errText = await response.text();
          if (errText.includes('RESOURCE_EXHAUSTED')) {
            quotaExceeded = true;
          }
        }
      } catch {
        // Fall through to OpenStreetMap Nominatim fallback
      }
    }

    // Nominatim fallback so Detect My Location always resolves cleanly
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
        {
          headers: {
            'User-Agent': 'SevaMap-CivicDiscovery/1.0',
          },
        }
      );
      if (osmRes.ok) {
        const osmData = (await osmRes.json()) as {
          display_name?: string;
          address?: {
            city?: string;
            town?: string;
            suburb?: string;
            state_district?: string;
            state?: string;
          };
        };
        const city =
          osmData.address?.city ||
          osmData.address?.town ||
          osmData.address?.suburb ||
          osmData.address?.state_district ||
          osmData.address?.state ||
          `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
        res.json({
          city,
          formattedAddress: osmData.display_name || city,
          quotaExceeded,
        });
        return;
      }
    } catch {
      // Ignore fallback error
    }

    res.json({
      city: `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
      formattedAddress: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      quotaExceeded,
    });
  });

  // Live NGO discovery powered by Gemini + Google Search Grounding
  app.post('/api/ngos/search', async (req: Request, res: Response) => {
    const { location, lat, lng, category } = req.body as {
      location?: string;
      lat?: number;
      lng?: number;
      category?: string;
    };

    const queryLocation = (location || '').trim();
    if (!queryLocation && (lat === undefined || lng === undefined)) {
      res.status(400).json({ error: 'Location or coordinates are required.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Showing curated local directory.',
        fallbackRequired: true,
      });
      return;
    }

    const locationContext = queryLocation
      ? `in and around "${queryLocation}"`
      : `near coordinates (${lat}, ${lng})`;

    const categoryInstruction =
      category && VALID_CATEGORIES.has(category)
        ? `Focus primarily on category "${category}", while including verified organizations.`
        : `Find 8 to 10 real, verified organizations balanced across all 5 categories:
1. Orphanages / Children's Homes (category: "children")
2. Pet & Animal Shelters (category: "animals")
3. Old Age Homes (category: "elderly")
4. Disaster Relief Organizations (category: "disaster_relief")
5. General Social Welfare NGOs (category: "community")`;

    const prompt = `Search the web for real, verified charitable NGOs, shelters, orphanages, old-age homes, and disaster relief organizations ${locationContext}.
${categoryInstruction}

Return ONLY a valid JSON object (no markdown commentary outside JSON) with this exact structure:
{
  "resolvedLocation": "City, State",
  "center": { "lat": number, "lng": number },
  "organizations": [
    {
      "id": "unique-slug-string",
      "name": "Exact Organization Name",
      "category": "children | animals | elderly | disaster_relief | community",
      "address": "Full street address",
      "lat": number,
      "lng": number,
      "distance_km": number,
      "verified": true,
      "summary": "2-sentence description of their real mission and services.",
      "urgent_needs": ["Specific need 1", "Specific need 2", "Specific need 3"],
      "phone": "Verified phone number or empty string",
      "website": "Official https website URL",
      "donation_upi": "Verified UPI ID if publicly listed, or empty string",
      "donation_link": "Official donation page URL"
    }
  ]
}

Important rules:
- Use realistic, accurate latitude/longitude coordinates for each address near the city center.
- Only include real organizations found via Google Search. Do not invent fake UPI IDs; if no public UPI ID is found, leave donation_upi as "" and provide their real donation_link.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = response.text || '';
      const parsed = extractJsonPayload(rawText) as {
        resolvedLocation?: string;
        center?: { lat?: number; lng?: number };
        organizations?: Array<Record<string, unknown>>;
      };

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk) => chunk.web)
        .filter(
          (web): web is { uri: string; title: string } =>
            Boolean(web?.uri && web?.title)
        )
        .slice(0, 8);

      const rawOrgs = Array.isArray(parsed.organizations)
        ? parsed.organizations
        : Array.isArray(parsed)
          ? (parsed as Array<Record<string, unknown>>)
          : [];

      const centerLat = Number(parsed.center?.lat ?? lat ?? 12.9716);
      const centerLng = Number(parsed.center?.lng ?? lng ?? 77.5946);

      const organizations = rawOrgs
        .filter((o) => o && typeof o.name === 'string')
        .map((o, idx) => {
          const catRaw = String(o.category || 'community');
          const safeCat = VALID_CATEGORIES.has(catRaw) ? catRaw : 'community';
          const orgLat = Number(o.lat);
          const orgLng = Number(o.lng);
          const validCoords =
            Number.isFinite(orgLat) &&
            Number.isFinite(orgLng) &&
            Math.abs(orgLat) <= 90 &&
            Math.abs(orgLng) <= 180;

          // Slight offset around center if coordinates are missing
          const jitterLat = centerLat + ((idx % 5) - 2) * 0.014;
          const jitterLng = centerLng + ((Math.floor(idx / 5) % 5) - 1) * 0.016;

          return {
            id: String(o.id || `ngo-${idx}-${Date.now()}`),
            name: String(o.name),
            category: safeCat,
            address: String(o.address || queryLocation || 'Local Area'),
            lat: validCoords ? orgLat : jitterLat,
            lng: validCoords ? orgLng : jitterLng,
            distance_km: Number.isFinite(Number(o.distance_km))
              ? Math.round(Number(o.distance_km) * 10) / 10
              : Math.round((1.5 + idx * 1.1) * 10) / 10,
            verified: Boolean(o.verified ?? true),
            summary: String(
              o.summary || 'Community-verified social welfare organization.'
            ),
            urgent_needs: Array.isArray(o.urgent_needs)
              ? o.urgent_needs.map(String).slice(0, 4)
              : ['Monthly essential supplies', 'Volunteer support'],
            phone: String(o.phone || ''),
            website: String(o.website || ''),
            donation_upi: String(o.donation_upi || ''),
            donation_link: String(
              o.donation_link || o.website || ''
            ),
          };
        });

      res.json({
        resolvedLocation: parsed.resolvedLocation || queryLocation || 'Nearby',
        center: { lat: centerLat, lng: centerLng },
        organizations,
        sources,
      });
    } catch (err) {
      const info = extractGeminiError(err);
      res.status(info.status).json({
        error: info.message,
        code: info.code,
        fallbackRequired: true,
      });
    }
  });

  // Dynamic Translation Endpoint (Cloud Translation API or fast Gemini helper)
  app.post('/api/translate', async (req: Request, res: Response) => {
    const { targetLanguage, texts } = req.body as {
      targetLanguage?: string;
      texts?: Record<string, string>;
    };

    if (!targetLanguage || !texts || typeof texts !== 'object') {
      res.status(400).json({ error: 'targetLanguage and texts object required.' });
      return;
    }

    if (targetLanguage === 'en') {
      res.json({ translations: texts });
      return;
    }

    const keys = Object.keys(texts);
    if (keys.length === 0) {
      res.json({ translations: {} });
      return;
    }

    const translateKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (translateKey) {
      try {
        const values = keys.map((k) => texts[k]);
        const trRes = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(translateKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: values,
              target: targetLanguage,
              source: 'en',
              format: 'text',
            }),
          }
        );
        if (trRes.ok) {
          const data = (await trRes.json()) as {
            data?: { translations?: Array<{ translatedText: string }> };
          };
          const translatedList = data.data?.translations || [];
          const out: Record<string, string> = {};
          keys.forEach((k, idx) => {
            out[k] = translatedList[idx]?.translatedText || texts[k];
          });
          res.json({ translations: out });
          return;
        }
      } catch {
        // Fall back to Gemini fast translation
      }
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Translation service unavailable without API key.',
        translations: texts,
      });
      return;
    }

    const langNames: Record<string, string> = {
      hi: 'Hindi (Devanagari script)',
      kn: 'Kannada (Kannada script)',
      ta: 'Tamil (Tamil script)',
      mr: 'Marathi (Devanagari script)',
      bn: 'Bengali (Bengali script)',
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Translate all values in the following JSON object from English into natural, empathetic ${langNames[targetLanguage] || targetLanguage}.
Preserve all JSON keys identically. Keep numbers, currency symbols (₹), and proper organization brand names clear and natural.

Input JSON:
${JSON.stringify(texts)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim()) as Record<
        string,
        string
      >;
      res.json({ translations: { ...texts, ...parsed } });
    } catch (err) {
      const info = extractGeminiError(err);
      res.status(info.status).json({
        error: info.message,
        translations: texts,
      });
    }
  });

  // Nano Banana Custom Poster Generation
  app.post('/api/creative/poster', async (req: Request, res: Response) => {
    const { org, mood, languageName } = req.body as {
      org?: {
        name: string;
        category: string;
        urgent_needs?: string[];
        summary?: string;
        address?: string;
      };
      mood?: string;
      languageName?: string;
    };

    if (!org?.name) {
      res.status(400).json({ error: 'Organization details required.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        code: 'NO_KEY',
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
      return;
    }

    const primaryNeed =
      org.urgent_needs?.[0] || 'Essential supplies and monthly care';
    const selectedMood = mood || 'Hopeful & Uplifting';
    const lang = languageName || 'English';

    const prompt = `Design a high-contrast, emotionally compelling charitable donation poster for "${org.name}" (Category: ${org.category}).
Primary campaign focus: "${primaryNeed}".
Visual mood & art direction: ${selectedMood}, warm editorial documentary photography aesthetic, empathetic and dignified storytelling, bold clean modern typography in ${lang}.
Layout composition rules:
- Leave a clean, dedicated solid light-colored badge area in the bottom-right corner labeled "Scan to Donate" where a QR code can sit cleanly.
- Include the organization name "${org.name}" prominently at the top and a crisp call-to-action highlighting "${primaryNeed}".
- Ensure high contrast, crisp legibility, print-ready 3:4 vertical poster proportions, no clutter or distorted faces.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
          },
        },
      });

      let imageDataUrl = '';
      let captionText = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          captionText += part.text;
        }
      }

      if (!imageDataUrl) {
        res.status(502).json({
          code: 'NO_IMAGE',
          error: 'The image model did not return an image frame.',
        });
        return;
      }

      res.json({ imageDataUrl, captionText });
    } catch (err) {
      const info = extractGeminiError(err);
      res.status(info.status).json({
        code: info.code,
        error: info.message,
      });
    }
  });

  // Promo Video Ad Generation (15s Script + Omni Flash Interactions API)
  app.post('/api/creative/video', async (req: Request, res: Response) => {
    const { org, tone, languageName } = req.body as {
      org?: {
        name: string;
        category: string;
        urgent_needs?: string[];
        summary?: string;
      };
      tone?: string;
      languageName?: string;
    };

    if (!org?.name) {
      res.status(400).json({ error: 'Organization details required.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        code: 'NO_KEY',
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
      return;
    }

    const primaryNeed =
      org.urgent_needs?.[0] || 'Essential food, care, and shelter support';
    const videoTone = tone || 'Documentary Field Story';
    const lang = languageName || 'English';

    // Generate 15-second voiceover + captions via gemini-4-hydrogen
    let script: {
      headline: string;
      voiceover: string;
      captions: string[];
      cta: string;
    } = {
      headline: `Stand With ${org.name}`,
      voiceover: `Every contribution counts. Support ${org.name} today to provide ${primaryNeed}.`,
      captions: [
        `${org.name} is on the front lines.`,
        `Urgent need: ${primaryNeed}.`,
        'Scan or tap to donate directly today.',
      ],
      cta: 'Donate Directly via SevaMap',
    };

    try {
      const scriptRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Write a punchy 15-second charitable promo ad voiceover and 3 timed on-screen captions in ${lang} for "${org.name}" (${org.category}).
Mission: ${org.summary || ''}
Urgent need: ${primaryNeed}
Tone: ${videoTone}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              voiceover: { type: Type.STRING },
              captions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              cta: { type: Type.STRING },
            },
            required: ['headline', 'voiceover', 'captions', 'cta'],
          },
        },
      });
      if (scriptRes.text) {
        script = JSON.parse(scriptRes.text.trim());
      }
    } catch {
      // Keep default structured script if text call fails
    }

    // Start background video generation via Interactions API (gemini-omni-1.2-flash)
    const videoPrompt = `A cinematic, heartwarming ${videoTone} short awareness film for ${org.name}, supporting ${org.category.replace('_', ' ')}. Warm golden-hour natural lighting, uplifting human dignity and community care focused around ${primaryNeed}. Smooth steady camera movement, editorial documentary film grain, hopeful atmosphere.`;

    try {
      const interaction = await ai.interactions.create({
        model: 'gemini-omni-1.2-flash',
        input: videoPrompt,
        background: true,
        store: true,
        response_format: {
          type: 'video',
          aspect_ratio: '16:9',
          duration: '10s',
          resolution: '720p',
        },
      });

      res.json({
        script,
        interactionId: interaction.id,
        status: interaction.status || 'in_progress',
      });
    } catch (err) {
      const info = extractGeminiError(err);
      res.status(200).json({
        script,
        interactionId: null,
        status: 'error',
        videoError: info.message,
        videoErrorCode: info.code,
      });
    }
  });

  // Poll video generation interaction status
  app.get(
    '/api/creative/video-status/:id',
    async (req: Request, res: Response) => {
      const id = String(req.params.id || '');
      if (!id) {
        res.status(400).json({ error: 'Interaction ID required.' });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({ error: 'GEMINI_API_KEY not configured.' });
        return;
      }

      try {
        const interaction = await ai.interactions.get(id);
        const status = interaction.status;

        if (status === 'completed') {
          const videoPart = interaction.output_video;
          if (videoPart?.data) {
            const mime = videoPart.mime_type || 'video/mp4';
            res.json({
              status: 'completed',
              videoDataUrl: `data:${mime};base64,${videoPart.data}`,
            });
            return;
          }
          if (videoPart?.uri) {
            res.json({
              status: 'completed',
              videoDataUrl: videoPart.uri,
            });
            return;
          }
          res.json({
            status: 'failed',
            error: 'Video interaction completed without video bytes.',
          });
          return;
        }

        if (status === 'failed' || status === 'cancelled') {
          res.json({
            status: 'failed',
            error: 'Video rendering failed on the server.',
          });
          return;
        }

        res.json({
          status: status || 'in_progress',
        });
      } catch (err) {
        const info = extractGeminiError(err);
        res.status(info.status).json({
          status: 'failed',
          error: info.message,
        });
      }
    }
  );

  // Vite Dev Middleware or Static Production Build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SevaMap server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SevaMap server:', err);
  process.exit(1);
});
