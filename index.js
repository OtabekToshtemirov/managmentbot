require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');

const app = express();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Ma'lumotlar bazasi ulanishi
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/taskdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

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
                [{ text: '/edittask' }, { text: '/deletetask' }],
                [{ text: '/completetask' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        }
    };
    bot.sendMessage(chatId, "Xush kelibsiz! Men sizga vazifalaringizni boshqarishda yordam beraman. " +
        "Vazifaning qo'shish uchun /addtask komandasini, barcha vazifalaringizni ko'rish uchun /tasks komandasini, " +
        "vazifani o'zgartirish uchun /edittask komandasini, vazifani o'chirish uchun /deletetask komandasini kiriting.", opts);
});

// Vazifa qo'shish
bot.onText(/\/addtask/, (msg) => {
    const chatId = msg.chat.id;
    let task = { userId: chatId };

    bot.sendMessage(chatId, "Vazifaning sarlavhasini kiriting:");
    bot.once('message', (msg) => {
        task.title = msg.text;
        bot.sendMessage(chatId, "Vazifaning tavsifini kiriting:");
        bot.once('message', (msg) => {
            task.description = msg.text;
            bot.sendMessage(chatId, "Amal qilish muddatini (YYYY-MM-DD) kiriting:");
            bot.once('message', (msg) => {
                task.deadline = new Date(msg.text);
                bot.sendMessage(chatId, "Ustuvorlikni kiriting (yuqori, o'rta, past):");
                bot.once('message', (msg) => {
                    task.priority = msg.text;
                    task.category = 'General';
                    task.completed = false;
                    const newTask = new Task(task);
                    newTask.save().then(() => {
                        bot.sendMessage(chatId, "Vazifa muvaffaqiyatli qo'shildi!");
                    }).catch(err => {
                        bot.sendMessage(chatId, "Xatolik yuz berdi: " + err.message);
                    });
                });
            });
        });
    });
});

// Barcha vazifalarni ko'rish
bot.onText(/\/tasks/, async (msg) => {
    const tasks = await Task.find({ userId: msg.chat.id });
    let response = "Sizning vazifalaringiz:\n\n";
    tasks.forEach((task, index) => {
        response += `${index + 1}. ${task.title} - ${task.description} - ${task.deadline.toLocaleDateString()} - ${task.priority} - ${task.completed ? 'Bajarilgan' : 'Bajarilmagan'}\n`;
    });
    bot.sendMessage(msg.chat.id, response);
});

// Vazifani o'zgartirish
bot.onText(/\/edittask/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "O'zgartirmoqchi bo'lgan vazifangizni raqamini kiriting:");
    bot.once('message', async (msg) => {
        const taskNumber = parseInt(msg.text);
        const tasks = await Task.find({ userId: chatId });
        const task = tasks[taskNumber - 1];
        if (task) {
            bot.sendMessage(chatId, "Yangi sarlavhani kiriting:");
            bot.once('message', (msg) => {
                task.title = msg.text;
                bot.sendMessage(chatId, "Yangi tavsifni kiriting:");
                bot.once('message', (msg) => {
                    task.description = msg.text;
                    bot.sendMessage(chatId, "Yangi amal qilish muddatini (YYYY-MM-DD) kiriting:");
                    bot.once('message', (msg) => {
                        task.deadline = new Date(msg.text);
                        bot.sendMessage(chatId, "Yangi ustuvorlikni kiriting (yuqori, o'rta, past):");
                        bot.once('message', (msg) => {
                            task.priority = msg.text;
                            task.save().then(() => {
                                bot.sendMessage(chatId, "Vazifa muvaffaqiyatli o'zgartirildi!");
                            }).catch(err => {
                                bot.sendMessage(chatId, "Xatolik yuz berdi: " + err.message);
                            });
                        });
                    });
                });
            });
        } else {
            bot.sendMessage(chatId, "Vazifa topilmadi.");
        }
    });
});

// Vazifani o'chirish
bot.onText(/\/deletetask/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "O'chirmoqchi bo'lgan vazifangizni raqamini kiriting:");
    bot.once('message', async (msg) => {
        const taskNumber = parseInt(msg.text);
        const tasks = await Task.find({ userId: chatId });
        const task = tasks[taskNumber - 1];
        if (task) {
            task.remove().then(() => {
                bot.sendMessage(chatId, "Vazifa muvaffaqiyatli o'chirildi!");
            }).catch(err => {
                bot.sendMessage(chatId, "Xatolik yuz berdi: " + err.message);
            });
        } else {
            bot.sendMessage(chatId, "Vazifa topilmadi.");
        }
    });
});

// Vazifani bajarilgan deb belgilash
bot.onText(/\/completetask/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Bajarilgan deb belgilamoqchi bo'lgan vazifangizni raqamini kiriting:");
    bot.once('message', async (msg) => {
        const taskNumber = parseInt(msg.text);
        const tasks = await Task.find({ userId: chatId });
        const task = tasks[taskNumber - 1];
        if (task) {
            task.completed = true;
            task.save().then(() => {
                bot.sendMessage(chatId, "Vazifa bajarilgan deb belgilandi!");
            }).catch(err => {
                bot.sendMessage(chatId, "Xatolik yuz berdi: " + err.message);
            });
        } else {
            bot.sendMessage(chatId, "Vazifa topilmadi.");
        }
    });
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
