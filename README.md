# Yuvabe Election Poll Platform
A multi-mode polling and election analytics platform designed for real-world use cases and scalable deployment.

## Live Demo (Production Deployment)

https://yuvabe-election-poll.vercel.app/

---

## Overview

Yuvabe Election Poll Platform is a multi-level polling and election simulation system that supports three distinct modes of voting within a single application:

- General Polling (survey-based voting)
- Candidate Polling (candidate-based voting system)
- State Election Dashboard (district-level election simulation)

The system is designed to demonstrate real-world election analytics, structured data handling, and scalable product design.

---

## Live Application Structure

The application consists of three independent sections:

### 1. General Polling

- Create custom questions  
- Add multiple options  
- Users can vote on options  
- Real-time response tracking  

### 2. Candidate Poll

- Add candidates dynamically  
- Each candidate receives votes  
- Simulates a simplified election system  
- Clear winner based on vote count  

### 3. State Election (Tamil Nadu Simulation)

- District-wise election system  
- Each district has:
  - Candidates  
  - Party mapping (DMK, ADMK, TVK, etc.)  
  - Independent vote storage  

- Displays:
  - District leaders  
  - State winner  
  - Party-wise dominance  

---

## Key Features

- Multi-mode architecture (3 independent systems in one app)  
- District-level data isolation (no data overwrite issues)  
- Real-time vote updates  
- State-level winner calculation based on district wins  

### Insights Provided

- Vote distribution  
- Market share  
- Margin of victory  
- Regional trends  

---

## Technical Architecture

### Frontend

- React + TypeScript  
- Vite-based setup  
- Tailwind CSS for UI  
- Modular components:
  - GeneralPolling.tsx  
  - CandidatePoll.tsx  
  - StateElection.tsx  

### Backend

- Node.js + Express server  
- REST API structure  
- Separate APIs for:
  - General polling  
  - Candidate voting  
  - State election logic  

### Deployment

- Configured for Vercel deployment  
- Static frontend + API routing  

---

## Core Logic

### Data Isolation

Each module maintains independent state:

- General polling → question-based data  
- Candidate polling → candidate vote counts  
- State election → district-wise structured data  

### District Handling

- Each district stores votes independently  
- Switching districts does not overwrite previous data  
- Ensures consistent analytics  

### State Winner Logic

- Each district produces a winner (based on votes)  
- Party-wise district wins are counted  
- Final state winner is determined by:  
  → Party with maximum district wins  

---

## Project Structure

```
src/
  App.tsx
  GeneralPolling.tsx
  CandidatePoll.tsx
  StateElection.tsx
  api_logic.ts

server.ts
index.html
package.json
```

## Getting Started

### Install Dependencies

```
npm install
```

### Run Development Server

```
npm run dev
```

### Build for Production

```
npm run build
npm run preview
```

## Deployment

The application is configured for deployment using:

- Frontend: Vercel (static build)  
- Backend: Node server (API routes)  

Deployment configuration available in:

- vercel.json  

---

## AI Tools Usage

AI tools were used as development assistants:

- Code structuring and modularization  
- Debugging state and data flow issues  
- Improving architecture and separation of concerns  

All outputs were manually reviewed and refined.

---

## Real-World Applications

- College election systems  
- Public opinion polling platforms  
- Media election dashboards  
- Event-based live voting systems  

---

## Product Potential

This system can evolve into a scalable product:

- SaaS platform for institutions  
- Election analytics tool for media companies  
- Real-time polling engine for events  

### Revenue Opportunities

- Subscription-based access  
- Analytics dashboard licensing  
- White-label solutions  

---

## Conclusion

Yuvabe Election Poll Platform demonstrates:

- Strong system design  
- Clean separation of logic  
- Real-world use case implementation  
- Scalable and extensible architecture  

It combines product thinking and engineering execution to build a complete polling ecosystem.
