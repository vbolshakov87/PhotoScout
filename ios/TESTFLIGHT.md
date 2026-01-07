# TestFlight Deployment Guide

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at: https://developer.apple.com/programs/

2. **App Store Connect Access**
   - https://appstoreconnect.apple.com/

## Step 1: Configure Xcode Project

1. Open PhotoScout.xcodeproj in Xcode
2. Select the PhotoScout target
3. Go to "Signing & Capabilities" tab

### Set Bundle Identifier
- Change from `com.yourcompany.PhotoScout` to your unique identifier
- Example: `com.yourname.PhotoScout`

### Enable Automatic Signing
- Check "Automatically manage signing"
- Select your Team (your Apple Developer account)
- Xcode will create provisioning profiles automatically

## Step 2: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: PhotoScout
   - **Primary Language**: English
   - **Bundle ID**: (select the one you configured in Xcode)
   - **SKU**: com.yourname.photoscout (any unique identifier)
   - **User Access**: Full Access

## Step 3: Archive and Upload

### In Xcode:

1. **Select "Any iOS Device (arm64)" as destination** (not simulator)
2. **Product → Archive** (this takes a few minutes)
3. When done, the Organizer window opens
4. Select your archive → Click **"Distribute App"**
5. Choose **"App Store Connect"**
6. Choose **"Upload"**
7. Keep defaults, click **"Next"** through the steps
8. Click **"Upload"**

Wait 5-10 minutes for Apple to process the build.

## Step 4: Enable TestFlight

1. Go to App Store Connect → Your App → TestFlight tab
2. Your build will appear under "iOS builds"
3. Fill in required info:
   - Export Compliance: Answer the encryption questions
   - Test Information: What to test

### Add Internal Testers:
1. Click "Internal Testing" → "+"
2. Add testers (must have App Store Connect access)
3. Testers get email with TestFlight link

### Add External Testers:
1. Click "External Testing" → "+"
2. Create a test group
3. Add testers by email (they don't need developer accounts)
4. Submit for Beta App Review (first time only, ~24 hours)
5. Once approved, testers get TestFlight invite

## Step 5: Testers Install App

Testers need:
1. Install TestFlight app from App Store
2. Click invite link from email
3. Install PhotoScout from TestFlight

## Updating the App

When you make changes:

1. Increment build number in Xcode:
   - Select target → General tab
   - Increment "Build" number (e.g., 1 → 2)

2. Archive and upload again (Step 3)
3. New build appears in TestFlight automatically
4. Testers get notified of update

## Important Notes

- **Build numbers must always increment** (can't reuse)
- **Version number** (e.g., 1.0.0) can stay same during testing
- First external TestFlight requires Beta App Review (~24 hours)
- Subsequent builds with same features don't need re-review
- Internal testers (App Store Connect users): instant access
- External testers: need initial Beta App Review

## Troubleshooting

**"No signing certificate"**:
- Xcode → Preferences → Accounts → Download Manual Profiles

**"Build not appearing"**:
- Wait 5-10 minutes after upload
- Check email for processing errors

**Export compliance**:
- If app only uses HTTPS (which we do), answer "No" to encryption questions
