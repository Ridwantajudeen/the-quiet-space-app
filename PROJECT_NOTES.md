# Project Notes - The Quiet Space

This file is a running list of things to update later, why they matter, and the signs that it is time to do them.

## 1) Replace `expo-av` (Deprecated)
Why:
- Expo warns that `expo-av` will be removed in SDK 54.
What you will notice:
- A warning in the console about `expo-av` deprecation.
- Eventually, SDK upgrade will break recording if not migrated.
What to do:
- Replace audio recording with `expo-audio`.
- (Later) replace video playback with `expo-video` when we build the daily reset screen.

## 2) Admin Website for Video Uploads (Planned)
Why:
- Users do NOT upload videos. Admin will.
What you will notice:
- We need a way to add a "daily reset" video to Firestore + Storage.
What to do:
- Build admin web app with login.
- Add upload page that stores video in Storage + creates Firestore `videos` doc.
- Enforce one video per day.

## 3) Backend Auth Hardening (Planned)
Why:
- Auth currently works but needs tighter validation and roles.
What you will notice:
- Need to secure routes and add token validation for all data endpoints.
What to do:
- Verify Firebase ID token in backend routes (`moods`, `journal`, `videos`).
- Add middleware to protect endpoints.

## 4) Voice Upload Storage Rules (Planned)
Why:
- Voice uploads are stored server-side; we should restrict access and expiry if needed.
What you will notice:
- Storage costs grow or privacy concerns arise.
What to do:
- Add retention policy or cleanup job.
- Optionally store signed URL expiry in DB and refresh when needed.

## 5) Payment / Premium (Future Phase)
Why:
- Premium is a boolean now; payments not integrated yet.
What you will notice:
- Need to sell premium or unlock premium content securely.
What to do:
- Add Stripe (or other) payment flow.
- Use server to update `users.isPremium`.

## 6) Replace Placeholder Screens (When ready)
Why:
- Several screens are placeholders right now.
What you will notice:
- UI still says "will live here" in tabs.
What to do:
- Build real screens for Mood, Journal list, Profile, and Insights.

## 7) Production API URL
Why:
- App currently uses `EXPO_PUBLIC_API_URL=http://localhost:4000`.
What you will notice:
- On device, requests will fail if API isn't reachable.
What to do:
- Change `EXPO_PUBLIC_API_URL` to your deployed backend URL.
- Update `.env.example` accordingly.

## 8) Permission Explanations (iOS Review)
Why:
- Apple expects a clear reason shown to users before permission prompts.
What you will notice:
- Review feedback if we request permissions without a calm explanation.
What to do:
- Keep pre-permission alerts for microphone + notifications (already added).
- When we add profile photo upload, show a gentle prompt before photo library access.

## 9) Admin Dashboard + Web Password Reset (Planned)
Why:
- We need an admin web dashboard to manage content and password resets.
What you will notice:
- Team needs a way to upload daily videos and help users reset passwords.
What to do:
- Build admin dashboard for video uploads.
- Add web flow to trigger password reset emails.
