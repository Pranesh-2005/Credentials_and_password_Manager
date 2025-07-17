import CryptoJS from "crypto-js"

export const hashKey = (key: string): string => {
  return CryptoJS.SHA256(key).toString()
}

export const encrypt = (text: string, key: string): string => {
  return CryptoJS.AES.encrypt(text, key).toString()
}

export const decrypt = (ciphertext: string, key: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    return "[Decryption Failed]"
  }
}
