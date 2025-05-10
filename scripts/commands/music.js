const { ytmp3 } = require('@vreden/youtube_scraper');
const { inlineButton, inlineKeyboard } = require('telebot');
const axios = require('axios');

module.exports = {
    config: {
        name: 'music',
        aliases: ['song', 'track'],
        category: 'utility',
        role: 0,
        cooldowns: 5,
        version: '1.0.0',
        author: 'Priyanshi Kaur',
        description: 'Search for songs and download them',
        usage: 'music <song name>'
    },

    onStart: async function({ msg, bot, args }) {
        if (!args.length) {
            return bot.sendMessage(msg.chat.id, 'Please provide the song name.', { replyToMessage: msg.message_id });
        }

        const query = args.join(' ');
        const chatId = msg.chat.id;

        const url = `https://me0xn4hy3i.execute-api.us-east-1.amazonaws.com/staging/api/resolve/resolveYoutubeSearch?search=${encodeURIComponent(query)}`;
        const headers = {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            Referer: "https://v4.mp3paw.link/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        };

        try {
            const res = await axios.get(url, { headers });
            const videos = res.data?.videos;
            if (!videos || !videos.length) {
                return bot.sendMessage(chatId, 'No results found for that query.', { replyToMessage: msg.message_id });
            }

            const song = videos[0]; // Use the first result
            const videoId = song.videoId;
            const title = song.title;
            const duration = song.lengthText || 'Unknown';
            const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            let message = `🎵 *Found song:*\n\n*Title:* ${title}\n*Duration:* ${duration}`;
            const buttons = [64, 96, 128, 192, 256, 320].map(kbps => [
                inlineButton(`${kbps} kbps`, { callback_data: `music_dl_${kbps}_${videoId}` })
            ]);

            return bot.sendPhoto(chatId, thumbnail, {
                caption: message,
                parseMode: 'Markdown',
                replyMarkup: inlineKeyboard(buttons)
            });
        } catch (error) {
            console.error('Search error:', error);
            return bot.sendMessage(chatId, 'An error occurred while searching for the song.', { replyToMessage: msg.message_id });
        }
    }
};