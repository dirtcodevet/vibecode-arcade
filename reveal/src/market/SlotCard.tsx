/** An open place on the shelf: the grid ends by inviting the next game instead of stopping short. */
export function SlotCard({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <article className="mk-card mk-slot">
      <div className="mk-slot-mark" aria-hidden="true">
        +
      </div>
      <h3 className="mk-slot-title">{title}</h3>
      <p className="mk-slot-body">{body}</p>
      <a className="mk-slot-cta" href={href} target="_blank" rel="noreferrer">
        {cta} →
      </a>
    </article>
  )
}
