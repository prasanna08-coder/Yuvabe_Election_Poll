import express from "express";

const TN_DISTRICTS = [
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
  email: string; choice: string; reason?: string; timestamp: number; district: string;
}
let votes: Vote[] = [];
let districts: Record<string, { candidates: string[] }> = {};
TN_DISTRICTS.forEach(d => { districts[d] = { candidates: [] }; });

let generalVotes: any[] = [];
let generalPoll = { question: "General Polling", options: [] as string[] };
let candidateVotes: any[] = [];
let candidatePoll = { candidates: [] as string[] };

const app = express();
app.use(express.json());

// API Routes
app.get("/api/poll", (req, res) => res.json(districts));
app.post("/api/poll", (req, res) => {
  const { district, options } = req.body;
  if (!district || !districts[district]) return res.status(400).json({ error: "Valid district is required" });
  districts[district].candidates = options;
  votes = votes.filter(v => v.district !== district);
  res.json({ message: "Updated", districts });
});

app.get("/api/votes", (req, res) => res.json(votes));
app.post("/api/votes", (req, res) => {
  const { email, choice, reason, district } = req.body;
  if (!email || !choice || !district) return res.status(400).json({ error: "Missing fields" });
  votes.push({ email, choice, reason, timestamp: Date.now(), district });
  res.status(201).json({ message: "Vote cast" });
});

app.get("/api/general/poll", (req, res) => res.json(generalPoll));
app.post("/api/general/poll", (req, res) => {
  const { question, options } = req.body;
  generalPoll.question = question || "General Polling";
  generalPoll.options = options;
  generalVotes = [];
  res.json({ message: "Updated", poll: generalPoll });
});
app.get("/api/general/votes", (req, res) => res.json(generalVotes));
app.post("/api/general/votes", (req, res) => {
  const { email, choice } = req.body;
  generalVotes.push({ email, choice, timestamp: Date.now() });
  res.status(201).json({ message: "Vote cast" });
});

app.get("/api/candidate/poll", (req, res) => res.json(candidatePoll));
app.post("/api/candidate/poll", (req, res) => {
  const { candidates } = req.body;
  candidatePoll.candidates = candidates;
  candidateVotes = [];
  res.json({ message: "Updated", poll: candidatePoll });
});
app.get("/api/candidate/votes", (req, res) => res.json(candidateVotes));
app.post("/api/candidate/votes", (req, res) => {
  const { email, name, choice } = req.body;
  candidateVotes.push({ email, name, choice, timestamp: Date.now() });
  res.status(201).json({ message: "Vote cast" });
});

export default app;
