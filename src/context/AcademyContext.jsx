import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchContactLinks } from '../services/contactService.js';
import { MOCK_CONTACT_LINKS } from '../lib/mockData.js';

const AcademyContext = createContext(null);

export function AcademyProvider({ children }) {
  // روابط التواصل بتتقرأ من قاعدة البيانات وبتُدار من لوحة الأدمن
  const [contactLinks, setContactLinks] = useState(MOCK_CONTACT_LINKS);
  const [contactLoaded, setContactLoaded] = useState(false);

  const loadContact = useCallback(async () => {
    const { data, error } = await fetchContactLinks();
    if (!error && Array.isArray(data) && data.length > 0) {
      setContactLinks(data);
    }
    setContactLoaded(true);
  }, []);

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  const getLink = useCallback(
    (platform) => contactLinks.find((l) => l.platform === platform)?.value || ''
  , [contactLinks]);

  return (
    <AcademyContext.Provider value={{ contactLinks, contactLoaded, getLink, refreshContact: loadContact }}>
      {children}
    </AcademyContext.Provider>
  );
}

export function useAcademy() {
  const ctx = useContext(AcademyContext);
  if (!ctx) throw new Error('useAcademy must be used within AcademyProvider');
  return ctx;
}