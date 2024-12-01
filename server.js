require('dotenv').config();

const WebSocket = require('ws');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('.'));

// MongoDB Verbindung
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// MongoDB Schemas
const QuestionSchema = new mongoose.Schema({
  text: String,
  answers: [String],
  correctAnswer: Number,
  timeLimit: Number
});

const Question = mongoose.model('Question', mongoose.Schema);

const GameRoom = {
  id: null,
  players: [],
  currentQuestion: null,
  timer: null,
  scores: {}
};

const rooms = new Map();

// API Endpoints für Fragen
app.post('/api/questions', async (req, res) => {
    try {
        const question = new Question(req.body);
        await question.save();
        res.status(201).json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

// WebSocket Server auf einem anderen Port
const WS_PORT = process.env.WS_PORT || 3001;
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  let playerRoom = null;
  let playerName = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch(data.type) {
        case 'join':
          playerName = data.username;
          playerRoom = joinRoom(ws, playerName);
          break;

        case 'answer':
          if (playerRoom) {
            handleAnswer(playerRoom, playerName, data.answer);
          }
          break;
      }
    } catch (err) {
      console.error('Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Ein Fehler ist aufgetreten' }));
    }
  });

  ws.on('close', () => {
    if (playerRoom && playerName) {
      removePlayerFromRoom(playerRoom, playerName);
    }
  });
});

function joinRoom(ws, username) {
  let room = findAvailableRoom();
  if (!room) {
    room = createNewRoom();
  }
  
  room.players.push({ ws, username });
  room.scores[username] = 0;
  
  if (room.players.length >= 2) {
    startGame(room);
  }
  
  return room;
}

function startGame(room) {
  sendNextQuestion(room);
}

async function sendNextQuestion(room) {
  const question = await Question.aggregate([{ $sample: { size: 1 } }]).exec();
  if (!question) return;

  room.currentQuestion = question;
  room.timer = setTimeout(() => handleQuestionTimeout(room), question.timeLimit * 1000);

  broadcastToRoom(room, {
    type: 'question',
    question: {
      text: question.text,
      answers: question.answers,
      timeLimit: question.timeLimit
    }
  });
}

function handleAnswer(room, username, answer) {
  if (!room.currentQuestion) return;

  if (answer === room.currentQuestion.correctAnswer) {
    room.scores[username] += 100;
  }

  broadcastScores(room);
}

function broadcastToRoom(room, message) {
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  });
}

function broadcastScores(room) {
  const scores = Object.entries(room.scores).map(([username, points]) => ({
    username,
    points
  }));
  
  broadcastToRoom(room, {
    type: 'scores',
    scores
  });
}