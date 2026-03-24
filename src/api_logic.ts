import express from "express";

export const TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
  "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram",
  "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
  "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
  "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
  "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
  "Vellore", "Viluppuram", "Virudhunagar"
];

interface Vote {
  email: string;
  choice: string;
  reason?: string;
  timestamp: number;
  district: string;
}

let votes: Vote[] = [];
let districts: Record<string, { candidates: string[] }> = {};
TN_DISTRICTS.forEach(d => {
  districts[d] = { candidates: [] };
});

interface GeneralVote {
  email: string;
  choice: string;
  reason?: string;
  timestamp: number;
}
let generalVotes: GeneralVote[] = [];
let generalPoll = { question: "General Polling", options: [] as string[] };

interface CandidateVote {
  email: string;
  name: string;
  choice: string;
  timestamp: number;
}
let candidateVotes: CandidateVote[] = [];
let candidatePoll = { candidates: [] as string[] };

export function setupRoutes(app: express.Express) {
  app.use(express.json());

  // Survey Poll Routes
  app.get("/api/poll", (req, res) => res.json(districts));
  app.post("/api/poll", (req, res) => {
    const { district, options } = req.body;
    if (!district || !districts[district]) return res.status(400).json({ error: "Valid district is required" });
    if (!Array.isArray(options) || options.length === 0) return res.status(400).json({ error: "Options must be a non-empty array" });
    districts[district].candidates = options;
    // Do NOT clear votes when updating candidates - preserve all district data
    res.json({ message: "Candidates updated successfully for " + district, districts });
  });

  app.get("/api/votes", (req, res) => res.json(votes));
  app.post("/api/votes", (req, res) => {
    const { email, choice, reason, district } = req.body;
    if (!email || !choice || !district) return res.status(400).json({ error: "Email, choice, and district are required" });
    if (!districts[district]) return res.status(400).json({ error: "Invalid district" });
    if (!districts[district].candidates.includes(choice)) return res.status(400).json({ error: "Invalid candidate choice." });
    if (votes.find(v => v.email === email && v.district === district)) return res.status(400).json({ error: `You have already cast your vote in ${district}.` });
    votes.push({ email, choice, reason, timestamp: Date.now(), district });
    res.status(201).json({ message: "Vote cast successfully" });
  });

  // General Polling
  app.get("/api/general/poll", (req, res) => res.json(generalPoll));
  app.post("/api/general/poll", (req, res) => {
    const { question, options } = req.body;
    if (!Array.isArray(options) || options.length === 0) return res.status(400).json({ error: "Options must be a non-empty array" });
    generalPoll.question = question || "General Polling";
    generalPoll.options = options;
    generalVotes = [];
    res.json({ message: "General poll updated", poll: generalPoll });
  });
  app.get("/api/general/votes", (req, res) => res.json(generalVotes));
  app.post("/api/general/votes", (req, res) => {
    const { email, choice, reason } = req.body;
    if (!email || !choice) return res.status(400).json({ error: "Email and choice are required" });
    if (!generalPoll.options.includes(choice)) return res.status(400).json({ error: "Invalid option choice." });
    if (generalVotes.find(v => v.email === email)) return res.status(400).json({ error: "You have already cast your vote." });
    generalVotes.push({ email, choice, reason, timestamp: Date.now() });
    res.status(201).json({ message: "Vote cast successfully" });
  });

  // Candidate Polling
  app.get("/api/candidate/poll", (req, res) => res.json(candidatePoll));
  app.post("/api/candidate/poll", (req, res) => {
    const { candidates } = req.body;
    if (!Array.isArray(candidates) || candidates.length < 2 || candidates.length > 5) return res.status(400).json({ error: "Please select between 2 and 5 candidates." });
    candidatePoll.candidates = candidates;
    candidateVotes = [];
    res.json({ message: "Candidates updated successfully", poll: candidatePoll });
  });
  app.get("/api/candidate/votes", (req, res) => res.json(candidateVotes));
  app.post("/api/candidate/votes", (req, res) => {
    const { email, name, choice } = req.body;
    if (!email || !name || !choice) return res.status(400).json({ error: "Email, Name, and choice required" });
    if (!candidatePoll.candidates.includes(choice)) return res.status(400).json({ error: "Invalid choice." });
    if (candidateVotes.find(v => v.email === email)) return res.status(400).json({ error: "Already voted." });
    candidateVotes.push({ email, name, choice, timestamp: Date.now() });
    res.status(201).json({ message: "Vote cast successfully" });
  });
}
