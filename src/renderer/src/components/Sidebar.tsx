import { SECTIONS, type SectionId } from '../sections.ts';

export function Sidebar({ active }: { active: SectionId }) {
  return (
    <nav className="sidebar" aria-label="Sections">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <strong>VibeCode Arcade</strong>
          <small>free · open source</small>
        </div>
      </div>
      <ul className="nav">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} aria-current={section.id === active ? 'page' : undefined}>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="sidebar-foot">Bring your games.</p>
    </nav>
  );
}
