// Admin Reviews page: which tab a review belongs to and how many each tab has.

export const isPublished = (r) => Boolean(r.approved_at)

export function filterReviews(reviews, tab) {
  if (tab === 'pending') return reviews.filter((r) => !isPublished(r))
  if (tab === 'published') return reviews.filter(isPublished)
  return reviews
}

export function reviewCounts(reviews) {
  const published = reviews.filter(isPublished).length
  return { pending: reviews.length - published, published, all: reviews.length }
}
