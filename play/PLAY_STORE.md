# StockPile on Google Play: launch kit

Prepared Nov 17, 2026. Plan: the free offline app goes on Google Play first; cloud sync and paid plans come later as an update.
Check Google's current rules at each step. Fees and tester rules below are what Google required as of mid-2026 and may have changed.

## 0. Before anything: promote the test copy
Finish the phone checklist on the test copy (https://stockpile-apk.github.io/StockPile-/beta/), then copy `beta/index.html` to `index.html`. Play should package the main app, never the test copy.

## 1. Google Play developer account (Rick, about 30 minutes plus waiting)
1. Go to https://play.google.com/console and sign up as a **personal** account (no registered business needed).
2. One-time fee: US$25 (about C$35). ID verification can take a few days.
3. New personal accounts must run a **closed test with at least 12 testers opted in for 14 days in a row** before they can publish to everyone. Start finding testers now: family, friends, people from school, a local business owner. Each needs a Gmail address and an Android phone, and must stay opted in all 14 days.

## 2. The one technical gotcha: the "asset links" file
StockPile goes on Play as a **Trusted Web Activity** (TWA): a small Android wrapper that opens the hosted app full-screen. For the app to open without a browser address bar, Android checks a file at the **root** of the website:

`https://stockpile-apk.github.io/.well-known/assetlinks.json`

StockPile lives at `/StockPile-/`, a sub-folder, so the file can't go in this repo. It needs a second repo named exactly **`Stockpile-apk.github.io`** (your GitHub "user site"). DoseDay can use the same file later.

Steps:
1. Create a public repo named `Stockpile-apk.github.io`. Turn on GitHub Pages from `main`.
2. Add an empty file named `.nojekyll` (otherwise GitHub hides folders that start with a dot).
3. Add `.well-known/assetlinks.json` using the contents PWABuilder gives you in step 3. It holds your package name and the SHA-256 fingerprint of your signing key.
4. After you upload to Play, add Play's **app signing** fingerprint too (Play Console → Test and release → App integrity). The file can list both fingerprints. Without Play's one, the store version shows an address bar.

Claude can make this repo and file for you once you have the fingerprints.

## 3. Build the Android package (PWABuilder, free, no Android tools needed)
1. Open https://www.pwabuilder.com and enter `https://stockpile-apk.github.io/StockPile-/`.
2. Choose **Package for stores → Android → Generate package**.
3. Settings:
   - Package ID: `io.github.stockpile_apk.stockpile` (permanent: it can never change after the first upload)
   - App name: `StockPile`, launcher name: `StockPile`
   - Version: `3.22.2` style name; version code `1` (each Play upload needs a higher code)
   - Display: standalone. Status bar / nav colour: `#1d2433`
   - Signing key: **Create new**. Fill in your name and Canada.
4. Download the zip. Inside: the `.aab` file to upload, `assetlinks.json`, and `signing.keystore` plus `signing-key-info.txt`.
5. **Keep `signing.keystore` and its passwords safe**, the same way you keep your StockPile recovery key: one copy off the phone, one printed. If it's lost you need Google support to reset the upload key.

## 4. Play Console listing
- **App name** (30 max): `StockPile: Money & Stock`
- **Short description** (80 max): `Offline tracker for sales, stock, debts and your household budget. No account.`
- **Full description:** see `listing.txt` in this folder.
- **Category:** Business (or Finance). **Tags:** inventory, point of sale, budget.
- **Contact email:** required. Use an address you're happy to show publicly; consider a separate Gmail just for the app.
- **Privacy policy URL:** `https://stockpile-apk.github.io/StockPile-/privacy.html` (live once this is pushed; it's also linked at the bottom of More).
- **Graphics:** app icon 512×512 (`icon-512.png`), feature graphic 1024×500 and phone screenshots: see the `play/` folder.

## 5. Policy forms (answers that match how StockPile works today)
- **Data safety:** Does your app collect or share any of the required user data types? **No.** (Everything stays on the phone; nothing is sent to you or anyone else.) Is data encrypted in transit? Not applicable, since none is transmitted. Deletion: users delete in-app (Erase all data) or by uninstalling.
- **Ads:** No ads.
- **App access:** All features available without login. If asked, say a PIN is optional and set by the user.
- **Content rating questionnaire:** Utility/productivity, no violence, no user-to-user chat, no gambling → expect "Everyone".
- **Target audience:** 18 and over (it handles money and business records).
- **Financial features declaration:** It's a record-keeping/budgeting tool. It doesn't move money, give loans, or connect to banks (bank statements are .csv files the user brings in). Answer the form on that basis.
- **Camera permission:** used for barcode scanning and receipt photos, only when the user taps to use it.

## 6. Order of release
1. Internal testing track (just you): install from Play, check that it opens with no address bar.
2. Closed testing track with your 12+ testers for 14 days. Ask them to actually open it a few times.
3. Apply for production access, then publish.
4. Later: cloud sync and paid plans as an update (subscriptions go through Play Billing; that needs a policy update and data safety changes).
