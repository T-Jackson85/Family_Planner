require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const expenseRoutes = require('./routes/expenseRoutes');
const taskRoutes = require('./routes/taskRoutes');
const groupRoutes = require('./routes/groupRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3000", // React development server
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

// API Routes
app.use('/api', userRoutes);
app.use('/api', eventRoutes);
app.use('/api', expenseRoutes);
app.use('/api', taskRoutes);
app.use('/api', groupRoutes);


  app.use(express.static(path.join(__dirname,  'build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
