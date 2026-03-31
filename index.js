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
    console.log(`✅ Bot is online as ${client.user.tag}`);

    // Register slash command as backup
    const commands = [{ name: 'trade', description: 'Post a trade advertisement' }];
    await client.application.commands.set(commands);
    console.log('✅ /trade command registered');

    // ==================== POST THE PERMANENT BUTTON (RUN ONLY ONCE) ====================
    // Uncomment the lines below only once, then comment them again after the button appears
    
    const tradeChannel = client.channels.cache.get(TRADE_CHANNEL_ID);
    if (tradeChannel) {
        const button = new ButtonBuilder()
            .setCustomId('post_trade_button')
            .setLabel('📝 Post New Trade')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await tradeChannel.send({
            content: '**Trade Posting Panel**\nClick the green button below to create your trade offer:',
            components: [row]
        });
        console.log('✅ Permanent "Post New Trade" button has been posted!');
    }
    */
});

client.on('interactionCreate', async interaction => {

    // Open the trade form when clicking the big green button OR using /trade
    if ((interaction.isChatInputCommand() && interaction.commandName === 'trade') ||
        (interaction.isButton() && interaction.customId === 'post_trade_button')) {

        const modal = new ModalBuilder()
            .setCustomId('trade_modal')
            .setTitle('📝 Post Your Trade');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('offering').setLabel('What are you Offering?').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('looking').setLabel('What are you Looking For?').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('roblox').setLabel('Your Roblox Username').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('image').setLabel('Image / Proof Link (optional)').setPlaceholder('https://i.imgur.com/...').setStyle(TextInputStyle.Short).setRequired(false)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('extra').setLabel('Extra Notes (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false)
            )
        );

        await interaction.showModal(modal);
        return;
    }

    // When someone submits the form → post the trade ad
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

        if (imageUrl && imageUrl.startsWith('http')) {
            embed.setImage(imageUrl);
        }

        const startButton = new ButtonBuilder()
            .setCustomId(`start_trade_${interaction.user.id}`)
            .setLabel('DM / Start Trade')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(startButton);

        const channel = client.channels.cache.get(TRADE_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Your trade has been posted!', ephemeral: true });
        }
    }

    // When someone clicks "DM / Start Trade" button → create private thread
    if (interaction.isButton() && interaction.customId.startsWith('start_trade_')) {
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

            await thread.send(`**Private Trade Chat**\n${buyer} wants to trade with ${seller}\n\nFeel free to discuss here.`);

            await interaction.reply({ 
                content: `✅ Private trade thread created!\nGo here: ${thread}`, 
                ephemeral: true 
            });
        } catch (err) {
            await interaction.reply({ content: '❌ Failed to create thread.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
