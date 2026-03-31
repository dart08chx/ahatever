const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
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
let tradesDB = new Map();

// Load database from file on startup
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            tradesDB = new Map(Object.entries(data));
            console.log(`✅ Loaded ${tradesDB.size} saved trades from database`);
        }
    } catch (err) {
        console.log('No existing database found, starting fresh.');
    }
}

// Save database to file
function saveDatabase() {
    try {
        const data = Object.fromEntries(tradesDB);
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to save database:', err);
    }
}

loadDatabase();

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    const commands = [
        { name: 'trade', description: 'Post a trade advertisement' },
        { name: 'forcebutton', description: 'Force sticky button to appear' }
    ];
    await client.application.commands.set(commands);
    console.log('✅ Commands registered');
});

// ==================== STICKY PANEL ====================
client.on('messageCreate', async message => {
    if (message.channel.id !== TRADE_CHANNEL_ID) return;
    if (message.author.bot) return;

    if (stickyMessageId) {
        try {
            const oldMsg = await message.channel.messages.fetch(stickyMessageId);
            await oldMsg.delete().catch(() => {});
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

    const stickyMsg = await message.channel.send({
        content: '━━━━━━━━━━━━━━━━━━\n**📌 Jailbreak Trading Panel**\nUse the buttons below:',
        components: [row]
    });

    stickyMessageId = stickyMsg.id;
});

client.on('interactionCreate', async interaction => {

    // Force Button
    if (interaction.isChatInputCommand() && interaction.commandName === 'forcebutton') {
        const postBtn = new ButtonBuilder()
            .setCustomId('post_trade_button')
            .setLabel('📝 Post New Trade')
            .setStyle(ButtonStyle.Success);

        const searchBtn = new ButtonBuilder()
            .setCustomId('search_trade_button')
            .setLabel('🔍 Search Trades')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(postBtn, searchBtn);

        const channel = client.channels.cache.get(TRADE_CHANNEL_ID);
        if (channel) {
            await channel.send({
                content: '━━━━━━━━━━━━━━━━━━\n**📌 Jailbreak Trading Panel**\nUse the buttons below:',
                components: [row]
            });
        }
        await interaction.reply({ content: '✅ Sticky button posted!', ephemeral: true });
        return;
    }

    // Post New Trade Button
    if (interaction.isButton() && interaction.customId === 'post_trade_button') {
        await interaction.deferUpdate();

        const modal = new ModalBuilder()
            .setCustomId('trade_modal')
            .setTitle('📝 Post Your Trade');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('offering').setLabel('What are you Offering?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('looking').setLabel('What are you Looking For?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox Username').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('extra').setLabel('Extra Notes (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );

        await interaction.showModal(modal);
        return;
    }

    // Modal Submitted + Save to Persistent Database
    if (interaction.isModalSubmit() && interaction.customId === 'trade_modal') {
        const offering = interaction.fields.getTextInputValue('offering');
        const looking = interaction.fields.getTextInputValue('looking');
        const roblox = interaction.fields.getTextInputValue('roblox');
        const extra = interaction.fields.getTextInputValue('extra') || 'None';

        const tradeId = Date.now().toString();

        const tradeData = {
            id: tradeId,
            posterId: interaction.user.id,
            posterTag: interaction.user.tag,
            offering,
            looking,
            roblox,
            extra,
            timestamp: Date.now()
        };

        tradesDB.set(tradeId, tradeData);
        saveDatabase();   // ← Save to file

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('💰 New Trade Offer')
            .setDescription(`Posted by ${interaction.user}`)
            .addFields(
                { name: 'Offering', value: offering },
                { name: 'Looking For', value: looking },
                { name: 'Roblox Username', value: roblox, inline: true },
                { name: 'Extra Notes', value: extra }
            )
            .setTimestamp();

        const startButton = new ButtonBuilder()
            .setCustomId(`start_trade_${interaction.user.id}`)
            .setLabel('DM / Start Trade')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(startButton);

        const channel = client.channels.cache.get(TRADE_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed], components: [row] });
        }

        await interaction.reply({ content: '✅ Your trade has been posted and saved permanently!', ephemeral: true });
    }

    // ==================== SEARCH FUNCTION (Real Database) ====================
    if (interaction.isButton() && interaction.customId === 'search_trade_button') {
        await interaction.deferUpdate();

        const categoryMenu = new StringSelectMenuBuilder()
            .setCustomId('search_category')
            .setPlaceholder('What category are you searching for?')
            .addOptions([
                { label: 'Gear', value: 'gear' },
                { label: 'Trinket', value: 'trinket' },
                { label: 'Cash', value: 'cash' },
                { label: 'Tool', value: 'tool' }
            ]);

        await interaction.followUp({
            content: '🔍 What are you looking for?',
            components: [new ActionRowBuilder().addComponents(categoryMenu)],
            ephemeral: true
        });
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'search_category') {
        const category = interaction.values[0].toLowerCase();

        let results = Array.from(tradesDB.values()).filter(trade => 
            trade.offering.toLowerCase().includes(category) || 
            trade.looking.toLowerCase().includes(category)
        );

        if (results.length === 0) {
            await interaction.reply({
                content: `🔍 No matching **${category}** trades found.`,
                ephemeral: true
            });
        } else {
            let replyText = `🔍 Found ${results.length} matching **${category}** trade(s):\n\n`;
            results.slice(0, 8).forEach(trade => {
                replyText += `**Posted by** ${trade.posterTag}\n**Offering:** ${trade.offering}\n**Looking For:** ${trade.looking}\n**Roblox:** ${trade.roblox}\n\n`;
            });
            if (results.length > 8) replyText += `... and ${results.length - 8} more.`;

            await interaction.reply({
                content: replyText,
                ephemeral: true
            });
        }
        return;
    }

    // Start Trade Button
    if (interaction.isButton() && interaction.customId.startsWith('start_trade_')) {
        await interaction.deferUpdate();

        const sellerId = interaction.customId.split('_')[2];
        const buyer = interaction.user;

        try {
            const seller = await client.users.fetch(sellerId);
            const channel = client.channels.cache.get(TRADE_CHANNEL_ID);

            const thread = await channel.threads.create({
                name: `Trade ${buyer.username} ↔ ${seller.username}`,
                type: ChannelType.GuildPrivateThread,
                autoArchiveDuration: 1440,
            });

            await thread.members.add(buyer.id);
            await thread.members.add(seller.id);

            const closeBtn = new ButtonBuilder()
                .setCustomId('close_thread')
                .setLabel('🔒 Close Thread')
                .setStyle(ButtonStyle.Danger);

            await thread.send({
                content: `**Private Trade Chat Started**\n${buyer} wants to trade with ${seller}`,
                components: [new ActionRowBuilder().addComponents(closeBtn)]
            });

            await interaction.followUp({ content: `✅ Private thread created!\nGo here: ${thread}`, ephemeral: true });
        } catch (err) {
            await interaction.followUp({ content: '❌ Failed to create thread.', ephemeral: true });
        }
    }

    if (interaction.isButton() && interaction.customId === 'close_thread') {
        if (interaction.channel.isThread()) {
            await interaction.channel.setArchived(true);
            await interaction.reply({ content: '🔒 Thread closed.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
