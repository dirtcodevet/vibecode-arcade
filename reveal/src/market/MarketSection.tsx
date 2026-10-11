import './market.css'
import { Storefront } from './Storefront'

/**
 * "The Arcade" section for the reveal site: an intro, then a working storefront preview in an app window.
 * Self-contained: every class is mk- prefixed, styles live in market.css, listings are clearly labelled examples.
 */
export function MarketSection() {
  return (
    <section className="mk-section" id="arcade" aria-labelledby="mk-heading">
      <div className="mk-intro">
        <p className="mk-kicker">The Arcade</p>
        <h2 id="mk-heading" className="mk-h2">
          This is what the shelf becomes.
        </h2>
        <p className="mk-lede">
          Every game free, open source, and shipped with the prompt that made it. Have a look around: these are example listings until the first real
          games arrive.
        </p>
      </div>
      <Storefront />
    </section>
  )
}
