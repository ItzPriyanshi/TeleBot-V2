const { ytmp3 } = require('@vreden/youtube_scraper');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: 'callbackQuery',
    version: '1.0.0',
    author: 'Priyanshi Kaur',
    description: 'Handle callback queries for music downloads'
  },
  
  onEvent: async function ({ bot, msg, threadModel, userModel }) {
    // Check if the callback is related to music download
    if (msg.data.startsWith('dl_')) {
      try {
        // Extract video ID and quality from callback data
        const [_, videoId, quality] = msg.data.split('_');
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Update the message to show download status
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption + '\n\n⏳ Downloading... Please wait',
          { parseMode: 'Markdown' }
        );
        
        // Download the audio
        const result = await ytmp3(url, quality);
        
        if (!result.status) {
          throw new Error(result.result || 'Download failed');
        }
        
        // Create temp directory if it doesn't exist
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Download the file to send it
        const audioResponse = await axios({
          method: 'get',
          url: result.download,
          responseType: 'arraybuffer'
        });
        
        const filePath = path.join(tempDir, `${videoId}_${quality}.mp3`);
        fs.writeFileSync(filePath, Buffer.from(audioResponse.data));
        
        // Update message to show completed download
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption + '\n\n✅ Download completed! Sending audio...',
          { parseMode: 'Markdown' }
        );
        
        // Send the audio file
        await bot.sendAudio(msg.message.chat.id, filePath, {
          title: result.metadata.title,
          performer: result.metadata.author,
          duration: result.metadata.duration,
          caption: `🎵 *Title:* ${result.metadata.title}\n👤 *Artist:* ${result.metadata.author}\n💽 *Quality:* ${quality}kbps`,
          parseMode: 'Markdown'
        });
        
        // Clean up the file
        fs.unlinkSync(filePath);
        
        // Reset the caption
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption.split('\n\n✅')[0],
          { parseMode: 'Markdown' }
        );
        
        // Answer callback query
        bot.answerCallbackQuery(msg.id, { text: '✅ Audio downloaded successfully!' });
        
      } catch (error) {
        console.error('Music download error:', error);
        
        // Update message to show error
        await bot.editMessageCaption(
          { chatId: msg.message.chat.id, messageId: msg.message.message_id },
          msg.message.caption + '\n\n❌ Download failed. Please try again.',
          { parseMode: 'Markdown' }
        );
        
        // Answer callback query with error
        bot.answerCallbackQuery(msg.id, { 
          text: '❌ Failed to download audio. Please try again.',
          showAlert: true
        });
      }
    }
  }
};