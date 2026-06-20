# Tasks

## Now
- Run database_schema.sql in Supabase SQL editor
- Load extension unpacked in chrome://extensions, test onboarding including cooldown mode

## Confirm or revert my judgment calls
- Hard mode phrase changed to "I am choosing distraction over my goal" in extension/content.js
- Cooldown mode is now the default recommended option in onboarding.html

## Your assets
- Replace extension/icons/icon16.png icon48.png icon128.png, currently empty
- Add web/app/favicon.ico
- Add logo and brand assets to web/public

## Before launch
- Deploy web to Vercel, set env vars there
- Update API_BASE_URL in extension/config.js to the Vercel URL
- Rotate Gemini key and Supabase service role key
- Write a privacy policy page, required for Chrome Web Store

## Launching for real user testing
Two paths.

Fast path, no review wait. Zip the extension folder and send to a few testers. They load it unpacked via chrome://extensions Developer Mode. No developer account needed. Best for the first handful of testers right now.

Real path, no dev mode needed for testers. Chrome Web Store developer account, 5 dollar one time fee. Upload a zip. Set visibility to Private and list tester emails, or Unlisted for a link anyone can use without it showing in search. Needs icons, at least one screenshot, a privacy policy link, and justification text for the all_urls permission since it is broad. Review takes hours to a few days.

Recommend the fast path now since icons and privacy policy are not ready, then move to Web Store once those exist.

## Payments later
- Set PREMIUM_FOR_ALL to false in extension/config.js and on Vercel
- Build checkout flow and webhook to set is_pro true in Supabase
