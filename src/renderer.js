// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {ipcRenderer} = require('electron')
const fs = require('fs')
const parse = require('csv-parse/lib/sync')
const Vue = require('vue/dist/vue.common')
const actual = require('@actual-app/api')
const ElectronStore = require('electron-store');
const moment = require('moment')

const store = new ElectronStore();
const budget = "Meins"

var app = new Vue({
  el: '#app',
  data: {
    selectedAccount: null,
    selectedImportAccount: 'default',
    accounts: {},
    importAccounts: {},
    importTransactions: {},
    accountMatch: {}
  },
  methods: {
    selectAccount: function (id) {
      this.selectedAccount = id
      this.selectedImportAccount = this.accountMatch[id] || 'default'
    },
    loadAccounts: async function () {
      this.accounts = await actual.runWithBudget(budget, async function() {
        return await Promise.all((await actual.getAccounts()).map(async (account) => {
          let transactions = (await actual.getTransactions(account.id)).map( (transaction) => {
            return {...transaction, date: moment(transaction.date, 'YYYY-MM-DD')}
          })
          let balance = transactions.reduce((total, current) => { return total + current.amount }, 0) / 100
          let firstTransaction = moment(transactions.reduce((max, current) => { 
            return current.date.valueOf() > max ? current.date.valueOf() : max
          }, 0))

          return {...account, transactions, balance, firstTransaction }
        }))
      })
    },
    discardTransactions: function () {
      this.importAccounts = {}
      this.importTransactions = {}
    },
    transactionCount: function(id) {
      let importId = this.accountMatch[id]
      let importAccount = this.importAccounts[importId]
      if (!importId || !importAccount || !importAccount.transactions || importAccount.transactions == 0) { return 'No transactions' }


      if (importAccount.transactions == 1) { return 'One transaction' }
      return `${importAccount.transactions} transactions`
    },
    inSync: function(accountId, importAccountId) {
      let account = this.accounts.find(acc => acc.id == accountId)
      let importAccount = importAccountId != null ? this.importAccounts[importAccountId] : this.importAccounts[this.accountMatch[accountId]]
      if (!account || !importAccount) { return null }
      return account.balance === importAccount.balance
    }
  },
  mounted() {
    let storedMatches = store.get('accountMatch')
    if (storedMatches) {
      this.accountMatch = storedMatches;
    }
  },
  watch: {
    accountMatch(newMatches) {
      if(newMatches !== {}) {
        store.set('accountMatch', newMatches)
        console.log('Save', newMatches)
      }
    },
    selectedImportAccount(newValue) {
      if (newValue !== 'default') {
        Vue.set(this.accountMatch, this.selectedAccount, newValue)
      }
    }
  }
})

app.loadAccounts()

var content = document.getElementById('app')
content.ondragover = () => {
  return false;
};
content.ondragleave = () => {
  return false;
};
content.ondragend = () => {
  return false;
};
content.ondrop = (e) => {
  e.preventDefault();
  for (let f of e.dataTransfer.files) {
      openFile(f.path)
  }
  return false;
};

function openFile(path) {
  fs.readFile(path, 'utf-8', (err, data) => {
    if(err){
        console.log("An error ocurred reading the file :" + err.message);
        return;
    }
    parseCsv(data)
  })
}

function parseCsv(data) {
  const records = parse(data, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true
  })

  records.forEach( record => {
    Vue.set(app.importAccounts, record.MyAccountNumber, {
      name: record.MyAccountName,
      balance: parseFloat(record.MyAccountBalance),
      number: record.MyAccountNumber,
    })
    let newRecord = {
      ...record,
      Date: moment.unix(record.Date),
      ValueDate: moment.unix(record.ValueDate)
    }
    Vue.set(app.importTransactions, newRecord.ID, newRecord)
  })

  Object.keys(app.importAccounts).forEach((key) => {
    let value = app.importAccounts[key]
    let transactionCount = Object.values(app.importTransactions).filter(transaction => transaction.MyAccountNumber == value.number).length
    app.importAccounts[key]['transactions'] = transactionCount
  })
}

ipcRenderer.on('open-file', (event, message) => {
    openFile(message)
})