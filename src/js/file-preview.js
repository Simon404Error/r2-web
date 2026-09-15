import { filesize } from 'filesize'
import { AUDIO_RE, IMAGE_RE, TEXT_RE, VIDEO_RE } from './constants.js'
import { t } from './i18n.js'
import { R2Client } from './r2-client.js'
import { UIManager } from './ui-manager.js'
import { $, formatDate, getErrorMessage, extractFileName, getMimeType } from './utils.js'

class FilePreview {
  /** @type {R2Client} */
  #r2
  /** @type {UIManager} */
  #ui
  #currentKey = ''
  #currentText = ''
  #currentUrl = ''
  /** @type {HTMLImageElement | null} */
  #currentImage = null
  #currentImageLoaded = false

  /** @param {R2Client} r2 @param {UIManager} ui */
  constructor(r2, ui) {
    this.#r2 = r2
    this.#ui = ui
    const dialog = /** @type {HTMLDialogElement} */ ($('#preview-dialog'))
    dialog.addEventListener('close', () => {
      dialog.querySelectorAll('video, audio').forEach((el) => /** @type {HTMLMediaElement} */ (el).pause())
    })
  }

  get currentKey() {
    return this.#currentKey
  }

  /** @param {{key: string, size?: number, lastModified?: number}} item */
  async preview(item) {
    const key = item.key
    this.#currentKey = key
    this.#currentText = ''
    this.#currentUrl = ''
    this.#currentImage = null
    this.#currentImageLoaded = false
    const dialog = /** @type {HTMLDialogElement} */ ($('#preview-dialog'))
    const body = $('#preview-body')
    const footer = $('#preview-footer')
    const filename = $('#preview-filename')
    const copyBtn = /** @type {HTMLElement} */ ($('#preview-copy'))
    const copyTextBtn = /** @type {HTMLElement} */ ($('#preview-copy-text'))
    const copyImageBtn = /** @type {HTMLElement} */ ($('#preview-copy-image'))

    filename.textContent = extractFileName(key)
    body.innerHTML = '<div style="color:var(--text-tertiary)">Loading...</div>'
    footer.innerHTML = ''
    footer.classList.remove('bordered')
    copyBtn.hidden = true
    copyTextBtn.hidden = true
    copyImageBtn.hidden = true
    dialog.showModal()

    try {
      let realContentType = getMimeType(key)
      try {
        const head = await this.#r2.headObject(key)
        if (head.contentType) realContentType = head.contentType
      } catch {}

      const meta = {
        contentLength: item.size ?? 0,
        contentType: realContentType,
        lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
      }

      footer.classList.add('bordered')
      footer.innerHTML = `
        <span>${t('size')}: ${filesize(meta.contentLength)}</span>
        <span>${t('contentType')}: ${meta.contentType || 'unknown'}</span>
        ${meta.lastModified ? `<span>${t('lastModified')}: ${formatDate(meta.lastModified)}</span>` : ''}
      `

      if (IMAGE_RE.test(key)) {
        const url = this.#r2.getPublicUrl(key) ?? (await this.#r2.getPresignedUrl(key))
        this.#currentUrl = url
        body.innerHTML = ''
        const img = document.createElement('img')
        this.#currentImage = img
        img.addEventListener(
          'load',
          () => {
            if (this.#currentImage === img) this.#currentImageLoaded = true
          },
          { once: true },
        )
        img.addEventListener(
          'error',
          () => {
            if (this.#currentImage === img) this.#currentImageLoaded = false
          },
          { once: true },
        )
        img.src = url
        img.alt = extractFileName(key)
        body.appendChild(img)
        copyImageBtn.dataset.tooltip = t('copyImage')
        copyImageBtn.hidden = false
        copyBtn.dataset.tooltip = t('copyLink')
        copyBtn.hidden = false
      } else if (VIDEO_RE.test(key)) {
        const url = this.#r2.getPublicUrl(key) ?? (await this.#r2.getPresignedUrl(key))
        this.#currentUrl = url
        body.innerHTML = ''
        const video = document.createElement('video')
        video.src = url
        video.controls = true
        body.appendChild(video)
        copyBtn.dataset.tooltip = t('copyLink')
        copyBtn.hidden = false
      } else if (AUDIO_RE.test(key)) {
        const url = this.#r2.getPublicUrl(key) ?? (await this.#r2.getPresignedUrl(key))
        this.#currentUrl = url
        body.innerHTML = ''
        const audio = document.createElement('audio')
        audio.src = url
        audio.controls = true
        body.appendChild(audio)
        copyBtn.dataset.tooltip = t('copyLink')
        copyBtn.hidden = false
      } else if (TEXT_RE.test(key)) {
        const url = this.#r2.getPublicUrl(key) ?? (await this.#r2.getPresignedUrl(key))
        this.#currentUrl = url
        const res = await this.#r2.getObject(key)
        const text = await res.text()
        this.#currentText = text
        body.innerHTML = ''
        const pre = document.createElement('pre')
        pre.textContent = text
        body.appendChild(pre)
        copyBtn.dataset.tooltip = t('copyLink')
        copyBtn.hidden = false
        copyTextBtn.dataset.tooltip = t('copyText')
        copyTextBtn.hidden = false
      } else {
        body.innerHTML = `<p style="color:var(--text-tertiary)">${t('previewNotAvailable')}</p>`
      }
    } catch (/** @type {any} */ err) {
      const errP = document.createElement('p')
      errP.style.color = 'var(--text-danger)'
      errP.textContent = err.message
      body.innerHTML = ''
      body.appendChild(errP)
    }
  }

  async downloadCurrent() {
    if (!this.#currentKey) return
    try {
      const filename = extractFileName(this.#currentKey)
      const url = await this.#r2.getDownloadUrl(this.#currentKey, filename)
      const a = document.createElement('a')
      a.href = url
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (/** @type {any} */ err) {
      const errorKey = getErrorMessage(err)
      if (errorKey === 'networkError') {
        this.#ui.toast(t('networkError', { msg: err.message }), 'error')
      } else {
        this.#ui.toast(t(/** @type {any} */ (errorKey)), 'error')
      }
    }
  }

  async copyCurrentLink() {
    if (!this.#currentUrl) return
    try {
      await navigator.clipboard.writeText(this.#currentUrl)
      this.#ui.toast(t('linkCopied'), 'success')
    } catch {
      await this.#ui.prompt(t('copyLink'), t('copyUrl'), this.#currentUrl)
    }
  }

  /** @param {HTMLImageElement} img @returns {Promise<Blob>} */
  #imageToPng(img) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const context = canvas.getContext('2d')
      if (!context || !canvas.width || !canvas.height) {
        reject(new Error('Image is not ready'))
        return
      }
      try {
        context.drawImage(img, 0, 0)
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to convert image'))), 'image/png')
      } catch (err) {
        reject(err)
      }
    })
  }

  /** @param {string} key @returns {Promise<Blob>} */
  async #fetchImageAsPng(key) {
    const url = await this.#r2.getPresignedUrl(key)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', reject, { once: true })
        img.src = objectUrl
      })
      return await this.#imageToPng(img)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  async copyCurrentImage() {
    if (!this.#currentKey || !this.#currentImage) return
    if (!navigator.clipboard?.write) {
      this.#ui.toast(t('copyImageNotSupported'), 'error')
      return
    }
    try {
      let pngBlob
      if (this.#currentImageLoaded) {
        try {
          pngBlob = await this.#imageToPng(this.#currentImage)
        } catch {
          pngBlob = await this.#fetchImageAsPng(this.#currentKey)
        }
      } else {
        pngBlob = await this.#fetchImageAsPng(this.#currentKey)
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      this.#ui.toast(t('copyImageSuccess'), 'success')
    } catch {
      this.#ui.toast(t('copyImageFailed'), 'error')
    }
  }

  async copyCurrentText() {
    if (!this.#currentText) return
    try {
      await navigator.clipboard.writeText(this.#currentText)
      this.#ui.toast(t('copyTextSuccess'), 'success')
    } catch {
      await this.#ui.prompt(t('copyTextTitle'), t('copyTextLabel'), this.#currentText)
    }
  }
}

export { FilePreview }
