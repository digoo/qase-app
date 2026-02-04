import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'

export function initAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })

  autoUpdater.on('update-available', () => {
    console.log('Update available.')
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available.')
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto update error:', err)
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download speed: ${progress.bytesPerSecond}`)
    console.log(`Downloaded ${progress.percent}%`)
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update ready',
      message: 'A new version has been downloaded. Restart the app to apply the update.',
      buttons: ['Restart']
    }).then(() => {
      autoUpdater.quitAndInstall()
    })
  })

  autoUpdater.checkForUpdates()
}
