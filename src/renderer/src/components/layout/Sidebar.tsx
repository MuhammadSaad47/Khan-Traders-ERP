import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Users, PackageSearch, Settings, Menu, Truck, Receipt, PackageMinus, FileText, ShoppingBag, Banknote, Landmark, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { motion } from 'framer-motion'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'POS', href: '/pos', icon: ShoppingCart },
  { name: 'Sales', href: '/sales', icon: FileText },
  { name: 'Purchases', href: '/purchases', icon: ShoppingBag },
  { name: 'Inventory', href: '/inventory', icon: PackageSearch },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Payments', href: '/payments', icon: Banknote },
  { name: 'Installments', href: '/installments', icon: CalendarDays },
  { name: 'Accounts', href: '/accounts', icon: Landmark },
  { name: 'Van Sales', href: '/vans', icon: Truck },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Adjustments', href: '/adjustments', icon: PackageMinus },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.div 
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      className="h-screen bg-card border-r border-border flex flex-col transition-all duration-300"
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && <span className="font-bold text-lg text-primary truncate">Khan Trader</span>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Menu size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"
                  />
                )}
                <Icon size={20} className={cn("shrink-0", isActive && "text-primary")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
    </motion.div>
  )
}
