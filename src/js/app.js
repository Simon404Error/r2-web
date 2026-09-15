import {
  VERSION,
  UPDATED_AT,
  THEME_KEY,
  LANG_KEY,
  VIEW_KEY,
  DENSITY_KEY,
  SORT_BY_KEY,
  SORT_ORDER_KEY,
  MAX_UPLOAD_SIZE,
} from './constants.js'
import { ConfigManager } from './config-manager.js'
import { FileExplorer } from './file-explorer.js'
import { FileOperations } from './file-operations.js'
import { FilePreview } from './file-preview.js'
import { UploadManager } from './upload-manager.js'
import { R2Client } from './r2-client.js'
import { UIManager } from './ui-manager.js'
import { getCurrentLang, setLang, t } from './i18n.js'
import { $, getErrorMessage } from './utils.js'
import dayjs from 'dayjs'
import { filesize } from 'filesize'

/** @typedef {'zh'|'en'|'ja'} Lang */

class App {
  /** @type {ConfigManager} */
  #config
  /** @type {R2Client} */
  #r2
  /** @type {UIManager} */
  #ui
  /** @type {FileExplorer | null} */
  #explorer = null
  /** @type {UploadManager | null} */
  #upload = null
  /** @type {FilePreview | null} */
  #preview = null
  /** @type {FileOperations | null} */
  #ops = null
  #appEventsBound = false
  #batchMode = false
  /** @type {((e: TransitionEvent) => void) | null} */
  #onBarTransitionEnd = null

  constructor() {
    this.#config = new ConfigManager()
    this.#r2 = new R2Client()
    this.#ui = new UIManager()

    this.#ui.initTheme()
    this.#ui.initTooltip()

    const urlParams = new URLSearchParams(window.location.search)
    const configParam = urlParams.get('config')
    if (configParam) {
      if (this.#config.loadFromBase64(configParam)) {
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete('config')
        window.history.replaceState({}, '', cleanUrl.toString())
        const lang = localStorage.getItem(LANG_KEY)
        if (lang) setLang(/** @type {Lang} */ (lang))
        const theme = localStorage.getItem(THEME_KEY)
        if (theme) this.#ui.setTheme(theme)
      }
    }

    this.#applyI18nToHTML()

    if (this.#config.isValid()) {
      this.#connectAndLoad()
      if (configParam) {
        setTimeout(() => this.#ui.toast(t('configLoadedFromUrl'), 'success'), 500)
      }
    } else {
      this.#showHero()
    }

    this.#bindGlobalEvents()
    this.#bindHeroEvents()
  }

  #applyI18nToHTML() {
    document.title = t('appTitle')
    $('.topbar-title').textContent = t('appTitle')

    const heroTitle = $('#hero-title')
    if (heroTitle) heroTitle.textContent = t('appTitle')
    const heroDesc = $('#hero-desc')
    if (heroDesc) heroDesc.textContent = t('heroDesc')
    const heroConnectText = $('#hero-connect-text')
    if (heroConnectText) heroConnectText.textContent = t('heroConnect')
    const heroF1 = $('#hero-f1')
    if (heroF1) heroF1.textContent = t('heroF1')
    const heroF2 = $('#hero-f2')
    if (heroF2) heroF2.textContent = t('heroF2')
    const heroF3 = $('#hero-f3')
    if (heroF3) heroF3.textContent = t('heroF3')
    const heroF4 = $('#hero-f4')
    if (heroF4) heroF4.textContent = t('heroF4')
    const heroF5 = $('#hero-f5')
    if (heroF5) heroF5.textContent = t('heroF5')
    const heroF6 = $('#hero-f6')
    if (heroF6) heroF6.textContent = t('heroF6')
    const heroF7 = $('#hero-f7')
    if (heroF7) heroF7.textContent = t('heroF7')
    const heroF8 = $('#hero-f8')
    if (heroF8) heroF8.textContent = t('heroF8')

    $('#tab-preferences').textContent = t('configTabPreferences')
    $('#tab-r2').textContent = t('configTabR2')
    $('#tab-upload').textContent = t('configTabUpload')
    $('#tab-compression').textContent = t('configTabCompression')
    $('#tab-about').textContent = t('configTabAbout')

    $('#lbl-theme').textContent = t('lblTheme')
    const themeSelect = $('#cfg-theme')
    if (themeSelect) {
      $('option[value="light"]', themeSelect).textContent = t('themeLight')
      $('option[value="dark"]', themeSelect).textContent = t('themeDark')
      $('option[value="auto"]', themeSelect).textContent = t('themeAuto')
    }

    $('#lbl-language').textContent = t('lblLanguage')

    $('#lbl-density').textContent = t('lblDensity')
    const densitySelect = $('#cfg-density')
    if (densitySelect) {
      $('option[value="compact"]', densitySelect).textContent = t('densityCompact')
      $('option[value="normal"]', densitySelect).textContent = t('densityNormal')
      $('option[value="loose"]', densitySelect).textContent = t('densityLoose')
    }

    $('#config-title').textContent = t('appTitle')
    $('#lbl-account-id').textContent = t('accountId')
    $('#lbl-access-key').textContent = t('accessKeyId')
    $('#lbl-secret-key').textContent = t('secretAccessKey')
    $('#lbl-bucket').textContent = t('bucketName')
    $('#lbl-custom-domain').textContent = t('customDomain')
    $('#lbl-bucket-access').textContent = t('bucketAccess')
    const bucketAccessSelect = $('#cfg-bucket-access')
    if (bucketAccessSelect) {
      $('option[value="public"]', bucketAccessSelect).textContent = t('bucketAccessPublic')
      $('option[value="private"]', bucketAccessSelect).textContent = t('bucketAccessPrivate')
    }

    $('#lbl-filename-tpl').textContent = t('filenameTpl')
    $('#lbl-filename-tpl-scope').textContent = t('filenameTplScope')
    $('#lbl-upload-concurrency').textContent = t('uploadConcurrency')
    $('#multipart-cleanup-title').textContent = t('multipartCleanupTitle')
    $('#multipart-cleanup-desc').textContent = t('multipartCleanupDesc')
    $('#cleanup-multipart-btn').textContent = t('multipartCleanupButton')
    const filenameScopeSelect = $('#cfg-filename-tpl-scope')
    if (filenameScopeSelect) {
      $('option[value="images"]', filenameScopeSelect).textContent = t('filenameTplScopeImages')
      $('option[value="all"]', filenameScopeSelect).textContent = t('filenameTplScopeAll')
    }
    $('#filename-tpl-hint').textContent = t('filenameTplHintDetailed')

    $('#lbl-compress-mode').textContent = t('compressMode')

    const compressModeSelect = $('#cfg-compress-mode')
    if (compressModeSelect) {
      $('option[value="none"]', compressModeSelect).textContent = t('compressModeNone')
      $('option[value="local"]', compressModeSelect).textContent = t('compressModeLocal')
      $('option[value="tinify"]', compressModeSelect).textContent = t('compressModeTinify')
    }

    $('#lbl-compress-level').textContent = t('compressLevel')

    const compressLevelSelect = $('#cfg-compress-level')
    if (compressLevelSelect) {
      $('option[value="balanced"]', compressLevelSelect).textContent = t('compressLevelBalanced')
      $('option[value="extreme"]', compressLevelSelect).textContent = t('compressLevelExtreme')
    }

    $('#lbl-tinify-key').textContent = 'Tinify API Key'
    $('#tinify-key-hint-text').textContent = t('tinifyKeyHintText')
    $('#tinify-key-link').textContent = t('tinifyKeyLink')

    $('#config-cancel').textContent = t('cancel')
    $('#config-submit').textContent = t('save')
    $('#config-dialog-close').dataset.tooltip = t('close')

    $('#about-version').textContent = `v${VERSION}`
    $('#about-updated').textContent = `${t('aboutUpdatedLabel')}: ${dayjs(UPDATED_AT).format('YYYY-MM-DD HH:mm:ss')}`
    $('#about-description').textContent = t('aboutDescription')
    $('#about-github').textContent = t('aboutGithub')
    $('#about-changelog').textContent = t('aboutChangelog')
    $('#about-qq-group').textContent = t('aboutQQGroup')
    $('#about-license-label').textContent = t('aboutLicense')

    $('#help-theme').dataset.tooltip = t('tooltipTheme')
    $('#help-language').dataset.tooltip = t('tooltipLanguage')
    $('#help-density').dataset.tooltip = t('tooltipDensity')

    $('#help-account-id').dataset.tooltip = t('tooltipAccountId')
    $('#help-access-key').dataset.tooltip = t('tooltipAccessKeyId')
    $('#help-secret-key').dataset.tooltip = t('tooltipSecretAccessKey')
    $('#help-bucket').dataset.tooltip = t('tooltipBucket')
    $('#help-custom-domain').dataset.tooltip = t('tooltipCustomDomain')
    $('#help-bucket-access').dataset.tooltip = t('tooltipBucketAccess')

    $('#help-filename-tpl').dataset.tooltip = t('tooltipFilenameTpl')
    $('#help-filename-tpl-scope').dataset.tooltip = t('tooltipFilenameTplScope')
    $('#help-compress-mode').dataset.tooltip = t('tooltipCompressMode')
    $('#help-compress-level').dataset.tooltip = t('tooltipCompressLevel')
    $('#help-tinify-key').dataset.tooltip = t('tooltipTinifyKey')

    $('#sort-asc-btn').dataset.tooltip = t('sortAsc')
    $('#sort-desc-btn').dataset.tooltip = t('sortDesc')

    $('#view-grid-btn').dataset.tooltip = t('viewGrid')
    $('#view-list-btn').dataset.tooltip = t('viewList')

    $('#sort-name-btn').dataset.tooltip = t('sortName')
    $('#sort-date-btn').dataset.tooltip = t('sortDate')
    $('#sort-size-btn').dataset.tooltip = t('sortSize')

    $('#new-folder-btn span').textContent = t('newFolder')
    $('#upload-btn span').textContent = t('upload')

    $('#dropzone-text').textContent = t('dropToUpload')

    $('#empty-state p').textContent = t('emptyFolder')
    $('#empty-upload-btn').lastChild.textContent = ' ' + t('uploadFiles')
    $('#empty-upload-hint').textContent = t('uploadHint', {
      size: filesize(MAX_UPLOAD_SIZE, { standard: 'iec' }),
    })
    $('#paste-hint-text').textContent = t('pasteHint')

    $('#load-more-btn').textContent = t('loadMore')
    this.#explorer?.updateCountDisplay()

    $('[data-action="preview"] span').textContent = t('preview')
    $('[data-action="download"] span').textContent = t('download')
    $('#ctx-copy-link > span').textContent = t('copyLink')
    $('[data-action="copyPath"] span').textContent = t('copyPath')
    $('[data-action="copyUrl"] span').textContent = t('copyUrl')
    $('[data-action="copyMarkdown"] span').textContent = t('copyMarkdown')
    $('[data-action="copyHtml"] span').textContent = t('copyHtml')
    $('[data-action="copyImage"] span').textContent = t('copyImage')
    $('[data-action="copyPresigned"] span').textContent = t('copyPresigned')
    $('[data-action="shareQr"] span').textContent = t('shareQr')
    $('[data-action="editContentType"] span').textContent = t('editContentType')
    $('[data-action="rename"] span').textContent = t('rename')
    $('[data-action="copy"] span').textContent = t('copy')
    $('[data-action="move"] span').textContent = t('move')
    $('[data-action="delete"] span').textContent = t('delete')

    $('#share-btn').dataset.tooltip = t('shareConfig')
    $('#settings-btn').dataset.tooltip = t('settings')
    $('#logout-btn').dataset.tooltip = t('logout')
    $('#refresh-btn').dataset.tooltip = t('refresh')
    $('#preview-copy-text').dataset.tooltip = t('copyText')
    $('#preview-copy-image').dataset.tooltip = t('copyImage')
    $('#preview-copy').dataset.tooltip = t('copyLink')
    $('#preview-download').dataset.tooltip = t('download')
    $('#preview-close').dataset.tooltip = t('close')
    $('#file-qr-close').dataset.tooltip = t('close')
    $('#view-grid-btn').dataset.tooltip = t('viewGrid')
    $('#view-list-btn').dataset.tooltip = t('viewList')
    $('#upload-panel-close').dataset.tooltip = t('close')

    $('#prompt-cancel').textContent = t('cancel')
    $('#prompt-ok').textContent = t('ok')

    $('#confirm-cancel').textContent = t('cancel')
    $('#confirm-ok').textContent = t('confirm')

    $('#filename-path-title').textContent = t('filenameTplPathTitle')
    $('#filename-path-desc').textContent = t('filenameTplPathDesc')
    $('#filename-path-cancel').textContent = t('cancel')
    $('#filename-path-ok').textContent = t('confirm')

    $('#share-dialog-title').textContent = t('shareDialogTitle')
    $('#share-dialog-subtitle').textContent = t('shareDialogSubtitle')
    $('#share-divider-text').textContent = t('shareDividerText')
    $('#share-link-title').textContent = t('shareLinkTitle')
    $('#share-link-desc').textContent = t('shareLinkDesc')
    $('#share-qr-title').textContent = t('shareQrTitle')
    $('#share-qr-desc').textContent = t('shareQrDesc')
    $('#share-qr-hint').textContent = t('shareQrHint')
    $('#copy-share-url-text').textContent = t('copyShareUrl')
    $('#share-warning').textContent = t('shareWarning')
    $('#share-dialog-close').dataset.tooltip = t('close')

    $('#file-qr-title').textContent = t('fileQrTitle')
    $('#file-qr-desc').textContent = t('fileQrDesc')
    $('#file-qr-copy-text').textContent = t('copyLink')

    this.#updateSelectAllBtn()
    $('#batch-move-text').textContent = t('move')
    $('#batch-copy-text').textContent = t('copy')
    $('#batch-delete-text').textContent = t('delete')
    $('#batch-toggle-text').textContent = t(this.#batchMode ? 'exitBatchMode' : 'batchMode')

    this.#ui.initTooltip()
  }

  async #connectAndLoad() {
    try {
      this.#r2.init(this.#config)
      this.#explorer = new FileExplorer(this.#r2, this.#ui)
      this.#upload = new UploadManager(this.#r2, this.#ui, this.#explorer, this.#config)
      this.#preview = new FilePreview(this.#r2, this.#ui)
      this.#ops = new FileOperations(this.#r2, this.#ui, this.#explorer)

      this.#hideHero()
      $('#app').hidden = false
      this.#restoreViewPrefs()
      this.#explorer.setOnSelectionChange((count) => {
        if (!this.#batchMode) return
        $('#batch-count').textContent = t('batchSelected', { count })
        this.#updateSelectAllBtn()
      })
      if (!this.#appEventsBound) {
        this.#upload.initDragDrop()
        this.#bindAppEvents()
        this.#appEventsBound = true
      }
      await this.#explorer.navigate('')
    } catch (/** @type {any} */ err) {
      if (err.message === 'AUTH_FAILED') {
        this.#config.clear()
        /** @type {HTMLElement} */
        $('#app').hidden = true
        this.#showHero()
      }
    }
  }

  #restoreViewPrefs() {
    const view = localStorage.getItem(VIEW_KEY) || 'grid'
    const density = localStorage.getItem(DENSITY_KEY) || 'normal'
    const sortBy = localStorage.getItem(SORT_BY_KEY) || 'name'
    const sortOrder = /** @type {'asc' | 'desc'} */ (localStorage.getItem(SORT_ORDER_KEY) || 'asc')
    this.#setView(view)
    this.#setDensity(density)
    this.#setSortBy(sortBy)
    this.#setSortOrder(sortOrder)
  }

  #enterBatchMode() {
    this.#batchMode = true
    const app = /** @type {HTMLElement} */ ($('#app'))
    app.classList.add('batch-mode')
    const btn = /** @type {HTMLElement} */ ($('#batch-toggle-btn'))
    btn.setAttribute('aria-pressed', 'true')
    $('#batch-toggle-text').textContent = t('exitBatchMode')
    const bar = /** @type {HTMLElement} */ ($('#batch-action-bar'))
    if (this.#onBarTransitionEnd) {
      bar.removeEventListener('transitionend', this.#onBarTransitionEnd)
      this.#onBarTransitionEnd = null
    }
    bar.classList.remove('hiding')
    bar.hidden = false
    $('#batch-count').textContent = t('batchSelected', { count: 0 })
    this.#updateSelectAllBtn()
  }

  #exitBatchMode() {
    this.#batchMode = false
    const explorer = /** @type {FileExplorer} */ (this.#explorer)
    explorer.clearSelection()
    const app = /** @type {HTMLElement} */ ($('#app'))
    app.classList.remove('batch-mode')
    const btn = /** @type {HTMLElement} */ ($('#batch-toggle-btn'))
    btn.setAttribute('aria-pressed', 'false')
    $('#batch-toggle-text').textContent = t('batchMode')
    const bar = /** @type {HTMLElement} */ ($('#batch-action-bar'))
    bar.classList.add('hiding')
    this.#onBarTransitionEnd = (/** @type {TransitionEvent} */ e) => {
      if (e.propertyName !== 'opacity') return
      bar.removeEventListener('transitionend', this.#onBarTransitionEnd)
      this.#onBarTransitionEnd = null
      bar.hidden = true
      bar.classList.remove('hiding')
    }
    bar.addEventListener('transitionend', this.#onBarTransitionEnd)
  }

  #updateSelectAllBtn() {
    if (!this.#explorer) {
      $('#batch-select-all-text').textContent = t('batchSelectAll')
      return
    }
    const total = document.querySelectorAll('#file-grid .file-card').length
    const selected = this.#explorer.selectionCount
    const allSelected = total > 0 && selected === total
    $('#batch-select-all-text').textContent = allSelected ? t('batchDeselectAll') : t('batchSelectAll')
  }

  /** @param {string} view */
  #setView(view) {
    $('#file-browser').dataset.view = view
    $('#view-grid-btn').setAttribute('aria-pressed', String(view === 'grid'))
    $('#view-list-btn').setAttribute('aria-pressed', String(view === 'list'))
    localStorage.setItem(VIEW_KEY, view)
  }

  /** @param {string} density */
  #setDensity(density) {
    $('#file-browser').dataset.density = density
    localStorage.setItem(DENSITY_KEY, density)
  }

  /** @param {string} sortBy */
  #setSortBy(sortBy) {
    $('#sort-name-btn').setAttribute('aria-pressed', String(sortBy === 'name'))
    $('#sort-date-btn').setAttribute('aria-pressed', String(sortBy === 'date'))
    $('#sort-size-btn').setAttribute('aria-pressed', String(sortBy === 'size'))
    if (this.#explorer) this.#explorer.setSortBy(sortBy)
    localStorage.setItem(SORT_BY_KEY, sortBy)
  }

  /** @param {'asc' | 'desc'} order */
  #setSortOrder(order) {
    $('#sort-asc-btn').setAttribute('aria-pressed', String(order === 'asc'))
    $('#sort-desc-btn').setAttribute('aria-pressed', String(order === 'desc'))
    if (this.#explorer) this.#explorer.setSortOrder(order)
    localStorage.setItem(SORT_ORDER_KEY, order)
  }

  #showHero() {
    $('#hero').hidden = false
    $('#app').hidden = true
  }

  #hideHero() {
    $('#hero').hidden = true
  }

  #bindHeroEvents() {
    $('#hero-connect-btn').addEventListener('click', () => {
      this.#showConfigDialog('r2')
    })
  }

  /**
   * Show Config Dialog
   * @param {string} [defaultTab='preferences']
   */
  #showConfigDialog(defaultTab = 'preferences') {
    const dialog = /** @type {HTMLDialogElement} */ ($('#config-dialog'))

    const tabButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (dialog.querySelectorAll('.config-tab-btn'))
    const tabPanels = /** @type {NodeListOf<HTMLElement>} */ (dialog.querySelectorAll('.config-tab-panel'))

    /** @param {string} tabId */
    const switchTab = (tabId) => {
      tabButtons.forEach((btn) => {
        const isActive = btn.dataset.tab === tabId
        btn.setAttribute('aria-selected', String(isActive))
      })
      tabPanels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tabId
      })
    }

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab
        if (tabId) switchTab(tabId)
      })
    })

    switchTab(defaultTab)

    const themeInput = /** @type {HTMLSelectElement | null} */ ($('#cfg-theme'))
    const languageInput = /** @type {HTMLSelectElement | null} */ ($('#cfg-language'))
    const densityInput = /** @type {HTMLSelectElement | null} */ ($('#cfg-density'))

    const cfg = this.#config.get()
    const accountInput = /** @type {HTMLInputElement} */ ($('#cfg-account-id'))
    const accessInput = /** @type {HTMLInputElement} */ ($('#cfg-access-key'))
    const secretInput = /** @type {HTMLInputElement} */ ($('#cfg-secret-key'))
    const bucketInput = /** @type {HTMLInputElement} */ ($('#cfg-bucket'))
    const tplInput = /** @type {HTMLInputElement} */ ($('#cfg-filename-tpl'))
    const tplScopeInput = /** @type {HTMLSelectElement | null} */ ($('#cfg-filename-tpl-scope'))
    const domainInput = /** @type {HTMLInputElement} */ ($('#cfg-custom-domain'))
    const bucketAccessInput = /** @type {HTMLSelectElement} */ ($('#cfg-bucket-access'))

    const compressModeInput = /** @type {HTMLSelectElement} */ ($('#cfg-compress-mode'))
    const compressLevelInput = /** @type {HTMLSelectElement} */ ($('#cfg-compress-level'))
    const tinifyKeyInput = /** @type {HTMLInputElement} */ ($('#cfg-tinify-key'))
    const uploadConcurrencyInput = /** @type {HTMLSelectElement} */ ($('#cfg-upload-concurrency'))

    const currentTheme = localStorage.getItem(THEME_KEY) || 'auto'
    const savedLang = getCurrentLang()
    const currentDensityValue = localStorage.getItem(DENSITY_KEY) || 'normal'

    if (themeInput) themeInput.value = currentTheme
    if (languageInput) languageInput.value = savedLang
    if (densityInput) densityInput.value = currentDensityValue

    if (cfg.accountId) accountInput.value = cfg.accountId
    if (cfg.accessKeyId) accessInput.value = cfg.accessKeyId
    if (cfg.secretAccessKey) secretInput.value = cfg.secretAccessKey
    if (cfg.bucket) bucketInput.value = cfg.bucket
    if (cfg.filenameTpl) tplInput.value = cfg.filenameTpl
    if (tplScopeInput) tplScopeInput.value = cfg.filenameTplScope || 'images'
    if (cfg.customDomain) domainInput.value = cfg.customDomain
    if (bucketAccessInput) bucketAccessInput.value = cfg.bucketAccess || 'public'

    if (compressModeInput) compressModeInput.value = cfg.compressMode || 'none'
    if (compressLevelInput) compressLevelInput.value = cfg.compressLevel || 'balanced'
    if (tinifyKeyInput) tinifyKeyInput.value = cfg.tinifyKey || ''
    if (uploadConcurrencyInput) uploadConcurrencyInput.value = String(cfg.uploadConcurrency ?? 3)

    const cleanupMultipartButton = /** @type {HTMLButtonElement} */ ($('#cleanup-multipart-btn'))
    cleanupMultipartButton.disabled = !this.#config.isValid()
    cleanupMultipartButton.onclick = async () => {
      const confirmed = await this.#ui.confirm(t('multipartCleanupConfirmTitle'), t('multipartCleanupConfirmMsg'))
      if (!confirmed) return

      cleanupMultipartButton.disabled = true
      cleanupMultipartButton.textContent = t('multipartCleaning')
      this.#upload?.cancelAllUploads()
      try {
        const result = await this.#r2.abortAllMultipartUploads()
        if (result.failed > 0) {
          this.#ui.toast(
            t('multipartCleanupPartial', { success: result.succeeded, fail: result.failed }),
            'error',
          )
        } else if (result.total === 0) {
          this.#ui.toast(t('multipartCleanupEmpty'), 'info')
        } else {
          this.#ui.toast(t('multipartCleanupSuccess', { count: result.succeeded }), 'success')
        }
      } catch (error) {
        this.#ui.toast(t(getErrorMessage(/** @type {Error} */ (error)), { msg: String(error) }), 'error')
      } finally {
        cleanupMultipartButton.disabled = false
        cleanupMultipartButton.textContent = t('multipartCleanupButton')
      }
    }

    const updateCompressVisibility = () => {
      const mode = compressModeInput ? compressModeInput.value : 'none'
      const localOpts = $('#compress-local-options')
      const tinifyOpts = $('#compress-tinify-options')
      if (localOpts) localOpts.hidden = mode !== 'local'
      if (tinifyOpts) tinifyOpts.hidden = mode !== 'tinify'
    }

    if (compressModeInput) {
      compressModeInput.onchange = updateCompressVisibility
      updateCompressVisibility()
    }

    $('#config-cancel').onclick = () => dialog.close()
    $('#config-dialog-close').onclick = () => dialog.close()

    const onBackdropClick = (/** @type {Event} */ e) => {
      if (e.target === dialog) dialog.close()
    }
    dialog.addEventListener('click', onBackdropClick)

    dialog.addEventListener(
      'close',
      () => {
        dialog.removeEventListener('click', onBackdropClick)
        if (!this.#config.isValid()) {
          this.#showHero()
        }
      },
      { once: true },
    )

    $('#config-submit').onclick = async () => {
      const newTheme = themeInput ? themeInput.value : 'auto'
      if (newTheme !== currentTheme) {
        this.#ui.setTheme(newTheme)
      }

      const newLang = languageInput ? languageInput.value : 'zh'
      if (newLang !== savedLang) {
        setLang(/** @type {Lang} */ (newLang))
        this.#applyI18nToHTML()
      }

      const newDensity = densityInput ? densityInput.value : 'normal'
      if (newDensity !== currentDensityValue) {
        this.#setDensity(newDensity)
      }

      this.#config.save({
        accountId: accountInput.value.trim(),
        accessKeyId: accessInput.value.trim(),
        secretAccessKey: secretInput.value.trim(),
        bucket: bucketInput.value.trim(),
        filenameTpl: tplInput ? tplInput.value.trim() : '',
        filenameTplScope: tplScopeInput ? tplScopeInput.value : 'images',
        customDomain: domainInput ? domainInput.value.trim().replace(/\/+$/, '') : '',
        bucketAccess: bucketAccessInput ? /** @type {'public' | 'private'} */ (bucketAccessInput.value) : 'public',
        compressMode: compressModeInput ? compressModeInput.value : 'none',
        compressLevel: compressLevelInput ? compressLevelInput.value : 'balanced',
        tinifyKey: tinifyKeyInput ? tinifyKeyInput.value.trim() : '',
        uploadConcurrency: uploadConcurrencyInput ? Number(uploadConcurrencyInput.value) : 3,
      })

      dialog.close()
      await this.#connectAndLoad()
    }

    dialog.querySelectorAll('form.config-tab-panel').forEach((form) => {
      const formElement = /** @type {HTMLFormElement} */ (form)
      formElement.onsubmit = (/** @type {Event} */ e) => e.preventDefault()
    })

    dialog.showModal()
  }

  #bindGlobalEvents() {
    $('#settings-btn').addEventListener('click', () => this.#showConfigDialog())

    $('#logout-btn').addEventListener('click', async () => {
      const ok = await this.#ui.confirm(t('logoutConfirmTitle'), t('logoutConfirmMsg'))
      if (!ok) return
      this.#config.clear()
      $('#app').hidden = true
      this.#showHero()
    })

    $('#share-btn').addEventListener('click', async () => {
      if (!this.#config.isValid()) {
        this.#ui.toast(t('authFailed'), 'error')
        return
      }
      const url = this.#config.getShareUrl()
      await this.#ui.showShareDialog(url)
    })

    document.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target)
      if (!target.closest('.context-menu') && !target.closest('.file-card-menu')) {
        this.#ui.hideContextMenu(true)
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.#ui.hideContextMenu()
      }
    })
  }

  #bindAppEvents() {
    $('#refresh-btn').addEventListener('click', async () => {
      const btn = /** @type {HTMLElement} */ ($('#refresh-btn'))
      btn.classList.add('refreshing')
      btn.addEventListener('animationend', () => btn.classList.remove('refreshing'), { once: true })
      await this.#explorer.refresh()
    })

    $('#breadcrumb').addEventListener('click', (e) => {
      const btn = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.breadcrumb-btn'))
      if (btn) {
        /** @type {FileExplorer} */ this.#explorer.navigate(btn.dataset.prefix ?? '')
      }
    })

    $('#file-grid').addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target)
      const menuBtn = /** @type {HTMLElement | null} */ (target.closest('.file-card-menu'))
      if (menuBtn) {
        e.stopPropagation()
        const card = /** @type {HTMLElement} */ (menuBtn.closest('.file-card'))
        const rect = menuBtn.getBoundingClientRect()
        this.#ui.showContextMenu(rect.right, rect.bottom, card.dataset.key ?? '', card.dataset.isFolder === 'true', {
          size: Number(card.dataset.size ?? 0),
          mod: Number(card.dataset.mod ?? 0),
        })
        return
      }

      const checkboxWrap = /** @type {HTMLElement | null} */ (target.closest('.file-card-checkbox-wrap'))
      if (checkboxWrap) {
        e.stopPropagation()
        const card = /** @type {HTMLElement | null} */ (checkboxWrap.closest('.file-card'))
        if (card)
          /** @type {FileExplorer} */ (this.#explorer).toggleSelect(
            card.dataset.key ?? '',
            card.dataset.isFolder === 'true',
          )
        return
      }

      const card = /** @type {HTMLElement | null} */ (target.closest('.file-card'))
      if (card) {
        if (this.#batchMode) {
          /** @type {FileExplorer} */ this.#explorer.toggleSelect(
            card.dataset.key ?? '',
            card.dataset.isFolder === 'true',
          )
          return
        }
        if (e.ctrlKey || e.metaKey) {
          /** @type {FileExplorer} */ this.#explorer.toggleSelect(
            card.dataset.key ?? '',
            card.dataset.isFolder === 'true',
          )
          return
        }
        /** @type {FileExplorer} */ this.#explorer.clearSelection()
        if (card.dataset.isFolder === 'true') {
          /** @type {FileExplorer} */ this.#explorer.navigate(card.dataset.key ?? '')
        } else {
          /** @type {FilePreview} */ this.#preview.preview({
            key: card.dataset.key ?? '',
            size: Number(card.dataset.size ?? 0),
            lastModified: Number(card.dataset.mod ?? 0),
          })
        }
      }
    })

    $('#file-grid').addEventListener('contextmenu', (e) => {
      const card = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('.file-card'))
      if (card) {
        e.preventDefault()
        this.#ui.showContextMenu(e.clientX, e.clientY, card.dataset.key ?? '', card.dataset.isFolder === 'true', {
          size: Number(card.dataset.size ?? 0),
          mod: Number(card.dataset.mod ?? 0),
        })
      }
    })

    $('#context-menu').addEventListener('click', (e) => {
      const item = /** @type {HTMLElement | null} */ (
        /** @type {HTMLElement} */ (e.target).closest('.context-menu-item')
      )
      if (!item) return

      const action = item.dataset.action
      if (!action) return

      const menu = /** @type {HTMLElement} */ ($('#context-menu'))
      const key = menu.dataset.key ?? ''
      const isFolder = menu.dataset.isFolder === 'true'

      this.#ui.hideContextMenu()

      switch (action) {
        case 'preview':
          /** @type {FilePreview} */ this.#preview.preview({
            key,
            size: Number(menu.dataset.size ?? 0),
            lastModified: Number(menu.dataset.mod ?? 0),
          })
          break
        case 'download':
          /** @type {FileOperations} */ this.#ops.download(key)
          break
        case 'copyPath':
          /** @type {FileOperations} */ this.#ops.copyAs(key, 'path')
          break
        case 'copyUrl':
          /** @type {FileOperations} */ this.#ops.copyAs(key, 'url')
          break
        case 'copyMarkdown':
          /** @type {FileOperations} */ this.#ops.copyAs(key, 'markdown')
          break
        case 'copyHtml':
          /** @type {FileOperations} */ this.#ops.copyAs(key, 'html')
          break
        case 'copyImage':
          /** @type {FileOperations} */ this.#ops.copyImage(key)
          break
        case 'copyPresigned':
          /** @type {FileOperations} */ this.#ops.copyAs(key, 'presigned')
          break
        case 'shareQr':
          /** @type {FileOperations} */ this.#ops.shareQr(key)
          break
        case 'editContentType':
          /** @type {FileOperations} */ this.#ops.editContentType(key)
          break
        case 'rename':
          /** @type {FileOperations} */ this.#ops.rename(key, isFolder)
          break
        case 'copy':
          /** @type {FileOperations} */ this.#ops.copy(key, isFolder)
          break
        case 'move':
          /** @type {FileOperations} */ this.#ops.move(key, isFolder)
          break
        case 'delete':
          /** @type {FileOperations} */ this.#ops.delete(key, isFolder)
          break
      }
    })

    const fileInput = /** @type {HTMLInputElement} */ ($('#file-input'))
    $('#upload-btn').addEventListener('click', () => fileInput.click())
    $('#empty-upload-btn').addEventListener('click', () => fileInput.click())

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        /** @type {UploadManager} */ this.#upload.uploadFiles([...fileInput.files])
        fileInput.value = ''
      }
    })

    $('#new-folder-btn').addEventListener('click', async () => {
      const name = await this.#ui.prompt(t('newFolderTitle'), t('newFolderLabel'))
      if (!name) return
      try {
        const key = this.#explorer.currentPrefix + name
        await this.#r2.createFolder(key)
        this.#ui.toast(t('folderCreated', { name }), 'success')
        await this.#explorer.refresh()
      } catch (/** @type {any} */ err) {
        const errorKey = getErrorMessage(err)
        if (errorKey === 'networkError') {
          this.#ui.toast(t('networkError', { msg: err.message }), 'error')
        } else {
          this.#ui.toast(t(/** @type {any} */ (errorKey)), 'error')
        }
      }
    })

    $('#load-more-btn').addEventListener('click', () => /** @type {FileExplorer} */ (this.#explorer).loadMore())

    const previewDialog = /** @type {HTMLDialogElement} */ ($('#preview-dialog'))
    $('#preview-close').addEventListener('click', () => previewDialog.close())
    previewDialog.addEventListener('click', (e) => {
      if (e.target === previewDialog) previewDialog.close()
    })
    $('#preview-download').addEventListener('click', () => /** @type {FilePreview} */ (this.#preview).downloadCurrent())
    $('#preview-copy-text').addEventListener('click', () =>
      /** @type {FilePreview} */ (this.#preview).copyCurrentText(),
    )
    $('#preview-copy-image').addEventListener('click', () =>
      /** @type {FilePreview} */ (this.#preview).copyCurrentImage(),
    )
    $('#preview-copy').addEventListener('click', () => /** @type {FilePreview} */ (this.#preview).copyCurrentLink())

    $('#upload-panel-close').addEventListener('click', () => {
      $('#upload-panel').hidden = true
    })

    $('#sort-name-btn').addEventListener('click', () => this.#setSortBy('name'))
    $('#sort-date-btn').addEventListener('click', () => this.#setSortBy('date'))
    $('#sort-size-btn').addEventListener('click', () => this.#setSortBy('size'))

    $('#sort-asc-btn').addEventListener('click', () => this.#setSortOrder('asc'))
    $('#sort-desc-btn').addEventListener('click', () => this.#setSortOrder('desc'))

    $('#view-grid-btn').addEventListener('click', () => this.#setView('grid'))
    $('#view-list-btn').addEventListener('click', () => this.#setView('list'))

    $('#batch-delete-btn').addEventListener('click', async () => {
      const items = /** @type {FileExplorer} */ (this.#explorer).getSelection()
      if (!items.length) return
      const executed = await /** @type {FileOperations} */ (this.#ops).deleteMany(items)
      if (executed) this.#exitBatchMode()
    })

    $('#batch-move-btn').addEventListener('click', async () => {
      const items = /** @type {FileExplorer} */ (this.#explorer).getSelection()
      if (!items.length) return
      const executed = await /** @type {FileOperations} */ (this.#ops).moveMany(items)
      if (executed) this.#exitBatchMode()
    })

    $('#batch-copy-btn').addEventListener('click', async () => {
      const items = /** @type {FileExplorer} */ (this.#explorer).getSelection()
      if (!items.length) return
      const executed = await /** @type {FileOperations} */ (this.#ops).copyMany(items)
      if (executed) this.#exitBatchMode()
    })

    $('#batch-cancel-btn').addEventListener('click', () => {
      this.#exitBatchMode()
    })

    $('#batch-select-all-btn').addEventListener('click', () => {
      const total = document.querySelectorAll('#file-grid .file-card').length
      const selected = /** @type {FileExplorer} */ (this.#explorer).selectionCount
      if (total > 0 && selected === total) {
        /** @type {FileExplorer} */ this.#explorer.clearSelection()
      } else {
        /** @type {FileExplorer} */ this.#explorer.selectAll()
      }
    })

    $('#batch-toggle-btn').addEventListener('click', () => {
      if (this.#batchMode) {
        this.#exitBatchMode()
      } else {
        this.#enterBatchMode()
      }
    })
  }
}

export { App }
