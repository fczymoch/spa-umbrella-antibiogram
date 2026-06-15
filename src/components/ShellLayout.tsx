import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { BiolabLogo } from './BiolabLogo.tsx'

const PAGE_TITLES: Record<string, string> = {
  '/app': 'Início',
  '/app/exams': 'Antibiogramas',
  '/app/patients': 'Pacientes',
  '/app/doctors': 'Equipe Médica',
  '/app/attachments': 'Anexos',
  '/app/reports': 'Relatórios PDF',
  '/app/profile': 'Perfil',
  '/app/admin': 'Administrador',
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/app/exams/')) return 'Detalhe do Antibiograma'
  if (pathname.startsWith('/app/patients/')) return 'Detalhe do Paciente'
  if (pathname.startsWith('/app/doctors/')) return 'Perfil do Médico'
  return PAGE_TITLES[pathname] ?? 'BioLab'
}

/* ---- Ícones de navegação ---- */
const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
)
const IconFlask = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 3h6M9 3v7l-4 8a1.6 1.6 0 0 0 1.4 2.3h9.6A1.6 1.6 0 0 0 19 18l-4-8V3"/>
    <circle cx="11" cy="15" r=".6" fill="currentColor"/>
    <circle cx="14.5" cy="17" r=".9" fill="currentColor"/>
  </svg>
)
const IconPatients = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconDoctors = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <path d="M12 16v4m-2-2h4"/>
  </svg>
)
const IconProfile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const IconAdmin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
  </svg>
)
const IconReport = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

export function ShellLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('biolab:theme', 'light')
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  const closeDrawer = () => setDrawerOpen(false)

  const navContent = (
    <>
      <nav className="side-nav" aria-label="Navegação principal">
        <NavLink to="/app" end className="nav-item" onClick={closeDrawer}>
          <IconHome /> Início
        </NavLink>

        <p className="nav-section-label">Clínico</p>

        <details open className="nav-group">
          <summary><IconFlask /> Antibiogramas</summary>
          <NavLink to={{ pathname: '/app/exams', search: '?view=all' }} className="nav-subitem" end onClick={closeDrawer}>
            Geral
          </NavLink>
          <NavLink to={{ pathname: '/app/exams', search: '?view=mine' }} className="nav-subitem" onClick={closeDrawer}>
            Meus antibiogramas
          </NavLink>
        </details>

        <NavLink to="/app/patients" className="nav-item" onClick={closeDrawer}>
          <IconPatients /> Pacientes
        </NavLink>
        <NavLink to="/app/doctors" className="nav-item" onClick={closeDrawer}>
          <IconDoctors /> Equipe
        </NavLink>

        <p className="nav-section-label">Gestão</p>

        <NavLink to="/app/reports" className="nav-item" onClick={closeDrawer}>
          <IconReport /> Relatórios PDF
        </NavLink>
        <NavLink to="/app/admin" className="nav-item" onClick={closeDrawer}>
          <IconAdmin /> Administrador
        </NavLink>

        <p className="nav-section-label">Conta</p>

        <NavLink to="/app/profile" className="nav-item" onClick={closeDrawer}>
          <IconProfile /> Perfil
        </NavLink>
      </nav>

      {user && (
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-chip__avatar" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-chip__info">
              <p>{user.name}</p>
              <span>{user.role}</span>
            </div>
          </div>
          <button className="nav-logout" onClick={handleLogout}>
            <IconLogout /> Sair
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <BiolabLogo size={34} variant="white" />
          <div>
            <p className="brand-eyebrow">Microbiologia clínica</p>
            <p className="brand-title">BioLab</p>
          </div>
        </div>
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="drawer-overlay" aria-hidden="true" onClick={closeDrawer} />
      )}

      {/* Mobile Drawer */}
      <aside className={`drawer${drawerOpen ? ' drawer--open' : ''}`} aria-label="Menu de navegação">
        <div className="drawer-header">
          <div className="brand">
            <BiolabLogo size={28} variant="white" />
            <p className="brand-title">BioLab</p>
          </div>
          <button className="drawer-close" onClick={closeDrawer} aria-label="Fechar menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {navContent}
      </aside>

      {/* Main Content */}
      <div className="content-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="topbar-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu de navegação"
            aria-expanded={drawerOpen}
          >
            <span /><span /><span />
          </button>
          <h2 className="topbar-title">{pageTitle}</h2>
          <div className="topbar-actions">
            <button
              className="topbar-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            {user && (
              <div className="topbar-user">
                <div className="topbar-avatar" aria-label={user.name}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="topbar-user-name">{user.name}</span>
              </div>
            )}
          </div>
        </header>

        <main className="content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
