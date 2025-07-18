interface VaultData {
  masterHash: string
  information: { [key: string]: string }
  credentials: Array<{
    site: string
    user: string
    pass: string
  }>
}

let fileHandle: FileSystemFileHandle | null = null

// IndexedDB utilities
const DB_NAME = "SecureVaultDB"
const DB_VERSION = 1
const STORE_NAME = "fileHandles"

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

const saveFileHandleToIndexedDB = async (handle: FileSystemFileHandle) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    await store.put(handle, "vaultFileHandle")
  } catch (error) {
    console.error("Failed to save file handle to IndexedDB:", error)
  }
}

const getFileHandleFromIndexedDB = async (): Promise<FileSystemFileHandle | null> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get("vaultFileHandle")
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  } catch (error) {
    console.error("Failed to get file handle from IndexedDB:", error)
    return null
  }
}

export const initializeFileSystem = async () => {
  if (!("showOpenFilePicker" in window)) {
    console.log("File System Access API not supported")
    return
  }

  try {
    // Try to get existing file handle from IndexedDB
    fileHandle = await getFileHandleFromIndexedDB()

    if (fileHandle) {
      // Just check permission, don't request it automatically
      const permission = await fileHandle.queryPermission({ mode: "readwrite" })
      if (permission !== "granted") {
        // Don't request permission automatically - clear the handle instead
        fileHandle = null
      }
    }
  } catch (error) {
    console.error("Error initializing file system:", error)
    fileHandle = null
  }
}

export const saveVaultFile = async (data: VaultData) => {
  if (!("showSaveFilePicker" in window)) {
    // Fallback to localStorage for unsupported browsers
    localStorage.setItem("vaultData", JSON.stringify(data))
    return
  }

  try {
    if (!fileHandle) {
      // Create new file (this requires user gesture)
      fileHandle = await window.showSaveFilePicker({
        suggestedName: "vault.dat",
        types: [
          {
            description: "Vault data files",
            accept: { "application/octet-stream": [".dat"] },
          },
        ],
      })

      // Save handle to IndexedDB
      await saveFileHandleToIndexedDB(fileHandle)
    }

    // Write data to file
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.error("Error saving vault file:", error)
      throw error
    }
  }
}

// Load from existing file handle (no user gesture needed)
export const loadVaultFile = async (): Promise<VaultData | null> => {
  if (!("showOpenFilePicker" in window)) {
    // Fallback to localStorage for unsupported browsers
    const data = localStorage.getItem("vaultData")
    return data ? JSON.parse(data) : null
  }

  try {
    if (fileHandle) {
      // Check if we still have permission
      const permission = await fileHandle.queryPermission({ mode: "readwrite" })
      if (permission === "granted") {
        // Read data from existing file handle
        const file = await fileHandle.getFile()
        const contents = await file.text()
        return JSON.parse(contents)
      } else {
        // No permission, clear the handle
        fileHandle = null
        return null
      }
    }
    
    // No file handle available, return null
    return null
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.error("Error loading vault file:", error)
    }
    return null
  }
}

// Separate function for user-initiated file selection
export const selectVaultFile = async (): Promise<VaultData | null> => {
  if (!("showOpenFilePicker" in window)) {
    // Fallback to localStorage for unsupported browsers
    const data = localStorage.getItem("vaultData")
    return data ? JSON.parse(data) : null
  }

  try {
    // This requires user gesture
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "Vault data files",
          accept: { "application/octet-stream": [".dat"] },
        },
      ],
    })

    fileHandle = handle
    await saveFileHandleToIndexedDB(fileHandle)

    // Read data from file
    const file = await fileHandle.getFile()
    const contents = await file.text()
    return JSON.parse(contents)
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.error("Error selecting vault file:", error)
    }
    return null
  }
}

// Request permission for existing file handle (requires user gesture)
export const requestFilePermission = async (): Promise<boolean> => {
  if (!fileHandle) return false

  try {
    const permission = await fileHandle.requestPermission({ mode: "readwrite" })
    return permission === "granted"
  } catch (error) {
    console.error("Error requesting file permission:", error)
    return false
  }
}

// Check if we have an existing file handle
export const hasExistingVaultFile = async (): Promise<boolean> => {
  if (!fileHandle) {
    fileHandle = await getFileHandleFromIndexedDB()
  }
  return fileHandle !== null
}

// Clear the current file handle
export const clearFileHandle = () => {
  fileHandle = null
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    showOpenFilePicker: (options?: {
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle[]>

    showSaveFilePicker: (options?: {
      suggestedName?: string
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle>
  }
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
  queryPermission(options?: { mode?: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">
  requestPermission(options?: { mode?: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">
}

interface FileSystemWritableFileStream {
  write(data: string | BufferSource | Blob): Promise<void>
  close(): Promise<void>
}
// Add this function to your existing file-system.ts

export const clearVaultFile = async (): Promise<void> => {
  try {
    // Clear the file handle
    fileHandle = null
    
    // Clear file handle from IndexedDB
    if (typeof window !== 'undefined') {
      try {
        const db = await openDB()
        const transaction = db.transaction([STORE_NAME], "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        await store.delete("vaultFileHandle")
      } catch (error) {
        console.error("Failed to clear file handle from IndexedDB:", error)
      }
    }
    
    // Clear any cached vault data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tempVaultData')
      localStorage.removeItem('vaultData') // Also clear fallback data
    }
    
    console.log('Vault file reference cleared')
  } catch (error) {
    console.error('Error clearing vault file:', error)
    throw error
  }
}