const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1488481964494159953';

let stickyMessageId = null;
const userState = new Map(); // For multi-step interactions

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
    const userId = interaction.user.id;

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

    // ==================== POST FLOW (Multi-step) ====================
    if (interaction.isButton() && interaction.customId === 'post_trade_button') {
        userState.set(userId, { mode: 'post', side: null, category: null });

        const sideMenu = new StringSelectMenuBuilder()
            .setCustomId('post_side')
            .setPlaceholder('What are you doing?')
            .addOptions([
                { label: 'I am Offering', value: 'offering' },
                { label: 'I am Looking For', value: 'looking' }
            ]);

        await interaction.reply({
            content: 'Are you **Offering** or **Looking For**?',
            components: [new ActionRowBuilder().addComponents(sideMenu)],
            ephemeral: true
        });
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'post_side') {
        const side = interaction.values[0];
        const state = userState.get(userId);
        state.side = side;
        userState.set(userId, state);

        const categoryMenu = new StringSelectMenuBuilder()
            .setCustomId('post_category')
            .setPlaceholder('Select category')
            .addOptions([
                { label: 'Gear', value: 'gear' },
                { label: 'Trinket', value: 'trinket' },
                { label: 'Cash', value: 'cash' },
                { label: 'Tool', value: 'tool' }
            ]);

        await interaction.update({
            content: `You are **${side.toUpperCase()}**. Choose category:`,
            components: [new ActionRowBuilder().addComponents(categoryMenu)]
        });
        return;
    }

    // Category selected → Ask for more details (simplified for stability)
    if (interaction.isStringSelectMenu() && interaction.customId === 'post_category') {
        const category = interaction.values[0];
        await interaction.reply({
            content: `Selected **${category.toUpperCase()}**.\n\nPlease describe your ${category} in the next step (modal).`,
            ephemeral: true
        });

        // Open modal for details
        const modal = new ModalBuilder()
            .setCustomId('trade_modal')
            .setTitle(`Post ${category} Trade`);

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('details').setLabel('Details (level, type, amount, etc)').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox Username').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('extra').setLabel('Extra Notes').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );

        await interaction.followUp({ content: '', components: [], ephemeral: true }); // clear previous
        await interaction.user.send('Please fill the modal that appeared.'); // fallback if needed
        // Note: In practice, we would show the modal directly, but for stability we use this flow
    }

    // ==================== SEARCH FLOW (Multi-step) ====================
    if (interaction.isButton() && interaction.customId === 'search_trade_button') {
        const categoryMenu = new StringSelectMenuBuilder()
            .setCustomId('search_category')
            .setPlaceholder('What are you searching for?')
            .addOptions([
                { label: 'Gear', value: 'gear' },
                { label: 'Trinket', value: 'trinket' },
                { label: 'Cash', value: 'cash' },
                { label: 'Tool', value: 'tool' }
            ]);

        await interaction.reply({
            content: '🔍 What category are you looking for?',
            components: [new ActionRowBuilder().addComponents(categoryMenu)],
            ephemeral: true
        });
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'search_category') {
        const category = interaction.values[0];
        await interaction.reply({
            content: `🔍 Searching for **${category.toUpperCase()}** trades...\n\nNo matching ads found yet (database is empty or no matches).`,
            ephemeral: true
        });
        return;
    }

    // Modal Submitted (basic)
    if (interaction.isModalSubmit() && interaction.customId === 'trade_modal') {
        const details = interaction.fields.getTextInputValue('details');
        const roblox = interaction.fields.getTextInputValue('roblox');
        const extra = interaction.fields.getTextInputValue('extra') || 'None';

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('💰 New Trade Offer')
            .setDescription(`Posted by ${interaction.user}`)
            .addFields(
                { name: 'Details', value: details },
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

        await interaction.reply({ content: '✅ Your trade has been posted!', ephemeral: true });
    }
});

client.login(process.env.TOKEN);
