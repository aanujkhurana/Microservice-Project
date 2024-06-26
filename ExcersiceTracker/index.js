require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create user schema and model
const userSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model('User', userSchema);

// Create exercise schema and model
const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userId = req.params._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const exercise = new Exercise({
      userId,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });
    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Get exercise logs for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let query = { userId };
    if (from) query.date = { $gte: from };
    if (to) query.date = { ...query.date, $lte: to };

    let exercises = await Exercise.find(query).limit(limit);
    const count = exercises.length;

    const user = await User.findById(userId);
    const logs = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));

    res.json({ username: user.username, _id: user._id, count, log: logs });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
