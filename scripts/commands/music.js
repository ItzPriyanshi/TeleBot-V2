const { search, ytmp3 } = require('@vreden/youtube_scraper');
const axios = require('axios');

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "audio"],
    role: 0,
    cooldowns: 10,
    version: '1.0.0',
    author: 'Priyanshi Kaur',
    category: "media",
    description: "Search and download music from YouTube",
    usage: "music <song name>"
  },

  onStart: async function ({ bot, msg, args }) {
    if (!args[0]) {
      return bot.sendMessage(msg.chat.id, `Please provide a song name.\nUsage: ${this.config.usage}`, { replyToMessage: msg.message_id });
    }

    const query = args.join(" ");
    const loadingMsg = await bot.sendMessage(msg.chat.id, "🔍 Searching for music...", { replyToMessage: msg.message_id });

    try {
      let searchResult;
      try {
        const searchResponse = await axios.get(`https://dev-priyanshi.onrender.com/api/ytsearch?query=${encodeURIComponent(query)}`);
        if (searchResponse.data.status && searchResponse.data.results.length > 0) {
          searchResult = searchResponse.data.results[0];
        } else {
          throw new Error("No results found");
        }
      } catch (e) {
        const localSearch = await search(query);
        if (localSearch.status && localSearch.results.length > 0) {
          searchResult = localSearch.results[0];
        } else {
          throw new Error("No results found");
        }
      }

      const qualityButtons = [
        [
          bot.inlineButton("64kbps", { callback: `music_64_${encodeURIComponent(searchResult.url)}` }),
          bot.inlineButton("128kbps", { callback: `music_128_${encodeURIComponent(searchResult.url)}` }),
          bot.inlineButton("192kbps", { callback: `music_192_${encodeURIComponent(searchResult.url)}` })
        ],
        [
          bot.inlineButton("256kbps", { callback: `music_256_${encodeURIComponent(searchResult.url)}` }),
          bot.inlineButton("320kbps", { callback: `music_320_${encodeURIComponent(searchResult.url)}` })
        ]
      ];

      const caption = `🎵 ${searchResult.title}\n🎤 ${searchResult.author || "Unknown artist"}\n⏱ ${searchResult.duration || "Unknown duration"}\n\nPlease select audio quality:`;
      
      await bot.editMessageText(
        { chatId: loadingMsg.chat.id, messageId: loadingMsg.message_id },
        caption,
        { replyMarkup: bot.inlineKeyboard(qualityButtons) }
      );

    } catch (error) {
      console.error("Music search error:", error);
      await bot.editMessageText(
        { chatId: loadingMsg.chat.id, messageId: loadingMsg.message_id },
        "Failed to find music. Please try again with a different query.",
        { replyToMessage: msg.message_id }
      );
    }
  },

  onCallback: async function ({ bot, msg, data }) {
    const [quality, url] = data.split("_");
    const decodedUrl = decodeURIComponent(url);
    const processingMsg = await bot.sendMessage(msg.chat.id, `⬇️ Downloading ${quality}kbps audio...`, { replyToMessage: msg.message_id });

    try {
      const audioResult = await ytmp3(decodedUrl, quality);
      if (audioResult.status) {
        await bot.sendAudio(
          msg.chat.id,
          audioResult.download,
          {
            title: audioResult.metadata?.title || "Music",
            performer: audioResult.metadata?.author || "Unknown",
            replyToMessage: msg.message_id
          }
        );
        await bot.deleteMessage(processingMsg.chat.id, processingMsg.message_id);
      } else {
        throw new Error(audioResult.result);
      }
    } catch (error) {
      console.error("Music download error:", error);
      await bot.editMessageText(
        { chatId: processingMsg.chat.id, messageId: processingMsg.message_id },
        "Failed to download audio. Please try again later.",
        { replyToMessage: msg.message_id }
      );
    }
  }
};