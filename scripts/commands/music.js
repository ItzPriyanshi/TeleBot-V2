const youtubesearchapi = require("youtube-search-api");
const { ytmp3 } = require('@vreden/youtube_scraper');
const config = require('../../config.json');

module.exports = {
    name: 'music',
    description: 'Search and download music from YouTube',
    permission: 0,
    cooldowns: 10,
    dmUser: true,
    author: config.botSettings.ownerName || 'Priyanshi kaur',
    run: async ({ sock, m, args }) => {
        try {
            const query = args.join(' ');
            
            if (!query) {
                return await sock.sendMessage(
                    m.key.remoteJid, 
                    { text: `Please provide a search query.\nExample: ${global.prefix}music never gonna give you up` },
                    { quoted: m }
                );
            }

            // Show searching indicator
            await sock.sendMessage(
                m.key.remoteJid,
                { text: `🔍 Searching for "${query}"...` },
                { quoted: m }
            );

            // Search YouTube
            const searchResults = await youtubesearchapi.GetListByKeyword(query, false, 5);

            if (!searchResults.items || searchResults.items.length === 0) {
                return await sock.sendMessage(
                    m.key.remoteJid,
                    { text: `❌ No results found for "${query}"` },
                    { quoted: m }
                );
            }

            // Format results
            const results = searchResults.items.map((video, index) => ({
                index: index + 1,
                title: video.title,
                id: video.id,
                url: `https://www.youtube.com/watch?v=${video.id}`,
                duration: video.length?.simpleText || "N/A",
                views: video.viewCount || "N/A",
                author: video.channelTitle,
                thumbnail: video.thumbnail?.thumbnails?.pop()?.url || null
            }));

            // Send search results
            let resultText = `🎵 Search Results for "${query}":\n\n`;
            results.forEach(item => {
                resultText += `${item.index}. *${item.title}*\n`;
                resultText += `👤 ${item.author} | ⏱️ ${item.duration} | 👀 ${item.views}\n`;
                resultText += `🔗 ${item.url}\n\n`;
            });
            resultText += `\nReply with the number (1-${results.length}) to download the audio.`;

            await sock.sendMessage(
                m.key.remoteJid,
                { text: resultText },
                { quoted: m }
            );

            // Wait for user selection
            const reply = await waitForReply(sock, m.key.remoteJid, m.sender, results.length);
            
            if (!reply || isNaN(reply) || reply < 1 || reply > results.length) {
                return await sock.sendMessage(
                    m.key.remoteJid,
                    { text: '❌ Invalid selection or timeout. Please try again.' },
                    { quoted: m }
                );
            }

            const selected = results[reply - 1];
            
            // Download processing message
            await sock.sendMessage(
                m.key.remoteJid,
                { text: `⬇️ Downloading: ${selected.title}\nThis may take a moment...` },
                { quoted: m }
            );

            // Download audio
            const downloadResult = await ytmp3(selected.url, "128").catch(err => {
                console.error('Download error:', err);
                return { status: false, result: 'Failed to download audio' };
            });

            if (!downloadResult.status) {
                return await sock.sendMessage(
                    m.key.remoteJid,
                    { text: `❌ Error downloading audio: ${downloadResult.result}` },
                    { quoted: m }
                );
            }

            // Send audio file
            await sock.sendMessage(
                m.key.remoteJid,
                { 
                    audio: { url: downloadResult.download },
                    mimetype: 'audio/mpeg',
                    fileName: `${selected.title}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: selected.title,
                            body: `🎵 ${global.botName} Music`,
                            thumbnailUrl: selected.thumbnail,
                            mediaType: 2,
                            mediaUrl: selected.url,
                            sourceUrl: selected.url
                        }
                    }
                },
                { quoted: m }
            );

        } catch (error) {
            console.error('Music command error:', error);
            await sock.sendMessage(
                m.key.remoteJid,
                { text: `❌ An error occurred: ${error.message}` },
                { quoted: m }
            );
        }
    }
};

// Helper function to wait for user reply
async function waitForReply(sock, chatId, userId, maxNumber) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 30000); // 30 seconds timeout
        
        const listener = async (message) => {
            try {
                if (!message.key.fromMe && message.key.remoteJid === chatId && 
                    message.sender === userId && message.message?.conversation) {
                    
                    const num = parseInt(message.message.conversation.trim());
                    if (!isNaN(num) && num >= 1 && num <= maxNumber) {
                        clearTimeout(timeout);
                        sock.ev.off('messages.upsert', listener);
                        resolve(num);
                    }
                }
            } catch (err) {
                console.error('Reply listener error:', err);
                clearTimeout(timeout);
                sock.ev.off('messages.upsert', listener);
                resolve(null);
            }
        };

        sock.ev.on('messages.upsert', listener);
    });
}