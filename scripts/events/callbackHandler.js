const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: 'callbackQuery',
    version: '1.1.0',
    author: 'Priyanshi Kaur',
    description: 'Handle callback queries for music and video downloads'
  },

  onEvent: async function ({ bot, msg }) {
    // Check if the callback is related to media download
    if (msg.data.startsWith('dl_')) {
      try {
        // Extract type and video ID from callback data
        const [_, mediaType, videoId] = msg.data.split('_');
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Update the message to show download status
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption + '\n\n⏳ Fetching download link... Please wait',
          { parseMode: 'Markdown' }
        );

        // Get download links from the new API
        const apiUrl = `https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(url)}`;
        const apiResponse = await axios.get(apiUrl);
        
        if (!apiResponse.data || apiResponse.data.error) {
          throw new Error(apiResponse.data?.error || 'Failed to get download links');
        }

        // Extract the appropriate link based on mediaType
        let downloadUrl = '';
        let fileName = '';
        let fileType = '';
        
        if (mediaType === 'audio') {
          // Find the audio URL (starts with "audio:")
          const audioLinks = Object.entries(apiResponse.data).find(([key, value]) => 
            typeof value === 'string' && value.startsWith('https://rr') && key.includes('audio')
          );
          
          if (!audioLinks || !audioLinks[1]) {
            throw new Error('No audio download link found');
          }
          
          downloadUrl = audioLinks[1];
          fileName = `${videoId}.mp3`;
          fileType = 'audio';
        } else if (mediaType === 'video') {
          // Find the video URL (starts with "video:")
          const videoLinks = Object.entries(apiResponse.data).find(([key, value]) => 
            typeof value === 'string' && value.startsWith('https://redirector') && key.includes('video')
          );
          
          if (!videoLinks || !videoLinks[1]) {
            throw new Error('No video download link found');
          }
          
          downloadUrl = videoLinks[1];
          fileName = `${videoId}.mp4`;
          fileType = 'video';
        } else {
          throw new Error('Invalid media type');
        }

        // Update message to show download progress
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption + '\n\n⏳ Downloading... Please wait',
          { parseMode: 'Markdown' }
        );

        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Download the file
        const mediaResponse = await axios({
          method: 'get',
          url: downloadUrl,
          responseType: 'arraybuffer',
          timeout: 60000, // 60 seconds timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(mediaResponse.data));

        // Extract title and artist from caption
        const captionLines = msg.message.caption.split('\n');
        const title = captionLines[0].replace('🎵 Found: ', '').trim();
        const artist = captionLines[1].replace('👤 Artist: ', '').trim();

        // Update message to show completed download
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption + '\n\n✅ Download completed! Sending media...',
          { parseMode: 'Markdown' }
        );

        // Send the media file based on type
        if (fileType === 'audio') {
          await bot.sendAudio(msg.message.chat.id, filePath, {
            title: title,
            performer: artist,
            caption: `🎵 *Title:* ${title}\n👤 *Artist:* ${artist}`,
            parseMode: 'Markdown'
          });
        } else {
          await bot.sendVideo(msg.message.chat.id, filePath, {
            caption: `🎬 *Title:* ${title}\n👤 *Artist:* ${artist}`,
            parseMode: 'Markdown'
          });
        }

        // Clean up the file
        fs.unlinkSync(filePath);

        // Reset the caption
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption.split('\n\n⏳')[0],
          { 
            parseMode: 'Markdown',
            replyMarkup: msg.message.reply_markup // Keep the original buttons
          }
        );

        // Answer callback query
        bot.answerCallbackQuery(msg.id, { 
          text: `✅ ${fileType === 'audio' ? 'Audio' : 'Video'} downloaded successfully!` 
        });

      } catch (error) {
        console.error('Media download error:', error);

        // Update message to show error
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption.split('\n\n⏳')[0] + '\n\n❌ Download failed. Please try again.',
          { 
            parseMode: 'Markdown',
            replyMarkup: msg.message.reply_markup // Keep the original buttons
          }
        );

        // Answer callback query with error
        bot.answerCallbackQuery(msg.id, { 
          text: '❌ Failed to download. Please try again.',
          showAlert: true
        });
      }
    }
  }
};