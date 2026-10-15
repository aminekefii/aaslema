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

// Approve or unpublish, but only the version the admin is looking at: updated_at
// changes on every author edit, so an edit made meanwhile makes the update match no row
export const approvalChange = (review, now) => ({
  values: { approved_at: isPublished(review) ? null : now },
  match: { id: review.id, updated_at: review.updated_at },
})
