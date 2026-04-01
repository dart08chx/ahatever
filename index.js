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
let tradesDB = [];

// Load / Save database
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
});

// Sticky Panel - reacts to ANY message in the channel
client.on('messageCreate', async message => {
    if (message.channel.id !== TRADE_CHANNEL_ID) return;

    // Delete old sticky
    if (stickyMessageId) {
        try {
            const old = await message.channel.messages.fetch(stickyMessageId);
            await old.delete().catch(() => {});
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

    const sticky = await message.channel.send({
        content: '━━━━━━━━━━━━━━━━━━\n**📌 Jailbreak Trading Panel**\nClick below to post or search trades.',
        components: [row]
    });

    stickyMessageId = sticky.id;
});

client.on('interactionCreate', async interaction => {
    try {
        // ===================== POST BUTTON =====================
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

        // ===================== MODAL SUBMIT (used by both Post and Search) =====================
        if (interaction.isModalSubmit() && interaction.customId === 'trade_modal') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const offeringText = interaction.fields.getTextInputValue('offering').trim();
            const lookingText = interaction.fields.getTextInputValue('looking').trim();

            const offeringLines = offeringText.split('\n').map(line => line.trim()).filter(line => line);
            const lookingLines = lookingText.split('\n').map(line => line.trim()).filter(line => line);

            if (offeringLines.length === 0 && lookingLines.length === 0) {
                await interaction.editReply({ content: '❌ Please fill at least one field.' });
                return;
            }

            // If this is a Post (we can distinguish later if needed, but for now treat modal the same and add a hidden way)
            // For simplicity: always treat as Post for now. Search will use same modal but different logic below.

            // ==================== POST LOGIC ====================
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
            if (channel) {
                await channel.send({ embeds: [embed], components: [row] });
            }

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

        // ===================== SEARCH BUTTON =====================
        if (interaction.isButton() && interaction.customId === 'search_trade_button') {
            const modal = new ModalBuilder()
                .setCustomId('search_modal')
                .setTitle('Search Trades');

            const offeringInput = new TextInputBuilder()
                .setCustomId('offering')
                .setLabel('Search in Offering (one item per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            const lookingInput = new TextInputBuilder()
                .setCustomId('looking')
                .setLabel('Search in Looking For (one item per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(offeringInput),
                new ActionRowBuilder().addComponents(lookingInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // ===================== SEARCH MODAL SUBMIT =====================
        if (interaction.isModalSubmit() && interaction.customId === 'search_modal') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const offeringText = interaction.fields.getTextInputValue('offering').trim();
            const lookingText = interaction.fields.getTextInputValue('looking').trim();

            const searchOffering = offeringText ? offeringText.split('\n').map(l => l.trim().toLowerCase()).filter(l => l) : [];
            const searchLooking = lookingText ? lookingText.split('\n').map(l => l.trim().toLowerCase()).filter(l => l) : [];

            if (searchOffering.length === 0 && searchLooking.length === 0) {
                await interaction.editReply({ content: '❌ Please type at least one item to search.' });
                return;
            }

            // Search logic: any post that matches ANY searched item in Offering or Looking For
            const results = tradesDB.filter(trade => {
                const tradeOffering = trade.offering.map(item => item.toLowerCase());
                const tradeLooking = trade.looking.map(item => item.toLowerCase());

                const matchOffering = searchOffering.some(item => 
                    tradeOffering.some(t => t.includes(item))
                );
                const matchLooking = searchLooking.some(item => 
                    tradeLooking.some(t => t.includes(item))
                );

                return matchOffering || matchLooking;
            });

            if (results.length === 0) {
                await interaction.editReply({ content: '🔍 No matching trades found.' });
                return;
            }

            let replyText = `🔍 Found ${results.length} matching trade(s):\n\n`;
            results.slice(0, 10).forEach((trade, i) => {
                replyText += `**${i+1}.** Posted by ${trade.posterTag}\n**Offering:** ${trade.offering.join('\n')}\n**Looking For:** ${trade.looking.join('\n')}\n\n`;
            });
            if (results.length > 10) replyText += `... and ${results.length - 10} more.`;

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
