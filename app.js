require('dotenv').config();
const express = require('express');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes'); 
const expenseRoutes = require('./routes/expenseRoutes');
const taskRoutes = require('./routes/taskRoutes');
const groupRoutes = require('./routes/groupRoutes');

const app = express();


app.use(express.json());
app.use('/api', userRoutes);
app.use('/api', eventRoutes);
app.use('/api', expenseRoutes);
app.use('/api', taskRoutes);
app.use('/api', groupRoutes);

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log('Server running on port 3000');
});

module.exports = app;