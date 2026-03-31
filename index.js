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
const userState = new Map();

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    const commands = [
        { name: 'trade', description: 'Post a trade advertisement' },
        { name: 'forcebutton', description: 'Force sticky button to appear' }
    ];
    await client.application.commands.set(commands);
});

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
    let state = userState.get(userId) || { mode: 'post', side: null, category: null, sub1: null, sub2: null, items: { offering: [], looking: [] } };

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

    // ==================== POST FLOW ====================
    if (interaction.isButton() && interaction.customId === 'post_trade_button') {
        state = { mode: 'post', side: null, category: null, sub1: null, sub2: null, items: { offering: [], looking: [] } };
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

    // Category → First sub-option
    if (interaction.isStringSelectMenu() && interaction.customId === 'post_category') {
        state.category = interaction.values[0];
        userState.set(userId, state);

        let options = [];

        if (state.category === 'gear') {
            options = [
                { label: 'Under 100', value: 'under 100' },
                { label: '110', value: '110' },
                { label: '120', value: '120' },
                { label: '130', value: '130' },
                { label: '140', value: '140' },
                { label: '150', value: '150' },
                { label: '160', value: '160' },
                { label: '165', value: '165' },
                { label: '170', value: '170' },
                { label: '175', value: '175' },
                { label: '180', value: '180' },
                { label: '180+', value: '180+' }
            ];
        } else if (state.category === 'trinket') {
            options = [
                { label: 'Pen', value: 'Pen' },
                { label: 'Regen', value: 'Regen' },
                { label: 'Sprint', value: 'Sprint' },
                { label: 'Saver', value: 'Saver' },
                { label: 'Curve', value: 'Curve' },
                { label: 'Steal', value: 'Steal' },
                { label: 'Fast Pass', value: 'Fast Pass' },
                { label: 'Rebound', value: 'Rebound' }
            ];
        } else if (state.category === 'cash') {
            options = [
                { label: 'Offer', value: 'Offer' },
                { label: 'Regular', value: 'Regular' },
                { label: 'Overpay', value: 'Overpay' },
                { label: '50k', value: '50k' },
                { label: '100k', value: '100k' },
                { label: '150k', value: '150k' },
                { label: '200k', value: '200k' },
                { label: '250k', value: '250k' },
                { label: '300k', value: '300k' },
                { label: '350k', value: '350k' },
                { label: '400k', value: '400k' },
                { label: '450k', value: '450k' },
                { label: '500k', value: '500k' },
                { label: '550k', value: '550k' },
                { label: '600k', value: '600k' },
                { label: '650k', value: '650k' },
                { label: '700k', value: '700k' },
                { label: '750k', value: '750k' },
                { label: '800k', value: '800k' },
                { label: '900k', value: '900k' },
                { label: '1m', value: '1m' },
                { label: '1.25m', value: '1.25m' },
                { label: '1.5m', value: '1.5m' },
                { label: '1.75m', value: '1.75m' },
                { label: '2m', value: '2m' },
                { label: '2.25m', value: '2.25m' },
                { label: '2.5m', value: '2.5m' },
                { label: '2.75m', value: '2.75m' },
                { label: '3m', value: '3m' },
                { label: '3m+', value: '3m+' }
            ];
        } else if (state.category === 'tool') {
            options = [
                { label: 'Kits', value: 'Kits' },
                { label: 'Recs', value: 'Recs' },
                { label: 'Overclocks', value: 'Overclocks' },
                { label: 'Orbs', value: 'Orbs' },
                { label: 'Slot Unlock', value: 'Slot Unlock' },
                { label: 'Item Aug', value: 'Item Aug' }
            ];
        }

        const subMenu = new StringSelectMenuBuilder()
            .setCustomId('post_sub1')
            .setPlaceholder(`Select ${state.category} detail (required)`)
            .addOptions(options);

        await interaction.update({
            content: `Selected **${state.category}**. Choose detail:`,
            components: [new ActionRowBuilder().addComponents(subMenu)]
        });
        return;
    }

    // Sub1 selected → Add item and ask to continue or send
    if (interaction.isStringSelectMenu() && interaction.customId === 'post_sub1') {
        state.sub1 = interaction.values[0];

        const itemText = formatItem(state.category, state.sub1);

        if (state.side === 'offering') {
            state.items.offering.push(itemText);
        } else {
            state.items.looking.push(itemText);
        }

        userState.set(userId, state);

        const continueMenu = new StringSelectMenuBuilder()
            .setCustomId('continue_or_send')
            .setPlaceholder('What next?')
            .addOptions([
                { label: 'Add Another Item', value: 'add_another' },
                { label: 'Send Post Now', value: 'send_post' }
            ]);

        await interaction.update({
            content: `✅ Added: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat do you want to do?`,
            components: [new ActionRowBuilder().addComponents(continueMenu)]
        });
        return;
    }

    // Continue or Send Post
    if (interaction.isStringSelectMenu() && interaction.customId === 'continue_or_send') {
        const choice = interaction.values[0];

        if (choice === 'add_another') {
            state.side = null;
            state.category = null;
            state.sub1 = null;
            userState.set(userId, state);

            const sideMenu = new StringSelectMenuBuilder()
                .setCustomId('post_side')
                .setPlaceholder('What are you doing?')
                .addOptions([
                    { label: 'Offering', value: 'offering' },
                    { label: 'Looking For', value: 'looking' }
                ]);

            await interaction.update({
                content: 'Add another item. Are you **Offering** or **Looking For**?',
                components: [new ActionRowBuilder().addComponents(sideMenu)]
            });
        } else if (choice === 'send_post') {
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('💰 New Trade Offer')
                .setDescription(`Posted by ${interaction.user}`)
                .addFields(
                    { name: 'Offering', value: state.items.offering.join('\n') || 'None' },
                    { name: 'Looking For', value: state.items.looking.join('\n') || 'None' }
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

            await interaction.update({
                content: '✅ Trade posted successfully!',
                components: []
            });

            userState.delete(userId);
        }
        return;
    }

    // Search Button - Multi-step
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

// Helper to format item text
function formatItem(category, sub) {
    if (category === 'cash') return `${sub} Cash`;
    if (category === 'tool') return `${sub} Tool`;
    return `${sub} ${category}`;
}

client.login(process.env.TOKEN);
