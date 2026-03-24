# Yuvabe Election Poll Platform

## Overview

Yuvabe Election Poll Platform is a multi-level polling and election simulation system that supports three distinct voting modes within a single application:

- General Polling (survey-based voting)
- Candidate Poll (candidate-based voting)
- State Election Dashboard (district-level election simulation)

The platform demonstrates real-world system design by combining structured data handling, modular architecture, and analytics-driven insights.

---

## Live Demo

Add your deployed link here

---

## Screenshots

### General Polling
![General Polling](./assets/general.png)

### Candidate Poll
![Candidate Poll](./assets/candidate.png)

### State Election Dashboard
![State Election](./assets/state.png)

### Insights Dashboard
![Insights](./assets/insights.png)

---

## Demo Flow

### Step 1: General Polling
- Create a poll question
- Add multiple options
- Users can vote
- Results update dynamically

### Step 2: Candidate Poll
- Add candidates dynamically
- Users vote for candidates
- Winner is determined by vote count

### Step 3: State Election
- Select a district (e.g., Chennai, Ariyalur)
- Add candidates mapped to parties (DMK, ADMK, etc.)
- Vote within each district

### Step 4: District Insights
- Vote distribution
- Market share
- Margin of victory

### Step 5: State-Level Result
- District winners are calculated
- Party-wise wins are aggregated
- Final state winner is determined based on maximum district wins

---

## Key Features

- Multi-mode architecture (General, Candidate, State)
- Independent data handling for each module
- District-level data isolation
- Real-time vote updates
- State-level winner computation
- Insight generation:
  - Vote distribution
  - Market share
  - Margin of victory
  - Regional trends

---

## Technical Architecture

### Frontend
- React with TypeScript
- Vite build system
- Tailwind CSS for styling
- Modular components:
  - GeneralPolling.tsx
  - CandidatePoll.tsx
  - StateElection.tsx

### Backend
- Node.js with Express
- REST API design
- Separate endpoints for each module

### Deployment
- Configured for Vercel deployment
- Static frontend build with API routing

---

## Core Logic

### Data Isolation
Each module operates independently:
- General polling → question-based data
- Candidate polling → candidate vote counts
- State election → district-wise structured data

### District Handling
- Each district stores votes independently
- Switching districts does not overwrite previous data

### State Winner Logic
- Each district produces a winner
- Party-wise district wins are counted
- Final state winner is the party with the highest district wins

---

## Project Structure
