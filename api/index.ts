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

let votes: any[] = [];
let districts: any = {};
TN_DISTRICTS.forEach(d => { districts[d] = { candidates: [] }; });

let generalVotes: any[] = [];
let generalPoll = { question: "General Polling", options: [] as string[] };
let candidateVotes: any[] = [];
let candidatePoll = { candidates: [] as string[] };

const app = express();
app.use(express.json());

// Helper to wrap routes for error catching
const asyncHandler = (fn: any) => (req: any, res: any) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    res.status(500).json({ error: err.message, stack: err.stack });
  });
};

app.get("/api/poll", asyncHandler(async (req: any, res: any) => {
  res.json(districts);
}));

app.post("/api/poll", asyncHandler(async (req: any, res: any) => {
  const { district, options } = req.body;
  if (!district) return res.status(400).json({ error: "District is missing" });
  if (!districts[district]) {
      // Auto-initialize if for some reason it's missing (shouldn't happen but safe)
      districts[district] = { candidates: [] };
  }
  districts[district].candidates = options || [];
  // Do NOT clear votes when updating candidates - preserve all district data
  res.json({ message: "Updated", districts });
}));

app.get("/api/votes", asyncHandler(async (req: any, res: any) => {
  res.json(votes);
}));

app.post("/api/votes", asyncHandler(async (req: any, res: any) => {
  const { email, choice, reason, district } = req.body;
  if (!email || !choice || !district) return res.status(400).json({ error: "Missing fields" });
  votes.push({ email, choice, reason, timestamp: Date.now(), district });
  res.status(201).json({ message: "Vote cast" });
}));

app.get("/api/general/poll", asyncHandler(async (req: any, res: any) => {
  res.json(generalPoll);
}));

app.post("/api/general/poll", asyncHandler(async (req: any, res: any) => {
  const { question, options } = req.body;
  generalPoll.question = question || "General Polling";
  generalPoll.options = options || [];
  generalVotes = [];
  res.json({ message: "Updated", poll: generalPoll });
}));

app.get("/api/general/votes", asyncHandler(async (req: any, res: any) => {
  res.json(generalVotes);
}));

app.post("/api/general/votes", asyncHandler(async (req: any, res: any) => {
  const { email, choice } = req.body;
  generalVotes.push({ email, choice, timestamp: Date.now() });
  res.status(201).json({ message: "Vote cast" });
}));

app.get("/api/candidate/poll", asyncHandler(async (req: any, res: any) => {
  res.json(candidatePoll);
}));

app.post("/api/candidate/poll", asyncHandler(async (req: any, res: any) => {
  const { candidates } = req.body;
  candidatePoll.candidates = candidates || [];
  candidateVotes = [];
  res.json({ message: "Updated", poll: candidatePoll });
}));

app.get("/api/candidate/votes", asyncHandler(async (req: any, res: any) => {
  res.json(candidateVotes);
}));

app.post("/api/candidate/votes", asyncHandler(async (req: any, res: any) => {
  const { email, name, choice } = req.body;
  candidateVotes.push({ email, name, choice, timestamp: Date.now() });
  res.status(201).json({ message: "Vote cast" });
}));

export default app;
