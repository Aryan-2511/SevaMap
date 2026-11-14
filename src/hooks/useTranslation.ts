import { useState, useEffect, useCallback, useRef } from 'react';
import { BASE_UI_LABELS, UiLabels } from '../i18n/labels';
import { NgoOrganization, SupportedLanguage } from '../types';

const STORAGE_PREFIX = 'sevamap_tr_v1_';

function readCache(lang: SupportedLanguage): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${lang}`);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeCache(lang: SupportedLanguage, data: Record<string, string>) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${lang}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function useTranslation(organizations: NgoOrganization[]) {
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [labels, setLabels] = useState<UiLabels>(BASE_UI_LABELS);
  const [ngoTranslations, setNgoTranslations] = useState<
    Record<string, { summary: string; urgent_needs: string[] }>
  >({});
  const [isTranslating, setIsTranslating] = useState(false);

  const memoryCacheRef = useRef<Record<string, Record<string, string>>>({});

  const translateAll = useCallback(
    async (targetLang: SupportedLanguage, orgList: NgoOrganization[]) => {
      if (targetLang === 'en') {
        setLabels(BASE_UI_LABELS);
        setNgoTranslations({});
        setIsTranslating(false);
        return;
      }

      if (!memoryCacheRef.current[targetLang]) {
        memoryCacheRef.current[targetLang] = readCache(targetLang);
      }
      const cache = memoryCacheRef.current[targetLang];

      // Build dictionary of missing keys
      const payload: Record<string, string> = {};

      (Object.keys(BASE_UI_LABELS) as Array<keyof UiLabels>).forEach((key) => {
        const cacheKey = `ui:${key}`;
        if (!cache[cacheKey]) {
          payload[cacheKey] = BASE_UI_LABELS[key];
        }
      });

      orgList.forEach((org) => {
        const sumKey = `org:${org.id}:summary:${org.summary.slice(0, 24)}`;
        if (!cache[sumKey]) {
          payload[sumKey] = org.summary;
        }
        org.urgent_needs.forEach((need, idx) => {
          const needKey = `org:${org.id}:need:${idx}:${need.slice(0, 20)}`;
          if (!cache[needKey]) {
            payload[needKey] = need;
          }
        });
      });

      const applyFromCache = (resolvedCache: Record<string, string>) => {
        const nextLabels = { ...BASE_UI_LABELS };
        (Object.keys(BASE_UI_LABELS) as Array<keyof UiLabels>).forEach((key) => {
          const val = resolvedCache[`ui:${key}`];
          if (val) nextLabels[key] = val;
        });
        setLabels(nextLabels);

        const nextOrgs: Record<
          string,
          { summary: string; urgent_needs: string[] }
        > = {};
        orgList.forEach((org) => {
          const sumKey = `org:${org.id}:summary:${org.summary.slice(0, 24)}`;
          const translatedNeeds = org.urgent_needs.map((need, idx) => {
            const needKey = `org:${org.id}:need:${idx}:${need.slice(0, 20)}`;
            return resolvedCache[needKey] || need;
          });
          nextOrgs[org.id] = {
            summary: resolvedCache[sumKey] || org.summary,
            urgent_needs: translatedNeeds,
          };
        });
        setNgoTranslations(nextOrgs);
      };

      // Apply whatever is already cached immediately for zero-flicker UX
      applyFromCache(cache);

      const missingKeys = Object.keys(payload);
      if (missingKeys.length === 0) {
        return;
      }

      setIsTranslating(true);
      try {
        // Chunk into batches of 40 keys to stay fast and deterministic
        const chunkSize = 40;
        for (let i = 0; i < missingKeys.length; i += chunkSize) {
          const sliceKeys = missingKeys.slice(i, i + chunkSize);
          const batch: Record<string, string> = {};
          sliceKeys.forEach((k) => {
            batch[k] = payload[k];
          });

          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetLanguage: targetLang,
              texts: batch,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              translations?: Record<string, string>;
            };
            if (data.translations) {
              Object.assign(cache, data.translations);
            }
          }
        }
        writeCache(targetLang, cache);
        applyFromCache(cache);
      } catch {
        // Retain English fallback cleanly on error
      } finally {
        setIsTranslating(false);
      }
    },
    []
  );

  useEffect(() => {
    void translateAll(language, organizations);
  }, [language, organizations, translateAll]);

  const getTranslatedOrg = useCallback(
    (org: NgoOrganization): NgoOrganization => {
      if (language === 'en' || !ngoTranslations[org.id]) {
        return org;
      }
      return {
        ...org,
        summary: ngoTranslations[org.id].summary,
        urgent_needs: ngoTranslations[org.id].urgent_needs,
      };
    },
    [language, ngoTranslations]
  );

  return {
    language,
    setLanguage,
    labels,
    isTranslating,
    getTranslatedOrg,
  };
}
