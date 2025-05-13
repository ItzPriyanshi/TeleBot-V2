const axios = require('axios');
// No longer need @vreden/youtube_scraper here

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    role: 0,
    cooldowns: 10,
    version: '1.1.0', // Updated version
    author: 'Priyanshi Kaur (adapted by AI)', // Acknowledge changes
    category: "music",
    description: "Search YouTube and get download options for audio or video.",
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

      if (!searchResponse.data || !searchResponse.data.status || !searchResponse.data.results || searchResponse.data.results.length === 0) {
        await bot.deleteMessage(preMessage.chat.id, preMessage.message_id).catch(e => console.error("Failed to delete preMessage:", e));
        return bot.sendMessage(chatId, '❌ No songs found for the given query.', { replyToMessage: msg.message_id });
      }

      const song = searchResponse.data.results[0];
      const videoId = song.url.split('v=')[1]; // Extract videoId

      if (!videoId) {
        await bot.deleteMessage(preMessage.chat.id, preMessage.message_id).catch(e => console.error("Failed to delete preMessage:", e));
        return bot.sendMessage(chatId, '❌ Could not extract video ID from search result.', { replyToMessage: msg.message_id });
      }

      // Display song information with audio/video download buttons
      const inlineKeyboard = [
        [
          bot.inlineButton('Download Audio 🎵', { callback: `dl_audio_${videoId}` }),
          bot.inlineButton('Download Video 🎬', { callback: `dl_video_${videoId}` })
        ]
      ];

      await bot.deleteMessage(preMessage.chat.id, preMessage.message_id).catch(e => console.error("Failed to delete preMessage:", e));

      await bot.sendPhoto(chatId, song.thumbnail, {
        caption: `🎵 *Found:* ${song.title}\n👤 *Artist:* ${song.author}\n⏱️ *Duration:* ${song.duration}\n\n选择下载类型:`,
        replyMarkup: bot.inlineKeyboard(inlineKeyboard),
        replyToMessage: msg.message_id,
        parseMode: 'Markdown'
      });

    } catch (error) {
      console.error("Music Search Error:", error);
      try {
        await bot.editMessageText(
          { chatId: preMessage.chat.id, messageId: preMessage.message_id },
          '❌ Failed to search for songs. Please try again later.'
        );
      } catch (editError) {
        console.error("Music Search Edit Error:", editError);
        await bot.deleteMessage(preMessage.chat.id, preMessage.message_id).catch(e => console.error("Failed to delete preMessage:", e));
        bot.sendMessage(chatId, '❌ Failed to search for songs. Please try again later.', { replyToMessage: msg.message_id });
      }
    }
  }
};