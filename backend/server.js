const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require("http");
const { Server } = require("socket.io");
const Request = require('./models/Request');


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/lifestream')
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Connection error:", err));

// Import routes
const donorRoutes = require('./routes/donorRoutes');
app.use('/donors', donorRoutes);

const hospitalRoutes = require('./routes/hospitalRoutes');
app.use('/hospitals', hospitalRoutes);

const requestRoutes = require('./routes/requestRoutes');
app.use('/requests', requestRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

// Leaderboard Schema & Routes
const LeaderboardSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  donorName: String,
  bloodGroup: String,
  score: Number,
  lives: Number,
  badge: String,
  date: { type: Date, default: Date.now }
});

LeaderboardSchema.index({ donorId: 1 }, { unique: true, sparse: true });

const Leaderboard = mongoose.model('Leaderboard', LeaderboardSchema);

async function getTopLeaderboard(filter = {}) {
  const entries = await Leaderboard.find(filter).sort({ score: -1, date: 1 }).lean();
  const bestByDonor = new Map();

  for (const entry of entries) {
    const donorKey = entry.donorId
      ? `id:${entry.donorId}`
      : `legacy:${(entry.donorName || '').trim().toLowerCase()}|${(entry.bloodGroup || '').trim().toUpperCase()}`;
    if (!bestByDonor.has(donorKey)) {
      bestByDonor.set(donorKey, entry);
    }
  }

  return [...bestByDonor.values()]
    .sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date))
    .slice(0, 10);
}

// Save score
app.post('/leaderboard', async (req, res) => {
  try {
    const { donorId, donorName, bloodGroup, score, lives } = req.body;
    const numericScore = Number(score);

    if (!donorName || !bloodGroup || !Number.isFinite(numericScore) || numericScore < 0) {
      return res.status(400).json({ error: 'A donor name, blood group, and non-negative score are required.' });
    }

    if (donorId && !mongoose.isValidObjectId(donorId)) {
      return res.status(400).json({ error: 'Invalid donor ID.' });
    }

    const legacyFilter = {
      donorId: { $exists: false },
      donorName,
      bloodGroup
    };
    const legacyEntries = donorId
      ? await Leaderboard.find(legacyFilter).select('score').lean()
      : [];
    const bestScore = Math.max(numericScore, ...legacyEntries.map(entry => Number(entry.score) || 0));
    const identityFilter = donorId
      ? { donorId: new mongoose.Types.ObjectId(donorId) }
      : { ...legacyFilter };

    const savedEntry = await Leaderboard.findOneAndUpdate(
      identityFilter,
      {
        $set: { donorName, bloodGroup, lives, date: new Date() },
        $max: { score: bestScore }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (donorId && legacyEntries.length > 0) {
      await Leaderboard.deleteMany(legacyFilter);
    }

    res.json({ message: 'Personal best saved!', score: savedEntry.score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get leaderboard (top 10 all-time)
app.get('/leaderboard', async (req, res) => {
  try {
    const entries = await getTopLeaderboard();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily leaderboard
app.get('/leaderboard/daily', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries = await getTopLeaderboard({ date: { $gte: today } });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weekly leaderboard
app.get('/leaderboard/weekly', async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const entries = await getTopLeaderboard({ date: { $gte: weekAgo } });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly leaderboard
app.get('/leaderboard/monthly', async (req, res) => {
  try {
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const entries = await getTopLeaderboard({ date: { $gte: monthAgo } });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All-time leaderboard
app.get('/leaderboard/all', async (req, res) => {
  try {
    const entries = await getTopLeaderboard();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('LifeStream backend is running 🚀');
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinBloodGroup", (bloodGroup) => {
    socket.join(bloodGroup);
    console.log(`Donor ${socket.id} joined room: ${bloodGroup}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Admin approves hospital request
app.post("/requests/approve/:id", async (req, res) => {
  const requestId = req.params.id;
  const approvedRequest = await Request.findByIdAndUpdate(
    requestId,
    { status: "approved" },
    { new: true }
  ).populate('hospitalId', 'name');

  if (!approvedRequest) {
    return res.status(404).json({ error: "Request not found" });
  }

  io.to(approvedRequest.bloodGroup).emit("requestApproved", {
    hospital: approvedRequest.hospitalId?.name || approvedRequest.hospitalName,
    bloodGroup: approvedRequest.bloodGroup
  });

  console.log("Emitting to room:", approvedRequest.bloodGroup);

  res.json({ success: true, message: "Request approved" });
});

// Start server (only once!)
const PORT = Number(process.env.PORT) || 5000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the running server or start with PORT=<different-port>.`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
