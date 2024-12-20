require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { Client } = require('pg');
const cron = require('node-cron');

const app = express();
app.use(express.json());

// Bot initialization in webhook mode
const url = 'https://managmentbot.vercel.app';
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  webHook: {
    port: process.env.PORT || 3000
  }
});

// Set webhook
bot.setWebHook(`${url}/api/webhook`).catch(console.error);

// PostgreSQL connection setup
const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

client.connect()
  .then(() => console.log('PostgreSQL connected successfully'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// Define Task schema and model using PostgreSQL
const createTaskTable = async () => {
  try {
    await client.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          deadline DATE NOT NULL,
          priority VARCHAR(50) DEFAULT 'medium',
          category VARCHAR(100) DEFAULT 'General',
          completed BOOLEAN DEFAULT FALSE,
          userId BIGINT NOT NULL
        );
            
    `);
    console.log('Table created successfully');
  } catch (err) {
    console.error('Error creating table:', err);
  }
};

createTaskTable();

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const opts = {
    reply_markup: {
      keyboard: [
        [{ text: '/tasks' }, { text: '/addtask' }],
        [{ text: '/edittask' }, { text: '/deletetask' }],
        [{ text: '/completetask' }]
      ],
      resize_keyboard: true,
    }
  };

  bot.sendMessage(chatId, "Salom men sizga qilishingiz kerak bo'lgan ishlarni eslatib turaman, shuningdek, sizning qo'llanma qilingan ishlarni o'zgartirishingiz va ishlarni tugatishingiz mumkin.\n" +
    "Commands:\n" +
    "/addtask - Yangi vazifa qo'shish\n" +
    "/tasks - Vazifalar ro'yxatini ko'rish\n" +
    "/edittask - Vazifa o'zgartirish\n" +
    "/deletetask - Vazifa o'chirish\n" +
    "/completetask - Vazifa tugatish", opts);
});

// Add task command
bot.onText(/\/addtask/, async (msg) => {
    const chatId = msg.chat.id;
    let task = { userId: chatId };
  
    try {
      task.title = await getUserInput(chatId, "Yangi vazifa uchun sarlavhani kiriting:");
      task.description = await getUserInput(chatId, "Vazifa haqida qisqacha ma'lumot kiriting:");
      task.deadline = new Date(await getUserInput(chatId, "Vazifani tugatish vaqtni kiriting (Yil-Oy-kun):"));
      
      // Priority selection with inline keyboard
      const priorityOptions = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Muhim', callback_data: 'priority_high' },
              { text: 'O\'rta', callback_data: 'priority_medium' },
              { text: 'Muhim emas', callback_data: 'priority_low' }
            ]
          ]
        }
      };
      
      await bot.sendMessage(chatId, "Vazifani darajasini tanlang:", priorityOptions);
  
      // Wait for priority selection
      task.priority = await new Promise((resolve) => {
        bot.once('callback_query', (callbackQuery) => {
          const priority = callbackQuery.data.split('_')[1];
          bot.answerCallbackQuery(callbackQuery.id);
          resolve(priority);
        });
      });
  
      const query = `
        INSERT INTO tasks (title, description, deadline, priority, userId)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const values = [task.title, task.description, task.deadline, task.priority, chatId];
  
      const res = await client.query(query, values);
      bot.sendMessage(chatId, "Vazifa muvaffaqiyatli qo'shildi!");
    } catch (err) {
      bot.sendMessage(chatId, "Error: " + err.message);
    }
  });

// View tasks command
bot.onText(/\/tasks/, async (msg) => {
  const chatId = msg.chat.id;
  const query = `
    SELECT * FROM tasks WHERE userId = $1;
  `;

  try {
    const res = await client.query(query, [chatId]);
    if (res.rows.length === 0) {
      bot.sendMessage(chatId, "Vazifalar ro'yxati bo'sh.");
      return;
    }

    let response = "Sizning vazifalaringiz:\n\n";
    res.rows.forEach((task, index) => {
      response += `${index + 1}. ${task.title} - ${task.description} - ${task.deadline.toLocaleDateString()} - ${task.priority} - ${task.completed ? 'Completed' : 'Pending'}\n`;
    });

    bot.sendMessage(chatId, response);
  } catch (err) {
    bot.sendMessage(chatId, "Error: " + err.message);
  }
});
// Edit task command
bot.onText(/\/edittask/, async (msg) => {
    const chatId = msg.chat.id;
  
    // Fetch tasks for the user
    const query = `SELECT * FROM tasks WHERE userId = $1;`;
  
    try {
      const res = await client.query(query, [chatId]);
      if (res.rows.length === 0) {
        bot.sendMessage(chatId, "Sizning vazifalaringiz ro'yxati bo'sh.");
        return;
      }
  
      // Display tasks to the user for selection
      let taskList = "Sizning vazifalaringiz:\n\n";
      res.rows.forEach((task, index) => {
        taskList += `${index + 1}. ${task.title} - ${task.description} - ${task.deadline.toLocaleDateString()} - ${task.priority} - ${task.completed ? 'Completed' : 'Pending'}\n`;
      });
  
      bot.sendMessage(chatId, taskList);
  
      // Wait for the user to select a task
      bot.once('message', async (msg) => {
        const taskIndex = parseInt(msg.text) - 1;
  
        if (isNaN(taskIndex) || taskIndex < 0 || taskIndex >= res.rows.length) {
          bot.sendMessage(chatId, "Noto'g'ri tanlov, qayta urinib ko'ring.");
          return;
        }
  
        const task = res.rows[taskIndex];
  
        // Ask the user for new details of the task
        const updatedTask = { id: task.id };
  
        try {
          updatedTask.title = await getUserInput(chatId, "Yangi sarlavhani kiriting(yoki o'zgarishsiz qolishi uchun boshqa buyruq tanlang):");
          updatedTask.description = await getUserInput(chatId, "Yangi ma'lumot kiriting(yoki o'zgarishsiz qolishi uchun boshqa buyruq tanlang):");
          updatedTask.deadline = await getUserInput(chatId, "Yangi muddatni kiriting(Yil-Oy-Kun) (yoki o'zgarishsiz qolishi uchun boshqa buyruq tanlang):");
  
          // Priority selection with inline keyboard
          const priorityOptions = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Muhim', callback_data: 'priority_high' },
                  { text: 'Orta', callback_data: 'priority_medium' },
                  { text: 'Muhim emas', callback_data: 'priority_low' }
                ]
              ]
            }
          };
  
          await bot.sendMessage(chatId, "Muhimlilik darajasini tanlang:", priorityOptions);
  
          updatedTask.priority = await new Promise((resolve) => {
            bot.once('callback_query', (callbackQuery) => {
              const priority = callbackQuery.data.split('_')[1];
              bot.answerCallbackQuery(callbackQuery.id);
              resolve(priority);
            });
          });
  
          // Update the task in the database
          const updateQuery = `
            UPDATE tasks
            SET title = COALESCE(NULLIF($1, ''), title),
                description = COALESCE(NULLIF($2, ''), description),
                deadline = COALESCE(NULLIF($3, '')::DATE, deadline),
                priority = COALESCE(NULLIF($4, ''), priority)
            WHERE id = $5
            RETURNING *;
          `;
          const updateValues = [
            updatedTask.title,
            updatedTask.description,
            updatedTask.deadline,
            updatedTask.priority,
            updatedTask.id
          ];
  
          const updateRes = await client.query(updateQuery, updateValues);
          const updated = updateRes.rows[0];
  
          bot.sendMessage(chatId, `Vazifa muvaffaqiyatli o'zgartirildi:\n\nTitle: ${updated.title}\nDescription: ${updated.description}\nDeadline: ${updated.deadline.toLocaleDateString()}\nPriority: ${updated.priority}`);
        } catch (err) {
          bot.sendMessage(chatId, "Xatolik: " + err.message);
        }
      });
    } catch (err) {
      bot.sendMessage(chatId, "Xatolik: " + err.message);
    }
  });
  

// Complete task command
bot.onText(/\/completetask/, async (msg) => {
  const chatId = msg.chat.id;
  const query = `
    SELECT * FROM tasks WHERE userId = $1 AND completed = FALSE;
  `;

  try {
    const res = await client.query(query, [chatId]);
    if (res.rows.length === 0) {
      bot.sendMessage(chatId, ".");
      return;
    }

    const taskList = res.rows.map((task, index) => `${index + 1}. ${task.title}`).join('\n');
    bot.sendMessage(chatId, `Yakunlangan vazifani belgilash uchun tanlang:\n\n${taskList}`);

    bot.once('message', async (msg) => {
      const taskIndex = parseInt(msg.text) - 1;

      if (isNaN(taskIndex) || taskIndex < 0 || taskIndex >= res.rows.length) {
        bot.sendMessage(chatId, "Noto'g'ri tanlov, qayta urinib ko'ring.");
        return;
      }

      const task = res.rows[taskIndex];
      const updateQuery = `
        UPDATE tasks SET completed = TRUE WHERE id = $1 RETURNING *;
      `;

      const updateValues = [task.id];
      const result = await client.query(updateQuery, updateValues);
      bot.sendMessage(chatId, `Vazifa "${result.rows[0].title}" yakunlandi.`);
    });
  } catch (err) {
    bot.sendMessage(chatId, "Xatolik: " + err.message);
  }
});

// Reminder feature
cron.schedule('0 8 * * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
  
    // Format tomorrow's date as 'YYYY-MM-DD'
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
  
    const query = `
      SELECT userId, title, description, deadline 
      FROM tasks 
      WHERE completed = FALSE AND deadline = $1::DATE;
    `;
    const values = [tomorrowDate];
  
    try {
      const res = await client.query(query, values);
  
      if (res.rows.length === 0) {
        console.log(`Ertangi kun uchun vazifalar mavjud emas: ${tomorrowDate}.`);
        return;
      }
  
      res.rows.forEach(task => {
        const message = `
          Eslatma: Ertangi kun uchun vazifangiz mavjud!
          Vazifa: ${task.title}
          Tasvir: ${task.description || 'Izoh yozilmagan.'}
          Yakuniy sana: ${new Date(task.deadline).toLocaleDateString()}
        `;
        bot.sendMessage(task.userId, message.trim());
      });
  
      console.log(`Bildirishnoma yuborildi: ${tomorrowDate}.`);
    } catch (err) {
      console.error(`Xatolik ${tomorrowDate}:`, err.message);
    }
  });
  

// Get user input utility function
async function getUserInput(chatId, prompt) {
  return new Promise((resolve, reject) => {
    bot.sendMessage(chatId, prompt);
    bot.once('message', (msg) => {
      if (msg.text) resolve(msg.text);
      else reject(new Error("Noto'g'ri buyruq"));
    });
  });
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
