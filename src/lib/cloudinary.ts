export interface UploadOptions {
  cloudName: string
  uploadPreset?: string
  folder?: string
  publicId?: string
  // Signed params (if you implement server signature):
  timestamp?: number
  signature?: string
  apiKey?: string
}

export async function uploadImageBlobToCloudinary(blob: Blob, opts: UploadOptions) {
  const { cloudName, uploadPreset, folder, publicId, timestamp, signature, apiKey } = opts
  if (!cloudName) throw new Error('Missing Cloudinary cloudName')

  const fd = new FormData()
  const filename = `${publicId || 'snapshot'}-${Date.now()}.jpg`
  fd.append('file', blob, filename)
  if (uploadPreset) fd.append('upload_preset', uploadPreset)
  if (folder) fd.append('folder', folder)
  if (timestamp) fd.append('timestamp', String(timestamp))
  if (signature) fd.append('signature', signature)
  if (apiKey) fd.append('api_key', apiKey)

  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`
  const res = await fetch(url, { method: 'POST', body: fd })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<{
    secure_url: string
    url: string
    public_id: string
    [k: string]: any
  }>
}