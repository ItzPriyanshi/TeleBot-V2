const TeleBot = require('telebot');
const config = require('./config.json');
const connectDB = require('./database/connectDB');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const axios = require('axios');

const bot = new TeleBot(config.botToken);

connectDB(config.mongoURI).then(async ({ threadModel, userModel }) => {
  console.log('MongoDB connected');

  const commands = new Map();  
  const aliases = new Map();  

  const loadCommands = (dir) => {  
    fs.readdirSync(dir).forEach(file => {  
      const filePath = path.join(dir, file);  
      const fileExtension = path.extname(file);  
      if (fs.statSync(filePath).isDirectory()) {  
        loadCommands(filePath);  
      } else if (fileExtension === '.js') {  
        const command = require(filePath);  
        if (command.config && command.config.name) {  
          commands.set(command.config.name.toLowerCase(), command);  
          if (command.config.aliases && Array.isArray(command.config.aliases)) {  
            command.config.aliases.forEach(alias => aliases.set(alias.toLowerCase(), command.config.name.toLowerCase()));  
          }  
        }  
      }  
    });  
  };  
  loadCommands(path.join(__dirname, 'scripts/commands'));  

  const loadEvents = (botInstance, models) => {
    const eventsDir = path.join(__dirname, 'scripts', 'events');
    if (fs.existsSync(eventsDir)) {
      fs.readdirSync(eventsDir).forEach(file => {
        if (path.extname(file) === '.js') {
          try {
            const eventModule = require(path.join(eventsDir, file));
            if (eventModule.config && eventModule.config.name && typeof eventModule.onEvent === 'function') {
              botInstance.on(eventModule.config.name, (msg) => {
                eventModule.onEvent({ bot: botInstance, msg, ...models, config });
              });
            }
          } catch (error) {
            console.error(`Failed to load event ${file}:`, error);
          }
        }
      });
      console.log('Events loaded and bound successfully.');
    } else {
      console.log('Events directory not found. Skipping event loading.');
    }
  };
  loadEvents(bot, { threadModel, userModel });

  const isGroupAdmin = async (userId, chatId) => {
    if (!chatId) return false;
    try {
      const chatAdmins = await bot.getChatAdministrators(chatId);
      return chatAdmins.some(admin => admin.user.id.toString() === userId.toString());
    } catch (error) {
      console.error(`Error fetching chat administrators for chat ${chatId}:`, error.message);
      return false;
    }
  };

  const isGloballyBanned = async (userId) => {  
    try {  
      const response = await axios.get('https://raw.githubusercontent.com/notsopreety/Uselessrepo/main/gban.json');  
      const bannedUsers = response.data;  
      if (Array.isArray(bannedUsers)) {
        const bannedUser = bannedUsers.find(user => user.userId && user.userId.toString() === userId.toString());  
        return bannedUser ? bannedUser : null;  
      }
      return null;
    } catch (error) {  
      console.error('Error fetching global ban list:', error.message);  
      return null;  
    }  
  };  

  const cooldowns = new Map();  

  const hasPermission = async (userId, chatId, commandConfig) => {
    const sUserId = userId.toString();
    if (config.adminId && Array.isArray(config.adminId) && config.adminId.includes(sUserId)) {
        return true;
    }
    if (commandConfig.onlyAdmin === true) {
        return false;
    }

    const role = commandConfig.role;
    if (role === 0) {
        return true;
    }
    if (role === 1) {
        return await isGroupAdmin(sUserId, chatId);
    }
    if (role === 2) {
        return false;
    }
    return false;
  };  

  bot.on('text', async (msg) => {  
    if (!msg.text) return;
    const chatId = msg.chat.id.toString();  
    const userId = msg.from.id.toString();  

    let thread = await threadModel.findOne({ chatId });  
    if (!thread) {  
      thread = new threadModel({ chatId, users: new Map() });  
      await thread.save();  
      console.log(`[DATABASE] New thread: ${chatId} database has been created!`);  
    }  

    let user = await userModel.findOne({ userID: userId });  
    if (!user) {  
      user = new userModel({  
        userID: userId,  
        username: msg.from.username || '',  
        first_name: msg.from.first_name || '',  
        last_name: msg.from.last_name || ''  
      });  
      await user.save();  
      console.log(`[DATABASE] New user: ${userId} database has been created!`);  
    }  

    const globalBanInfo = await isGloballyBanned(userId);  
    if (globalBanInfo) {  
      const banTime = moment(globalBanInfo.banTime).format('MMMM Do YYYY, h:mm:ss A');  
      if (msg.text.startsWith(config.prefix)) {  
        return bot.sendPhoto(chatId, globalBanInfo.proof, { caption: `Dear @${msg.from.username || userId} !\nYou are globally banned from using ${config.botName}\nReason: ${globalBanInfo.reason}\nBan Time: ${banTime}`, replyToMessage: msg.message_id });  
      }  
      return;  
    }  

    if (user.banned) {  
      if (msg.text.startsWith(config.prefix)) {  
        return bot.sendMessage(chatId, 'You are banned from using this bot!', { replyToMessage: msg.message_id });  
      }  
      return;  
    }  

    if (thread.users && thread.users.get && thread.users.get(userId) && thread.users.get(userId).gcBan) {  
        if (msg.text.startsWith(config.prefix)) {  
            return bot.sendMessage(chatId, 'You are banned from using this bot in this group!', { replyToMessage: msg.message_id });  
        }  
        return;  
    }  

    if (!msg.text.startsWith(config.prefix)) {  
      if (!thread.users) {  
        thread.users = new Map();  
      }  
      const userThreadData = thread.users.get(userId) || { totalMsg: 0 };
      userThreadData.totalMsg += 1;
      thread.users.set(userId, userThreadData);
      thread.markModified('users');
      await thread.save();  
    }  

    if (msg.text.startsWith(config.prefix)) {  
      const args = msg.text.slice(config.prefix.length).trim().split(/ +/);  
      const commandName = args.shift().toLowerCase();  
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));  

      if (!command || !command.config || typeof command.onStart !== 'function') return;  

      const { cooldown } = command.config;  

      if (!(await hasPermission(userId, chatId, command.config))) {  
        return bot.sendMessage(chatId, 'You do not have permission to use this command.', { replyToMessage: msg.message_id });  
      }  

      if (!cooldowns.has(command.config.name)) {  
        cooldowns.set(command.config.name, new Map());  
      }  

      const now = Date.now();  
      const timestamps = cooldowns.get(command.config.name);  
      const cooldownAmount = (cooldown || 3) * 1000;  

      if (timestamps.has(userId)) {  
        const expirationTime = timestamps.get(userId) + cooldownAmount;  
        if (now < expirationTime) {  
          const timeLeft = (expirationTime - now) / 1000;  
          return bot.sendMessage(chatId, `Please wait ${timeLeft.toFixed(1)} more seconds before reusing the ${command.config.name} command.`, { replyToMessage: msg.message_id });  
        }  
      }  

      timestamps.set(userId, now);  
      setTimeout(() => timestamps.delete(userId), cooldownAmount);  

      try {  
        const senderName = `${msg.from.first_name || ''}${msg.from.last_name ? ' ' + msg.from.last_name : ''}`.trim() || msg.from.username || userId;
        await command.onStart({ 
            msg, 
            bot, 
            args, 
            chatId, 
            userId, 
            config, 
            botName: config.botName, 
            senderName, 
            username: msg.from.username || userId, 
            copyrightMark: config.copyrightMark, 
            threadModel, 
            userModel, 
            user, 
            thread, 
            api: config.globalapi 
        });  
      } catch (error) {  
        console.error(`Error executing command ${command.config.name}:`, error);  
        bot.sendMessage(chatId, 'There was an error executing the command.', { replyToMessage: msg.message_id });  
      }  
    }  
  });  

  bot.start();  
  console.log(`${config.botName || 'Bot'} started successfully!`);

}).catch(error => {
  console.error('Error connecting to MongoDB or during bot initialization:', error);
});

const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<html><head><title>Bot Active</title></head><body style="margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #282c34; color: white; font-family: Arial, sans-serif;"><h1>Bot is running!</h1></body></html>');
});
const port = process.env.PORT || config.port || 3000;
server.listen(port, () => {
  console.log(`Server online at port: ${port}`);
});