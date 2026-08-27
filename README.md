# 🏢 Khan Traders POS & ERP

> A comprehensive, high-performance Desktop Point of Sale and Enterprise Resource Planning (ERP) application built specifically for modern distribution, retail, and wholesale businesses.

## ✨ Features

- **🚀 Lightning Fast POS**: Highly optimized Point of Sale interface designed for speed, supporting keyboard shortcuts, multiple payment methods, and instant receipt printing.
- **📦 Smart Inventory Management**: Real-time stock tracking, automated low-stock alerts, dynamic pricing, and seamless adjustments.
- **👥 Complete Ledger System**: Manage comprehensive ledgers, track outstanding balances, and generate automated PDF statements for both Customers and Suppliers.
- **📊 Advanced Analytics & Reports**: Deep financial insights including Profit & Loss (P&L), Stock Valuation, and Detailed Sales Breakdowns (Counter, Van, Wholesale).
- **🚚 Van Sales Distribution**: Dedicated features for van salesmen routing and remote sales tracking.
- **🏦 Financial Accounts**: Full double-entry accounting system tracking cash flow, banks, business expenses, and capital equity.
- **🔒 Enterprise Security**: Role-based access control (Admin, Manager, Cashier, Van Salesman) with granular permissions, session timeouts, and detailed system audit logging.
- **💻 Offline First**: Powered by a blazing-fast local SQLite database ensuring zero network downtime and absolute data privacy.

## 🛠️ Tech Stack

Built with a modern, type-safe, and highly scalable architecture:

- **Framework**: [Electron](https://www.electronjs.org/) (Desktop Application)
- **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible components
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack React Query](https://tanstack.com/query/latest)
- **Database**: [SQLite](https://sqlite.org/) (via `better-sqlite3` and `Kysely` query builder)
- **Build Tool**: [Electron Vite](https://electron-vite.org/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/khan-traders.git
   cd khan-traders
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Building for Production

Compile the application into a standalone executable for your operating system:

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

The compiled executables will be available in the `dist` folder.

## 📸 Screenshots

*(Developers: Add screenshots of your Dashboard, POS, and Reports here to showcase the UI)*

## 🛡️ Security

This application features a built-in locking mechanism, inactivity session timeouts, password hashing via bcrypt, and encrypted local credential storage to ensure that business financials remain completely secure.

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification of this software is strictly prohibited.
