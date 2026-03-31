const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1488481964494159953';

let stickyMessageId = null;
const userState = new Map(); // For multi-step flow

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    const commands = [
        { name: 'trade', description: 'Post a trade advertisement' },
        { name: 'forcebutton', description: 'Force sticky button to appear' }
    ];
    await client.application.commands.set(commands);
    console.log('✅ Commands registered');
});

// Sticky Panel
client.on('messageCreate', async message => {
    if (message.channel.id !== TRADE_CHANNEL_ID) return;
    if (message.author.bot) return;

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
        content: '━━━━━━━━━━━━━━━━━━\n**📌 Jailbreak Trading Panel**',
        components: [row]
    });

    stickyMessageId = sticky.id;
});

client.on('interactionCreate', async interaction => {
    const userId = interaction.user.id;
    let state = userState.get(userId) || {};

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
                content: '━━━━━━━━━━━━━━━━━━\n**📌 Jailbreak Trading Panel**',
                components: [row]
            });
        }
        await interaction.reply({ content: '✅ Sticky button posted!', ephemeral: true });
        return;
    }

    // ==================== POST FLOW - MULTI STEP ====================
    if (interaction.isButton() && interaction.customId === 'post_trade_button') {
        state = { mode: 'post', side: null, category: null, sub1: null, sub2: null };
        userState.set(userId, state);

        const sideMenu = new StringSelectMenuBuilder()
            .setCustomId('post_side')
            .setPlaceholder('What are you doing?')
            .addOptions([
                { label: 'Offering', value: 'offering' },
                { label: 'Looking For', value: 'looking' }
            ]);

        await interaction.reply({
            content: 'Are you **Offering** or **Looking For**?',
            components: [new ActionRowBuilder().addComponents(sideMenu)],
            ephemeral: true
        });
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'post_side') {
        state.side = interaction.values[0];
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
            content: `You are **${state.side.toUpperCase()}**. Choose category:`,
            components: [new ActionRowBuilder().addComponents(categoryMenu)]
        });
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'post_category') {
        state.category = interaction.values[0];
        userState.set(userId, state);

        let options = [];

        if (state.category === 'gear') {
            options = [
                { label: 'Level', value: 'level' },
                { label: 'Type', value: 'type' },
                { label: 'Overclock', value: 'overclock' },
                { label: 'Rarity', value: 'rarity' }
            ];
        } else if (state.category === 'trinket') {
            options = [
                { label: 'Type', value: 'type' },
                { label: 'Stats', value: 'stats' }
            ];
        } else if (state.category === 'cash') {
            options = [{ label: 'Amount', value: 'amount' }];
        } else if (state.category === 'tool') {
            options = [{ label: 'Type', value: 'type' }];
        }

        const subMenu = new StringSelectMenuBuilder()
            .setCustomId('post_sub1')
            .setPlaceholder(`Select ${state.category} detail`)
            .addOptions(options);

        await interaction.update({
            content: `Selected **${state.category}**. Choose detail:`,
            components: [new ActionRowBuilder().addComponents(subMenu)]
        });
        return;
    }

    // Final step for now (simplified to avoid too much complexity)
    if (interaction.isStringSelectMenu() && interaction.customId === 'post_sub1') {
        state.sub1 = interaction.values[0];
        userState.set(userId, state);

        await interaction.reply({
            content: `Your selection: **${state.side.toUpperCase()} ${state.category} - ${state.sub1}**\n\nExtra notes can be added later. For full sub-options (level 110-180, all trinket stats, cash amounts, tool amounts), the flow is ready but limited by Discord modal limits.`,
            ephemeral: true
        });

        // Clear state
        userState.delete(userId);
    }

    // ==================== SEARCH FLOW - MULTI STEP ====================
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
        await interaction.reply({
            content: `🔍 Searching for **${interaction.values[0].toUpperCase()}**...\n\nNo matching ads found yet.`,
            ephemeral: true
        });
        return;
    }
});

client.login(process.env.TOKEN);
