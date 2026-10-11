import { HOST_LABELS } from '../../../framework/launch.ts';
import type { Manifest, Platform } from '../../../framework/types.ts';
import { shelf } from '../shelf.ts';

const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  web: 'Web',
  ...HOST_LABELS,
  android: 'Android',
  ios: 'iOS',
};

const LISTING_FIELDS = [
  { name: 'maker', text: 'Who made it — a person or a small crew.' },
  { name: 'license', text: 'A free, open-source license from the Rules list.' },
  { name: 'prompt', text: 'How it was vibecoded, in the maker’s words. Remixes start here.' },
  { name: 'source', text: 'A link to the full source code.' },
  { name: 'builds', text: 'Any platform: web, Linux, Windows, macOS, Android, iOS. One is enough.' },
  { name: 'remix', text: 'The game it grew from, if any.' },
] as const;

export function ArcadeScreen() {
  const { games } = shelf;
  return (
    <div className="screen" data-screen="arcade">
      <header className="screen-head">
        <p className="eyebrow">The shelf</p>
        <h1>Arcade</h1>
        <p className="lede">Free, open-source games made by vibecoding. Every listing carries the prompt that made it.</p>
      </header>

      {games.length === 0 ? (
        <section className="card empty-shelf">
          <h2>The shelf is empty — on purpose.</h2>
          <p>
            No placeholder games and no demo listings. The first games here will come from the community: made by
            vibecoding, free and open source, each one shipped with its prompt.
          </p>
          <p className="muted">
            Want to be first? Read <a href="#deal">The Deal</a>, then check your package against the{' '}
            <a href="#rules">Rules</a>.
          </p>
        </section>
      ) : (
        <ul className="listings">
          {games.map((game) => (
            <Listing key={game.slug} game={game} />
          ))}
        </ul>
      )}

      <section className="legend">
        <h2 className="section-label">What every listing shows</h2>
        <dl className="legend-grid">
          {LISTING_FIELDS.map((field) => (
            <div key={field.name} className="legend-item">
              <dt>{field.name}</dt>
              <dd>{field.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function Listing({ game }: { game: Manifest }) {
  const platforms = (Object.keys(game.builds) as Platform[]).map((p) => PLATFORM_LABELS[p]);
  return (
    <li className="card listing">
      <h3>{game.title}</h3>
      <p className="muted">{game.tagline}</p>
      <dl className="listing-fields">
        <dt>maker</dt>
        <dd>{game.maker}</dd>
        <dt>license</dt>
        <dd>{game.license}</dd>
        <dt>prompt</dt>
        <dd>{game.prompt}</dd>
        <dt>source</dt>
        <dd>{game.sourceUrl}</dd>
        <dt>builds</dt>
        <dd>{platforms.join(' · ')}</dd>
        <dt>remix</dt>
        <dd>{game.remixOf ?? 'original'}</dd>
      </dl>
    </li>
  );
}
