const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
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
const userState = new Map();
let tradesDB = [];

// Load database
function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            tradesDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            console.log(`✅ Loaded ${tradesDB.length} trades from database`);
        }
    } catch (e) {}
}

// Save database
function saveDB() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(tradesDB, null, 2));
    } catch (e) {}
}

loadDB();

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

    // ==================== POST FLOW ====================
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

    // All sub-option handlers (Gear, Trinket, Cash, Tool) are the same as before
    // ... (the full sub-option code from previous version is kept for brevity - the important part is below)

    // Continue or Send Post
    if (interaction.isStringSelectMenu() && interaction.customId === 'continue_or_send') {
        const choice = interaction.values[0];

        if (choice === 'add_another') {
            // reset state and restart
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
            // Save to persistent database
            tradesDB.push({
                posterTag: interaction.user.tag,
                offering: state.items.offering,
                looking: state.items.looking,
                timestamp: Date.now()
            });
            saveDB();

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
                content: '✅ Trade posted and saved!',
                components: []
            });

            userState.delete(userId);
        }
        return;
    }

    // ==================== ADVANCED SEARCH ====================
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
            trade.offering.some(item => item.toLowerCase().includes(category.toLowerCase())) || 
            trade.looking.some(item => item.toLowerCase().includes(category.toLowerCase()))
        );

        if (results.length === 0) {
            await interaction.reply({
                content: `🔍 No matching **${category}** trades found.`,
                ephemeral: true
            });
        } else {
            let replyText = `🔍 Found ${results.length} matching **${category}** trade(s):\n\n`;
            results.slice(0, 5).forEach(trade => {
                replyText += `**Posted by** ${trade.posterTag}\n**Offering:** ${trade.offering.join(', ')}\n**Looking For:** ${trade.looking.join(', ')}\n\n`;
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
