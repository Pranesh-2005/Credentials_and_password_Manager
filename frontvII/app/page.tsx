"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  Key,
  Info,
  Globe,
  User,
  Lock,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Search,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { encrypt, decrypt, hashKey } from "@/lib/crypto"
import { saveVaultFile, loadVaultFile, initializeFileSystem, selectVaultFile, clearVaultFile } from "@/lib/file-system"

interface InfoItem {
  name: string
  value: string
}

interface Credential {
  site: string
  user: string
  pass: string
}

interface VaultData {
  masterHash: string
  information: { [key: string]: string }
  credentials: Array<{
    site: string
    user: string
    pass: string
  }>
}

export default function SecureVault() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [masterPassword, setMasterPassword] = useState("")
  const [masterKey, setMasterKey] = useState("")
  const [information, setInformation] = useState<InfoItem[]>([])
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddInfoOpen, setIsAddInfoOpen] = useState(false)
  const [isAddCredOpen, setIsAddCredOpen] = useState(false)
  const [editingInfo, setEditingInfo] = useState<{ index: number; item: InfoItem } | null>(null)
  const [editingCred, setEditingCred] = useState<{ index: number; item: Credential } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasVaultFile, setHasVaultFile] = useState(false)
  const [fileSystemSupported, setFileSystemSupported] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Form states
  const [newInfo, setNewInfo] = useState({ name: "", value: "" })
  const [newCred, setNewCred] = useState({ site: "", user: "", pass: "" })

  useEffect(() => {
    const initializeAndMount = async () => {
      setIsMounted(true)
      await initializeApp()
    }
    initializeAndMount()
  }, [])

  useEffect(() => {
    if (isUnlocked && isMounted) {
      loadInformation()
      loadCredentials()
    }
  }, [isUnlocked, masterKey, isMounted])

  const initializeApp = async () => {
    setIsLoading(true)

    // Check if File System Access API is supported (client-side only)
    if (typeof window !== 'undefined') {
      const supported = "showOpenFilePicker" in window
      setFileSystemSupported(supported)
    }

    try {
      await initializeFileSystem()
      const vaultData = await loadVaultFile()

      if (vaultData) {
        setHasVaultFile(true)
        // Store the loaded data temporarily until user unlocks
        if (typeof window !== 'undefined') {
          localStorage.setItem("tempVaultData", JSON.stringify(vaultData))
        }
        toast({
          title: "Vault Found",
          description: "Existing vault file loaded successfully",
        })
      }
    } catch (error) {
      console.log("No existing vault file found or error loading:", error)
      setHasVaultFile(false)
    }

    setIsLoading(false)
  }

  const handleSelectExistingFile = async () => {
    try {
      const vaultData = await selectVaultFile()
      
      if (vaultData) {
        setHasVaultFile(true)
        // Store the loaded data temporarily until user unlocks
        if (typeof window !== 'undefined') {
          localStorage.setItem("tempVaultData", JSON.stringify(vaultData))
        }
        toast({
          title: "Success",
          description: "Vault file selected successfully! Enter your password to unlock.",
        })
      }
    } catch (error) {
      console.log("User cancelled file selection or error:", error)
    }
  }

  const saveVaultData = async () => {
    if (!masterKey) return

    setIsSaving(true)

    try {
      const vaultData: VaultData = {
        masterHash: hashKey(masterKey),
        information: {},
        credentials: [],
      }

      // Encrypt and store information
      information.forEach((item) => {
        vaultData.information[item.name] = encrypt(item.value, masterKey)
      })

      // Encrypt and store credentials
      vaultData.credentials = credentials.map((cred) => ({
        site: cred.site,
        user: encrypt(cred.user, masterKey),
        pass: encrypt(cred.pass, masterKey),
      }))

      await saveVaultFile(vaultData)
      setHasVaultFile(true)

      toast({
        title: "Success",
        description: "Vault saved successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save vault file",
        variant: "destructive",
      })
    }

    setIsSaving(false)
  }

  const exportVaultData = async () => {
    if (!masterKey) return

    setIsSaving(true)

    try {
      const vaultData: VaultData = {
        masterHash: hashKey(masterKey),
        information: {},
        credentials: [],
      }

      // Encrypt and store information
      information.forEach((item) => {
        vaultData.information[item.name] = encrypt(item.value, masterKey)
      })

      // Encrypt and store credentials
      vaultData.credentials = credentials.map((cred) => ({
        site: cred.site,
        user: encrypt(cred.user, masterKey),
        pass: encrypt(cred.pass, masterKey),
      }))

      // First save to the main vault file
      await saveVaultFile(vaultData)
      setHasVaultFile(true)

      // Then create a backup/export file (client-side only)
      if (typeof window !== 'undefined') {
        const dataStr = JSON.stringify(vaultData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `vault-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      toast({
        title: "Success",
        description: "Vault exported successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export vault file",
        variant: "destructive",
      })
    }

    setIsSaving(false)
  }

  const handleUnlock = async () => {
    if (!masterPassword) {
      toast({
        title: "Error",
        description: "Please enter your master password",
        variant: "destructive",
      })
      return
    }

    const hashedInput = hashKey(masterPassword)

    // Check if we have a vault file loaded (client-side only)
    const tempVaultData = typeof window !== 'undefined' ? localStorage.getItem("tempVaultData") : null

    if (tempVaultData) {
      const vaultData: VaultData = JSON.parse(tempVaultData)

      if (vaultData.masterHash !== hashedInput) {
        toast({
          title: "Error",
          description: "Incorrect master password",
          variant: "destructive",
        })
        return
      }

      // Set master key first
      setMasterKey(masterPassword)

      // Load data from vault file
      try {
        const infoItems: InfoItem[] = Object.keys(vaultData.information).map((name) => ({
          name,
          value: decrypt(vaultData.information[name], masterPassword),
        }))

        const credItems: Credential[] = vaultData.credentials.map((cred) => ({
          site: cred.site,
          user: decrypt(cred.user, masterPassword),
          pass: decrypt(cred.pass, masterPassword),
        }))

        setInformation(infoItems)
        setCredentials(credItems)
        if (typeof window !== 'undefined') {
          localStorage.removeItem("tempVaultData")
        }

        setIsUnlocked(true)

        toast({
          title: "Welcome Back",
          description: "Vault unlocked successfully!",
        })
      } catch (error) {
        console.error("Decryption error:", error)
        toast({
          title: "Error",
          description: "Failed to decrypt vault data. Please check your password.",
          variant: "destructive",
        })
        return
      }
    } else {
      // New vault - no existing file
      setHasVaultFile(false)
      setInformation([])
      setCredentials([])
      setMasterKey(masterPassword)
      setIsUnlocked(true)
      toast({
        title: "Welcome",
        description: "New vault created successfully!",
      })
    }
  }

  const handleLockVault = async () => {
    try {
      // Save current state before locking
      if (masterKey && (information.length > 0 || credentials.length > 0)) {
        await saveVaultData()
      }

      // Clear vault file reference and reset file system
      if (typeof clearVaultFile === 'function') {
        await clearVaultFile()
      }

      // Clear all sensitive data
      setIsUnlocked(false)
      setMasterKey("")
      setMasterPassword("")
      setInformation([])
      setCredentials([])
      setShowPasswords({})
      setSearchTerm("")
      setEditingInfo(null)
      setEditingCred(null)
      setNewInfo({ name: "", value: "" })
      setNewCred({ site: "", user: "", pass: "" })
      setHasVaultFile(false)

      // Clear any remaining temporary data (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.removeItem("tempVaultData")
      }

      // Reinitialize the app to check for vault files
      await initializeApp()

      toast({
        title: "Vault Locked",
        description: "Your vault has been securely locked and saved.",
      })
    } catch (error) {
      console.error("Error locking vault:", error)
      toast({
        title: "Error",
        description: "Failed to lock vault properly",
        variant: "destructive",
      })
    }
  }

  const loadInformation = () => {
    // Information is already loaded from vault file or empty for new vault
  }

  const loadCredentials = () => {
    // Credentials are already loaded from vault file or empty for new vault
  }

  const addInformation = async () => {
    if (!newInfo.name || !newInfo.value) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const newInformation = [...information, { name: newInfo.name, value: newInfo.value }]
    setInformation(newInformation)

    setNewInfo({ name: "", value: "" })
    setIsAddInfoOpen(false)

    // Only save to vault file, don't export
    await saveVaultData()

    toast({
      title: "Success",
      description: "Information added and saved successfully!",
    })
  }

  const addCredential = async () => {
    if (!newCred.site || !newCred.user || !newCred.pass) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const newCredentials = [...credentials, { ...newCred }]
    setCredentials(newCredentials)

    setNewCred({ site: "", user: "", pass: "" })
    setIsAddCredOpen(false)

    // Only save to vault file, don't export
    await saveVaultData()

    toast({
      title: "Success",
      description: "Credential added and saved successfully!",
    })
  }

  const deleteInformation = async (index: number) => {
    const newInformation = information.filter((_, i) => i !== index)
    setInformation(newInformation)

    await saveVaultData()

    toast({
      title: "Success",
      description: "Information deleted successfully!",
    })
  }

  const deleteCredential = async (index: number) => {
    const newCredentials = credentials.filter((_, i) => i !== index)
    setCredentials(newCredentials)

    await saveVaultData()

    toast({
      title: "Success",
      description: "Credential deleted successfully!",
    })
  }

  const updateInformation = async () => {
    if (!editingInfo || !editingInfo.item.name || !editingInfo.item.value) return

    const newInformation = [...information]
    newInformation[editingInfo.index] = editingInfo.item
    setInformation(newInformation)

    setEditingInfo(null)

    await saveVaultData()

    toast({
      title: "Success",
      description: "Information updated successfully!",
    })
  }

  const updateCredential = async () => {
    if (!editingCred) return

    const newCredentials = [...credentials]
    newCredentials[editingCred.index] = editingCred.item
    setCredentials(newCredentials)

    setEditingCred(null)

    await saveVaultData()

    toast({
      title: "Success",
      description: "Credential updated successfully!",
    })
  }

  const copyToClipboard = (text: string, type: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      })
    }
  }

  const togglePasswordVisibility = (index: number) => {
    setShowPasswords((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const filteredInformation = information.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredCredentials = credentials.filter(
    (cred) =>
      cred.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.user.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Show nothing until fully mounted to prevent hydration mismatch
  if (!isMounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-4" />
            <p className="text-gray-600 text-center">Loading your secure vault...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Secure Vault
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                {hasVaultFile ? "Welcome back! Enter your master password" : "Create your secure vault"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!fileSystemSupported && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    File system access not supported. Data will be stored locally in your browser.
                  </AlertDescription>
                </Alert>
              )}

              {hasVaultFile && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Vault file found! Enter your master password to unlock.
                  </AlertDescription>
                </Alert>
              )}

              {fileSystemSupported && !hasVaultFile && (
                <div className="space-y-3">
                  <Button
                    onClick={handleSelectExistingFile}
                    variant="outline"
                    className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Select Existing Vault File
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">or</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="master-password" className="text-gray-700 font-medium">
                  Master Password
                </Label>
                <Input
                  id="master-password"
                  type="password"
                  placeholder="Enter your master password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  className="h-12 border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                />
              </div>
              <Button
                onClick={handleUnlock}
                className="w-full h-12 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Key className="w-5 h-5 mr-2" />
                {hasVaultFile ? "Unlock Vault" : "Create Vault"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Secure Vault
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">Your encrypted personal data manager</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => saveVaultData()}
                disabled={isSaving}
                className="border-violet-200 text-violet-700 hover:bg-violet-50 bg-transparent"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={exportVaultData}
                disabled={isSaving}
                className="border-green-200 text-green-700 hover:bg-green-50 bg-transparent"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Export
              </Button>
              <Button
                variant="outline"
                onClick={handleLockVault}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Lock className="w-4 h-4 mr-2" />
                Lock
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search your vault..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 border-gray-200 focus:border-violet-500 focus:ring-violet-500 bg-white/80 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="information" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg p-1">
            <TabsTrigger
              value="information"
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Information</span>
              <span className="sm:hidden">Info</span>
              <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                {filteredInformation.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="credentials"
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Credentials</span>
              <span className="sm:hidden">Creds</span>
              <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                {filteredCredentials.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Information Tab */}
          <TabsContent value="information" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-800">Personal Information</h2>
              <Dialog open={isAddInfoOpen} onOpenChange={setIsAddInfoOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Information
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-800">Add New Information</DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Store encrypted personal information securely.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="info-name" className="text-gray-700 font-medium">
                        Name
                      </Label>
                      <Input
                        id="info-name"
                        placeholder="e.g., Aadhaar, Passport, etc."
                        value={newInfo.name}
                        onChange={(e) => setNewInfo({ ...newInfo, name: e.target.value })}
                        className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="info-value" className="text-gray-700 font-medium">
                        Value
                      </Label>
                      <Input
                        id="info-value"
                        placeholder="Enter the value"
                        value={newInfo.value}
                        onChange={(e) => setNewInfo({ ...newInfo, value: e.target.value })}
                        className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <Button
                      onClick={addInformation}
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                    >
                      Add Information
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {filteredInformation.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                      <Info className="w-8 h-8 text-violet-500" />
                    </div>
                    <p className="text-gray-500 text-center text-lg">
                      {searchTerm
                        ? "No information found matching your search."
                        : "No information stored yet. Add some to get started!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredInformation.map((item, index) => (
                  <Card
                    key={index}
                    className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-800 mb-2">{item.name}</h3>
                          <p className="text-gray-600 font-mono text-sm sm:text-base break-all bg-gray-50 p-3 rounded-lg">
                            {item.value}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(item.value, item.name)}
                            className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingInfo({ index, item: { ...item } })}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInformation(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-800">Login Credentials</h2>
              <Dialog open={isAddCredOpen} onOpenChange={setIsAddCredOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Credential
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-800">Add New Credential</DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Store website login credentials securely.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cred-site" className="text-gray-700 font-medium">
                        Website
                      </Label>
                      <Input
                        id="cred-site"
                        placeholder="e.g., google.com"
                        value={newCred.site}
                        onChange={(e) => setNewCred({ ...newCred, site: e.target.value })}
                        className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cred-user" className="text-gray-700 font-medium">
                        Username/Email
                      </Label>
                      <Input
                        id="cred-user"
                        placeholder="Enter username or email"
                        value={newCred.user}
                        onChange={(e) => setNewCred({ ...newCred, user: e.target.value })}
                        className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cred-pass" className="text-gray-700 font-medium">
                        Password
                      </Label>
                      <Input
                        id="cred-pass"
                        type="password"
                        placeholder="Enter password"
                        value={newCred.pass}
                        onChange={(e) => setNewCred({ ...newCred, pass: e.target.value })}
                        className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>
                    <Button
                      onClick={addCredential}
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                    >
                      Add Credential
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {filteredCredentials.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                      <Globe className="w-8 h-8 text-violet-500" />
                    </div>
                    <p className="text-gray-500 text-center text-lg">
                      {searchTerm
                        ? "No credentials found matching your search."
                        : "No credentials stored yet. Add some to get started!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredCredentials.map((cred, index) => (
                  <Card
                    key={index}
                    className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 w-full">
                          <h3 className="font-bold text-lg flex items-center text-gray-800 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-violet-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                              <Globe className="w-4 h-4 text-violet-600" />
                            </div>
                            <span className="truncate">{cred.site}</span>
                          </h3>
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 flex-shrink-0">Username:</span>
                                <span className="font-mono text-sm truncate">{cred.user}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(cred.user, "Username")}
                                className="text-violet-600 hover:text-violet-700 hover:bg-violet-100 flex-shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 flex-shrink-0">Password:</span>
                                <span className="font-mono text-sm truncate">
                                  {showPasswords[index] ? cred.pass : "••••••••"}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePasswordVisibility(index)}
                                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-200"
                                >
                                  {showPasswords[index] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(cred.pass, "Password")}
                                  className="text-violet-600 hover:text-violet-700 hover:bg-violet-100"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCred({ index, item: { ...cred } })}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCredential(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Information Dialog */}
        <Dialog open={!!editingInfo} onOpenChange={() => setEditingInfo(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">Edit Information</DialogTitle>
              <DialogDescription className="text-gray-600">Update your stored information.</DialogDescription>
            </DialogHeader>
            {editingInfo && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-info-name" className="text-gray-700 font-medium">
                    Name
                  </Label>
                  <Input
                    id="edit-info-name"
                    value={editingInfo.item.name}
                    onChange={(e) =>
                      setEditingInfo({
                        ...editingInfo,
                        item: { ...editingInfo.item, name: e.target.value },
                      })
                    }
                    className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-info-value" className="text-gray-700 font-medium">
                    Value
                  </Label>
                  <Input
                    id="edit-info-value"
                    value={editingInfo.item.value}
                    onChange={(e) =>
                      setEditingInfo({
                        ...editingInfo,
                        item: { ...editingInfo.item, value: e.target.value },
                      })
                    }
                    className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
                <Button
                  onClick={updateInformation}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  Update Information
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Credential Dialog */}
        <Dialog open={!!editingCred} onOpenChange={() => setEditingCred(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">Edit Credential</DialogTitle>
              <DialogDescription className="text-gray-600">Update your stored credential.</DialogDescription>
            </DialogHeader>
            {editingCred && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cred-site" className="text-gray-700 font-medium">
                    Website
                  </Label>
                  <Input
                    id="edit-cred-site"
                    value={editingCred.item.site}
                    onChange={(e) =>
                      setEditingCred({
                        ...editingCred,
                        item: { ...editingCred.item, site: e.target.value },
                      })
                    }
                    className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cred-user" className="text-gray-700 font-medium">
                    Username/Email
                  </Label>
                  <Input
                    id="edit-cred-user"
                    value={editingCred.item.user}
                    onChange={(e) =>
                      setEditingCred({
                        ...editingCred,
                        item: { ...editingCred.item, user: e.target.value },
                      })
                    }
                    className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cred-pass" className="text-gray-700 font-medium">
                    Password
                  </Label>
                  <Input
                    id="edit-cred-pass"
                    type="password"
                    value={editingCred.item.pass}
                    onChange={(e) =>
                      setEditingCred({
                        ...editingCred,
                        item: { ...editingCred.item, pass: e.target.value },
                      })
                    }
                    className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
                <Button
                  onClick={updateCredential}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  Update Credential
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}