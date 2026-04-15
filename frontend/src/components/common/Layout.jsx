import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Home, BookOpen, Users, FileText, Scroll, FolderOpen,
  Search, LogOut, User, Shield, ChevronLeft, Menu, Swords, X
} from 'lucide-react'
import styles from './Layout.module.css'

function NavItem({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} className={`${styles.navItem} ${active ? styles.navActive : ''}`}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )
}

export default function Layout({ children, campaign }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const slug = campaign?.slug

  const navItems = campaign ? [
    { to: `/campaigns/${slug}`, icon: Home, label: 'Inicio' },
    { to: `/campaigns/${slug}/characters`, icon: Users, label: 'Personajes' },
    { to: `/campaigns/${slug}/npcs`, icon: Swords, label: 'NPCs' },
    { to: `/campaigns/${slug}/wiki`, icon: BookOpen, label: 'Wiki' },
    { to: `/campaigns/${slug}/logs`, icon: Scroll, label: 'Sesiones' },
    { to: `/campaigns/${slug}/documents`, icon: FolderOpen, label: 'Documentos' },
  ] : []

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>⚔️</span>
            <span className={styles.logoText}>TTRPG Portal</span>
          </Link>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {campaign && (
          <div className={styles.campaignHeader}>
            {campaign.cover_image_url && (
              <img src={campaign.cover_image_url} alt={campaign.name} className={styles.campaignThumb} />
            )}
            <div className={styles.campaignInfo}>
              <div className={styles.campaignName}>{campaign.name}</div>
              {campaign.system && <div className={styles.campaignSystem}>{campaign.system}</div>}
              {campaign.my_role && (
                <span className={`role-badge ${campaign.my_role}`}>{campaign.my_role.replace('_', '-')}</span>
              )}
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          {campaign ? (
            <>
              {navItems.map(item => (
                <NavItem key={item.to} {...item} active={location.pathname === item.to} />
              ))}
              <div className={styles.navDivider} />
              <Link to="/" className={styles.navItem}>
                <ChevronLeft size={18} />
                <span>Mis campañas</span>
              </Link>
            </>
          ) : (
            <NavItem to="/" icon={Home} label="Mis campañas" active={location.pathname === '/'} />
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          {user?.is_site_admin && (
            <NavItem to="/admin" icon={Shield} label="Admin" active={location.pathname === '/admin'} />
          )}
          <NavItem to="/profile" icon={User} label="Perfil" active={location.pathname === '/profile'} />
          <button className={styles.logoutBtn} onClick={logout}>
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className={styles.topbarRight}>
            <div className={styles.userInfo}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt={user.username} className={styles.avatar} />
                : <div className={styles.avatarPlaceholder}>{user?.username?.[0]?.toUpperCase()}</div>
              }
              <span className={styles.username}>{user?.display_name || user?.username}</span>
            </div>
          </div>
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
