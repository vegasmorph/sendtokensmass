✅ README.md

# Terra Classic Batch CW20 & Native Token Sender

A Node.js script that reads an Excel or CSV file and sends native or CW20 token rewards on Terra Classic blockchain using your mnemonic. Supports dry-run and transaction logs.

---

## 📦 Features

- Send LUNC, USTC, or any CW20 tokens on Terra Classic
- Excel/CSV-based bulk sending
- Dry-run mode for preview
- TX hash logging and summary export

---

## 📊 Example Excel Format

Save your file as `.xlsx` or `.csv` with the following headers (case-insensitive):

| address                                | amount | type   | token                                  |
|----------------------------------------|--------|--------|----------------------------------------|
| terra1abc...xyz                        | 1.5    | native | LUNC                                   |
| terra1def...uvw                        | 2.0    | native | USTC                                   |
| terra1ghi...rst                        | 3.2    | cw20   | terra1contractaddressxxxxxxxxxxxxxx    |

- `address`: Recipient Terra address
- `amount`: Number of tokens to send (max 5)
- `type`: `native` for LUNC/USTC, or `cw20` for contract tokens
- `token`: `LUNC`, `USTC` or the CW20 contract address

---

## 🔧 Setup

### 1. 

Install dependencies
Node.js @terra-money/terra.js xlsx

```bash
npm install
2. Run the script
bash
Copy
Edit
node send-rewards-XLSX.js

You will be prompted to:

Enter your mnemonic phrase (run in a safe machine)

Provide the file path (e.g., airdrop.xlsx)

Choose dry-run mode (preview only)

Confirm to send real transactions (if not in dry-run)

📁 Output

dryrun_results.xlsx: Shows validation without sending tokens

tx_results.xlsx: Shows status of each transaction and TX hash

🔒 Security Tips

Never share your mnemonic phrase

Use on trusted and secured environments only

Double-check addresses and amounts before confirming

❓ FAQ

Q: Can I send more than 5000 tokens per row?

A: No. To prevent mistakes, 5000 is the default safety cap. You can change MAX_AMOUNT in the script if needed.


Q: What if a TX fails?

A: The status will show ❌ Failed and include the reason in console/log.

Q: Do I need to re-run for each batch?

A: Yes. Prepare a new file or edit the current one before re-running.



adptd from:   https://github.com/TCREVIVAL/Utility/
