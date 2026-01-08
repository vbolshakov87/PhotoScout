# Changelog

All notable changes to PhotoScout.

## [1.0.0] - 2026-01-08

### 🎉 Initial Release

#### Features

**Backend (AWS)**
- ✅ AWS Lambda-based API with streaming responses
- ✅ DynamoDB for data storage (conversations, messages, plans)
- ✅ S3 for HTML plan storage
- ✅ CloudFront CDN for global distribution
- ✅ Multi-LLM support (Claude Sonnet 4 & DeepSeek)
- ✅ Server-Sent Events for real-time streaming
- ✅ Automatic data cleanup with TTL

**Web App**
- ✅ React 18 with TypeScript
- ✅ Vite for fast development
- ✅ Tailwind CSS for styling
- ✅ Real-time chat interface
- ✅ Conversation history
- ✅ Trip plans management
- ✅ Responsive design

**iOS App**
- ✅ Native SwiftUI interface
- ✅ Google OAuth 2.0 authentication
- ✅ Native bottom navigation (TabView)
- ✅ Pull-to-refresh & swipe-to-delete
- ✅ Offline-ready architecture
- ✅ WKWebView for chat interface
- ✅ Native list views for plans and history
- ✅ Profile menu with sign-out

#### Technical Improvements

**iOS Architecture**
- Created `AuthenticationService` for OAuth management
- Created `GoogleSignInView` with beautiful sign-in UI
- Enhanced `WebView` component with URL monitoring
- Integrated authentication with `APIService`
- Added persistent authentication via UserDefaults
- Implemented JWT token decoding
- Added profile display in History tab

**Infrastructure**
- Fixed S3 permissions for plan uploads
- Configured CORS for all Lambda functions
- Set up CloudFront behaviors for API routing
- Implemented proper error handling
- Added logging for debugging

**Code Quality**
- Removed unused files and directories
- Cleaned up project structure
- Updated all documentation
- Fixed Xcode project configuration
- Resolved build errors

#### Documentation

**New Documentation**
- 📖 [README.md](../README.md) - Main project overview
- 📖 [docs/IOS_APP.md](IOS_APP.md) - Comprehensive iOS guide
- 📖 [docs/API.md](API.md) - Complete API reference
- 📖 [docs/AUTHENTICATION.md](AUTHENTICATION.md) - OAuth setup guide
- 📖 [docs/DEPLOYMENT.md](DEPLOYMENT.md) - Deployment instructions
- 📖 [docs/CHANGELOG.md](CHANGELOG.md) - This file
- 📖 [ios/README.md](../ios/README.md) - iOS quick start
- 📖 [ios/TESTFLIGHT.md](../ios/TESTFLIGHT.md) - TestFlight guide

**Removed Documentation**
- ❌ AUTH_SETUP.md (consolidated into AUTHENTICATION.md)
- ❌ CLAUDE_CODE_PROMPT.md (obsolete)
- ❌ CLAUDE_CODE_TODO.md (obsolete)
- ❌ IMPLEMENTATION_SUMMARY.md (obsolete)
- ❌ README_CLAUDE_CODE.md (obsolete)
- ❌ TESTING_GUIDE.md (integrated into main docs)
- ❌ UPDATES_SUMMARY.md (obsolete)
- ❌ ios/IOS_APP_SUMMARY.md (replaced by docs/IOS_APP.md)

#### Build Status

- ✅ Backend builds successfully
- ✅ Web app builds successfully
- ✅ iOS app builds successfully
- ✅ All tests passing

#### Known Issues

None at this time.

---

## Version Format

Format: `[MAJOR.MINOR.PATCH]`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

## Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

Last updated: January 8, 2026
