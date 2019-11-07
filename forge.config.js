require('dotenv').config()
module.exports = {
    "packagerConfig": {
    "extendInfo": "Info.plist",
    "appBundleId": "de.heilerich.actualmoney",
    "appCategoryType": "public.app-category.finance",
    "icon": "Icon",
    "ignore": [
      ".*\\.(sketch|png|md|icns)$",
      "LICENSE",
      "patches\\/{0,1}.*",
      ".*\\.lock$",
      "Info\\.plist"
    ],
    "osxSign": process.env['TRAVIS_TAG'] == "" || !process.env['TRAVIS_TAG'] ? false : {
      "hardenedRuntime": true,
      "entitlements": "entitlements.mac.plist",
      "entitlements-inherit": "entitlements.mac.plist",
      "gatekeeper-assess": false
    },
    "osxNotarize": process.env['TRAVIS_TAG'] == "" || !process.env['TRAVIS_TAG'] ? false : {
      "appleId": process.env['APPLE_ID'],
      "appleIdPassword": process.env['APPLE_ID_ASP']
    }
  },
  "makers": [
    {
      "name": "@electron-forge/maker-zip"
    }
  ]
}