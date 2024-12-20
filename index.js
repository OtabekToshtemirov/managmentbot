require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { connectDB } = require('./config/database');
const { bot, initBot } = require('./config/bot');
const TaskController = require('./controllers/taskController');

const app = express();
app.use(express.json());

// Connect to database and initialize bot
async function initialize() {
  await connectDB();
  await initBot();
}

initialize().catch(console.error);

// Bot commands
bot.onText(/\/start/, TaskController.handleStart);
bot.onText(/\/newtask/, TaskController.handleNewTask);
bot.onText(/\/tasks/, TaskController.handleViewTasks);
bot.onText(/\/completetask/, TaskController.handleCompleteTask);

// Schedule daily task check
cron.schedule('0 20 * * *', TaskController.checkTomorrowTasks);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});