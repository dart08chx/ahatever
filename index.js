const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1397162980327821413';   // Your trading ads channel

// ==================== READY EVENT ====================
client.once('ready', async () => {
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);

    // Register slash command (keep it as backup)
    const commands = [{ name: 'trade', description: 'Post a trade advertisement' }];
    await client.application.commands.set(commands);
    console.log('✅ /trade command registered');

    // Optional: Send the permanent "Post Trade" button once (run this only once)
    // const tradeChannel = client.channels.cache.get(TRADE_CHANNEL_ID);
    // if (tradeChannel) {
    //     const row = new ActionRowBuilder().addComponents(
    //         new ButtonBuilder()
    //             .setCustomId('post_trade_button')
    //             .setLabel('📝 Post New Trade')
    //             .setStyle(ButtonStyle.Success)
    //     );
    //     await tradeChannel.send({ content: '**Trade Posting Panel**\nClick the button below to post your trade offer:', components: [row] });
    // }
});

// ==================== INTERACTIONS ====================
client.on('interactionCreate', async interaction => {
    // === Open Modal from Slash Command or Button ===
    if ((interaction.isChatInputCommand() && interaction.commandName === 'trade') ||
        (interaction.isButton() && interaction.customId === 'post_trade_button')) {

        const modal = new ModalBuilder()
            .setCustomId('trade_modal')
            .setTitle('Post Your Trade Ad');

        const offeringInput = new TextInputBuilder()
            .setCustomId('offering')
            .setLabel('What are you Offering?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const lookingInput = new TextInputBuilder()
            .setCustomId('looking')
            .setLabel('What are you Looking For?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const robloxInput = new TextInputBuilder()
            .setCustomId('roblox')
            .setLabel('Your Roblox Username')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const extraInput = new TextInputBuilder()
            .setCustomId('extra')
            .setLabel('Extra Info / Proof Link (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(offeringInput),
            new ActionRowBuilder().addComponents(lookingInput),
            new ActionRowBuilder().addComponents(robloxInput),
            new ActionRowBuilder().addComponents(extraInput)
        );

        await interaction.showModal(modal);
        return;
    }

    // === Modal Submitted → Post Ad ===
    if (interaction.isModalSubmit() && interaction.customId === 'trade_modal') {
        const offering = interaction.fields.getTextInputValue('offering');
        const looking = interaction.fields.getTextInputValue('looking');
        const roblox = interaction.fields.getTextInputValue('roblox');
        const extra = interaction.fields.getTextInputValue('extra') || 'None';

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('💰 New Trade Offer')
            .setDescription(`Posted by ${interaction.user}`)
            .addFields(
                { name: 'Offering', value: offering },
                { name: 'Looking For', value: looking },
                { name: 'Roblox Username', value: roblox, inline: true },
                { name: 'Extra Info', value: extra }
            )
            .setTimestamp();

        const dmButton = new ButtonBuilder()
            .setCustomId(`dm_${interaction.user.id}`)
            .setLabel('DM / Start Trade')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(dmButton);

        const tradeChannel = client.channels.cache.get(TRADE_CHANNEL_ID);
        if (tradeChannel) {
            await tradeChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Your trade ad has been posted!', ephemeral: true });
        }
    }

    // === "DM Me" Button Clicked → Create Private Thread ===
    if (interaction.isButton() && interaction.customId.startsWith('dm_')) {
        const sellerId = interaction.customId.split('_')[1];
        const buyer = interaction.user;

        try {
            const seller = await client.users.fetch(sellerId);

            // Create private thread in the same trading channel
            const tradeChannel = client.channels.cache.get(TRADE_CHANNEL_ID);
            const thread = await tradeChannel.threads.create({
                name: `Trade with ${buyer.username} & ${seller.username}`,
                type: ChannelType.GuildPrivateThread,
                autoArchiveDuration: 1440,   // 24 hours
                reason: 'Trade conversation'
            });

            // Add both users to the thread
            await thread.members.add(buyer.id);
            await thread.members.add(seller.id);

            await thread.send(`**Trade started between ${buyer} and ${seller}**\n\nPlease discuss your trade here.\n\nOffering: (check original post)\nLooking For: (check original post)`);

            await interaction.reply({ 
                content: `✅ Private trade thread created! Go to ${thread}`, 
                ephemeral: true 
            });

        } catch (err) {
            console.error(err);
            await interaction.reply({ 
                content: '❌ Failed to create trade thread. Make sure the seller is still in the server.', 
                ephemeral: true 
            });
        }
    }
});

client.login(process.env.TOKEN);
