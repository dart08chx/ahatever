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
    let state = userState.get(userId) || { 
        mode: 'post', 
        side: null, 
        category: null, 
        level: null, 
        type: null, 
        overclock: null, 
        rarity: null, 
        statType: null,
        trinketType: null, 
        trinketStats: null, 
        cashAmount: null, 
        toolType: null, 
        toolAmount: null,
        items: { offering: [], looking: [] } 
    };

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

    // Start Post
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

    // Category selection
    if (interaction.isStringSelectMenu() && interaction.customId === 'post_category') {
        state.category = interaction.values[0];
        userState.set(userId, state);

        if (state.category === 'gear') {
            const levelMenu = new StringSelectMenuBuilder()
                .setCustomId('gear_level')
                .setPlaceholder('Select Level (required)')
                .addOptions([
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
                ]);

            await interaction.update({
                content: 'Selected **Gear**. Choose Level (required):',
                components: [new ActionRowBuilder().addComponents(levelMenu)]
            });
        } else if (state.category === 'trinket') {
            const typeMenu = new StringSelectMenuBuilder()
                .setCustomId('trinket_type')
                .setPlaceholder('Select Trinket Type (required)')
                .addOptions([
                    { label: 'Pen', value: 'Pen' },
                    { label: 'Regen', value: 'Regen' },
                    { label: 'Sprint', value: 'Sprint' },
                    { label: 'Saver', value: 'Saver' },
                    { label: 'Curve', value: 'Curve' },
                    { label: 'Steal', value: 'Steal' },
                    { label: 'Fast Pass', value: 'Fast Pass' },
                    { label: 'Rebound', value: 'Rebound' }
                ]);

            await interaction.update({
                content: 'Selected **Trinket**. Choose Type (required):',
                components: [new ActionRowBuilder().addComponents(typeMenu)]
            });
        } else if (state.category === 'cash') {
            const amountMenu = new StringSelectMenuBuilder()
                .setCustomId('cash_amount')
                .setPlaceholder('Select Amount (required)')
                .addOptions([
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
                ]);

            await interaction.update({
                content: 'Selected **Cash**. Choose Amount (required):',
                components: [new ActionRowBuilder().addComponents(amountMenu)]
            });
        } else if (state.category === 'tool') {
            const typeMenu = new StringSelectMenuBuilder()
                .setCustomId('tool_type')
                .setPlaceholder('Select Tool Type (required)')
                .addOptions([
                    { label: 'Kits', value: 'Kits' },
                    { label: 'Recs', value: 'Recs' },
                    { label: 'Overclocks', value: 'Overclocks' },
                    { label: 'Orbs', value: 'Orbs' },
                    { label: 'Slot Unlock', value: 'Slot Unlock' },
                    { label: 'Item Aug', value: 'Item Aug' }
                ]);

            await interaction.update({
                content: 'Selected **Tool**. Choose Type (required):',
                components: [new ActionRowBuilder().addComponents(typeMenu)]
            });
        }
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

    // Gear Stat Type - Final for Gear
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
            content: `✅ Added Gear: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat do you want to do?`,
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
                { label: '055', value: '055' },
                { label: '054', value: '054' },
                { label: '053', value: '053' },
                { label: '052', value: '052' },
                { label: '050', value: '050' },
                { label: '155', value: '155' },
                { label: '255', value: '255' },
                { label: '355', value: '355' },
                { label: '455', value: '455' },
                { label: '555', value: '555' },
                { label: '550', value: '550' },
                { label: '450', value: '450' },
                { label: '540', value: '540' },
                { label: '530', value: '530' },
                { label: '350', value: '350' },
                { label: '440', value: '440' },
                { label: '500', value: '500' },
                { label: '005', value: '005' },
                { label: '045', value: '045' },
                { label: '035', value: '035' },
                { label: '025', value: '025' },
                { label: '554', value: '554' },
                { label: '553', value: '553' },
                { label: '552', value: '552' },
                { label: '551', value: '551' },
                { label: '545', value: '545' },
                { label: '535', value: '535' },
                { label: '525', value: '525' },
                { label: '505', value: '505' },
                { label: '504', value: '504' },
                { label: '405', value: '405' }
            ]);

        await interaction.update({
            content: `Trinket Type: **${state.trinketType}**. Choose Stats (required):`,
            components: [new ActionRowBuilder().addComponents(statsMenu)]
        });
        return;
    }

    // Trinket Stats - Final for Trinket
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
            content: `✅ Added Trinket: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat do you want to do?`,
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
            content: `✅ Added Cash: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat do you want to do?`,
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

    // Tool Amount - Final for Tool
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
            content: `✅ Added Tool: **${itemText}**\n\nOffering: ${state.items.offering.join('\n') || 'None'}\nLooking For: ${state.items.looking.join('\n') || 'None'}\n\nWhat do you want to do?`,
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

    // Search Button
    if (interaction.isButton() && interaction.customId === 'search_trade_button') {
        await interaction.reply({
            content: '🔍 Search is not fully implemented yet.',
            ephemeral: true
        });
    }
});

client.login(process.env.TOKEN);
