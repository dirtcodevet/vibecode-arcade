import { useEffect, useState } from 'react';

export const SECTIONS = [
  { id: 'arcade', label: 'Arcade' },
  { id: 'deal', label: 'The Deal' },
  { id: 'rules', label: 'Rules' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

function sectionFromHash(hash: string): SectionId {
  const id = hash.replace(/^#/, '');
  return SECTIONS.find((section) => section.id === id)?.id ?? 'arcade';
}

/** The current section, kept in the URL hash so links and the smoke run can drive it. */
export function useSection(): SectionId {
  const [section, setSection] = useState(() => sectionFromHash(location.hash));
  useEffect(() => {
    const onChange = () => setSection(sectionFromHash(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return section;
}
