const TERMS = [
  {
    title: 'Free and open source.',
    text: 'Every game on the shelf is free to play and published under an open-source license. So is this shell.',
  },
  {
    title: 'Made by vibecoding.',
    text: 'These are games made with AI coding tools: prompts, iteration, and taste.',
  },
  {
    title: 'Bring your game from any platform.',
    text: 'Web, Linux, Windows, macOS, Android, iOS — ship whichever builds you have. One is enough.',
  },
  {
    title: 'One shell, three desktops.',
    text: 'The same shell runs on Windows, macOS, and Linux.',
  },
  {
    title: 'The prompt ships with the game.',
    text: 'Every game ships with its prompt, so remixing is how the next game starts.',
  },
  {
    title: 'No accounts, no payments, no DRM.',
    text: 'Nothing to sign up for, nothing to buy, nothing locked. Creator monetization is outside this version.',
  },
] as const;

export function DealScreen() {
  return (
    <div className="screen" data-screen="deal">
      <header className="screen-head">
        <p className="eyebrow">What this is</p>
        <h1>The Deal</h1>
        <p className="lede">Six promises. They are the reason the shelf exists.</p>
      </header>
      <ol className="terms">
        {TERMS.map((term, index) => (
          <li key={term.title} className="term">
            <span className="term-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{term.title}</h2>
              <p>{term.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
