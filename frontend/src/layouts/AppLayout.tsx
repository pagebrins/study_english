import { ChevronDown, MessageCircle, Settings, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { HelpChatPanel } from '../components/chat/HelpChatPanel'
import { categoryLabel, defaultStudyCategory, studyCategories } from '../constants/study'
import { useAuth } from '../hooks/useAuth'
import { useHelpChatStore } from '../store/helpChatStore'
import { hasPermission } from '../utils/permission'

const navSections = [
  { key: 'dashboard', label: 'Dashboard', base: '/dashboard' },
  { key: 'modes', label: 'Modes', base: '/modes' },
  { key: 'study', label: 'Study', base: '/study' },
  { key: 'practice', label: 'Practice', base: '/practice' },
  { key: 'history', label: 'History', base: '/history' },
]

/**
 * Main shell with 4-zone layout.
 */
export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isOpen, isMinimized, open, close, restore, ensureOpenHint, setContext } = useHelpChatStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSettingMenuOpen, setIsSettingMenuOpen] = useState(false)
  const [openSection, setOpenSection] = useState(() => {
    const activeSection = navSections.find((section) => location.pathname.startsWith(`${section.base}/`))
    return activeSection?.key ?? 'dashboard'
  })
  const avatarText = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || 'U'
    return source.charAt(0).toUpperCase()
  }, [user?.email, user?.name])
  const canUsePractice = hasPermission(user, 'practice.use')
  const canUseChat = hasPermission(user, 'chat.use')
  const canManageTheme = hasPermission(user, 'settings.theme.manage')
  const canManagePermission = hasPermission(user, 'settings.permission.manage')
  const visibleSections = useMemo(() => {
    return navSections.filter((section) => section.key !== 'practice' || canUsePractice)
  }, [canUsePractice])

  useEffect(() => {
    if (!location.pathname.startsWith('/practice/') && !location.pathname.startsWith('/history/')) {
      setContext({ page: 'other' })
    }
  }, [location.pathname, setContext])

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] grid-rows-[72px_1fr] bg-background">
      <div className="flex items-center border-b border-r border-zinc-800 bg-zinc-950 px-4">
        <Link to="/" className="block text-sm font-semibold tracking-wide">
          AI English Study
        </Link>
      </div>

      <aside className="row-start-2 border-r border-zinc-800 bg-zinc-950 px-4 py-4">
        <nav className="space-y-2">
          {visibleSections.map((section) => {
            const sectionActive = location.pathname.startsWith(`${section.base}/`)
            const sectionOpen = sectionActive || openSection === section.key
            return (
              <div key={section.key} className="space-y-1">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm ${
                    sectionActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                  }`}
                  onClick={() => {
                    setOpenSection(section.key)
                    navigate(`${section.base}/${defaultStudyCategory}`)
                  }}
                >
                  {section.label}
                  <ChevronDown
                    size={14}
                    className={sectionOpen ? 'rotate-180 text-zinc-300 transition-transform' : 'text-zinc-400 transition-transform'}
                  />
                </button>
                {sectionOpen && (
                  <div className="space-y-1 pl-2">
                    {studyCategories.map((category) => (
                      <NavLink
                        key={`${section.key}-${category}`}
                        to={`${section.base}/${category}`}
                        className={({ isActive }) =>
                          `block rounded-md px-3 py-1.5 text-xs ${
                            isActive ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                          }`
                        }
                      >
                        {categoryLabel[category]}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      <header className="col-start-2 flex items-center justify-end border-b border-zinc-800 bg-zinc-950 px-6">
        {(canManageTheme || canManagePermission) && (
          <div
            className="relative mr-2"
            onMouseEnter={() => setIsSettingMenuOpen(true)}
            onMouseLeave={() => setIsSettingMenuOpen(false)}
          >
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
              title="Setting"
              onClick={() => setIsSettingMenuOpen((value) => !value)}
            >
              <Settings size={18} />
            </button>
            {isSettingMenuOpen && (
              <div className="absolute right-0 top-full z-40 min-w-[120px] rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-lg">
                {canManageTheme && (
                  <button
                    type="button"
                    className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      window.open('/settings?tab=theme', '_blank', 'noopener,noreferrer')
                      setIsSettingMenuOpen(false)
                    }}
                  >
                    主题
                  </button>
                )}
                {canManagePermission && (
                  <button
                    type="button"
                    className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      window.open('/settings?tab=permission', '_blank', 'noopener,noreferrer')
                      setIsSettingMenuOpen(false)
                    }}
                  >
                    权限
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {canUseChat && (
          <div className="mr-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
              onClick={() => {
                if (isOpen && isMinimized) {
                  restore()
                } else if (!isOpen) {
                  open()
                  ensureOpenHint()
                }
              }}
              title="Open chat"
            >
              <MessageCircle size={18} />
            </button>
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {user?.image ? (
              <img src={user.image} alt="User avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                {avatarText}
              </span>
            )}
            <ChevronDown size={16} className="text-zinc-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-lg">
              <button
                type="button"
                className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="col-start-2 row-start-2 min-h-0 p-6">
        <div className="flex h-full min-h-0 gap-4">
          <section className={`min-w-0 transition-all duration-200 ${isOpen && !isMinimized ? 'w-[calc(100%-420px)]' : 'w-full'}`}>
            <Outlet />
          </section>
          {canUseChat && isOpen && (
            <aside className={`shrink-0 min-h-0 transition-all duration-200 ${isMinimized ? 'w-14' : 'w-[420px]'}`}>
              {isMinimized ? (
                <div className="group relative flex h-full items-start justify-center rounded-md border border-zinc-800 bg-zinc-950 py-4">
                  <button
                    type="button"
                    className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded border border-red-500/60 bg-red-500/20 text-red-400 hover:bg-red-500/30 group-hover:flex"
                    onClick={close}
                    title="Close chat"
                  >
                    <X size={10} />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                    onClick={restore}
                    title="Restore chat"
                  >
                    <MessageCircle size={16} />
                  </button>
                </div>
              ) : (
                <div className="h-full min-h-0 overflow-hidden rounded-md border border-zinc-800">
                  <HelpChatPanel />
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

    </div>
  )
}
