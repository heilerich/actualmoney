// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer } = require('electron')
const fs = require('fs')
const parse = require('csv-parse/lib/sync')
const Vue = require('vue/dist/vue.common')
const actual = require('@actual-app/api')
const ElectronStore = require('electron-store')
const moment = require('moment')
const overlay = require('vue-loading-overlay')
const Swal = require('sweetalert2')
const os = require('os')

const store = new ElectronStore()

Vue.use(overlay)

let accountTimeout = null

const app = new Vue({
  el: '#app',
  data: {
    selectedAccount: null,
    selectedImportAccount: 'default',
    accounts: [],
    importAccounts: {},
    importTransactions: {},
    accountMatch: {},
    budgets: getBudgets() ? getBudgets().budgets : [],
    selectedBudget: getBudgets() ? getBudgets().selectedBudget : {}
  },
  computed: {
    selectedAccountOb () {
      return this.accounts.find(acc => acc.id === this.selectedAccount)
    },
    selectedImportAccountOb () {
      return this.importAccounts[this.selectedImportAccount]
    }
  },
  methods: {
    selectAccount: function (id) {
      this.selectedAccount = id
      this.selectedImportAccount = this.accountMatch[id] || 'default'
    },
    loadAccounts: async function () {
      accountTimeout = setTimeout(() => {
        if (this.accounts.length > 0) { return }
        Swal.fire({
          type: 'error',
          title: 'Connection failure',
          text: 'Please make sure Actual is running, then try reloading accounts.',
          showConfirmButton: false,
          timer: 2000
        })
      }, 1000)
      if (!this.selectedBudget) { return }
      this.accounts = await actual.runWithBudget(this.selectedBudget, async function () {
        return await Promise.all((await actual.getAccounts()).map(async (account) => {
          const transactions = (await actual.getTransactions(account.id)).map((transaction) => {
            return { ...transaction, date: moment(transaction.date, 'YYYY-MM-DD') }
          })
          const firstTransaction = moment.min(transactions.map(transaction => transaction.date))
          const unclearedTransactions = transactions
            .filter(transaction => transaction.imported_id == null && transaction.date !== firstTransaction && transaction.transfer_id == null)
          const balance = grandTotal(transactions) - grandTotal(unclearedTransactions)
          return { ...account, transactions, balance, firstTransaction, unclearedTransactions }
        }))
      })
      clearTimeout(accountTimeout)
    },
    discardTransactions: function () {
      this.importAccounts = {}
      this.importTransactions = {}
    },
    transactionCount: function (id) {
      const importId = this.accountMatch[id]
      const importAccount = this.importAccounts[importId]
      if (!importId || !importAccount || !importAccount.transactions || importAccount.transactions === 0) { return 'No transactions' }

      if (importAccount.transactions === 1) { return 'One transaction' }
      return `${importAccount.transactions} transactions`
    },
    inSync: function (accountId, importAccountId) {
      const account = this.accounts.find(acc => acc.id === accountId)
      const importAccount = importAccountId != null ? this.importAccounts[importAccountId] : this.importAccounts[this.accountMatch[accountId]]
      if (!account || !importAccount) { return null }
      return account.balance === importAccount.balance
    },
    transactionsToSend: function (accountId) {
      const account = this.accounts.find(acc => acc.id === accountId)
      const importAccount = this.importAccounts[this.accountMatch[accountId]]
      if (!account || !importAccount) { return null }

      return Object.values(this.importTransactions).filter(transaction => {
        return transaction.MyAccountNumber === importAccount.number && transaction.Date > account.firstTransaction
      })
    },
    sendTransactions: async function () {
      await this.loadAccounts()
      if (!this.accounts || this.accounts.length === 0) {
        return
      }

      const loader = this.$loading.show({
        canCancel: false
      })

      const jobs = (this.accounts.map((account) => {
        const records = this.transactionsToSend(account.id)
        if (!records || !this.selectedBudget) { return null }

        const transactions = records.map(record => {
          return {
            account: account.id,
            date: record.Date.format('YYYY-MM-DD'),
            amount: Math.trunc(parseFloat(record.Amount) * 100),
            imported_payee: record.Name,
            payee_name: record.Name,
            notes: record.Purpose,
            imported_id: record.ID
          }
        })

        return {
          id: account.id,
          transactions
        }
      })).filter(ele => ele != null)

      await actual.runWithBudget(this.selectedBudget, async function () {
        return await Promise.all(jobs.map(async (job) => actual.importTransactions(job.id, job.transactions)))
      })

      await this.loadAccounts()
      loader.hide()
      Swal.fire({
        type: 'success',
        title: 'Import finished',
        showConfirmButton: false,
        timer: 2000
      })
    },
    getBudgets: function () {
      const { selectedBudget, budgets } = getBudgets()
      this.selectedBudget = selectedBudget
      this.budgets = budgets
    }
  },
  mounted () {
    const storedMatches = store.get('accountMatch')
    if (storedMatches) {
      this.accountMatch = storedMatches
    }
    this.getBudgets()
  },
  watch: {
    accountMatch (newMatches) {
      if (newMatches !== {}) {
        store.set('accountMatch', newMatches)
      }
    },
    selectedImportAccount (newValue) {
      if (newValue !== 'default') {
        Vue.set(this.accountMatch, this.selectedAccount, newValue)
      }
    },
    selectedBudget () {
      this.accounts = []
      this.selectedAccount = null
      this.loadAccounts()
    }
  }
})

app.loadAccounts()

const content = document.getElementById('app')
content.ondragover = () => {
  return false
}
content.ondragleave = () => {
  return false
}
content.ondragend = () => {
  return false
}
content.ondrop = (e) => {
  e.preventDefault()
  for (const f of e.dataTransfer.files) {
    openFile(f.path)
  }
  return false
}

function openFile (path) {
  fs.readFile(path, 'utf-8', (err, data) => {
    if (err) {
      console.log('An error ocurred reading the file :' + err.message)
      return
    }
    parseCsv(data)
  })
}

function getBudgets () {
  try {
    const path = os.homedir() + '/Library/Application Support/Actual/global-store.json'
    const actualSettings = JSON.parse(fs.readFileSync(path))
    this.selectedBudget = actualSettings.lastBudget
    const documentDir = actualSettings['document-dir'] || os.homedir() + '/Documents/Actual'
    this.budgets = fs.readdirSync(documentDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)
  } catch (error) {
    console.error(error)
    return { selectedBudget: '', budgets: [] }
  }
  return { selectedBudget: this.selectedBudget, budgets: this.budgets }
}

function parseCsv (data) {
  const records = parse(data, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true
  })

  records.forEach(record => {
    Vue.set(app.importAccounts, record.MyAccountNumber, {
      name: record.MyAccountName,
      balance: parseFloat(record.MyAccountBalance),
      number: record.MyAccountNumber
    })
    const newRecord = {
      ...record,
      Date: moment(moment.unix(record.Date).format('YYYY-MM-DD'), 'YYYY-MM-DD'),
      ValueDate: moment.unix(record.ValueDate)
    }
    Vue.set(app.importTransactions, newRecord.ID, newRecord)
  })

  Object.keys(app.importAccounts).forEach((key) => {
    const value = app.importAccounts[key]
    const transactionCount = Object.values(app.importTransactions).filter(transaction => transaction.MyAccountNumber === value.number).length
    app.importAccounts[key].transactions = transactionCount
  })

  app.loadAccounts()
}

function grandTotal (transactions) {
  return transactions.reduce((total, current) => { return total + current.amount }, 0) / 100
}

ipcRenderer.on('open-file', (event, message) => {
  openFile(message)
})
