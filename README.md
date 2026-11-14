# StockPile

A simple offline tracker for money in and out, stock, and debts. It runs entirely on your own phone.

**Open it here:** https://stockpile-apk.github.io/StockPile-/

- **Private:** your entries are stored only in your phone's browser. Nothing is sent anywhere.
- **Offline:** after the first visit it works with no internet.
- **Lockable:** set a PIN under More to encrypt your data and backups, and save the recovery key it gives you.
- **Separate books:** keep more than one business, each with its own money, stock and debts.
- **Sell screen:** ring up sales by item number or by scanning a barcode, with part payments and pay-later sales that go to the Owing tab.
- **Barcodes:** print labels for your products, or scan the barcode already on the packaging.
- **Personal books:** a household profile with spending categories, monthly budgets and receipt photos you can search by date and category.
- **Share between phones:** keep the same books on two phones, for a household budget or a second till, by passing a locked file between them. Entries from both are merged and stock counts add up. No internet or account needed.
- **Receipts and customers:** send or print a receipt, and see what each customer has bought and still owes.

## Install on Android

1. Open the link above in Chrome.
2. Tap the menu (⋮), then **Add to Home screen** or **Install app**.
3. Open StockPile from its icon.

## Good habits

- Back up regularly from **More → Back up now**, and keep a copy somewhere other than your phone.
- If you set a PIN, store the recovery key somewhere safe. Without the PIN, the recovery key or your security answers, nobody can open your data.

## Test copy

New changes are tried here first: https://stockpile-apk.github.io/StockPile-/beta/

The test copy keeps its own separate data, so nothing done there affects the main app. Once a change has been tried and works, it is copied to the main app.

## For developers

The whole app is `index.html`. `beta/index.html` is the test copy; the main app is `index.html` at the top level. Run the checks with `node tests/run.js` (Node 22 or newer).
