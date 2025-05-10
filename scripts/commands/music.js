const { search, ytmp3, ytmp4, ytdlv2, channel } = require('@vreden/youtube_scraper');
const { inlineButton, inlineKeyboard, sendAudio } = require('telebot');

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

    onStart: async function({ msg, bot, args, config }) {
        if (!args.length) {
            return bot.sendMessage(msg.chat.id, 'Please provide the song name.', { replyToMessage: msg.message_id });
        }

        const query = args.join(' ');
        const chatId = msg.chat.id;

        try {
            const searchResult = await search(query);

            if (!searchResult || !searchResult.length) {
                return bot.sendMessage(chatId, 'No results found for that query.', { replyToMessage: msg.message_id });
            }

            const song = searchResult[0];
            const videoId = song.id;
            const title = song.title;
            const thumbnail = song.thumbnail;
            const duration = song.duration;
            const description = song.description || 'No description available';

            let message = `Found song:\n\n`;
            message += `Title: ${title}\n`;
            message += `Duration: ${duration}\n`;
            message += `Description: ${description}\n`;

            const buttons = [
                [inlineButton('128 kbps', { callback_data: `quality_128_${videoId}` })],
                [inlineButton('192 kbps', { callback_data: `quality_192_${videoId}` })],
                [inlineButton('256 kbps', { callback_data: `quality_256_${videoId}` })],
                [inlineButton('320 kbps', { callback_data: `quality_320_${videoId}` })]
            ];

            return bot.sendPhoto(chatId, thumbnail, {
                caption: message,
                replyMarkup: inlineKeyboard(buttons)
            });
        } catch (error) {
            console.error(error);
            return bot.sendMessage(chatId, 'An error occurred while searching for the song.', { replyToMessage: msg.message_id });
        }
    }
};