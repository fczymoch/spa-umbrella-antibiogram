import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { AuthBrandPanel } from '../components/AuthBrandPanel.tsx'
import { BiolabLogo } from '../components/BiolabLogo.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { extractErrorMessage } from '../api/client.ts'

function IconEmail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconEye({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const emailError =
    touched && !email
      ? 'E-mail é obrigatório.'
      : touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Informe um e-mail válido.'
        : null

  const passwordError = touched && !password ? 'Senha é obrigatória.' : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    setServerError(null)
    if (!email || emailError || !password) return

    setLoading(true)
    try {
      await login({ email, password })
      const redirectTo =
        (location.state as { from?: Location } | undefined)?.from?.pathname || '/app'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      // O backend retorna mensagens amigáveis no body para todos os 401.
      // extractErrorMessage lê data.error || data.message automaticamente.
      setServerError(extractErrorMessage(error, 'Não foi possível autenticar. Verifique suas credenciais.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-simple">
      {/* Painel esquerdo — componente isolado */}
      <AuthBrandPanel />

      {/* Painel direito — formulário */}
      <div className="auth-panel-form">
        <div className="auth-card">

          {/* Logo + nome */}
          <div className="auth-card__brand">
            <BiolabLogo size={36} variant="color" />
            <span className="auth-card__brand-name">BioLab</span>
          </div>

          {/* Cabeçalho */}
          <div className="auth-card__header">
            <h1>Bem-vindo de volta</h1>
            <p className="muted">Acesse com seu e-mail institucional.</p>
          </div>

          {/* Formulário */}
          <form className="form" onSubmit={handleSubmit} noValidate>

            {/* Campo e-mail */}
            <div className="auth-field">
              <div className="auth-field__label-row">
                <label htmlFor="email">E-mail <span className="auth-field__required" aria-hidden="true">*</span></label>
              </div>
              <div className="auth-field__input-wrap">
                <span className="auth-field__icon"><IconEmail /></span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  aria-invalid={!!emailError}
                  style={emailError ? { borderColor: 'var(--color-alert-border)' } : undefined}
                />
              </div>
              {emailError && (
                <p id="email-error" role="alert" className="auth-field__error">
                  {emailError}
                </p>
              )}
            </div>

            {/* Campo senha */}
            <div className="auth-field">
              <div className="auth-field__label-row">
                <label htmlFor="password">Senha <span className="auth-field__required" aria-hidden="true">*</span></label>
              </div>
              <div className="auth-field__input-wrap">
                <span className="auth-field__icon"><IconLock /></span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!passwordError}
                  style={passwordError ? { borderColor: 'var(--color-alert-border)' } : undefined}
                />
                <button
                  type="button"
                  className="auth-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <IconEye open={showPassword} />
                </button>
              </div>
              {passwordError && (
                <p role="alert" className="auth-field__error">
                  {passwordError}
                </p>
              )}
              <a href="#" className="auth-field__forgot" onClick={(e) => e.preventDefault()}>
                Esqueci minha senha
              </a>
            </div>

            {serverError && (
              <p role="alert" className="auth-field__error" style={{ marginTop: 'var(--space-2)' }}>
                {serverError}
              </p>
            )}

            <button
              type="submit"
              className="button primary"
              disabled={loading}
              aria-busy={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Entrando…
                </>
              ) : (
                <>
                  Entrar no painel
                  <IconArrow />
                </>
              )}
            </button>
          </form>

          {/* Rodapé do card */}
          <p className="auth-card__footer">
            Acesso restrito a profissionais autorizados pelo hospital.
          </p>
        </div>
      </div>
    </div>
  )
}
