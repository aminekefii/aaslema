// A post's photos (1 to 3) and hashtags, shared by the community page, the Feed and My posts.

// One photo fills the width; two sit side by side; three are one large and two small
export function PostPhotos({ urls, title }) {
  if (!urls?.length) return null
  return (
    <div className={`post-photos post-photos--${urls.length}`}>
      {urls.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="post-photos__item">
          <img src={url} alt={`${title}, photo ${i + 1} of ${urls.length}`} loading="lazy" />
        </a>
      ))}
    </div>
  )
}

// With onTag the hashtags are buttons that filter by that hashtag; active is the one filtering now
export function PostTags({ tags, onTag = null, active = null }) {
  if (!tags?.length) return null
  return (
    <ul className="post-tags" aria-label="Hashtags">
      {tags.map((tag) => (
        <li key={tag}>
          {onTag
            ? <button type="button" onClick={() => onTag(tag)} className={`post-tags__tag ${active === tag ? 'is-active' : ''}`} aria-pressed={active === tag}>#{tag}</button>
            : <span className="post-tags__tag">#{tag}</span>}
        </li>
      ))}
    </ul>
  )
}
