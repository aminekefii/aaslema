import { isAppPath } from './redirects.js'

// Current page path without a trailing slash ("" for the landing page).
export const currentPath = window.location.pathname.replace(/\/+$/, '')

// Prefix for links between shared pages, so they stay inside the signed-in area.
export const base = isAppPath(currentPath) ? '/app' : ''
