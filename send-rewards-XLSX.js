const { LCDClient, MnemonicKey, MsgSend, MsgExecuteContract, isTxError } = require('@terra-money/terra.js');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MICRO = 1_000_000;
const MAX_AMOUNT = 5000;
const NATIVE_DENOMS = { LUNC: 'uluna', USTC: 'uusd' };

const terra = new LCDClient({
  URL: 'https://lcd.terra-classic.hexxagon.io/',
  chainID: 'columbus-5',
});

// === Helpers ===
function askQuestion(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, ans => {
    rl.close();
    res(ans.trim());
  }));
}

function loadFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  const wb = xlsx.readFile(filename);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}

function buildMsgs(entries, wallet) {
  const msgs = [];
  const summary = [];

  for (const entry of entries) {
    const { address, amount, type, token } = entry;
    const recipient = (address || '').trim();
    const amt = parseFloat(amount);
    const tokenType = (type || '').toLowerCase();
    const tokenInfo = (token || '').trim();

    if (!recipient || isNaN(amt) || !tokenType || !tokenInfo) {
      summary.push({ recipient, status: '❌ Invalid entry', type: tokenType });
      continue;
    }

    if (amt > MAX_AMOUNT) {
      summary.push({ recipient, status: `⚠️ Amount > ${MAX_AMOUNT}`, type: tokenType });
      continue;
    }

    const microAmount = Math.round(amt * MICRO);

    if (tokenType === 'native') {
      const denom = NATIVE_DENOMS[tokenInfo.toUpperCase()];
      if (!denom) {
        summary.push({ recipient, status: '❌ Invalid native token', type: tokenType });
        continue;
      }
      msgs.push(new MsgSend(wallet.key.accAddress, recipient, { [denom]: microAmount.toString() }));
      summary.push({ recipient, amount: amt, type: 'native', denom, status: '✅ Ready' });
    } else if (tokenType === 'cw20') {
      if (!tokenInfo.startsWith('terra1')) {
        summary.push({ recipient, status: '❌ Invalid CW20 contract', type: tokenType });
        continue;
      }
      msgs.push(new MsgExecuteContract(wallet.key.accAddress, tokenInfo, {
        transfer: { recipient, amount: microAmount.toString() },
      }));
      summary.push({ recipient, amount: amt, type: 'cw20', contract: tokenInfo, status: '✅ Ready' });
    } else {
      summary.push({ recipient, status: '❌ Unknown type', type: tokenType });
    }
  }

  return { msgs, summary };
}

async function saveLog(filename, results) {
  const rows = results.map(r => ({
    address: r.recipient,
    type: r.type,
    status: r.status,
    extra: r.txhash || r.denom || r.contract || '',
  }));
  const sheet = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, sheet, 'Results');
  xlsx.writeFile(wb, filename);
  console.log(`📁 Results saved to ${filename}`);
}

// Get the mnemonic from the user
async function getMnemonic() {
  const mnemonic = await askQuestion("Enter your mnemonic phrase: ");
  return mnemonic;
}

async function main() {
  console.log('📥 Welcome to the Terra Classic Batch Sender');

  // Get the mnemonic
  const mnemonic = await getMnemonic();

  if (!mnemonic || mnemonic.split(' ').length < 24) {
    console.error('❌ Invalid or missing mnemonic');
    process.exit(1);
  }

  const mk = new MnemonicKey({ mnemonic });
  const wallet = terra.wallet(mk);

  // Ask for the file and check if it exists
  const file = await askQuestion('Enter file path (CSV or Excel): ');
  if (!fs.existsSync(file)) return console.error('❌ File not found.');

  const dryRun = (await askQuestion('Dry run only? (yes/no): ')).toLowerCase().startsWith('y');
  const entries = loadFile(file);

  // Build the messages from the file entries
  const { msgs, summary } = buildMsgs(entries, wallet);

  // Display the summary of entries
  console.table(summary.map(s => ({
    Address: s.recipient,
    Type: s.type,
    Status: s.status,
    Token: s.denom || s.contract || '',
  })));

  if (dryRun) {
    console.log('✅ Dry run complete. No transactions sent.');
    await saveLog('dryrun_results.xlsx', summary);
    return;
  }

  // Confirm before sending the transactions
  const confirm = await askQuestion(`\n🚀 Send ${msgs.length} valid transactions? (yes/no): `);
  if (!confirm.toLowerCase().startsWith('y')) {
    console.log('🚫 Cancelled by user.');
    return;
  }

  // Try to broadcast the transactions
  try {
    const tx = await wallet.createAndSignTx({
      msgs,
      gasPrices: { uluna: 28.4 },
      gasAdjustment: 1.4,
    });

    console.log('⏳ Broadcasting...');
    const result = await terra.tx.broadcast(tx);

    if (isTxError(result)) {
      console.error('❌ TX failed:', result.raw_log);
      summary.forEach(s => s.status = '❌ Failed');
    } else {
      console.log(`✅ TX Success! Hash: ${result.txhash}`);
      summary.forEach(s => {
        if (s.status === '✅ Ready') s.status = '✅ Sent';
        s.txhash = result.txhash;
      });
    }

    // Save the results to a log file
    await saveLog('tx_results.xlsx', summary);
  } catch (err) {
    console.error('❌ Error broadcasting:', err.message);
  }
}

// Run the main function
main().catch((err) => {
  console.error("❌ Error occurred: ", err.message);
});
