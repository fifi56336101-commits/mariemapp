# DermAssist - AI-Powered Pressure Ulcer Care Assistant

A mobile application for pressure ulcer (bedsore) analysis, staging, and management using AI vision technology.

## 🏥 Features

### Core Features
- **AI Wound Analysis**: Google Gemini Vision API for pressure ulcer detection and NPIAP staging
- **Emergency Detection**: Automatic urgency flagging with emergency call integration
- **Multi-Language Support**: English, French, Spanish, and Arabic
- **Patient Information Form**: Collect age, duration, pain level, wound location, and symptoms
- **Camera Integration**: Take photos or upload from gallery

### 🚨 Emergency Call Feature
- **Automatic Urgency Detection**: AI flags wounds as CRITICAL, HIGH, MEDIUM, or LOW urgency
- **Emergency Banner**: Visual alert for dangerous cases requiring immediate attention
- **One-Tap Emergency Call**: Call 112 (universal), 911 (US), 15 (France/Morocco), etc.
- **Doctor Contact**: Quick access to contact healthcare providers

### 🔔 Care Reminders
- **Dressing Change Reminders**: Configurable intervals (6h, 12h, 24h, 48h)
- **Wound Check Reminders**: Daily wound inspection notifications
- **Position Change Alerts**: Prevent pressure buildup (1-4 hour intervals)
- **Morning/Evening Care**: Daily care routine reminders at 8 AM and 8 PM

### 📊 Data Management
- **Wound Journal**: Track wound evolution over time with photos
- **Analysis History**: Save and review past analyses with visual timeline
- **Local & Cloud Storage**: Works offline with automatic sync
- **Export & Backup**: Data export and cloud backup (coming soon)

### 🔒 Authentication & Security
- **Email/Password Auth**: Secure sign up and sign in
- **Guest Mode**: Try the app without creating an account
- **HIPAA-Compliant Design**: Secure data handling

## 📱 Screenshots

| Home Screen | Wound Analysis | Emergency Alert |
|-------------|----------------|-----------------|
| ![Home](assets/screenshots/home.png) | ![Analysis](assets/screenshots/analysis.png) | ![Emergency](assets/screenshots/emergency.png) |

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI
- MongoDB (local or MongoDB Atlas free tier)
- Google Gemini API key (free tier available)
- Xcode (for iOS build - Mac only)

### 1. Install Dependencies

```bash
# Clone the repository
git clone <repo-url>
cd DermAssist

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dermassist
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a free API key
3. Add to `backend/.env`

### 4. Start Backend

```bash
cd backend
npm run dev
```

### 5. Run Mobile App

#### Option A: Expo Go (Quick Testing)
```bash
npx expo start
# Scan QR code with Expo Go app
```

#### Option B: Local iOS Build (Full Features)
```bash
# Generate native iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/DermAssist.xcodeproj

# In Xcode:
# 1. Sign in with your Apple ID (free account works)
# 2. Select your Personal Team
# 3. Connect iPhone
# 4. Press ⌘+R to build and install
```

## 📁 Project Structure

```
DermAssist/
├── App.js                    # Main app entry
├── app.json                  # Expo configuration
├── backend/                  # Express + MongoDB backend
│   ├── server.js            # API server
│   ├── models/              # User, Analysis models
│   ├── routes/              # Auth, Analysis routes
│   └── .env                 # Environment config
├── src/
│   ├── components/          # Button, Input, Disclaimer, etc.
│   ├── screens/             # All app screens
│   │   ├── HomeScreen.js
│   │   ├── PatientFormScreen.js
│   │   ├── CameraScreen.js
│   │   ├── ResultsScreen.js
│   │   ├── HistoryScreen.js
│   │   ├── ChatScreen.js
│   │   ├── SettingsScreen.js
│   │   ├── ReminderSettingsScreen.js
│   │   └── DataManagementScreen.js
│   ├── services/            # Business logic
│   │   ├── authService.js
│   │   ├── geminiService.js
│   │   ├── storageService.js
│   │   └── reminderService.js
│   ├── navigation/          # React Navigation setup
│   ├── config/              # API URLs, theme
│   └── i18n/                # Translations (en, fr, es, ar)
└── assets/                  # Icons, splash screen
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/signin` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/signout` | Logout user |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analysis` | Get user's analysis history |
| POST | `/api/analysis` | Save new analysis |
| GET | `/api/analysis/:id` | Get single analysis |
| DELETE | `/api/analysis/:id` | Delete analysis |

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| React Native + Expo | Cross-platform mobile app |
| Express.js | Backend REST API |
| MongoDB + Mongoose | Database & ODM |
| JWT | Authentication |
| Google Gemini 2.x | AI image analysis |
| i18next | Multi-language support |
| React Navigation | Screen navigation |
| Expo Camera | Camera integration |
| Expo Notifications | Care reminders |

## ⚠️ Medical Disclaimer

**This app is for educational and informational purposes only.** It does NOT provide clinical diagnoses and should NOT replace professional medical advice. Always consult a qualified healthcare provider for proper diagnosis and treatment of pressure ulcers.

## 📄 License

MIT License - Free to use and modify

## 👨‍🎓 About

Final Year Project - AI-Powered Pressure Ulcer Care Assistant

Developed to help patients and caregivers monitor and manage pressure ulcers with AI assistance.
