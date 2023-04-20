// Importa la biblioteca node-telegram-bot-api
const TelegramBot = require('node-telegram-bot-api');

// Importa bcrypt para el manejo seguro de contraseñas
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Lee el token del bot desde las variables de entorno
require('dotenv').config({ path: './token.env' });
const token = process.env.TELEGRAM_BOT_TOKEN;

// Crea una instancia del bot
const bot = new TelegramBot(token, {polling: true});
bot.on('polling_error', (error) => {
  console.log('Error de sondeo:', error.code);
});

// Importar paquetes BASE DE DATOS
const sqlite3 = require('sqlite3').verbose();

// Función y crear tabla si no existe
function initializeDatabase() {
  const db = new sqlite3.Database('./users.db');
  
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    password TEXT
  )`);
  
  return db;
}

const db = initializeDatabase();

// Estado de los usuarios
let userStatus = {};

// Maneja el evento 'message'
bot.on('message', async (msg) => {
  if (msg.text.toString().toLowerCase().indexOf('/start') === 0) {
    const userName = msg.from.first_name;
    const welcomeMessage = `¡Bienvenido, ${userName}! ahora puedes enviar tu nombre de usuario en tu siguiente mensaje.`;
    bot.sendMessage(msg.chat.id, welcomeMessage);
    userStatus[msg.from.id] = 'awaitingUsername';
  } else if (userStatus[msg.from.id] === 'awaitingUsername') {
    const username = msg.text;
    userStatus[msg.from.id] = {
      username: username,
    };
    bot.sendMessage(msg.chat.id, 'Por favor, envía tu contraseña en tu siguiente mensaje.');
    userStatus[msg.from.id].status = 'awaitingPassword';
  } else if (userStatus[msg.from.id] && userStatus[msg.from.id].status === 'awaitingPassword') {
    const password = msg.text;
    const telegramId = msg.from.id;
    const username = userStatus[msg.from.id].username;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    db.run('INSERT OR REPLACE INTO users (telegram_id, username, password) VALUES (?, ?, ?)', [telegramId, username, hashedPassword], (err) => {
      if (err) {
        console.log(err);
        bot.sendMessage(msg.chat.id, 'Hubo un error al guardar tus datos. Por favor, inténtalo de nuevo.');
      } else {
        bot.sendMessage(msg.chat.id, 'Tus datos han sido guardados correctamente.');
      }
    });

    delete userStatus[msg.from.id];
  } 
  
  else if (msg.text.toString().toLowerCase().indexOf('/menu') === 0) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Perfil', callback_data: 'perfil' },
          { text: 'Eliminar', callback_data: 'delete' }
        ]
      ]
    }
  };

  bot.sendMessage(msg.chat.id, 'Elige una opción:', options);
}

  else if (msg.text.toString().toLowerCase().indexOf('/perfil') === 0) {
    const telegramId = msg.from.id;

    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
      if (err) {
        console.log(err);
        bot.sendMessage(msg.chat.id, 'Hubo un error al buscar tus datos. Por favor, inténtalo de nuevo.');
      } else if (row) {
        bot.sendMessage(msg.chat.id, `Nombre de usuario: ${row.username}\nContraseña: ${row.password}`);
      } else {
        bot.sendMessage(msg.chat.id, 'No se encontraron datos para tu usuario.');
      }
    });
  }
});

// Maneja el evento 'new_chat_members'
bot.on('new_chat_members', (msg) => {
  // Obtiene el primer nombre del miembro que se unió al chat
  const newMemberFirstName = msg.new_chat_member.first_name;

  // Crea un mensaje de bienvenida personalizado
  const welcomeMessage = `¡Hola, ${newMemberFirstName}! Bienvenid@ al grupo. Por favor, lee las reglas y preséntate.`;

  // Envía el mensaje de bienvenida al chat
  bot.sendMessage(msg.chat.id, welcomeMessage);
});

bot.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  if (action === 'perfil') {
    // Aquí puedes agregar la lógica del comando /perfil
  } else if (action === 'delete') {
    // Aquí puedes agregar la lógica del comando /delete
  }
});
