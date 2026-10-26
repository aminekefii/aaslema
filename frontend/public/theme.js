// Apply the saved theme before first paint to avoid a light flash.
// A file rather than an inline script, so the Content-Security-Policy needs no exception.
try { if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark') } catch (e) {}
