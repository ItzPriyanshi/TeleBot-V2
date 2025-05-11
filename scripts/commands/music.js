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
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Delete user's command message if bot has admin rights
        try {
            if (msg.chat.type !== 'private') {
                const botMember = await bot.getChatMember(chatId, bot.user.id);
                if (botMember.status === 'administrator' || botMember.status === 'creator') {
                    await bot.deleteMessage(chatId, msg.message_id);
                }
            }
        } catch (error) {
            console.log("Couldn't delete message:", error.message);
        }

        if (!args[0]) {
            return bot.sendMessage(chatId, `Please provide a song name.\nUsage: ${this.config.usage}`);
        }

        const query = args.join(" ");
        const searchMsg = await bot.sendMessage(chatId, "🔍 Searching for music...");

        try {
            // Step 1: Search for the video
            const searchResponse = await axios.get(`https://dev-priyanshi.onrender.com/api/ytsearch?query=${encodeURIComponent(query)}`);
            
            if (!searchResponse.data.status || searchResponse.data.results.length === 0) {
                throw new Error("No results found");
            }

            const firstResult = searchResponse.data.results[0];
            
            // Edit search message with found result
            await bot.editMessageText(
                {
                    chatId: searchMsg.chat.id,
                    messageId: searchMsg.message_id
                },
                `🎵 Found: ${firstResult.title}\n⬇️ Downloading audio...`
            );

            // Step 2: Get download URL from Nayan's API
            const downloadResponse = await axios.get(`https://nayan-video-downloader.vercel.app/ytdown?url=${encodeURIComponent(firstResult.url)}`);
            
            if (!downloadResponse.data.status || !downloadResponse.data.data.audio) {
                throw new Error("Download link not available");
            }

            const audioInfo = downloadResponse.data.data;

            // Step 3: Send the audio file
            await bot.sendAudio(
                chatId,
                audioInfo.audio,
                {
                    title: audioInfo.title,
                    performer: "YouTube",
                    thumbnail: audioInfo.thumb,
                    reply_to_message_id: msg.message_id
                }
            );

            // Delete the progress message
            await bot.deleteMessage(chatId, searchMsg.message_id);

        } catch (error) {
            console.error("Music error:", error);
            await bot.editMessageText(
                {
                    chatId: searchMsg.chat.id,
                    messageId: searchMsg.message_id
                },
                "❌ Failed to process your request. Please try again later."
            );
        }
    }
};