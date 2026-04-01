const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1488481964494159953';
const DB_FILE = './trades.json';

let stickyMessageId = null;
let lastStickyTime = 0;
let tradesDB = [];

// Database
function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            tradesDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            console.log(`✅ Loaded ${tradesDB.length} trades`);
        }
    } catch (e) {}
}

function saveDB() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(tradesDB, null, 2));
    } catch (e) {}
}

loadDB();

client.once('clientReady', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    const commands = [
        { name: 'forcebutton', description: 'Force sticky button to appear' }
    ];
    await client.application.commands.set(commands);
});

// Sticky Panel - Improved to prevent loop after trade posts
client.on('messageCreate', async message => {
    if (message.channel.id !== TRADE_CHANNEL_ID) return;

    // Never react to our own sticky message
    if (message.id === stickyMessageId) return;

    // Cooldown to prevent rapid firing
    const now = Date.now();
    if (now - lastStickyTime < 3000) return; // 3 second cooldown

    // Delete old sticky
    if (stickyMessageId) {
        try {
            const old = await message.channel.messages.fetch(stickyMessageId).catch(() => null);
            if (old) await old.delete().catch(() => {});
        } catch (e) {}
    }

    const postBtn = new ButtonBuilder()
        .setCustomId('post_trade_button')
        .setLabel('📝 Post New Trade')
        .setStyle(ButtonStyle.Success);

    const searchBtn = new ButtonBuilder()
        .setCustomId('search_trade_button')
        .setLabel('🔍 Search Trades')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(postBtn, searchBtn);

    try {
        const sticky = await message.channel.send({
            content: '━━━━━━━━━━━━━━━━━━\n**📌 Jailbreak Trading Panel**\nClick below to post or search.',
            components: [row]
        });
        stickyMessageId = sticky.id;
        lastStickyTime = now;
    } catch (err) {
        console.error('Failed to send sticky. Check bot permissions in the channel!', err.message);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        // Force Button
        if (interaction.isChatInputCommand() && interaction.commandName === 'forcebutton') {
            await interaction.reply({ content: '✅ Forcing sticky panel...', flags: MessageFlags.Ephemeral });
            return;
        }

        // Post Button
        if (interaction.isButton() && interaction.customId === 'post_trade_button') {
            const modal = new ModalBuilder()
                .setCustomId('trade_modal')
                .setTitle('Post Your Trade');

            const offeringInput = new TextInputBuilder()
                .setCustomId('offering')
                .setLabel('Offering (one item per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const lookingInput = new TextInputBuilder()
                .setCustomId('looking')
                .setLabel('Looking For (one item per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(offeringInput),
                new ActionRowBuilder().addComponents(lookingInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // Modal Submit - Post with format check
        if (interaction.isModalSubmit() && interaction.customId === 'trade_modal') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const offering = interaction.fields.getTextInputValue('offering').trim();
            const looking = interaction.fields.getTextInputValue('looking').trim();

            const offeringLines = offering.split('\n').map(l => l.trim()).filter(l => l);
            const lookingLines = looking.split('\n').map(l => l.trim()).filter(l => l);

            if (offeringLines.length === 0 && lookingLines.length === 0) {
                await interaction.editReply({ content: '❌ Please fill at least one field.' });
                return;
            }

            // ==================== FORMAT CHECK ====================
            const formatHelp = '❌ Bad format! Use these examples:\n' +
                'Gear: level 160 legendary shoe\n' +
                'Trinket: 555 sprint\n' +
                'Tool: 50 kits\n' +
                'Cash: 500k or 1.2m';

            const badLines = [];
            for (const line of [...offeringLines, ...lookingLines]) {
                const lower = line.toLowerCase().trim();
                if (!lower) continue;

                if (lower.includes('level') || lower.match(/^\d+\s+\w+/)) continue;
                if (/^\d+\s+\w+$/.test(lower) || lower.includes('sprint') || lower.includes('regen') || lower.includes('pen')) continue;
                if (/^\d+\s+\w+$/.test(lower) || lower.includes('kits') || lower.includes('recs')) continue;
                if (/\d+[km]?$/i.test(lower)) continue;

                badLines.push(`"${line}"`);
            }

            if (badLines.length > 0) {
                await interaction.editReply({ content: `${formatHelp}\n\nBad lines: ${badLines.join(', ')}` });
                return;
            }

            // Post the trade
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('💰 New Trade Offer')
                .setDescription(`Posted by ${interaction.user}`)
                .addFields(
                    { name: 'Offering', value: offeringLines.join('\n') || 'None' },
                    { name: 'Looking For', value: lookingLines.join('\n') || 'None' }
                )
                .setTimestamp();

            const dmBtn = new ButtonBuilder()
                .setCustomId(`start_trade_${interaction.user.id}`)
                .setLabel('DM / Start Trade')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(dmBtn);

            const channel = client.channels.cache.get(TRADE_CHANNEL_ID);
            if (channel) await channel.send({ embeds: [embed], components: [row] });

            tradesDB.push({
                posterTag: interaction.user.tag,
                offering: offeringLines,
                looking: lookingLines,
                timestamp: Date.now()
            });
            saveDB();

            await interaction.editReply({ content: '✅ Trade posted successfully!' });
            return;
        }

        // Search Button
        if (interaction.isButton() && interaction.customId === 'search_trade_button') {
            const modal = new ModalBuilder()
                .setCustomId('search_modal')
                .setTitle('Search Trades');

            const offeringInput = new TextInputBuilder()
                .setCustomId('offering')
                .setLabel('Search in Offering (one per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            const lookingInput = new TextInputBuilder()
                .setCustomId('looking')
                .setLabel('Search in Looking For (one per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(offeringInput),
                new ActionRowBuilder().addComponents(lookingInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // Search Modal
        if (interaction.isModalSubmit() && interaction.customId === 'search_modal') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const offeringText = interaction.fields.getTextInputValue('offering').trim();
            const lookingText = interaction.fields.getTextInputValue('looking').trim();

            const searchOffering = offeringText ? offeringText.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean) : [];
            const searchLooking = lookingText ? lookingText.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean) : [];

            if (searchOffering.length === 0 && searchLooking.length === 0) {
                await interaction.editReply({ content: '❌ Please type at least one item to search.' });
                return;
            }

            const results = tradesDB.filter(trade => {
                const tradeOff = trade.offering.map(item => item.toLowerCase());
                const tradeLook = trade.looking.map(item => item.toLowerCase());
                const matchOff = searchOffering.some(item => tradeOff.some(t => t.includes(item)));
                const matchLook = searchLooking.some(item => tradeLook.some(t => t.includes(item)));
                return matchOff || matchLook;
            });

            if (results.length === 0) {
                await interaction.editReply({ content: '🔍 No matching trades found.' });
                return;
            }

            let replyText = `🔍 Found ${results.length} matching trade(s):\n\n`;
            results.slice(0, 8).forEach((trade, i) => {
                replyText += `**${i+1}.** ${trade.posterTag}\n**Offering:** ${trade.offering.join('\n')}\n**Looking For:** ${trade.looking.join('\n')}\n\n`;
            });
            if (results.length > 8) replyText += `... and ${results.length - 8} more.`;

            await interaction.editReply({ content: replyText });
            return;
        }

    } catch (err) {
        console.error('Interaction error:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Something went wrong. Try again.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
});

client.login(process.env.TOKEN);
