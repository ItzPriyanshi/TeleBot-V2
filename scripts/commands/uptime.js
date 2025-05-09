const os = require('os');
const process = require('process');
const { format } = require('date-fns');
const axios = require('axios');

module.exports = {
    config: {
        name: "uptime",
        aliases: ["up", "botinfo"],
        category: "utility",
        role: 0,
        cooldowns: 10,
        version: '1.0.0',
        author: 'Priyanshi Kaur',
        description: "Displays bot uptime and system information",
        usage: "uptime"
    },

    onStart: async function ({ bot, msg }) {
        const chatId = msg.chat.id;
        const botLogoUrl = "https://envs.sh/8-q.jpg";
        
        try {
            // Calculate uptime
            const uptimeSeconds = process.uptime();
            const uptimeString = formatUptime(uptimeSeconds);
            
            // System information
            const systemInfo = {
                platform: os.platform(),
                arch: os.arch(),
                cpu: os.cpus()[0].model,
                cores: os.cpus().length,
                memory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                nodeVersion: process.version,
                botVersion: this.config.version
            };
            
            // Owner information
            const ownerInfo = {
                name: "Priyanshi Kaur",
                contact: "priyanshikaurji@gmail.com",
                github: "https://github.com/ItzPriyanshi",
                creationDate: "2021-5-3"
            };
            
            // Create information message
            const infoMessage = `
🤖 *Bot Uptime & Status* 🤖

⏳ *Uptime:* ${uptimeString}
📅 *Started:* ${format(new Date(Date.now() - uptimeSeconds * 1000), 'PPpp')}

🖥 *System Information:*
▸ OS: ${systemInfo.platform} (${systemInfo.arch})
▸ CPU: ${systemInfo.cpu} (${systemInfo.cores} cores)
▸ Memory: ${systemInfo.freeMemory} free / ${systemInfo.memory} total
▸ Node.js: ${systemInfo.nodeVersion}
▸ Bot Version: v${systemInfo.botVersion}

👤 *Owner Information:*
▸ Name: ${ownerInfo.name}
▸ Contact: ${ownerInfo.contact}
▸ GitHub: ${ownerInfo.github}
▸ Created: ${ownerInfo.creationDate}
            `;
            
            // Download bot logo
            const logoResponse = await axios.get(botLogoUrl, { responseType: 'arraybuffer' });
            const logoBuffer = Buffer.from(logoResponse.data, 'binary');
            
            // Send message with photo and caption
            await bot.sendPhoto(chatId, logoBuffer, {
                caption: infoMessage,
                parse_mode: 'Markdown',
                reply_to_message_id: msg.message_id
            });
            
        } catch (error) {
            console.error('Uptime command error:', error);
            bot.sendMessage(chatId, "Failed to retrieve system information. Please try again later.", {
                reply_to_message_id: msg.message_id
            });
        }
    }
};

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    seconds %= 3600 * 24;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    
    return parts.join(' ');
}