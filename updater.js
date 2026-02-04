import { app, dialog } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

export function initAutoUpdater() {
  // ⚠️ CRÍTICO para prerelease
  autoUpdater.allowPrerelease = true

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No updates available.')
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err)
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] ${Math.round(progress.percent)}%`)
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update ready',
      message: 'A new version has been downloaded. Restart to apply?',
      buttons: ['Restart', 'Later']
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })

  // ⚠️ NÃO chame cedo demais
  app.whenReady().then(() => {
    autoUpdater.checkForUpdates()
  })
}
