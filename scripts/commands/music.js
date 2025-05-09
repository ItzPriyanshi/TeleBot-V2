const axios = require('axios');
const { createInlineKeyboard } = require('your-bot-library'); // Replace with actual keyboard utility
const FormData = require('form-data');
const { Readable } = require('stream');

// Temporary storage for user selections
const tempStorage = new Map();

module.exports = {
    config: {
        name: "music",
        aliases: ["song", "play"],
        category: "music",
        role: 0,
        cooldowns: 5,
        version: '1.0.0',
        author: 'Priyanshi Kaur',
        description: "Search and download music from YouTube",
        usage: "music <song name>"
    },

    onStart: async function ({ bot, msg, args }) {
        const chatId = msg.chat.id;
        
        if (!args.length) {
            return bot.sendMessage(chatId, "Please provide a song name.\nExample: /music Paro Paro", {
                replyToMessage: msg.message_id
            });
        }

        try {
            const query = args.join(' ');
            const searchUrl = `https://dev-priyanshi.onrender.com/api/ytsearch?query=${encodeURIComponent(query)}`;

            const response = await axios.get(searchUrl);
            const results = response.data.results;

            if (!results || !results.length) {
                return bot.sendMessage(chatId, "No results found for your query.", {
                    replyToMessage: msg.message_id
                });
            }

            // Send first 3 results
            for (const [index, result] of results.slice(0, 3).entries()) {
                const keyboard = createInlineKeyboard([
                    [{ text: "Download", callback_data: `music_select ${result.url}` }]
                ]);

                await bot.sendPhoto(chatId, result.thumbnail, {
                    caption: `🎵 *${result.title}*\n🎤 ${result.author}\n⏱ ${result.duration}`,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            }

        } catch (error) {
            console.error('Search error:', error);
            bot.sendMessage(chatId, "An error occurred while searching. Please try again later.", {
                replyToMessage: msg.message_id
            });
        }
    },

    onCallback: async function ({ bot, msg, data }) {
        const chatId = msg.chat.id;
        const [action, ...params] = data.split(' ');

        try {
            switch (action) {
                case 'music_select': {
                    const url = params[0];
                    tempStorage.set(chatId, { url });
                    
                    const keyboard = createInlineKeyboard([
                        [
                            { text: "92kbps", callback_data: `music_quality 92 ${url}` },
                            { text: "128kbps", callback_data: `music_quality 128 ${url}` }
                        ],
                        [
                            { text: "256kbps", callback_data: `music_quality 256 ${url}` },
                            { text: "320kbps", callback_data: `music_quality 320 ${url}` }
                        ]
                    ]);

                    await bot.sendMessage(chatId, "Select audio quality:", {
                        reply_markup: keyboard
                    });
                    break;
                }

                case 'music_quality': {
                    const quality = params[0];
                    const url = params[1];
                    
                    const downloadUrl = `https://dev-priyanshi.onrender.com/api/ytmp3dl?url=${encodeURIComponent(url)}&quality=${quality}`;
                    const response = await axios.get(downloadUrl);
                    
                    if (!response.data.download.url) {
                        throw new Error('Invalid download URL');
                    }

                    // Send as audio file
                    const audioResponse = await axios.get(response.data.download.url, {
                        responseType: 'stream'
                    });

                    await bot.sendAudio(chatId, Readable.from(audioResponse.data), {
                        title: response.data.metadata.title,
                        performer: response.data.metadata.author.name
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Download error:', error);
            bot.sendMessage(chatId, "Failed to download the audio. Please try again.", {
                replyToMessage: msg.message_id
            });
        }
    }
};