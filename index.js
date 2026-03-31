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
const tradesDB = []; // Simple in-memory database for search

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
    let state = userState.get(userId) || { mode: 'post', side: null, category: null, level: null, type: null, overclock: null, rarity: null, statType: null, trinketType: null, trinketStats: null, cashAmount: null, toolType: null, toolAmount: null, items: { offering: [], looking: [] } };

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

    // ==================== POST FLOW (All categories expanded) ====================
    if (interaction.isButton() && interaction.customId === 'post_trade_button') {
        state = { mode: 'post', side: null, category: null, level: null, type: null, overclock: null, rarity: null, statType: null, trinketType: null, trinketStats: null, cashAmount: null, toolType: null, toolAmount: null, items: { offering: [], looking: [] } };
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

    // Category → Sub options
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
                { label: 'Regular', value: 'Regular' },
                { label: 'Overpay', value: 'Overpay' },
                { label: 'Offer', value: 'Offer' },
                { label: 'Under 250k', value: 'Under 250k' },
                { label: '~300k', value: '~300k' },
                { label: '~400k', value: '~400k' },
                { label: '~500k', value: '~500k' },
                { label: '~600k', value: '~600k' },
                { label: '~700k', value: '~700k' },
                { label: '~800k', value: '~800k' },
                { label: '~900k', value: '~900k' },
                { label: '1m+', value: '1m+' },
                { label: '1.5m+', value: '1.5m+' },
                { label: '2m+', value: '2m+' },
                { label: '2.5m+', value: '2.5m+' },
                { label: '3m+', value: '3m+' },
                { label: '5m+', value: '5m+' },
                { label: '7.5m+', value: '7.5m+' },
                { label: '10m+', value: '10m+' }
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
            content: `Selected **${state.category}**. Choose detail (required):`,
            components: [new ActionRowBuilder().addComponents(subMenu)]
        });
        return;
    }

    // Gear Level
    if (interaction.isStringSelectMenu() && interaction.customId === 'gear_level') {
        state.level = interaction.values[0];
        userState.set(userId, state);

        const typeMenu = new StringSelectMenuBuilder()
            .setCustomId('gear_type')
            .setPlaceholder('Select Type (required)')
            .addOptions([
                { label: 'Phoenix', value: 'Phoenix' },
                { label: 'Legendary', value: 'Legendary' },
                { label: 'Event', value: 'Event' },
                { label: 'Epic', value: 'Epic' },
                { label: 'Rare', value: 'Rare' },
                { label: 'Uncommon', value: 'Uncommon' },
                { label: 'Common', value: 'Common' }
            ]);

        await interaction.update({
            content: `Level: **${state.level}**. Choose Type (required):`,
            components: [new ActionRowBuilder().addComponents(typeMenu)]
        });
        return;
    }

    // Gear Type
    if (interaction.isStringSelectMenu() && interaction.customId === 'gear_type') {
        state.type = interaction.values[0];
        userState.set(userId, state);

        const overclockMenu = new StringSelectMenuBuilder()
            .setCustomId('gear_overclock')
            .setPlaceholder('Select Overclock (required)')
            .addOptions([
                { label: 'Full', value: 'Full' },
                { label: 'None', value: 'None' },
                { label: 'Missing', value: 'Missing' }
            ]);

        await interaction.update({
            content: `Type: **${state.type}**. Choose Overclock (required):`,
            components: [new ActionRowBuilder().addComponents(overclockMenu)]
        });
        return;
    }

    // Gear Overclock
    if (interaction.isStringSelectMenu() && interaction.customId === 'gear_overclock') {
        state.overclock = interaction.values[0];
        userState.set(userId, state);

        const rarityMenu = new StringSelectMenuBuilder()
            .setCustomId('gear_rarity')
            .setPlaceholder('Select Rarity (required)')
            .addOptions([
                { label: 'Original', value: 'Original' },
                { label: 'Gold', value: 'Gold' },
                { label: 'Divine', value: 'Divine' }
            ]);

        await interaction.update({
            content: `Overclock: **${state.overclock}**. Choose Rarity (required):`,
            components: [new ActionRowBuilder().addComponents(rarityMenu)]
        });
        return;
    }

    // Gear Rarity
    if (interaction.isStringSelectMenu() && interaction.customId === 'gear_rarity') {
        state.rarity = interaction.values[0];
        userState.set(userId, state);

        const statTypeMenu = new StringSelectMenuBuilder()
            .setCustomId('gear_stat_type')
            .setPlaceholder('Select Stat Type (required)')
            .addOptions([
                { label: 'Speed Def', value: 'Speed Def' },
                { label: 'Power Speed', value: 'Power Speed' }
            ]);

        await interaction.update({
            content: `Rarity: **${state.rarity}**. Choose Stat Type (required):`,
            components: [new ActionRowBuilder().addComponents(statTypeMenu)]
        });
        return;
    }

    // Gear Stat Type - Final
    if (interaction.isStringSelectMenu() && interaction.customId === 'gear_stat_type') {
        state.statType = interaction.values[0];

        const itemText = `${state.level} Level ${state.type} ${state.rarity} ${state.overclock} Overclock ${state.statType}`;

        if (state.side === 'offering') state.items.offering.push(itemText);
        else state.items.looking.push(itemText);

        userState.set(userId, state);

        const continueMenu = new StringSelectMenuBuilder()
            .setCustomId('continue_or_send')
            .setPlaceholder('What next?')
            .addOptions([
                { label: 'Add Another Item', value: 'add_another' },
                { label: 'Send Post Now', value: 'send_post' }
            ]);

        await interaction.update({
            content: `✅ Added Gear: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat next?`,
            components: [new ActionRowBuilder().addComponents(continueMenu)]
        });
        return;
    }

    // Trinket Type
    if (interaction.isStringSelectMenu() && interaction.customId === 'trinket_type') {
        state.trinketType = interaction.values[0];
        userState.set(userId, state);

        const statsMenu = new StringSelectMenuBuilder()
            .setCustomId('trinket_stats')
            .setPlaceholder('Select Stats (required)')
            .addOptions([
                { label: 'Speed Def', value: 'Speed Def' },
                { label: 'Power Speed', value: 'Power Speed' },
                { label: 'Mixed', value: 'Mixed' }
            ]);

        await interaction.update({
            content: `Trinket Type: **${state.trinketType}**. Choose Stats (required):`,
            components: [new ActionRowBuilder().addComponents(statsMenu)]
        });
        return;
    }

    // Trinket Stats - Final
    if (interaction.isStringSelectMenu() && interaction.customId === 'trinket_stats') {
        state.trinketStats = interaction.values[0];

        const itemText = `${state.trinketStats} ${state.trinketType}`;

        if (state.side === 'offering') state.items.offering.push(itemText);
        else state.items.looking.push(itemText);

        userState.set(userId, state);

        const continueMenu = new StringSelectMenuBuilder()
            .setCustomId('continue_or_send')
            .setPlaceholder('What next?')
            .addOptions([
                { label: 'Add Another Item', value: 'add_another' },
                { label: 'Send Post Now', value: 'send_post' }
            ]);

        await interaction.update({
            content: `✅ Added Trinket: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat next?`,
            components: [new ActionRowBuilder().addComponents(continueMenu)]
        });
        return;
    }

    // Cash Amount
    if (interaction.isStringSelectMenu() && interaction.customId === 'cash_amount') {
        state.cashAmount = interaction.values[0];

        const itemText = `${state.cashAmount} Cash`;

        if (state.side === 'offering') state.items.offering.push(itemText);
        else state.items.looking.push(itemText);

        userState.set(userId, state);

        const continueMenu = new StringSelectMenuBuilder()
            .setCustomId('continue_or_send')
            .setPlaceholder('What next?')
            .addOptions([
                { label: 'Add Another Item', value: 'add_another' },
                { label: 'Send Post Now', value: 'send_post' }
            ]);

        await interaction.update({
            content: `✅ Added Cash: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat next?`,
            components: [new ActionRowBuilder().addComponents(continueMenu)]
        });
        return;
    }

    // Tool Type
    if (interaction.isStringSelectMenu() && interaction.customId === 'tool_type') {
        state.toolType = interaction.values[0];
        userState.set(userId, state);

        const amountMenu = new StringSelectMenuBuilder()
            .setCustomId('tool_amount')
            .setPlaceholder('Select Amount (required)')
            .addOptions([
                { label: '1', value: '1' },
                { label: '5', value: '5' },
                { label: '10', value: '10' },
                { label: '20', value: '20' },
                { label: '50', value: '50' },
                { label: '100', value: '100' },
                { label: '200', value: '200' },
                { label: '500', value: '500' },
                { label: '500+', value: '500+' }
            ]);

        await interaction.update({
            content: `Tool Type: **${state.toolType}**. Choose Amount (required):`,
            components: [new ActionRowBuilder().addComponents(amountMenu)]
        });
        return;
    }

    // Tool Amount - Final
    if (interaction.isStringSelectMenu() && interaction.customId === 'tool_amount') {
        state.toolAmount = interaction.values[0];

        const itemText = `${state.toolAmount} ${state.toolType}`;

        if (state.side === 'offering') state.items.offering.push(itemText);
        else state.items.looking.push(itemText);

        userState.set(userId, state);

        const continueMenu = new StringSelectMenuBuilder()
            .setCustomId('continue_or_send')
            .setPlaceholder('What next?')
            .addOptions([
                { label: 'Add Another Item', value: 'add_another' },
                { label: 'Send Post Now', value: 'send_post' }
            ]);

        await interaction.update({
            content: `✅ Added Tool: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat next?`,
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
            state.level = null;
            state.type = null;
            state.overclock = null;
            state.rarity = null;
            state.statType = null;
            state.trinketType = null;
            state.trinketStats = null;
            state.cashAmount = null;
            state.toolType = null;
            state.toolAmount = null;
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

        let results = tradesDB.filter(trade => 
            trade.offering.toLowerCase().includes(category.toLowerCase()) || 
            trade.looking.toLowerCase().includes(category.toLowerCase())
        );

        if (results.length === 0) {
            await interaction.reply({
                content: `🔍 No matching **${category}** trades found.`,
                ephemeral: true
            });
        } else {
            let replyText = `🔍 Found ${results.length} matching **${category}** trade(s):\n\n`;
            results.slice(0, 5).forEach(trade => {
                replyText += `**Posted by** ${trade.posterTag}\n**Offering:** ${trade.offering}\n**Looking For:** ${trade.looking}\n\n`;
            });
            if (results.length > 5) replyText += `... and ${results.length - 5} more.`;

            await interaction.reply({
                content: replyText,
                ephemeral: true
            });
        }
        return;
    }
});

client.login(process.env.TOKEN);
