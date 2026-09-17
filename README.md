# 🔥 Squad AI Accountability App (3 Friends)

A collaborative mobile application built with **React Native (Expo)**, **PostgreSQL (Neon.tech)**, and **Google Gemini AI**.
Designed for a private 3-friend accountability circle to post daily achievements, photos/videos, track streaks, and receive candid AI accountability audits and dynamic performance charts.

---

## 📁 Project Structure

```
squad/
├── backend/                  # Node.js + Express + Prisma (PostgreSQL) + Gemini AI + Socket.io
│   ├── prisma/
│   │   └── schema.prisma     # Complete DB Schema (Users, 3-friend Squads, Goals, Achievements, Media, Messages)
│   ├── src/
│   │   ├── config/           # Prisma client and environment settings
│   │   ├── controllers/      # Auth, Squad, Achievement, and Chat controllers
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Gemini AI Coach (impact audit & chart dataset generation) & Multer media uploads
│   │   ├── sockets/          # Socket.io realtime chat & AI streaming
│   │   └── server.ts         # Express server entrypoint
│   ├── .env                  # Neon.tech & Gemini API keys (fill here!)
│   └── package.json
└── mobile/                   # React Native (Expo SDK 52) Mobile App
    ├── src/
    │   ├── api/client.ts     # Axios client & WebSocket connector
    │   └── screens/
    │       ├── SquadChatScreen.tsx       # Live feed + chat + AI critique badges + peer verification
    │       ├── LogAchievementScreen.tsx  # Daily win logger (title, category, time, photo/video proof)
    │       ├── InsightsChartsScreen.tsx  # Dynamic visual progress charts & on-demand AI queries
    │       └── SquadMembersScreen.tsx    # 3-member roster, streaks, goals & invite code
    ├── App.tsx               # Bottom Tab & Modal Navigation
    └── package.json
```

---

## ⚡ Step 1: Configure Backend Environment

Open `backend/.env` and paste your Neon.tech database URL and Google Gemini API key:

```env
# Neon.tech PostgreSQL connection string
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require"

PORT=4000
NODE_ENV=development

# Google Gemini API key
GEMINI_API_KEY="your_gemini_api_key_here"

CLIENT_URL="*"
```

---

## 🚀 Step 2: Push Database Schema to Neon.tech

Run this command inside the `backend` folder to automatically create all tables in your Neon PostgreSQL database:

```bash
cd backend
npx prisma db push
```

---

## 🌐 Step 3: Start the Backend Server

```bash
cd backend
npm run dev
```
The server will start on `http://localhost:4000` with the Socket.io WebSocket ready for live chat.

---

## 📱 Step 4: Run the React Native Mobile App

In a separate terminal:

```bash
cd mobile
npm install
npx expo start
```
- Press **`a`** to open in Android Emulator, or scan the QR code using the **Expo Go** app on your physical phone (iOS / Android).
- *(Note: If testing on a physical phone, update `API_BASE_URL` in `mobile/src/api/client.ts` to your computer's local Wi-Fi IP address, e.g. `http://192.168.1.50:4000`).*

---

## 🤖 AI Coach Capabilities

1. **Impact vs Vanity Audit**:
   - Every time a squad member posts an achievement, Gemini evaluates whether it is real progress or superficial busywork.
   - Assigns an **Impact Score (1-10)**, an **AI Verdict**, candid feedback, and next steps.
2. **On-Demand Charts**:
   - Members can type `@AI generate weekly progress chart` or `@AI compare our consistency` in the chat or insights screen to generate dynamic comparison charts.
3. **Peer Verification**:
   - Fellow friends can tap **"Verify Proof"** to confirm that the photo/video proof is legitimate.
