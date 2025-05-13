// No longer need @vreden/youtube_scraper
const fs = require('fs').promises; // Use promises for async file ops if needed, though we aim for direct URL sending
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: 'callbackQueryHandlerMusic', // More specific name if you have other callback handlers
    version: '1.1.0', // Updated version
    author: 'Priyanshi Kaur (adapted by AI)', // Acknowledge changes
    description: 'Handle callback queries for music/video downloads using Nayan API'
  },

  onEvent: async function ({ bot, msg /*, threadModel, userModel */ }) { // Assuming msg is the callback_query object
    if (!msg.data || !msg.data.startsWith('dl_')) {
      return; // Not for this handler
    }

    let originalMessageCaption = msg.message.caption || ""; // Store original caption before modifications
    const originalMessageId = msg.message.message_id;
    const chatId = msg.message.chat.id;

    try {
      const parts = msg.data.split('_');
      if (parts.length !== 3) {
        console.warn("Invalid callback data format:", msg.data);
        bot.answerCallbackQuery(msg.id, { text: '⚠️ Invalid action.', showAlert: true });
        return;
      }

      const [_, type, videoId] = parts;
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const downloadType = type === 'audio' ? 'Audio 🎵' : 'Video 🎬';

      // 1. Acknowledge the callback immediately (optional, but good practice)
      // bot.answerCallbackQuery(msg.id, { text: `Processing ${downloadType}...` }); // Simple ack

      // 2. Update the message to show "Fetching download link..."
      const fetchingCaption = originalMessageCaption.split('\n\n选择下载类型:')[0] + `\n\n⏳ Fetching ${downloadType} link...`;
      await bot.editMessageCaption(
        { chatId, messageId: originalMessageId },
        fetchingCaption,
        { parseMode: 'Markdown' }
      ).catch(e => console.error("Error editing caption (fetching):", e)); // Catch errors here

      // 3. Call the Nayan API
      const nayanApiUrl = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(youtubeUrl)}`;
      const apiResponse = await axios.get(nayanApiUrl, { timeout: 30000 }); // 30s timeout

      if (!apiResponse.data || !apiResponse.data.status || !apiResponse.data.data) {
        console.error("Nayan API Error or invalid response:", apiResponse.data);
        throw new Error('Failed to get download link from API.');
      }

      const downloadData = apiResponse.data.data;
      let mediaUrl;
      let mediaTitle = downloadData.title || "Untitled";
      let sendFunction;
      let captionForMedia = `▶️ *${mediaTitle}*\n\n📥 Downloaded via ${bot.me.username}`; // bot.me.username might need to be fetched or hardcoded if not available directly

      if (type === 'audio') {
        mediaUrl = downloadData.audio;
        sendFunction = bot.sendAudio.bind(bot);
        if (!mediaUrl) throw new Error('Audio link not found in API response.');
      } else if (type === 'video') {
        mediaUrl = downloadData.video_hd || downloadData.video; // Prefer HD
        sendFunction = bot.sendVideo.bind(bot);
        if (!mediaUrl) throw new Error('Video link not found in API response.');
      } else {
        throw new Error('Invalid download type specified.');
      }

      // 4. Update message to "Sending..."
      const sendingCaption = originalMessageCaption.split('\n\n选择下载类型:')[0] + `\n\n✅ Link fetched! Sending ${downloadType}...`;
      await bot.editMessageCaption(
        { chatId, messageId: originalMessageId },
        sendingCaption,
        { parseMode: 'Markdown' }
      ).catch(e => console.error("Error editing caption (sending):", e));

      // 5. Send the audio/video file directly from URL
      // Ensure your bot library's sendAudio/sendVideo can handle URLs directly. Most can.
      await sendFunction(chatId, mediaUrl, {
        caption: captionForMedia,
        title: mediaTitle, // For audio files
        // performer: downloadData.channel || "Unknown Artist", // Nayan API provides 'channel'
        // duration: parseDuration(downloadData.duration_raw), // Nayan API might have duration, parse if needed
        parseMode: 'Markdown',
        replyToMessage: msg.message.reply_to_message ? msg.message.reply_to_message.message_id : undefined
      });

      // 6. Clean up the original message (e.g., remove buttons or update caption)
      const finalCaption = originalMessageCaption.split('\n\n选择下载类型:')[0] + `\n\n✅ ${downloadType} sent!`;
      await bot.editMessageCaption(
        { chatId, messageId: originalMessageId },
        finalCaption,
        { replyMarkup: bot.inlineKeyboard([]), parseMode: 'Markdown' } // Remove buttons
      ).catch(e => console.error("Error editing caption (final):", e));

      bot.answerCallbackQuery(msg.id, { text: `✅ ${downloadType} sent successfully!` });

    } catch (error) {
      console.error('Music/Video download error:', error.message);
      const errorFeedback = error.message.includes("timeout") ? 'API request timed out. Please try again.' : '❌ Failed to process download.';
      
      try {
        // Try to edit the original message caption with the error
        const errorCaption = originalMessageCaption.split('\n\n选择下载类型:')[0] + `\n\n❌ ${errorFeedback}`;
        await bot.editMessageCaption(
          { chatId, messageId: originalMessageId },
          errorCaption,
          { parseMode: 'Markdown' } // Keep buttons so user can retry if desired, or remove them
        );
      } catch (editError) {
        console.error("Error editing caption for error state:", editError);
        // If editing fails, at least answer the callback
      }
      
      bot.answerCallbackQuery(msg.id, {
        text: errorFeedback,
        showAlert: true
      });
    }
  }
};