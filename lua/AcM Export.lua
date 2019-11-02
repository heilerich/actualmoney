--
-- MoneyMoney Export Extension
-- http://moneymoney-app.com/api/export
--
-- Copyright (c) 2012-2017 MRH applications GmbH. All rights reserved.
--
--
-- Export transactions as CSV file.
--

local md5 = require 'md5'

-- CSV settings.
local encoding     = "UTF-8"
local utf_bom      = false
local separator    = ";"
local linebreak    = "\n"
local reverseOrder = false


Exporter{version          = 1.09,
         format           = MM.localizeText("ActualMoney"),
         fileExtension    = "actualmoney",
         reverseOrder     = reverseOrder,
         bundleIdentifier = "de.heilerich.actualmoney",
         description      = "Export to ActualMoney"}


local function csvField (str)
  -- Helper function for quoting separator character and escaping double quotes.
  if str == nil then
    return ""
  elseif string.find(str, '[' .. separator .. '"]') then
    return '"' .. string.gsub(str, '"', '""') .. '"'
  else
    return str
  end
end


function WriteHeader (account, startDate, endDate, transactionCount) 
  assert(io.write(MM.toEncoding(encoding, csvField("Date") .. separator ..
                                          csvField("ValueDate") .. separator ..
                                          csvField("ID") .. separator ..
                                          csvField("Name") .. separator ..
                                          csvField("Purpose") .. separator ..
                                          csvField("Account") .. separator ..
                                          csvField("Bank") .. separator ..
                                          csvField("MyAccountName") .. separator ..
                                          csvField("MyAccountNumber") .. separator ..
                                          csvField("MyAccountBalance") .. separator ..
                                          csvField("Amount") .. separator ..
                                          csvField("Currency") .. linebreak, utf_bom)))
end


function WriteTransactions (account, transactions)
  for _,transaction in ipairs(transactions) do
    if not transaction.booked then goto continue end

    -- Append comments and metadata to transaction purpose.
    local purpose = transaction.purpose
    if string.len(transaction.comment) > 0 then
      if string.len(purpose) > 0 then
        purpose = purpose .. ", "
      end
      purpose = purpose .. MM.localizeText("Comment") .. ": " .. transaction.comment
    end
    if string.len(transaction.bookingText) > 0 then
      if string.len(purpose) > 0 then
        purpose = purpose .. ", "
      end
      purpose = purpose .. MM.localizeText("Transaction type") .. ": " .. transaction.bookingText
    end
    if string.len(transaction.returnReason) > 0 then
      if string.len(purpose) > 0 then
        purpose = purpose .. ", "
      end
      purpose = purpose .. MM.localizeText("Return reason") .. ": " .. transaction.returnReason
    end
    if string.len(transaction.endToEndReference) > 0 then
      if string.len(purpose) > 0 then
        purpose = purpose .. ", "
      end
      purpose = purpose .. MM.localizeText("Reference") .. ": " .. transaction.endToEndReference
    end
    if string.len(transaction.mandateReference) > 0 then
      if string.len(purpose) > 0 then
        purpose = purpose .. ", "
      end
      purpose = purpose .. MM.localizeText("Mandate") .. ": " .. transaction.mandateReference
    end
    if string.len(transaction.creditorId) > 0 then
      if string.len(purpose) > 0 then
        purpose = purpose .. ", "
      end
      purpose = purpose .. MM.localizeText("Creditor ID") .. ": " .. transaction.creditorId
    end

    -- Write one line per transaction.
    assert(io.write(MM.toEncoding(encoding, csvField(transaction.bookingDate) .. separator ..
                                            csvField(transaction.valueDate) .. separator ..
                                            csvField(md5.sumhexa(transaction.valueDate .. transaction.bookingDate .. transaction.accountNumber .. transaction.bankCode .. transaction.transactionCode .. transaction.purposeCode .. transaction.bookingKey .. transaction.creditorId ..  purpose .. math.abs(transaction.amount * 100))) .. separator ..
                                            csvField(transaction.name) .. separator ..
                                            csvField(purpose) .. separator ..
                                            csvField(transaction.accountNumber) .. separator ..
                                            csvField(transaction.bankCode) .. separator ..
                                            csvField(account.name) .. separator ..
                                            csvField(account.bankCode .. account.accountNumber) .. separator ..
                                            csvField(account.balance) .. separator ..
                                            csvField(transaction.amount) .. separator ..
                                            csvField(transaction.currency) .. linebreak)))
  ::continue::
  end
end


function WriteTail (account)
  -- Nothing to do.
end
