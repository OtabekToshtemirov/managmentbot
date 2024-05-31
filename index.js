require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');

const app = express();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: true});

// Ma'lumotlar bazasi ulanishi
mongoose.connect('mongodb://localhost:27017/taskdb');

const TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    deadline: Date,
    priority: String,
    category: String,
    completed: Boolean,
    userId: Number
});

const Task = mongoose.model('Task', TaskSchema);

// Start komandasi
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            keyboard: [
                [{ text: '/tasks' }, { text: '/addtask' }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        }
    };
    bot.sendMessage(msg.chat.id, "Xush kelibsiz! Men sizga vazifalaringizni boshqarishda yordam beraman." +
        "Vazifangizni qo'shish uchun /addtask komandasini, barcha vazifalaringizni ko'rish uchun /tasks komandasini kiriting.", opts);
});

// Vazifa qo'shish
bot.onText(/\/addtask/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Vazifaning sarlavhasini kiriting:");

    // Sarlavha uchun javob kutish
    bot.once('message', async (msg) => {
        const title = msg.text;
        bot.sendMessage(chatId, "Vazifaning tavsifini kiriting:");

        // Tavsif uchun javob kutish
        bot.once('message', async (msg) => {
            const description = msg.text;
            bot.sendMessage(chatId, "Amal qilish muddatini (YYYY-MM-DD) kiriting:");

            // Muddat uchun javob kutish
            bot.once('message', async (msg) => {
                const deadline = new Date(msg.text);
                bot.sendMessage(chatId, "Ustuvorlikni kiriting (yuqori, o'rta, past):");

                // Ustuvorlik uchun javob kutish
                bot.once('message', async (msg) => {
                    const priority = msg.text;
                    const newTask = new Task({title, description, deadline, priority, category: 'General', completed: false});
                    await newTask.save();
                    bot.sendMessage(chatId, "Vazifa muvaffaqiyatli qo'shildi!");
                });
            });
        });
    });
});

// Barcha vazifalarni ko'rish
bot.onText(/\/tasks/, async (msg) => {
    const tasks = await Task.find({completed: false});
    let response = "Sizning vazifalaringiz:\n\n";
    tasks.forEach((task, index) => {
        response += `${index + 1}. ${task.title} - ${task.description} - ${task.deadline.toLocaleDateString()} - ${task.priority}\n`;
    });
    bot.sendMessage(msg.chat.id, response);
});



// eslatma uchun
cron.schedule('0 8 * * *', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await Task.find({
        completed: false,
        deadline: {
            $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
            $lt: new Date(tomorrow.setHours(23, 59, 59, 999))
        }
    });

    tasks.forEach(task => {
        bot.sendMessage(task.userId, `Ertaga bajariladigan vazifangiz bor: ${task.title} - ${task.description}`);
    });
});


// Serverni ishga tushirish
app.listen(3000, () => {
    console.log('Server 3000-portda ishga tushdi');
});
