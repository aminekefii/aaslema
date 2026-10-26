import { useEffect, useState } from 'react'
import { Eye, EyeOff, Info } from 'lucide-react'
import { supabase, useUser } from '../supabase.js'
import { homeFor } from '../roles.js'
import { PASSWORD_HINT, newPasswordError } from '../profile.js'

// Sign in / Sign up / Reset password pages, backed by Supabase Auth (email + password).

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  )
}

function PasswordField({ label, autoComplete, minLength, hint }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="auth-field">
      {label}
      <span className="auth-field__password">
        <input type={visible ? 'text' : 'password'} name="password" autoComplete={autoComplete} minLength={minLength} required />
        <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  )
}

// `onSubmit(formData)` talks to Supabase and returns the notice to show: { text, error? }.
function AuthShell({ title, lead, children, footer, onSubmit, google = true }) {
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = `${title} - Aaslema`
  }, [title])

  const submit = async (e) => {
    e.preventDefault()
    if (!supabase) return setNotice({ text: "Accounts aren't connected yet. Add the Supabase values to .env.local." })
    const form = e.target
    setBusy(true)
    setNotice(null)
    try {
      const result = await onSubmit(new FormData(form))
      // Keep the typed values only when there's an error to fix
      if (!result.error) form.reset()
      setNotice(result)
    } catch {
      setNotice({ text: 'Something went wrong. Check your connection and try again.', error: true })
    }
    setBusy(false)
  }

  return (
    <section className="auth">
      <div className="container">
        <div className="auth__card">
          <h1>{title}</h1>
          <p className="auth__lead">{lead}</p>

          {google && (
            <>
              <button type="button" className="auth-google" onClick={() => setNotice({ text: "Google sign-in isn't available yet. Use your email below." })}>
                <GoogleIcon /> Continue with Google
              </button>
              <div className="auth-divider"><span>or use email</span></div>
            </>
          )}

          <form onSubmit={submit}>
            <fieldset className="auth-form" disabled={busy}>
              {children}
            </fieldset>
          </form>

          {notice && (
            <p className={`auth-notice ${notice.error ? 'auth-notice--error' : ''}`} role="status">
              <Info size={18} />
              {notice.text}
            </p>
          )}

          {footer && <p className="auth__switch">{footer}</p>}
          <p className="auth__terms">
            By continuing, you agree to our <a href="#" className="auth-link">terms of service</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

export function SignIn() {
  const signIn = async (form) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') })
    if (error) return { text: error.message, error: true }
    window.location.assign(homeFor(data.user))
    return { text: 'Signed in. Taking you home…' }
  }

  return (
    <AuthShell
      title="Sign in to Aaslema"
      lead="Save AI itineraries, post in the forum and share your trips with other travellers."
      footer={<>New to Aaslema? <a href="/signup">Create an account</a></>}
      onSubmit={signIn}
    >
      <label className="auth-field">
        Email
        <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
      </label>
      <PasswordField label="Password" autoComplete="current-password" />
      <a href="/reset-password" className="auth-link auth-forgot">Forgot password?</a>
      <button type="submit" className="btn btn--primary auth-submit">Sign in</button>
    </AuthShell>
  )
}

export function SignUp() {
  const signUp = async (form) => {
    const weak = newPasswordError(form.get('password'))
    if (weak) return { text: weak, error: true }
    const { data, error } = await supabase.auth.signUp({
      email: form.get('email'),
      password: form.get('password'),
      options: { data: { full_name: form.get('name') }, emailRedirectTo: window.location.origin },
    })
    if (error) return { text: error.message, error: true }
    // Supabase hides whether an email is taken; an existing account comes back with no identities
    if (data.user?.identities?.length === 0) return { text: 'An account with this email already exists. Sign in instead.', error: true }
    if (data.session) {
      window.location.assign('/app')
      return { text: 'Account created. Taking you home…' }
    }
    return { text: 'Almost there: check your email and click the link to confirm your account.' }
  }

  return (
    <AuthShell
      title="Join Aaslema"
      lead="Save AI itineraries, post in the forum and share your trips with other travellers."
      footer={<>Already have an account? <a href="/signin">Sign in</a></>}
      onSubmit={signUp}
    >
      <label className="auth-field">
        Name
        <input type="text" name="name" autoComplete="name" required />
      </label>
      <label className="auth-field">
        Email
        <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
      </label>
      <PasswordField label="Password" autoComplete="new-password" minLength={8} hint={PASSWORD_HINT} />
      <button type="submit" className="btn btn--primary auth-submit">Create account</button>
    </AuthShell>
  )
}

// Two steps on one page: ask for the reset email, then (arriving from that email's
// link, which signs the user in) set the new password.
export function ResetPassword() {
  const user = useUser()
  const linkError = new URLSearchParams(window.location.hash.slice(1)).get('error_description')

  const sendLink = async (form) => {
    const { error } = await supabase.auth.resetPasswordForEmail(form.get('email'), { redirectTo: `${window.location.origin}/reset-password` })
    if (error) return { text: error.message, error: true }
    return { text: 'If an account uses that email, a reset link is on its way.' }
  }

  const savePassword = async (form) => {
    const weak = newPasswordError(form.get('password'))
    if (weak) return { text: weak, error: true }
    const { error } = await supabase.auth.updateUser({ password: form.get('password') })
    if (error) return { text: error.message, error: true }
    window.location.assign('/')
    return { text: 'Password updated. Taking you home…' }
  }

  if (user === undefined) return <section className="auth" />

  return user ? (
    <AuthShell title="Choose a new password" lead={`For ${user.email}.`} onSubmit={savePassword} google={false}>
      <PasswordField label="New password" autoComplete="new-password" minLength={8} hint={PASSWORD_HINT} />
      <button type="submit" className="btn btn--primary auth-submit">Save password</button>
    </AuthShell>
  ) : (
    <AuthShell
      title="Reset your password"
      lead={linkError ? `${linkError}. Request a new link below.` : "Enter your email and we'll send you a link to set a new password."}
      footer={<a href="/signin">Back to sign in</a>}
      onSubmit={sendLink}
      google={false}
    >
      <label className="auth-field">
        Email
        <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
      </label>
      <button type="submit" className="btn btn--primary auth-submit">Send reset link</button>
    </AuthShell>
  )
}
