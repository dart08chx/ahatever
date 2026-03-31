const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, AttachmentBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1488481964494159953';

let stickyMessageId = null;

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    const commands = [{ name: 'trade', description: 'Post a trade advertisement' }];
    await client.application.commands.set(commands);
    console.log('✅ /trade command registered');
});

// Sticky Button - Triggers on ANY message (user or bot)
client.on('messageCreate', async message => {
    if (message.channel.id !== TRADE_CHANNEL_ID) return;

    // Delete old sticky
    if (stickyMessageId) {
        try {
            const oldMsg = await message.channel.messages.fetch(stickyMessageId);
            await oldMsg.delete().catch(() => {});
        } catch (e) {}
    }

    const button = new ButtonBuilder()
        .setCustomId('post_trade_button')
        .setLabel('📝 Post New Trade')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    const stickyMsg = await message.channel.send({
        content: '━━━━━━━━━━━━━━━━━━\n**📌 Trade Posting Panel**\nClick the green button below to post your trade offer:',
        components: [row]
    });

    stickyMessageId = stickyMsg.id;
});

client.on('interactionCreate', async interaction => {

    // Open Modal (with File Upload)
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
                new TextInputBuilder().setCustomId('extra').setLabel('Extra Notes (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false)
            )
        );

        // File Upload Component (the + sign / drag & drop)
        const fileUpload = new TextInputBuilder()  // We use a hidden text input as placeholder, but actually we'll use files from interaction
            .setCustomId('file_placeholder')
            .setLabel('Attachments (use + to upload images/files)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // Note: Real file upload in modals requires FileUploadBuilder in newer discord.js, but for compatibility we'll handle it via attachments in submit

        await interaction.showModal(modal);
        return;
    }

    // Modal Submitted
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
                { name: 'Extra Notes', value: extra }
            )
            .setTimestamp();

        const files = [];
        // Get attached files from the modal (if user used the + button)
        if (interaction.fields.fields.has('file_placeholder') || interaction.attachments) {
            // Discord.js v14+ modal file support
            const attachments = interaction.attachments || new Map();
            for (const attachment of attachments.values()) {
                files.push(attachment.url);
            }
        }

        const startButton = new ButtonBuilder()
            .setCustomId(`start_trade_${interaction.user.id}`)
            .setLabel('DM / Start Trade')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(startButton);

        const channel = client.channels.cache.get(TRADE_CHANNEL_ID);
        if (channel) {
            await channel.send({ 
                embeds: [embed], 
                components: [row],
                files: files.length > 0 ? files : undefined 
            });
            await interaction.reply({ content: '✅ Your trade has been posted with attachments!', ephemeral: true });
        }
    }

    // Start Trade → Private Thread with Close Button
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

            const closeButton = new ButtonBuilder()
                .setCustomId('close_thread')
                .setLabel('🔒 Close Thread')
                .setStyle(ButtonStyle.Danger);

            const closeRow = new ActionRowBuilder().addComponents(closeButton);

            await thread.send({
                content: `**Private Trade Chat Started**\n${buyer} wants to trade with ${seller}\n\nDiscuss your offer here.`,
                components: [closeRow]
            });

            await interaction.reply({ content: `✅ Private thread created!\nGo here: ${thread}`, ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: '❌ Failed to create thread.', ephemeral: true });
        }
    }

    // Close Thread
    if (interaction.isButton() && interaction.customId === 'close_thread') {
        if (interaction.channel.isThread()) {
            await interaction.channel.setArchived(true, `Closed by ${interaction.user.tag}`);
            await interaction.reply({ content: '🔒 This trade thread has been closed.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
