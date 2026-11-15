# Screenshot-to-listing upgrade (no paid AI API)

This upgrade adds an on-device OCR screenshot importer to **Sell → An item for sale**. It uses `tesseract.js` in the browser, suggests a product-photo crop (lower-middle portion), lets the member adjust the crop, uploads the cropped image to your existing Vercel Blob upload endpoint, and pre-fills the existing listing form. All fields must be reviewed and the existing form submitted. Listings are forced to `PENDING` for admin review.

**This is not AI object detection.** The initial crop is a heuristic and may include private chat content; adjust it before uploading. OCR accuracy depends on screenshot quality. It never invents missing price/contact details. Crop and text are processed in the browser; only the selected crop is uploaded. Tesseract may download language assets on first use.

## Files changed
- `src/components/ScreenshotImporter.tsx` (new)
- `src/components/ListingForm.tsx` (adds importer to item listings)
- `src/app/actions.ts` (requires approved membership for creation and always sets pending)
- `src/app/api/upload/route.ts` (requires approved membership for image upload)
- `package.json` (adds tesseract.js)

## Install and deploy (Mac)
1. Back up your website repo. Extract the ZIP to `~/Downloads/BuySell-Screenshot-Updated` (the ZIP contains a nested `BuySell_State-College-main` directory).
2. In Terminal:

```bash
cd ~/Downloads/BuySell_State-College
git checkout -b screenshot-listings
rsync -av --exclude='.git' --exclude='.env' --exclude='.env.local' --exclude='node_modules' \
  ~/Downloads/BuySell-Screenshot-Updated/BuySell_State-College-main/ ./
npm install
npm run build
git status
git add src/components/ScreenshotImporter.tsx src/components/ListingForm.tsx src/app/actions.ts src/app/api/upload/route.ts package.json package-lock.json SCREENSHOT_LISTING_SETUP.md
git commit -m "Add screenshot-to-listing OCR and crop"
git push -u origin screenshot-listings
```

If `package-lock.json` does not exist, remove it from `git add`. Check the extracted folder name using `ls` before running `rsync`.

3. Open a pull request into `main`. Verify the Vercel preview deployment before merging.
4. In Vercel, retain the existing `DATABASE_URL`, `SESSION_SECRET`, and Blob storage connection (`BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN`). **No new environment variables are required for OCR.** No Prisma schema changes are required.
5. Test as an approved member: `/sell?type=item` → screenshot → adjust crop → Use details and cropped photo → verify and fill missing fields → submit → check `/admin` for pending listing.
6. Test as a visitor or pending member: creating a listing and uploading photos should be denied.

**Note:** This patch is based on the uploaded `BuySell_State-College-main_updated.zip`. It may need merging if the live GitHub branch has newer changes. It has not been verified by a successful production build/deployment.
