const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../config.json');

function writeConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

module.exports = {
    config: {
        name: 'prefix',
        aliases: ['setprefix'],
        category: 'admin',
        role: 2,
        cooldowns: 5,
        version: '1.0.0',
        author: 'Samir Thakuri || Priyanshi Kaur',
        description: 'Change the bot\'s prefix',
        usage: 'prefix <new-prefix>'
    },

    onStart: async function({ msg, bot, args, config }) {
        if (!args[0]) {
            bot.sendMessage(msg.chat.id, '❌ Please provide a new prefix.', { replyToMessage: msg.message_id });
            return;
        }

        const newPrefix = args[0];
        config.prefix = newPrefix;
        writeConfig(config);

        bot.sendMessage(msg.chat.id, `✅ Bot prefix updated to: \`${newPrefix}\``, {
            replyToMessage: msg.message_id,
            parse_mode: 'Markdown'
        });
    }
};