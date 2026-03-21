# Yuvabe Election Survey

A full-stack election survey application that enables users to participate in polls, submit voting preferences, and analyze results in real time. The system is designed with a modern UI and a lightweight backend to simulate secure and scalable polling.

---

## Overview

Yuvabe Election Survey is a web-based platform built to collect and analyze voter insights. It supports real-time vote submission, prevents duplicate voting, and provides a foundation for data-driven election analysis.

---

## Features

- Real-time vote collection and tracking  
- One vote per user using email-based validation  
- Optional input for user reasoning  
- Dynamic poll configuration  
- Interactive data visualization  
- Clean and responsive user interface  
- Scalable backend architecture  

---

## Tech Stack

### Frontend
- React 19  
- Vite  
- Tailwind CSS  
- Framer Motion  

### Backend
- Node.js  
- Express  
- TypeScript  

### Data and Visualization
- Recharts  
- Google GenAI API  

---

## Project Structure

```
├── server.ts          # Express backend server
├── src/               # Frontend source code
├── dist/              # Production build output
├── package.json       # Project dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── vite.config.ts     # Vite configuration
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

---

### Installation

1. Clone the repository

```bash
git clone https://github.com/prasanna08-coder/Yuvabe_Election_Poll.git
cd Yuvabe_Election_Poll
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

Create a `.env` file in the root directory and add:

```env
GEMINI_API_KEY=your_api_key_here
```

---

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at:

[http://localhost:3000](http://localhost:3000)

---

## API Endpoints

### Get Poll Data
```http
GET /api/poll
```

### Update Poll Options
```http
POST /api/poll
```

### Get All Votes
```http
GET /api/votes
```

### Submit Vote
```http
POST /api/votes
```

---

## Key Implementation Details

- Votes are stored in-memory for demonstration purposes
- Duplicate voting is prevented using email-based validation
- Backend is built using Express with TypeScript support
- Frontend is served using Vite in development and static build in production

---

## Build and Deployment

Build the project:

```bash
npm run build
```

Run in production:

```bash
npm start
```

The project can be deployed on platforms such as Vercel or Render.

---

## Limitations

- Uses in-memory storage (not suitable for production)
- No authentication or authorization for admin routes
- Limited scalability without database integration

---

## Future Improvements

- Integrate database (MongoDB or PostgreSQL)
- Add authentication and role-based access
- Enhance analytics dashboard
- Implement secure voting mechanisms
- Deploy with CI/CD pipeline

---

## License

This project is open-source and available under the MIT License.
