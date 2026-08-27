import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  PackageSearch,
  Package,
  Settings,
  Menu,
  Truck,
  Receipt,
  PackageMinus,
  BarChart3,
  ShoppingBag,
  Banknote,
  Landmark,
  FileText,
  Building2,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/auth.store'

const navItems = [
  { name: 'Dashboard',    href: '/',           icon: LayoutDashboard },
  { name: 'POS',          href: '/pos',        icon: ShoppingCart },
  { name: 'Sales',        href: '/sales',      icon: FileText },
  { name: 'Purchases',    href: '/purchases',  icon: ShoppingBag },
  { name: 'Inventory',    href: '/inventory',  icon: PackageSearch },
  { name: 'Products',     href: '/products',   icon: Package },
  { name: 'Customers',    href: '/customers',  icon: Users },
  { name: 'Suppliers',    href: '/suppliers',  icon: Building2 },   // was Truck — now distinct
  { name: 'Payments',     href: '/payments',   icon: Banknote },
  { name: 'Accounts',     href: '/accounts',   icon: Landmark },
  { name: 'Van Sales',    href: '/vans',       icon: Truck },       // Truck is correct here
  { name: 'Reports',      href: '/reports',    icon: BarChart3 },   // was FileText — now distinct
  { name: 'Expenses',     href: '/expenses',   icon: Receipt },
  { name: 'Adjustments',  href: '/adjustments', icon: PackageMinus },
  { name: 'Settings',     href: '/settings',   icon: Settings },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === 'admin' || user?.role === 'manager'

  const visibleNavItems = navItems.filter(item => {
    if (isManager) return true
    // Cashier allowed items only
    const cashierAllowed = ['POS', 'Sales', 'Customers', 'Settings']
    return cashierAllowed.includes(item.name)
  })

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-screen bg-card border-r border-border flex flex-col shrink-0"
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border shrink-0">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="font-bold text-base text-primary truncate select-none"
          >
            Khan Traders
          </motion.span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            collapsed && 'mx-auto'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <nav className="space-y-0.5 px-2">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group relative',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-card',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon
                  size={18}
                  className={cn('shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
                />
                {!collapsed && (
                  <span className="text-sm truncate flex-1">{item.name}</span>
                )}
                {!collapsed && isActive && (
                  <ChevronRight size={14} className="text-primary/50 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User role badge at bottom */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 border-t border-border shrink-0"
        >
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
            {user?.role?.replace('_', ' ')}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
