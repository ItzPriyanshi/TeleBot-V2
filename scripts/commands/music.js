const axios = require('axios');
const { ytmp3 } = require('@vreden/youtube_scraper');

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    role: 0,
    cooldowns: 10,
    version: '1.0.0',
    author: 'Priyanshi Kaur',
    category: "music",
    description: "Search and download music from YouTube.",
    usage: "music <song name>",
  },

  onStart: async function ({ bot, args, chatId, msg }) {
    if (args.length === 0) {
      return bot.sendMessage(chatId, `⚠️ Please provide a song name.\n💡 Usage: ${this.config.usage}`, { replyToMessage: msg.message_id });
    }

    const query = args.join(" ");
    const preMessage = await bot.sendMessage(chatId, "🔍 | Searching for song...", { replyToMessage: msg.message_id });

    try {
      // Search for the song using the API
      const searchResponse = await axios.get(`https://dev-priyanshi.onrender.com/api/ytsearch?query=${encodeURIComponent(query)}`);
      
      if (!searchResponse.data.status || searchResponse.data.results.length === 0) {
        return bot.editMessageText(
          { chatId: preMessage.chat.id, messageId: preMessage.message_id },
          '❌ No songs found for the given query.'
        );
      }

      const song = searchResponse.data.results[0];
      
      // Display song information with thumbnail and quality selection buttons
      const qualityOptions = [64, 96, 128, 192, 256, 320];
      const inlineKeyboard = qualityOptions.map(quality => [
        bot.inlineButton(`${quality} kbps`, { callback: `dl_${song.url.split('v=')[1]}_${quality}` })
      ]);

      await bot.deleteMessage(preMessage.chat.id, preMessage.message_id);

      await bot.sendPhoto(chatId, song.thumbnail, {
        caption: `🎵 *Found:* ${song.title}\n👤 *Artist:* ${song.author}\n⏱️ *Duration:* ${song.duration}\n\n💿 Select Audio Quality:`,
        replyMarkup: bot.inlineKeyboard(inlineKeyboard),
        replyToMessage: msg.message_id,
        parseMode: 'Markdown'
      });

    } catch (error) {
      console.error("Music Search Error:", error);
      bot.editMessageText(
        { chatId: preMessage.chat.id, messageId: preMessage.message_id },
        '❌ Failed to search for songs. Please try again later.'
      );
    }
  }
};