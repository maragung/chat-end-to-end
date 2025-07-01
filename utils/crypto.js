import CryptoJS from "crypto-js"

export function encrypt(text, key) {
  return CryptoJS.AES.encrypt(text, key).toString()
}

export function decrypt(ciphertext, key) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch {
    return '[FAILED TO DECRYPT]'
  }
}

export function randomString(len = 32) {
  const chars = 'mnbvcxzasdfgh098765ASDFGHJKLKLMNBVCXZQWERTYUIOIOP4321jklpoiuytrewq'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function exportChat(messages) {
  const text = messages.map(m => `${m.from}: ${m.text || m.file?.name || '[file]'}`).join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chat.txt'
  a.click()
  URL.revokeObjectURL(url)
}

export function readableFileSize(size) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  return (size / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

export function md5sum(data) {
  return CryptoJS.MD5(data).toString();
}