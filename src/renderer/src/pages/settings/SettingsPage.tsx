import { useBusinessSettings, useUpdateBusinessSettings, useCloudBackupStatus, useCloudBackupAuth, useCloudBackupUpload, useCloudBackupRestore } from '../../hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Store, Save, Cloud, RefreshCw, Upload, DownloadCloud, Link, Info } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const { data: settingsData, isLoading: settingsLoading } = useBusinessSettings()
  const updateSettings = useUpdateBusinessSettings()
  
  const { data: cloudStatus, isLoading: cloudStatusLoading } = useCloudBackupStatus()
  const cloudAuth = useCloudBackupAuth()
  const cloudUpload = useCloudBackupUpload()
  const cloudRestore = useCloudBackupRestore()
  
  const [formData, setFormData] = useState({
    business_name: '',
    phone: '',
    address: '',
    currency_symbol: 'Rs',
    receipt_footer: '',
    low_stock_threshold_default: 10
  })

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

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(formData)
      alert('Settings saved successfully!')
    } catch (e: any) {
      alert('Failed to save settings: ' + e.message)
    }
  }

  const handleCloudAuth = async () => {
    try {
      const res = await cloudAuth.mutateAsync()
      if (res.success) {
        alert('Successfully authenticated with Google Drive!')
      } else {
        alert('Authentication failed: ' + res.error)
      }
    } catch (e: any) {
      alert('Error during authentication: ' + e.message)
    }
  }

  const handleCloudUpload = async () => {
    try {
      const res = await cloudUpload.mutateAsync()
      if (res.success) {
        alert('Data successfully backed up to Google Drive!')
      } else {
        alert('Backup failed: ' + res.error)
      }
    } catch (e: any) {
      alert('Error during backup: ' + e.message)
    }
  }

  const handleCloudRestore = async () => {
    if (!confirm('Are you sure you want to restore from Google Drive? This will overwrite your current local data and restart the application.')) {
      return
    }
    try {
      const res = await cloudRestore.mutateAsync()
      if (!res.success) {
        alert('Restore failed: ' + res.error)
      }
    } catch (e: any) {
      alert('Error during restore: ' + e.message)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-6 lg:p-8 bg-slate-50/40 dark:bg-slate-950/20 overflow-hidden">
      
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your store preferences and secure your data with automated cloud backups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        
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
                      onClick={handleCloudRestore} 
                      disabled={cloudRestore.isPending || !cloudStatus.lastBackup} 
                      className="gap-2 justify-center shadow-sm border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 w-full"
                    >
                      {cloudRestore.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                      Restore Data
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

      </div>
    </div>
  )
}
