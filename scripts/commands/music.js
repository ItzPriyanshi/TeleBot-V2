const axios = require('axios');

module.exports = {
    config: {
        name: "music",
        aliases: ["song", "play"],
        category: "media",
        role: 0, // All users can use this command
        cooldowns: 10,
        version: '1.0.0',
        author: 'Samir Thakuri',
        description: "Search and download music from YouTube",
        usage: "music <song name>",
    },

    onStart: async function ({ bot, msg, args, chatId }) {
        if (args.length === 0) {
            return bot.sendMessage(chatId, "Please provide a song name to search.", { replyToMessage: msg.message_id });
        }

        const query = args.join(' ');
        try {
            // Send typing action to indicate the bot is processing
            await bot.sendChatAction(chatId, 'typing');

            // Search for the song
            const searchResponse = await axios.get(`https://dev-priyanshi.onrender.com/api/ytsearch?query=${encodeURIComponent(query)}`);
            
            if (!searchResponse.data.status || !searchResponse.data.results || searchResponse.data.results.length === 0) {
                return bot.sendMessage(chatId, "No results found for your search.", { replyToMessage: msg.message_id });
            }

            // Get the first result
            const song = searchResponse.data.results[0];
            
            // Create quality buttons
            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        { text: '92 kbps', callback_data: `music_download_${encodeURIComponent(song.url)}_92` },
                        { text: '128 kbps', callback_data: `music_download_${encodeURIComponent(song.url)}_128` },
                    ],
                    [
                        { text: '256 kbps', callback_data: `music_download_${encodeURIComponent(song.url)}_256` },
                        { text: '320 kbps', callback_data: `music_download_${encodeURIComponent(song.url)}_320` },
                    ]
                ]
            };

            // Send song info with thumbnail and quality options
            await bot.sendPhoto(
                chatId,
                song.thumbnail,
                {
                    caption: `🎵 *${song.title}*\n\n👤 Author: ${song.author}\n⏱️ Duration: ${song.duration}\n\nChoose quality to download:`,
                    parseMode: 'Markdown',
                    replyMarkup: inlineKeyboard,
                    replyToMessage: msg.message_id
                }
            );
        } catch (error) {
            console.error('Error in music command:', error);
            bot.sendMessage(chatId, "An error occurred while searching for the music. Please try again later.", { replyToMessage: msg.message_id });
        }
    }
};

// This function needs to be registered separately in your bot's callback query handler
// Add this to your main bot file where you handle callback queries
async function handleMusicCallback(bot, query) {
    if (!query.data.startsWith('music_download_')) return;
    
    const parts = query.data.split('_');
    const url = decodeURIComponent(parts[2]);
    const quality = parts[3];
    
    try {
        // Answer callback query to stop loading animation
        await bot.answerCallbackQuery(query.id, { text: `Downloading ${quality}kbps version...` });
        
        // Send "downloading" message
        const statusMsg = await bot.sendMessage(query.message.chat.id, `⏳ Downloading your music at ${quality}kbps quality...`);
        
        // Get download URL
        const downloadResponse = await axios.get(`https://dev-priyanshi.onrender.com/api/ytmp3dl?url=${encodeURIComponent(url)}&quality=${quality}`);
        
        if (!downloadResponse.data.status || !downloadResponse.data.download || !downloadResponse.data.download.url) {
            await bot.deleteMessage(query.message.chat.id, statusMsg.message_id);
            return bot.sendMessage(query.message.chat.id, "Failed to download the music. Please try another quality or song.");
        }
        
        // Send the audio file
        await bot.sendAudio(
            query.message.chat.id,
            downloadResponse.data.download.url,
            {
                title: downloadResponse.data.metadata.title,
                performer: downloadResponse.data.metadata.author.name,
                duration: downloadResponse.data.metadata.seconds,
                caption: `🎵 *${downloadResponse.data.metadata.title}*\n👤 ${downloadResponse.data.metadata.author.name}\n⏱️ ${downloadResponse.data.metadata.timestamp}\n🔊 Quality: ${quality}kbps`,
                parseMode: 'Markdown'
            }
        );
        
        // Delete the "downloading" message
        await bot.deleteMessage(query.message.chat.id, statusMsg.message_id);
    } catch (error) {
        console.error('Error in music download callback:', error);
        bot.sendMessage(query.message.chat.id, "An error occurred while downloading the music. Please try again later.");
    }
}

// Export the callback handler so it can be used in your main bot file
module.exports.handleMusicCallback = handleMusicCallback;