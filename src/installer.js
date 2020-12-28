
const Vue = require('vue/dist/vue.common')
const Swal = require('sweetalert2')
const { remote } = require('electron')
const { checkExtensionVersion, copyScripts } = require('./extension')

function closeWindow () {
  const window = remote.getCurrentWindow()
  window.close()
}

const app = new Vue({
  el: '#app',
  data: {
    installed: null
  },
  mounted () {
    this.installed = checkExtensionVersion()
    Swal.fire({
      title: 'Install MoneyMoney Extension',
      text: 'Checking version',
      animation: false
    })
    Swal.showLoading()
  },
  watch: {
    installed (newValue) {
      Swal.hideLoading()
      if (!newValue) {
        Swal.fire({
          title: 'Install MoneyMoney Extension',
          type: 'warning',
          text: 'The correct version of the MoneyMoney extension is not installed. Importing ' +
                          'with a mismatching extension might lead to unexpected results!',
          confirmButtonText: 'Install',
          showLoaderOnConfirm: true,
          preConfirm: async function () {
            try {
              await copyScripts()
            } catch (e) {
              console.error(e)
              Swal.showValidationMessage(
                                `Failed: ${e}`
              )
            }
            return true
          }
        }).then(() => {
          Swal.fire({
            title: 'Install MoneyMoney Extension',
            text: 'Installation was successful.',
            type: 'success'
          }).then(() => {
            closeWindow()
          })
        })
      } else {
        Swal.fire({
          title: 'Install MoneyMoney Extension',
          type: 'success',
          text: 'The correct version of the MoneyMoney extension is installed.'
        }).then(() => {
          closeWindow()
        })
      }
    }
  }
})

export { app }
