import { useEffect } from 'react'
import { CONTRIBUTING, DISCUSS, REPO, RULES, SUBMIT } from '../links'
import { MarketSection } from '../market/MarketSection'

const MANIFEST = `{
  "slug": "your-game",
  "title": "Your Game",
  "maker": "you",
  "tagline": "One line that makes people click.",
  "license": "MIT",
  "prompt": "How you vibecoded it: the tools, the prompts, what you asked for and what came back.",
  "sourceUrl": "https://github.com/you/your-game",
  "builds": { "web": "web/index.html", "windows": "windows/game.exe" },
  "remixOf": null
}`

/** Reveals copy as it scrolls into view. The text is real DOM, so it stays sharp, selectable, and readable without WebGL. */
function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in')),
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export function Overlay() {
  useReveal()
  return (
    <main className="overlay">
      <section data-beat="dream" className="beat beat-dream">
        <div className="copy">
          <p className="kicker" data-reveal>
            VibeCode Arcade
          </p>
          <h1 data-reveal>Everyone has a game in their head.</h1>
          <p className="lede" data-reveal>
            Now you can just say it.
          </p>
        </div>
        <p className="scroll-hint" aria-hidden="true">
          <span>Scroll</span>
        </p>
      </section>

      <section data-beat="arcade" className="beat beat-arcade">
        <div className="copy center">
          <h2 className="title" data-reveal>
            VibeCode <em>Arcade</em>
          </h2>
          <p className="lede" data-reveal>
            A free, open-source home for games made by vibecoding. Built by the community, for every screen.
          </p>
        </div>
      </section>

      <section data-beat="deal" className="beat beat-deal">
        <div className="copy">
          <p className="kicker" data-reveal>
            The deal
          </p>
          <ul className="deal">
            <li data-reveal>
              <strong>Free.</strong> Every game, for everyone. No price tags, no paywalls, no accounts.
            </li>
            <li data-reveal>
              <strong>Open source.</strong> Every game ships its source under an open license.
            </li>
            <li data-reveal>
              <strong>Vibecoded.</strong> Made by talking with AI, and the prompt ships with the game.
            </li>
            <li data-reveal>
              <strong>Any platform.</strong> Web, Windows, macOS, Linux, Android, iOS. Bring your build.
            </li>
          </ul>
        </div>
      </section>

      <section data-beat="remix" className="beat beat-remix">
        <div className="copy">
          <p className="kicker" data-reveal>
            Remix
          </p>
          <h2 data-reveal>Every game ships with its prompt.</h2>
          <p className="lede" data-reveal>
            Fork the prompt, remix the game. Every listing remembers where it came from, so credit flows back to the original.
          </p>
          <ul className="fields" data-reveal aria-label="Every listing shows">
            <li>license</li>
            <li>prompt</li>
            <li>source</li>
            <li>builds</li>
            <li>remixOf</li>
          </ul>
        </div>
      </section>

      <section data-beat="shelf" className="beat beat-shelf">
        <div className="copy center">
          <p className="kicker" data-reveal>
            Day one
          </p>
          <h2 data-reveal>The shelf is empty. On purpose.</h2>
          <p className="lede" data-reveal>
            The first games come from you. Any engine, any platform. <strong>Bring your games.</strong>
          </p>
          <div className="ctas" data-reveal>
            <a className="btn primary" href={SUBMIT}>
              Submit your game
            </a>
            <a className="btn" href={DISCUSS}>
              Join the discussion
            </a>
            <a className="btn ghost" href={REPO}>
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      <MarketSection />

      <section className="howto" id="how">
        <div className="howto-inner">
          <h2 data-reveal>Get on the shelf in three steps</h2>
          <ol className="steps">
            <li data-reveal>
              <span className="step-n">1</span>
              <h3>Make a game.</h3>
              <p>Any engine, any language. Three.js, Godot, Phaser, Unity, Love2D, plain C. If you vibecoded it, it counts.</p>
            </li>
            <li data-reveal>
              <span className="step-n">2</span>
              <h3>Add arcade.json.</h3>
              <p>One small file: who made it, its license, the prompt, where the source lives, and which builds you ship.</p>
            </li>
            <li data-reveal>
              <span className="step-n">3</span>
              <h3>Open a submission.</h3>
              <p>
                File a <a href={SUBMIT}>Submit a game</a> issue with your repo. It's checked against the open rules, then it goes on the shelf.
              </p>
            </li>
          </ol>

          <div className="manifest" data-reveal>
            <div className="manifest-head">
              <span>arcade.json</span>
              <a href={CONTRIBUTING}>Full guide →</a>
            </div>
            <pre>
              <code>{MANIFEST}</code>
            </pre>
          </div>

          <div className="facts" data-reveal>
            <div>
              <h3>The rules are code</h3>
              <p>
                Admission is open source and runs the same everywhere: identity, a free license, provenance, at least one real build, and a path jail so packages can't reach outside themselves.{' '}
                <a href={RULES}>Read the rules</a>
              </p>
            </div>
            <div>
              <h3>The desktop shell</h3>
              <p>
                A launcher that admits a package, checks it, and runs it sandboxed. It works on Windows, macOS, and Linux, and ships with a reference cartridge. <a href={REPO}>See the code</a>
              </p>
            </div>
            <div>
              <h3>What's not here</h3>
              <p>No accounts. No payments. No DRM. No tracking. Just games, their source, and the prompts that made them.</p>
            </div>
          </div>

          <footer className="foot">
            <p>
              VibeCode Arcade 0.1 · MIT licensed · This page was vibecoded too: the scene is three.js, the windows were painted by Grok Imagine, and
              the score is Google Lyria. <a href={REPO}>Source on GitHub</a>
            </p>
          </footer>
        </div>
      </section>
    </main>
  )
}
