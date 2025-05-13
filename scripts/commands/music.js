const axios = require('axios');

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    role: 0,
    cooldowns: 10,
    version: '1.1.0',
    author: 'Priyanshi Kaur',
    category: "music",
    description: "Search and download music/video from YouTube.",
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
      const videoId = song.url.split('v=')[1];

      // Create buttons for audio and video options
      const inlineKeyboard = [
        [bot.inlineButton("🎵 Download Audio", { callback: `dl_audio_${videoId}` })],
        [bot.inlineButton("🎬 Download Video", { callback: `dl_video_${videoId}` })]
      ];

      await bot.deleteMessage(preMessage.chat.id, preMessage.message_id);

      await bot.sendPhoto(chatId, song.thumbnail, {
        caption: `🎵 *Found:* ${song.title}\n👤 *Artist:* ${song.author}\n⏱️ *Duration:* ${song.duration}\n\n📥 Select download option:`,
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