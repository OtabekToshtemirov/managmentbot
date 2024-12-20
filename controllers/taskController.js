const Task = require('../models/task');
const { bot } = require('../config/bot');

class TaskController {
  static async handleStart(msg) {
    const chatId = msg.chat.id;
    const message = `Salom! Men vazifalarni boshqarish botiman. 
    
Quyidagi buyruqlardan foydalanishingiz mumkin:
/newtask - Yangi vazifa qo'shish
/tasks - Barcha vazifalarni ko'rish
/completetask - Vazifani bajarilgan deb belgilash
/help - Yordam olish`;
    
    await bot.sendMessage(chatId, message);
  }

  static async handleNewTask(msg) {
    const chatId = msg.chat.id;
    try {
      const title = await getUserInput(chatId, "Vazifa nomini kiriting:");
      const description = await getUserInput(chatId, "Vazifa tavsifini kiriting (ixtiyoriy):");
      const deadline = await getUserInput(chatId, "Muddatni kiriting (YYYY-MM-DD formatida):");
      const priority = await getUserInput(chatId, "Muhimlik darajasini kiriting (low/medium/high):");
      
      const task = await Task.create(chatId, title, description, deadline, priority);
      await bot.sendMessage(chatId, "Vazifa muvaffaqiyatli qo'shildi!");
    } catch (error) {
      console.error('Error creating task:', error);
      await bot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
  }

  static async handleViewTasks(msg) {
    const chatId = msg.chat.id;
    try {
      const tasks = await Task.getAll(chatId);
      if (tasks.length === 0) {
        await bot.sendMessage(chatId, "Sizda hozircha vazifalar yo'q.");
        return;
      }

      const taskList = tasks.map(task => `
Vazifa: ${task.title}
Tasvir: ${task.description || 'Izoh yozilmagan'}
Muddat: ${new Date(task.deadline).toLocaleDateString()}
Holat: ${task.completed ? '✅ Bajarilgan' : '❌ Bajarilmagan'}
`).join('\n');

      await bot.sendMessage(chatId, taskList);
    } catch (error) {
      console.error('Error viewing tasks:', error);
      await bot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
  }

  static async handleCompleteTask(msg) {
    const chatId = msg.chat.id;
    try {
      const tasks = await Task.getIncomplete(chatId);
      if (tasks.length === 0) {
        await bot.sendMessage(chatId, "Sizda bajarilmagan vazifalar yo'q.");
        return;
      }

      const taskList = tasks.map((task, index) => 
        `${index + 1}. ${task.title} (${new Date(task.deadline).toLocaleDateString()})`
      ).join('\n');

      await bot.sendMessage(chatId, `Bajarilgan deb belgilash uchun vazifa raqamini tanlang:\n${taskList}`);
      
      // Handle task selection in the main message handler
    } catch (error) {
      console.error('Error completing task:', error);
      await bot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
  }

  static async checkTomorrowTasks() {
    try {
      const tasks = await Task.getTomorrowTasks();
      for (const task of tasks) {
        const message = `
Eslatma: Ertangi kun uchun vazifangiz mavjud!
Vazifa: ${task.title}
Tasvir: ${task.description || 'Izoh yozilmagan'}
Yakuniy sana: ${new Date(task.deadline).toLocaleDateString()}
`;
        await bot.sendMessage(task.userId, message.trim());
      }
    } catch (error) {
      console.error('Error checking tomorrow tasks:', error);
    }
  }
}

// Helper function to get user input
async function getUserInput(chatId, prompt) {
  await bot.sendMessage(chatId, prompt);
  return new Promise((resolve) => {
    bot.once('message', (msg) => {
      resolve(msg.text);
    });
  });
}

module.exports = TaskController;
