import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Vote {
  email: string;
  choice: string;
  reason?: string;
  timestamp: number;
}

// In-memory store for demo purposes
let votes: Vote[] = [];

let poll = {
  id: "national-election-survey-2026",
  question: "Who is your preferred candidate for the upcoming election?",
  options: [],
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/poll", (req, res) => {
    res.json(poll);
  });

  app.post("/api/poll", (req, res) => {
    const { options } = req.body;
    if (!Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: "Options must be a non-empty array" });
    }
    poll.options = options;
    // Clear votes when poll options change to avoid inconsistency in demo
    votes = [];
    res.json({ message: "Poll updated successfully", poll });
  });

  app.get("/api/votes", (req, res) => {
    // In a real app, check for admin auth here
    res.json(votes);
  });

  app.post("/api/votes", (req, res) => {
    const { email, choice, reason } = req.body;
    
    if (!email || !choice) {
      return res.status(400).json({ error: "Email and choice are required" });
    }

    // Check if user already voted
    const existingVote = votes.find(v => v.email === email);
    if (existingVote) {
      return res.status(400).json({ error: "You have already cast your vote." });
    }

    const newVote: Vote = {
      email,
      choice,
      reason,
      timestamp: Date.now(),
    };

    votes.push(newVote);
    res.status(201).json({ message: "Vote cast successfully" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
