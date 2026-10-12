import { useEffect, useState } from 'react'
import { Eye, EyeOff, Info } from 'lucide-react'

// Sign in / Sign up pages. Aaslema signs people in through Supabase; this template has
// no backend, so the forms validate in the browser and say that accounts aren't connected.

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

function AuthShell({ title, lead, children, footer }) {
  const [notice, setNotice] = useState(false)

  useEffect(() => {
    document.title = `${title} - Aaslema`
  }, [title])

  const onSubmit = (e) => {
    e.preventDefault()
    setNotice(true)
  }

  return (
    <section className="auth">
      <div className="container">
        <div className="auth__card">
          <h1>{title}</h1>
          <p className="auth__lead">{lead}</p>

          <button type="button" className="auth-google" onClick={() => setNotice(true)}>
            <GoogleIcon /> Continue with Google
          </button>

          <div className="auth-divider"><span>or use email</span></div>

          <form className="auth-form" onSubmit={onSubmit}>
            {children}
          </form>

          {notice && (
            <p className="auth-notice" role="status">
              <Info size={18} />
              Accounts aren't connected yet. Once a sign-in service is added, this form will work as-is.
            </p>
          )}

          <p className="auth__switch">{footer}</p>
          <p className="auth__terms">
            By continuing, you agree to our <a href="#" className="auth-link">terms of service</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

export function SignIn() {
  return (
    <AuthShell
      title="Sign in to Aaslema"
      lead="Save AI itineraries, post in the forum and share your trips with other travellers."
      footer={<>New to Aaslema? <a href="/signup">Create an account</a></>}
    >
      <label className="auth-field">
        Email
        <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
      </label>
      <PasswordField label="Password" autoComplete="current-password" />
      <a href="#" className="auth-link auth-forgot">Forgot password?</a>
      <button type="submit" className="btn btn--primary auth-submit">Sign in</button>
    </AuthShell>
  )
}

export function SignUp() {
  return (
    <AuthShell
      title="Join Aaslema"
      lead="Save AI itineraries, post in the forum and share your trips with other travellers."
      footer={<>Already have an account? <a href="/signin">Sign in</a></>}
    >
      <label className="auth-field">
        Name
        <input type="text" name="name" autoComplete="name" required />
      </label>
      <label className="auth-field">
        Email
        <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
      </label>
      <PasswordField label="Password" autoComplete="new-password" minLength={8} hint="At least 8 characters." />
      <button type="submit" className="btn btn--primary auth-submit">Create account</button>
    </AuthShell>
  )
}
