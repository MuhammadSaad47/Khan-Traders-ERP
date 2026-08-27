import { useBusinessSettings, useUpdateBusinessSettings, useCloudBackupStatus, useCloudBackupAuth, useCloudBackupUpload, useCloudBackupRestore, useCloudBackupDisconnect } from '../../hooks/useSettings'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Store, Save, Cloud, RefreshCw, Upload, DownloadCloud, Link, Info, UserCog, KeyRound, Shield, Printer, CheckCircle, AlertCircle, Wifi, Monitor } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '../../stores/auth.store'
import { useUsers, useChangePassword, useCreateUser, useDeleteUser, useResetPassword } from '../../hooks/useUsers'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SecurityQuestionsSetup } from '@/components/SecurityQuestionsSetup'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: settingsData, isLoading: settingsLoading } = useBusinessSettings()
  const updateSettings = useUpdateBusinessSettings()
  
  const { data: cloudStatus, isLoading: cloudStatusLoading } = useCloudBackupStatus()
  const cloudAuth = useCloudBackupAuth()
  const cloudUpload = useCloudBackupUpload()
  const cloudRestore = useCloudBackupRestore()
  const cloudDisconnect = useCloudBackupDisconnect()
  const [isExporting, setIsExporting] = useState(false)
  
  const currentUser = useAuthStore(state => state.user)
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager'
  
  const { data: users = [] } = useUsers()
  const changePassword = useChangePassword()
  const createUser = useCreateUser()
  const deleteUser = useDeleteUser()
  const resetPassword = useResetPassword()

  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [cloudRestoreConfirm, setCloudRestoreConfirm] = useState(false)
  const [cloudDisconnectConfirm, setCloudDisconnectConfirm] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', fullName: '', role: 'cashier', password: '' })
  
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [userToReset, setUserToReset] = useState<any>(null)
  const [resetPassValue, setResetPassValue] = useState('')
  
  const [hasSecurityQuestions, setHasSecurityQuestions] = useState(false)
  const [showSecurityQuestionsSetup, setShowSecurityQuestionsSetup] = useState(false)

  const [formData, setFormData] = useState({
    business_name: '',
    phone: '',
    address: '',
    currency_symbol: 'Rs',
    receipt_footer: '',
    low_stock_threshold_default: 10
  })

  // Printer Settings State
  const [printerConfig, setPrinterConfig] = useState({
    interface: '',
    type: 'EPSON',
    width: 80
  })
  const [printerSaving, setPrinterSaving] = useState(false)
  const [printerTesting, setPrinterTesting] = useState(false)
  const [printerTestResult, setPrinterTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  
  const [systemPrinters, setSystemPrinters] = useState<any[]>([])
  const [fetchingPrinters, setFetchingPrinters] = useState(false)

  // Zoom Settings State
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('app-zoom-level')
    return saved ? parseFloat(saved) : 1.0
  })

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setZoomLevel(val)
    window.dispatchEvent(new CustomEvent('app-zoom-changed', { detail: { zoom: val } }))
  }

  const handleSaveZoom = () => {
    localStorage.setItem('app-zoom-level', zoomLevel.toString())
    toast({ title: 'Zoom level saved successfully!' })
  }

  const handleResetZoom = () => {
    setZoomLevel(1.0)
    localStorage.setItem('app-zoom-level', '1.0')
    window.dispatchEvent(new CustomEvent('app-zoom-changed', { detail: { zoom: 1.0 } }))
    toast({ title: 'Zoom reset to 100%' })
  }

  useEffect(() => {
    if (settingsData) {
      setFormData({
        business_name: settingsData.business_name || '',
        phone: settingsData.phone || '',
        address: settingsData.address || '',
        currency_symbol: settingsData.currency_symbol || 'Rs',
        receipt_footer: settingsData.receipt_footer || '',
        low_stock_threshold_default: settingsData.low_stock_threshold_default || 10
      })
    }
  }, [settingsData])

  const fetchSystemPrinters = useCallback(async (currentInterface?: string) => {
    try {
      setFetchingPrinters(true)
      const printers = await window.api.settings.getSystemPrinters()
      setSystemPrinters(printers || [])
      
      if (!currentInterface && printers?.length > 0) {
        const likelyReceiptPrinter = printers.find((p: any) => 
          p.name.toLowerCase().includes('pos') || 
          p.name.toLowerCase().includes('epson') || 
          p.name.toLowerCase().includes('thermal') ||
          p.name.toLowerCase().includes('tm-') ||
          p.name.toLowerCase().includes('receipt')
        )
        if (likelyReceiptPrinter) {
          setPrinterConfig(prev => ({ ...prev, interface: `printer:${likelyReceiptPrinter.name}` }))
        }
      }
    } catch (e) {
      console.error('Failed to fetch system printers', e)
    } finally {
      setFetchingPrinters(false)
    }
  }, [])

  // Load printer config from backend
  const loadPrinterConfig = useCallback(async () => {
    try {
      const config = await window.api.settings.getPrinterConfig()
      let currentInterface = ''
      if (config) {
        currentInterface = config.interface || ''
        setPrinterConfig({
          interface: currentInterface,
          type: config.type || 'EPSON',
          width: config.width || 80
        })
      }
      fetchSystemPrinters(currentInterface)
    } catch (e) {
      console.error('Failed to load printer config', e)
    }
  }, [fetchSystemPrinters])

  useEffect(() => { loadPrinterConfig() }, [loadPrinterConfig])

  useEffect(() => {
    // Check if current user has security questions set up
    if (currentUser?.id) {
      window.api.auth.hasSecurityQuestions(currentUser.id).then(setHasSecurityQuestions).catch(console.error)
    }
  }, [currentUser?.id])

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(formData)
      toast({ title: 'Settings saved successfully!' })
    } catch (e: any) {
      toast({ title: 'Failed to save settings', description: e.message, variant: 'destructive' })
    }
  }

  const handleCloudAuth = async () => {
    try {
      const res = await cloudAuth.mutateAsync()
      if (res.success) {
        toast({ title: 'Successfully authenticated with Google Drive!' })
      } else {
        toast({ title: 'Authentication failed', description: res.error, variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error during authentication', description: e.message, variant: 'destructive' })
    }
  }

  const handleCloudUpload = async () => {
    try {
      const res = await cloudUpload.mutateAsync()
      if (res.success) {
        toast({ title: 'Data successfully backed up to Google Drive!' })
      } else {
        toast({ title: 'Backup failed', description: res.error, variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error during backup', description: e.message, variant: 'destructive' })
    }
  }

  const handleCloudRestore = async () => {
    try {
      const res = await cloudRestore.mutateAsync()
      if (!res.success) {
        toast({ title: 'Restore failed', description: res.error, variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error during restore', description: e.message, variant: 'destructive' })
    }
  }

  const handleCloudDisconnect = async () => {
    try {
      const res = await cloudDisconnect.mutateAsync()
      if (res.success) {
        toast({ title: 'Successfully disconnected from Google Drive!' })
      } else {
        toast({ title: 'Disconnect failed', description: res.error, variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error disconnecting', description: e.message, variant: 'destructive' })
    }
  }

  const handleExportLogs = async () => {
    try {
      setIsExporting(true)
      const result = await window.api.settings.exportLogs()
      if (result.success && result.path) {
        toast({ title: '✅ Diagnostics exported successfully!', description: `Saved to: ${result.path}` })
        // Open the folder in file explorer
        window.api.shell?.openPath(result.path)
      } else if (!result.canceled) {
        toast({ title: 'Failed to export diagnostics', description: result.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error exporting diagnostics', description: e.message, variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPass || !newPass) { toast({ title: 'Please fill in both fields', variant: 'destructive' }); return }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPass, newPassword: newPass })
      toast({ title: 'Password changed successfully!' })
      setCurrentPass('')
      setNewPass('')
    } catch (e: any) {
      toast({ title: 'Failed to change password', description: e.message, variant: 'destructive' })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUser.mutateAsync(newUser)
      toast({ title: 'User created successfully!' })
      setIsAddUserOpen(false)
      setNewUser({ username: '', fullName: '', role: 'cashier', password: '' })
    } catch (e: any) {
      toast({ title: 'Failed to create user', description: e.message, variant: 'destructive' })
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPassValue) { toast({ title: 'Enter a new password', variant: 'destructive' }); return }
    try {
      await resetPassword.mutateAsync({ targetUserId: userToReset.id, newPassword: resetPassValue })
      toast({ title: 'Password reset successfully!' })
      setUserToReset(null)
      setResetPassValue('')
    } catch (e: any) {
      toast({ title: 'Failed to reset password', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Tabs defaultValue={isManager ? "general" : "users"} className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-6 lg:p-8 bg-slate-50/40 dark:bg-slate-950/20 overflow-hidden">
      
      <div className="mb-6 shrink-0 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
          <TabsList className="mt-4">
            {isManager && <TabsTrigger value="general">General</TabsTrigger>}
            {isManager && <TabsTrigger value="printer"><Printer className="w-3.5 h-3.5 mr-1.5" />Printer</TabsTrigger>}
            <TabsTrigger value="users">{isManager ? 'User Management' : 'My Account'}</TabsTrigger>
          </TabsList>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportLogs} disabled={isExporting}>
          <DownloadCloud className="w-4 h-4" /> {isExporting ? 'Exporting...' : 'Export Diagnostics'}
        </Button>
      </div>

      {isManager && (
      <TabsContent value="general" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-y-auto pr-2 pb-6 content-start">
        
        {/* Left Column: Business Settings */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-full">
          <CardHeader className="bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Business Details
            </CardTitle>
            <CardDescription>
              Configure the core details of your business.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-white dark:bg-slate-900 flex-1 overflow-y-auto">
            {settingsLoading ? (
              <div className="flex justify-center items-center h-40 text-slate-400 animate-pulse">Loading settings...</div>
            ) : (
              <div className="grid gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Name</label>
                    <Input 
                      placeholder="e.g. Khan Traders"
                      className="bg-slate-50 dark:bg-slate-950"
                      value={formData.business_name} 
                      onChange={(e) => setFormData({...formData, business_name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                    <Input 
                      placeholder="+92 XXX XXXXXXX"
                      className="bg-slate-50 dark:bg-slate-950"
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                  <Input 
                    placeholder="Store physical address"
                    className="bg-slate-50 dark:bg-slate-950"
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency Symbol</label>
                    <Input 
                      placeholder="Rs, $, £"
                      className="bg-slate-50 dark:bg-slate-950"
                      value={formData.currency_symbol} 
                      onChange={(e) => setFormData({...formData, currency_symbol: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Low Stock Alert</label>
                    <Input 
                      type="number"
                      min="0"
                      className="bg-slate-50 dark:bg-slate-950"
                      value={formData.low_stock_threshold_default} 
                      onChange={(e) => setFormData({...formData, low_stock_threshold_default: Number(e.target.value)})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Receipt Footer Message</label>
                  <Input 
                    placeholder="Thank you for your business!"
                    className="bg-slate-50 dark:bg-slate-950"
                    value={formData.receipt_footer} 
                    onChange={(e) => setFormData({...formData, receipt_footer: e.target.value})} 
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 dark:bg-slate-900/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 p-4 shrink-0 flex justify-end">
            <Button 
              onClick={handleSaveSettings} 
              disabled={updateSettings.isPending || settingsLoading}
              className="gap-2 px-6"
            >
              {updateSettings.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* Right Column: Cloud Backups */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-full">
          <CardHeader className="bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Cloud Backup Integration
            </CardTitle>
            <CardDescription>
              Securely sync your entire database to your personal Google Drive account.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0 bg-white dark:bg-slate-900 flex-1 flex flex-col justify-center items-center">
            {cloudStatusLoading ? (
              <div className="flex justify-center items-center h-full w-full text-slate-400 animate-pulse">Checking connection...</div>
            ) : !cloudStatus?.authorized ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                  <Cloud className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Not Connected</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
                  Connect your Google account to enable automatic daily backups. Your data stays 100% private and is stored safely in your own Google Drive.
                </p>
                <Button onClick={handleCloudAuth} disabled={cloudAuth.isPending} size="lg" className="gap-2 px-8 w-full max-w-xs">
                  {cloudAuth.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                  Connect Google Drive
                </Button>
              </div>
            ) : (
              <div className="p-6 lg:p-8 h-full w-full flex flex-col justify-center max-w-lg mx-auto">
                <div className="flex flex-col gap-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-6 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xl">Connected and Active</span>
                    </div>
                    <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                      Your system is securely linked. Automatic backups run daily in the background.
                    </p>
                    
                    <div className="mt-5 flex flex-col gap-1 text-sm bg-white dark:bg-slate-900 p-3 rounded-md border border-emerald-100 dark:border-emerald-800">
                      <span className="text-slate-500">Last successful backup:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-base">
                        {cloudStatus.lastBackup ? new Date(cloudStatus.lastBackup).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        }) : 'Never'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-2">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={handleCloudUpload} 
                      disabled={cloudUpload.isPending} 
                      className="gap-2 justify-center shadow-sm border-slate-200 hover:bg-slate-50 w-full"
                    >
                      {cloudUpload.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-blue-600" />}
                      Backup Now
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => setCloudRestoreConfirm(true)} 
                      disabled={cloudRestore.isPending || !cloudStatus.lastBackup} 
                      className="gap-2 justify-center shadow-sm border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 w-full"
                    >
                      {cloudRestore.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                      Restore Data
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => setCloudDisconnectConfirm(true)} 
                      disabled={cloudDisconnect.isPending} 
                      className="gap-2 justify-center shadow-sm border-orange-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 w-full text-orange-600"
                    >
                      {cloudDisconnect.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      Disconnect Account
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                  <Info className="w-5 h-5 shrink-0 text-slate-400" />
                  <p className="leading-relaxed text-xs lg:text-sm">
                    <strong>Restoring data</strong> will completely replace your current local database with the snapshot from Google Drive and restart the application.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Third Card: Display & Zoom */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-full">
          <CardHeader className="bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Display & Zoom
            </CardTitle>
            <CardDescription>
              Uniformly scale the entire interface — all proportions stay exactly the same.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-white dark:bg-slate-900 flex-1 flex flex-col justify-center">
            <div className="flex flex-col gap-8 w-full max-w-md mx-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">App Zoom Level</label>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{Math.round(zoomLevel * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.7" 
                  max="1.3" 
                  step="0.05" 
                  value={zoomLevel} 
                  onChange={handleZoomChange}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>70% (Compact)</span>
                  <span>100% (Default)</span>
                  <span>130% (Large)</span>
                </div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed text-center">
                  Drag the slider to adjust the interface size. Everything scales proportionally — your layout stays exactly the same.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 dark:bg-slate-900/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 p-4 shrink-0 flex justify-end gap-3">
            <Button 
              variant="outline"
              onClick={handleResetZoom} 
              className="px-4"
            >
              Reset to 100%
            </Button>
            <Button 
              onClick={handleSaveZoom} 
              className="gap-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="w-4 h-4" /> Save Zoom
            </Button>
          </CardFooter>
        </Card>

      </div>
    </TabsContent>
    )}

      

      <TabsContent value="users" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col">
          <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          <div className="w-full lg:w-1/3 flex flex-col h-full">
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-full">
          <CardHeader className="bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Change Password
            </CardTitle>
            <CardDescription>
              Update your account password.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleChangePassword} className="flex flex-col flex-1 min-h-0">
            <CardContent className="p-6 bg-white dark:bg-slate-900 flex-1 overflow-y-auto space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 p-4 shrink-0 flex justify-end">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* Security Questions Card */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col mt-4">
          <CardHeader className="bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Security Questions
            </CardTitle>
            <CardDescription>
              Set up security questions for password recovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-white dark:bg-slate-900">
            {hasSecurityQuestions ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Security questions are configured. You can update them below.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Security questions are not configured. Set them up to enable password recovery.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 dark:bg-slate-900/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end">
            <Button onClick={() => setShowSecurityQuestionsSetup(true)}>
              {hasSecurityQuestions ? 'Update Security Questions' : 'Set Up Security Questions'}
            </Button>
          </CardFooter>
        </Card>
          </div>
          {isManager && (
            <div className="w-full lg:w-2/3 flex flex-col h-full">
              <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col h-full">
            <CardHeader className="bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <UserCog className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Manage Users
                </CardTitle>
                <CardDescription>
                  Create, disable, or reset passwords for system users.
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddUserOpen(true)}>Add User</Button>
            </CardHeader>
            <CardContent className="p-0 bg-white dark:bg-slate-900 flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">{u.role.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setUserToReset(u)
                          setResetPassValue('')
                        }}>Reset Password</Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setUserToDelete(u)} disabled={u.id === currentUser?.id}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center p-8 text-muted-foreground">No users found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
                    </div>
          )}
        </div>
      </TabsContent>

      {/* ── PRINTER SETTINGS TAB ─────────────────────────────────────────── */}
      {isManager && (
      <TabsContent value="printer" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">

          {/* Left: Configuration */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col">
            <CardHeader className="bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Thermal Printer
              </CardTitle>
              <CardDescription>
                Configure the thermal receipt printer connected to this PC.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-white dark:bg-slate-900 flex-1 space-y-6">

              {/* Windows Printer Name Guide */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">How to find your Windows printer name:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400 text-xs">
                      <li>Open <strong>Control Panel → Devices and Printers</strong></li>
                      <li>Right-click your thermal printer → <strong>Printer Properties</strong></li>
                      <li>Copy the exact name from the top (e.g. <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">EPSON TM-T88V</code>)</li>
                      <li>Paste it in the field below prefixed with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">printer:</code></li>
                    </ol>
                    <p className="mt-2 text-blue-700 dark:text-blue-400 text-xs">
                      Example: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded font-mono">printer:EPSON TM-T88V</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Interface Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    System Printers (Auto-Detected)
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-blue-600 gap-1"
                    onClick={() => fetchSystemPrinters()}
                    disabled={fetchingPrinters}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingPrinters ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
                
                <Select 
                  value={printerConfig.interface.startsWith('printer:') ? printerConfig.interface.replace('printer:', '') : ''} 
                  onValueChange={(val) => setPrinterConfig({ ...printerConfig, interface: `printer:${val}` })}
                >
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Select a connected printer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {systemPrinters.map(p => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.displayName || p.name}
                      </SelectItem>
                    ))}
                    {systemPrinters.length === 0 && (
                      <SelectItem value="none" disabled>No printers found</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                    Manual / Network Interface (Advanced)
                  </label>
                  <Input
                    id="printer-interface"
                    placeholder="e.g.  tcp://192.168.1.100:9100"
                    className="font-mono text-sm bg-slate-50 dark:bg-slate-950"
                    value={printerConfig.interface}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, interface: e.target.value })}
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Select from the dropdown above for USB printers, or manually enter the interface for Network/Advanced setups.
                  </p>
                </div>
              </div>

              {/* Printer Brand */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Printer Brand</label>
                <div className="flex gap-3">
                  {(['EPSON', 'STAR'] as const).map(brand => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setPrinterConfig({ ...printerConfig, type: brand })}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${
                        printerConfig.type === brand
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Width */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Default Paper Width</label>
                <div className="flex gap-3">
                  {([58, 80] as const).map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPrinterConfig({ ...printerConfig, width: w })}
                      className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${
                        printerConfig.width === w
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {w}mm
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">Most common thermal printers use 80mm paper.</p>
              </div>

            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 rounded-b-xl border-t border-slate-100 dark:border-slate-800 p-4 shrink-0 flex justify-end gap-3">
              <Button
                variant="outline"
                className="gap-2"
                disabled={printerTesting || !printerConfig.interface.trim()}
                onClick={async () => {
                  setPrinterTesting(true)
                  setPrinterTestResult(null)
                  // Save first so the backend uses the latest config
                  await window.api.settings.savePrinterConfig(printerConfig)
                  const result = await window.api.settings.testPrint()
                  setPrinterTestResult(result)
                  setPrinterTesting(false)
                }}
              >
                {printerTesting
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Printer className="w-4 h-4" />}
                Test Print
              </Button>
              <Button
                className="gap-2 px-6"
                disabled={printerSaving}
                onClick={async () => {
                  setPrinterSaving(true)
                  try {
                    await window.api.settings.savePrinterConfig(printerConfig)
                    toast({ title: 'Printer settings saved!' })
                  } catch (e: any) {
                    toast({ title: 'Failed to save', description: e.message, variant: 'destructive' })
                  } finally {
                    setPrinterSaving(false)
                  }
                }}
              >
                {printerSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </CardFooter>
          </Card>

          {/* Right: Status & Help */}
          <div className="flex flex-col gap-6">

            {/* Test Result */}
            {printerTestResult && (
              <div className={`rounded-xl border-2 p-5 flex items-start gap-3 ${
                printerTestResult.success
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700'
                  : 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700'
              }`}>
                {printerTestResult.success
                  ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-semibold ${
                    printerTestResult.success ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'
                  }`}>
                    {printerTestResult.success ? '✅ Printer Working!' : '❌ Print Failed'}
                  </p>
                  {printerTestResult.error && (
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">{printerTestResult.error}</p>
                  )}
                  {printerTestResult.success && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                      A test receipt was printed successfully. Your printer is ready.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Common Errors Guide */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 bg-white dark:bg-slate-900 rounded-t-xl border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Troubleshooting
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 bg-white dark:bg-slate-900 rounded-b-xl space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">❌ "Printer not configured"</p>
                  <p className="text-slate-500 mt-0.5">Enter the printer interface string and click Save first.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">❌ "Printer name not found"</p>
                  <p className="text-slate-500 mt-0.5">Make sure the name in the field exactly matches the Windows printer name. Check spelling and spacing.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">❌ Printer is offline / paper jam</p>
                  <p className="text-slate-500 mt-0.5">Check USB cable, power, and paper. Try turning the printer off and on.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">✅ Finding the correct printer name</p>
                  <ol className="list-decimal list-inside text-slate-500 mt-0.5 space-y-0.5 text-xs">
                    <li>Press <kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">Win + R</kbd> → type <code>control printers</code> → Enter</li>
                    <li>Your printer's name appears below its icon</li>
                    <li>Use exactly: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">printer:EXACT NAME HERE</code></li>
                  </ol>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5" /> Using a Network Printer instead?
                  </p>
                  <p className="text-slate-500 mt-0.5 text-xs">
                    Enter: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">tcp://192.168.1.100:9100</code><br />
                    Replace the IP with your printer's actual network IP address.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </TabsContent>
      )}

      {/* Dialogs */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({...newUser, role: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createUser.isPending}>Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password for {userToReset?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" value={resetPassValue} onChange={e => setResetPassValue(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserToReset(null)}>Cancel</Button>
              <Button type="submit" disabled={resetPassword.isPending}>Reset Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog 
        open={!!userToDelete} 
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Delete User"
        description={`Are you sure you want to delete ${userToDelete?.username}? They will no longer be able to log in.`}
        confirmText="Delete User"
        destructive={true}
        onConfirm={() => {
          if (userToDelete) {
            deleteUser.mutate(userToDelete.id, {
              onSuccess: () => {
                toast({ title: 'User deleted successfully' })
                setUserToDelete(null)
              }
            })
          }
        }}
      />

      {/* Security Questions Setup Dialog */}
      <Dialog open={showSecurityQuestionsSetup} onOpenChange={setShowSecurityQuestionsSetup}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {hasSecurityQuestions ? 'Update Security Questions' : 'Set Up Security Questions'}
            </DialogTitle>
          </DialogHeader>
          {currentUser?.id && (
            <SecurityQuestionsSetup
              userId={currentUser.id}
              onComplete={() => {
                setShowSecurityQuestionsSetup(false)
                setHasSecurityQuestions(true)
                toast({ title: 'Security questions saved successfully!' })
              }}
              onSkip={() => {
                setShowSecurityQuestionsSetup(false)
              }}
              isOptional={true}
            />
          )}
        </DialogContent>
      </Dialog>
    <ConfirmDialog 
        open={cloudRestoreConfirm} 
        onOpenChange={setCloudRestoreConfirm}
        title="Restore from Cloud"
        description="Are you sure you want to restore from Google Drive? This will overwrite your current local data and restart the application."
        onConfirm={() => {
          handleCloudRestore()
          setCloudRestoreConfirm(false)
        }}
      />
      <ConfirmDialog 
        open={cloudDisconnectConfirm} 
        onOpenChange={setCloudDisconnectConfirm}
        title="Disconnect Google Drive"
        description="Are you sure you want to disconnect Google Drive? You will need to re-authenticate to use cloud backups again."
        onConfirm={() => {
          handleCloudDisconnect()
          setCloudDisconnectConfirm(false)
        }}
      />
    </Tabs>
  )
}
