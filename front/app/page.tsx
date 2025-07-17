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
import { Shield, Key, Info, Globe, User, Lock, Plus, Edit, Trash2, Copy, Eye, EyeOff, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { encrypt, decrypt, hashKey } from "@/lib/crypto"

interface InfoItem {
  name: string
  value: string
}

interface Credential {
  site: string
  user: string
  pass: string
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

  // Form states
  const [newInfo, setNewInfo] = useState({ name: "", value: "" })
  const [newCred, setNewCred] = useState({ site: "", user: "", pass: "" })

  useEffect(() => {
    if (isUnlocked) {
      loadInformation()
      loadCredentials()
    }
  }, [isUnlocked, masterKey])

  const handleUnlock = () => {
    if (!masterPassword) {
      toast({
        title: "Error",
        description: "Please enter your master password",
        variant: "destructive",
      })
      return
    }

    const hashedInput = hashKey(masterPassword)
    const storedHash = localStorage.getItem("masterHash")

    if (!storedHash) {
      localStorage.setItem("masterHash", hashedInput)
      toast({
        title: "Success",
        description: "Master password set successfully!",
      })
    } else if (storedHash !== hashedInput) {
      toast({
        title: "Error",
        description: "Incorrect master password",
        variant: "destructive",
      })
      return
    }

    setMasterKey(masterPassword)
    setIsUnlocked(true)
    toast({
      title: "Welcome",
      description: "Vault unlocked successfully!",
    })
  }

  const loadInformation = () => {
    const data = JSON.parse(localStorage.getItem("information") || "{}")
    const items: InfoItem[] = Object.keys(data).map((name) => ({
      name,
      value: decrypt(data[name], masterKey),
    }))
    setInformation(items)
  }

  const loadCredentials = () => {
    const data = JSON.parse(localStorage.getItem("credentials") || "[]")
    const items: Credential[] = data.map((cred: any) => ({
      site: cred.site,
      user: decrypt(cred.user, masterKey),
      pass: decrypt(cred.pass, masterKey),
    }))
    setCredentials(items)
  }

  const addInformation = () => {
    if (!newInfo.name || !newInfo.value) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const data = JSON.parse(localStorage.getItem("information") || "{}")
    data[newInfo.name] = encrypt(newInfo.value, masterKey)
    localStorage.setItem("information", JSON.stringify(data))

    setNewInfo({ name: "", value: "" })
    setIsAddInfoOpen(false)
    loadInformation()
    toast({
      title: "Success",
      description: "Information added successfully!",
    })
  }

  const addCredential = () => {
    if (!newCred.site || !newCred.user || !newCred.pass) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    const data = JSON.parse(localStorage.getItem("credentials") || "[]")
    data.push({
      site: newCred.site,
      user: encrypt(newCred.user, masterKey),
      pass: encrypt(newCred.pass, masterKey),
    })
    localStorage.setItem("credentials", JSON.stringify(data))

    setNewCred({ site: "", user: "", pass: "" })
    setIsAddCredOpen(false)
    loadCredentials()
    toast({
      title: "Success",
      description: "Credential added successfully!",
    })
  }

  const deleteInformation = (index: number) => {
    const data = JSON.parse(localStorage.getItem("information") || "{}")
    delete data[information[index].name]
    localStorage.setItem("information", JSON.stringify(data))
    loadInformation()
    toast({
      title: "Success",
      description: "Information deleted successfully!",
    })
  }

  const deleteCredential = (index: number) => {
    const data = JSON.parse(localStorage.getItem("credentials") || "[]")
    data.splice(index, 1)
    localStorage.setItem("credentials", JSON.stringify(data))
    loadCredentials()
    toast({
      title: "Success",
      description: "Credential deleted successfully!",
    })
  }

  const updateInformation = () => {
    if (!editingInfo || !editingInfo.item.name || !editingInfo.item.value) return

    const data = JSON.parse(localStorage.getItem("information") || "{}")
    delete data[information[editingInfo.index].name] // Remove old key
    data[editingInfo.item.name] = encrypt(editingInfo.item.value, masterKey)
    localStorage.setItem("information", JSON.stringify(data))

    setEditingInfo(null)
    loadInformation()
    toast({
      title: "Success",
      description: "Information updated successfully!",
    })
  }

  const updateCredential = () => {
    if (!editingCred) return

    const data = JSON.parse(localStorage.getItem("credentials") || "[]")
    data[editingCred.index] = {
      site: editingCred.item.site,
      user: encrypt(editingCred.item.user, masterKey),
      pass: encrypt(editingCred.item.pass, masterKey),
    }
    localStorage.setItem("credentials", JSON.stringify(data))

    setEditingCred(null)
    loadCredentials()
    toast({
      title: "Success",
      description: "Credential updated successfully!",
    })
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    })
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

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Secure Vault</CardTitle>
            <CardDescription>Enter your master password to unlock your vault</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="master-password">Master Password</Label>
              <Input
                id="master-password"
                type="password"
                placeholder="Enter your master password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleUnlock()}
              />
            </div>
            <Button onClick={handleUnlock} className="w-full">
              <Key className="w-4 h-4 mr-2" />
              Unlock Vault
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Secure Vault</h1>
                <p className="text-gray-600">Your encrypted personal data manager</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setIsUnlocked(false)
                setMasterKey("")
                setMasterPassword("")
              }}
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock Vault
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search your vault..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="information" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="information" className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Information</span>
              <Badge variant="secondary">{filteredInformation.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>Credentials</span>
              <Badge variant="secondary">{filteredCredentials.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <Dialog open={isAddInfoOpen} onOpenChange={setIsAddInfoOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Information
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Information</DialogTitle>
                    <DialogDescription>Store encrypted personal information securely.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="info-name">Name</Label>
                      <Input
                        id="info-name"
                        placeholder="e.g., Aadhaar, Passport, etc."
                        value={newInfo.name}
                        onChange={(e) => setNewInfo({ ...newInfo, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="info-value">Value</Label>
                      <Input
                        id="info-value"
                        placeholder="Enter the value"
                        value={newInfo.value}
                        onChange={(e) => setNewInfo({ ...newInfo, value: e.target.value })}
                      />
                    </div>
                    <Button onClick={addInformation} className="w-full">
                      Add Information
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {filteredInformation.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Info className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-center">
                      {searchTerm
                        ? "No information found matching your search."
                        : "No information stored yet. Add some to get started!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredInformation.map((item, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          <p className="text-gray-600 mt-1 font-mono">{item.value}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(item.value, item.name)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingInfo({ index, item: { ...item } })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteInformation(index)}>
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

          <TabsContent value="credentials" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Login Credentials</h2>
              <Dialog open={isAddCredOpen} onOpenChange={setIsAddCredOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Credential
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Credential</DialogTitle>
                    <DialogDescription>Store website login credentials securely.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cred-site">Website</Label>
                      <Input
                        id="cred-site"
                        placeholder="e.g., google.com"
                        value={newCred.site}
                        onChange={(e) => setNewCred({ ...newCred, site: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cred-user">Username/Email</Label>
                      <Input
                        id="cred-user"
                        placeholder="Enter username or email"
                        value={newCred.user}
                        onChange={(e) => setNewCred({ ...newCred, user: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cred-pass">Password</Label>
                      <Input
                        id="cred-pass"
                        type="password"
                        placeholder="Enter password"
                        value={newCred.pass}
                        onChange={(e) => setNewCred({ ...newCred, pass: e.target.value })}
                      />
                    </div>
                    <Button onClick={addCredential} className="w-full">
                      Add Credential
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {filteredCredentials.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-center">
                      {searchTerm
                        ? "No credentials found matching your search."
                        : "No credentials stored yet. Add some to get started!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredCredentials.map((cred, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center">
                            <Globe className="w-4 h-4 mr-2" />
                            {cred.site}
                          </h3>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">Username:</span>
                              <span className="font-mono">{cred.user}</span>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(cred.user, "Username")}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Lock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">Password:</span>
                              <span className="font-mono">{showPasswords[index] ? cred.pass : "••••••••"}</span>
                              <Button variant="ghost" size="sm" onClick={() => togglePasswordVisibility(index)}>
                                {showPasswords[index] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(cred.pass, "Password")}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCred({ index, item: { ...cred } })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteCredential(index)}>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Information</DialogTitle>
              <DialogDescription>Update your stored information.</DialogDescription>
            </DialogHeader>
            {editingInfo && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-info-name">Name</Label>
                  <Input
                    id="edit-info-name"
                    value={editingInfo.item.name}
                    onChange={(e) =>
                      setEditingInfo({
                        ...editingInfo,
                        item: { ...editingInfo.item, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-info-value">Value</Label>
                  <Input
                    id="edit-info-value"
                    value={editingInfo.item.value}
                    onChange={(e) =>
                      setEditingInfo({
                        ...editingInfo,
                        item: { ...editingInfo.item, value: e.target.value },
                      })
                    }
                  />
                </div>
                <Button onClick={updateInformation} className="w-full">
                  Update Information
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Credential Dialog */}
        <Dialog open={!!editingCred} onOpenChange={() => setEditingCred(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Credential</DialogTitle>
              <DialogDescription>Update your stored credential.</DialogDescription>
            </DialogHeader>
            {editingCred && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cred-site">Website</Label>
                  <Input
                    id="edit-cred-site"
                    value={editingCred.item.site}
                    onChange={(e) =>
                      setEditingCred({
                        ...editingCred,
                        item: { ...editingCred.item, site: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cred-user">Username/Email</Label>
                  <Input
                    id="edit-cred-user"
                    value={editingCred.item.user}
                    onChange={(e) =>
                      setEditingCred({
                        ...editingCred,
                        item: { ...editingCred.item, user: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cred-pass">Password</Label>
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
                  />
                </div>
                <Button onClick={updateCredential} className="w-full">
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
