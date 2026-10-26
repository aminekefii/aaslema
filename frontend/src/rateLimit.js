// Posting limits from 026_rate_limits.sql: an insert over the hourly limit fails with code P0429
export const TOO_OFTEN = "You're doing that too often. Please wait a while and try again."
export const isTooOften = (error) => error?.code === 'P0429'
