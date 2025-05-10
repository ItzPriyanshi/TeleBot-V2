const { ytmp3 } = require('@vreden/youtube_scraper');
const { inlineButton, inlineKeyboard } = require('telebot');
const { YouTubeSearchApi } = require('youtube-search-api');

module.exports = {
    config: {
        name: 'music',
        aliases: ['song', 'track'],
        category: 'utility',
        role: 0,
        cooldowns: 5,
        version: '1.0.0',
        author: 'Samir Thakuri',
        description: 'Search for songs and download them',
        usage: 'music <song name>'
    },

    onStart: async function({ msg, bot, args }) {
        if (!args.length) {
            return bot.sendMessage(msg.chat.id, 'Please provide the song name.', { replyToMessage: msg.message_id });
        }

        const query = args.join(' ');
        const chatId = msg.chat.id;

        try {
            const result = await YouTubeSearchApi.GetListByKeyword(query, false, 1);
            const item = result.items.find(i => i.type === 'video');
            if (!item) return bot.sendMessage(chatId, 'No results found.', { replyToMessage: msg.message_id });

            const videoId = item.id;
            const title = item.title;
            const duration = item.length.simpleText || 'Unknown';
            const thumbnail = item.thumbnail.thumbnails.pop().url;

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
            console.error(error);
            return bot.sendMessage(chatId, 'Failed to search for music.', { replyToMessage: msg.message_id });
        }
    }
};