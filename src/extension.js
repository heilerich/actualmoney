const fs = require('fs')
const os = require('os')
const {promisify} = require('util')

const copyFile = promisify(fs.copyFile)
const readdir = promisify(fs.readdir)

const targetDir = os.homedir() + '/Library/Containers/com.moneymoney-app.retail/Data/Library/Application Support/MoneyMoney/Extensions/'
const sourceDir = 'lua/'
const scriptName = 'AcM Export.lua'
const versionPattern = /Exporter\{version\s+=\s+([0-9\.]+),/

const getVersion = function(folder) {
    return fs.readFileSync(folder + scriptName, 'utf8').match(versionPattern)[1]
}

const checkExtensionVersion = function() {
    try {
        let installedExtensions = fs.readdirSync(targetDir, { withFileTypes: true })
            .filter(dirent => dirent.isFile()).map(dirent => dirent.name)
        if (!installedExtensions.includes(scriptName)) { return false }

        let latestVersion = getVersion(sourceDir)
        let installedVersion = getVersion(targetDir)
        return latestVersion === installedVersion
    } catch (e) {
        //console.error(e)
        return false
    }
}

const copyScripts = async function() {
    let scripts = (await readdir(sourceDir, { withFileTypes: true }))
        .filter(dirent => dirent.isFile()).map(dirent => dirent.name)
    await Promise.all(scripts.map( async (script) => {
        await copyFile(sourceDir + script, targetDir + script)
    }))
}
exports.checkExtensionVersion = checkExtensionVersion
exports.getVersion = getVersion
exports.copyScripts = copyScripts
