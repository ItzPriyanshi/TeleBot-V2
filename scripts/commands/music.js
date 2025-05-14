const axios = require('axios');

module.exports = {
  config: {
    name: "music",
    aliases: ["song", "play"],
    role: 0,
    cooldowns: 10,
    version: '1.2.0',
    author: 'Priyanshi Kaur (adapted by AI)',
    category: "music",
    description: "Search YouTube and get download options for audio or video.",
    usage: "music <song name>",
  },

  onStart: async function ({ bot, args, chatId, msg }) {
    if (args.length === 0) {
      return bot.sendMessage(chatId, `⚠️ Please provide a song name.\n💡 Usage: ${this.config.usage}`, { 
        replyToMessage: msg.message_id 
      });
    }

    const query = args.join(" ");
    const preMessage = await bot.sendMessage(chatId, "🔍 | Searching for song...", { 
      replyToMessage: msg.message_id 
    });

    try {
      // Search for the song using the API
      const searchResponse = await axios.get(
        `https://dev-priyanshi.onrender.com/api/ytsearch?query=${encodeURIComponent(query)}`
      );

      if (!searchResponse.data?.status || !searchResponse.data.results?.length) {
        await bot.deleteMessage(chatId, preMessage.message_id).catch(console.error);
        return bot.sendMessage(chatId, '❌ No songs found for the given query.', { 
          replyToMessage: msg.message_id 
        });
      }

      const song = searchResponse.data.results[0];
      const videoUrl = song.url;
      
      // More robust video ID extraction
      const videoId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
      
      if (!videoId) {
        await bot.deleteMessage(chatId, preMessage.message_id).catch(console.error);
        return bot.sendMessage(chatId, '❌ Could not extract video ID from search result.', { 
          replyToMessage: msg.message_id 
        });
      }

      // Display song information with audio/video download buttons
      const inlineKeyboard = [
        [
          {
            text: 'Download Audio 🎵',
            callback_data: `music_audio_${videoId}`
          },
          {
            text: 'Download Video 🎬', 
            callback_data: `music_video_${videoId}`
          }
        ]
      ];

      await bot.deleteMessage(chatId, preMessage.message_id).catch(console.error);

      await bot.sendPhoto(chatId, song.thumbnail, {
        caption: `🎵 *Found:* ${song.title}\n👤 *Artist:* ${song.author}\n⏱️ *Duration:* ${song.duration}\n\n选择下载类型:`,
        reply_markup: {
          inline_keyboard: inlineKeyboard
        },
        reply_to_message_id: msg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error("Music Search Error:", error);
      try {
        await bot.editMessageText({
          chat_id: chatId,
          message_id: preMessage.message_id,
          text: '❌ Failed to search for songs. Please try again later.'
        });
      } catch (editError) {
        console.error("Music Search Edit Error:", editError);
        await bot.deleteMessage(chatId, preMessage.message_id).catch(console.error);
        bot.sendMessage(chatId, '❌ Failed to search for songs. Please try again later.', { 
          replyToMessage: msg.message_id 
        });
      }
    }
  },

  onCallback: async function ({ bot, msg, data }) {
    const [type, videoId] = data.split('_').slice(1);
    const chatId = msg.message.chat.id;
    const userId = msg.from.id;

    try {
      await bot.answerCallbackQuery(msg.id, { 
        text: `Preparing ${type} download...` 
      });

      const loadingMsg = await bot.sendMessage(chatId, `⬇️ Preparing ${type} download...`, {
        reply_to_message_id: msg.message.message_id
      });

      // Use the download API you provided
      const downloadUrl = `https://nayan-video-downloader.vercel.app/ytdown?url=https://www.youtube.com/watch?v=${videoId}`;
      const response = await axios.get(downloadUrl);

      if (!response.data?.status) {
        throw new Error('Download API returned error');
      }

      const downloadData = response.data.data;
      const fileUrl = type === 'audio' ? downloadData.audio : downloadData.video;
      
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(console.error);

      if (type === 'audio') {
        await bot.sendAudio(chatId, fileUrl, {
          caption: `🎵 ${downloadData.title}`,
          reply_to_message_id: msg.message.message_id
        });
      } else {
        await bot.sendVideo(chatId, fileUrl, {
          caption: `🎬 ${downloadData.title}`,
          reply_to_message_id: msg.message.message_id
        });
      }

    } catch (error) {
      console.error(`Music ${type} Download Error:`, error);
      await bot.editMessageText({
        chat_id: chatId,
        message_id: msg.message.message_id,
        text: `❌ Failed to download ${type}. Please try again later.`
      });
    }
  }
};