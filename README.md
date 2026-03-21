<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  # 🗳️ Yuvabe Election Poll
  
  **An interactive, real-time election survey application built with React, Vite, and Express.**
</div>

---

## 🚀 Features

- **Real-Time Polling**: Securely cast and tally votes dynamically.
- **Modern UI/UX**: Designed using Tailwind CSS and Lucide React icons.
- **Interactive Visualizations**: View survey results powered by Recharts.
- **AI Integration**: Integrated with the Gemini API for advanced analytical insights.
- **Production Ready**: Fully configured Express/TypeScript backend serving an optimized Vite SPA.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Backend**: Express, TypeScript, tsx
- **AI & Data**: Google GenAI, Recharts

## 💻 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Gemini API Key (get one from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prasanna08-coder/Yuvabe_Election_Poll.git
   cd Yuvabe_Election_Poll
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Rename `.env.example` to `.env` (or create `.env.local`) and add your API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app in the browser.

## ☁️ Deployment

This project is configured out-of-the-box for easy deployment to platforms like **Vercel** and **Render**.

**Build Command**: `npm install && npm run build`  
**Start Command**: `npm start`  

**Live Demo**: [https://yuvabe-election-poll.vercel.app/](https://yuvabe-election-poll.vercel.app/)

## 📝 License

This project is open-source and available under the MIT License.
