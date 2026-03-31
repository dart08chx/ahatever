const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1397162980327821413';

client.once('ready', async () => {
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);

    const commands = [{ name: 'trade', description: 'Post a trade advertisement' }];
    await client.application.commands.set(commands);
    console.log('✅ /trade command registered');
});

// ==================== INTERACTIONS ====================
client.on('interactionCreate', async interaction => {
    // Open Modal (from /trade or permanent button)
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

        const imageInput = new TextInputBuilder()
            .setCustomId('image')
            .setLabel('Image / Proof Link (optional)')
            .setPlaceholder('https://i.imgur.com/xxxxxx.jpg or Discord image link')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const extraInput = new TextInputBuilder()
            .setCustomId('extra')
            .setLabel('Extra Notes (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(offeringInput),
            new ActionRowBuilder().addComponents(lookingInput),
            new ActionRowBuilder().addComponents(robloxInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(extraInput)
        );

        await interaction.showModal(modal);
        return;
    }

    // Modal Submitted → Post Trade Ad with Image Support
    if (interaction.isModalSubmit() && interaction.customId === 'trade_modal') {
        const offering = interaction.fields.getTextInputValue('offering');
        const looking = interaction.fields.getTextInputValue('looking');
        const roblox = interaction.fields.getTextInputValue('roblox');
        const imageUrl = interaction.fields.getTextInputValue('image').trim();
        const extra = interaction.fields.getTextInputValue('extra') || 'None';

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

        // Add image if user provided a valid link
        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
            embed.setImage(imageUrl);
        }

        const dmButton = new ButtonBuilder()
            .setCustomId(`dm_${interaction.user.id}`)
            .setLabel('DM / Start Trade')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(dmButton);

        const tradeChannel = client.channels.cache.get(TRADE_CHANNEL_ID);
        if (tradeChannel) {
            await tradeChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Your trade ad has been posted successfully!', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Trade channel not found.', ephemeral: true });
        }
    }

    // DM Button → Create Private Thread
    if (interaction.isButton() && interaction.customId.startsWith('dm_')) {
        const sellerId = interaction.customId.split('_')[1];
        const buyer = interaction.user;

        try {
            const seller = await client.users.fetch(sellerId);
            const tradeChannel = client.channels.cache.get(TRADE_CHANNEL_ID);

            const thread = await tradeChannel.threads.create({
                name: `Trade ${buyer.username} ↔ ${seller.username}`,
                type: ChannelType.GuildPrivateThread,
                autoArchiveDuration: 1440,   // 24 hours
                reason: 'Private trade discussion'
            });

            await thread.members.add(buyer.id);
            await thread.members.add(seller.id);

            await thread.send(`**New Trade Thread**\n${buyer} and ${seller} — discuss your trade here privately.\n\nCheck the original post above for details.`);

            await interaction.reply({ 
                content: `✅ Private trade thread created! Go here: ${thread}`, 
                ephemeral: true 
            });

        } catch (err) {
            console.error(err);
            await interaction.reply({ 
                content: '❌ Could not create private thread. Make sure the seller is still in the server.', 
                ephemeral: true 
            });
        }
    }
});

client.login(process.env.TOKEN);
