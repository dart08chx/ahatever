const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1488481964494159953';

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    const commands = [
        { name: 'trade', description: 'Post a trade advertisement' },
        { name: 'forcebutton', description: 'Force sticky button to appear' }
    ];
    await client.application.commands.set(commands);
    console.log('✅ Commands registered');
});

// Force button to appear
client.on('interactionCreate', async interaction => {
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
            await interaction.reply({ content: '✅ Sticky button posted!', ephemeral: true });
        }
        return;
    }

    // Post New Trade Button
    if (interaction.isButton() && interaction.customId === 'post_trade_button') {
        await interaction.deferUpdate();   // ← This is the key fix

        const modal = new ModalBuilder()
            .setCustomId('trade_modal')
            .setTitle('📝 Post Your Trade');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('offering').setLabel('What are you Offering?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('looking').setLabel('What are you Looking For?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox').setLabel('Roblox Username').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('extra').setLabel('Extra Notes (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );

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

    // Search Button
    if (interaction.isButton() && interaction.customId === 'search_trade_button') {
        await interaction.deferUpdate();

        await interaction.followUp({
            content: '🔍 Search is not fully ready yet.\nScroll the channel or use Post New Trade.',
            ephemeral: true
        });
    }

    // Start Trade Button
    if (interaction.isButton() && interaction.customId.startsWith('start_trade_')) {
        await interaction.deferUpdate();

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

            const closeBtn = new ButtonBuilder()
                .setCustomId('close_thread')
                .setLabel('🔒 Close Thread')
                .setStyle(ButtonStyle.Danger);

            await thread.send({
                content: `**Private Trade Chat Started**\n${buyer} wants to trade with ${seller}`,
                components: [new ActionRowBuilder().addComponents(closeBtn)]
            });

            await interaction.followUp({ content: `✅ Private thread created!\nGo here: ${thread}`, ephemeral: true });
        } catch (err) {
            await interaction.followUp({ content: '❌ Failed to create thread.', ephemeral: true });
        }
    }

    if (interaction.isButton() && interaction.customId === 'close_thread') {
        if (interaction.channel.isThread()) {
            await interaction.channel.setArchived(true);
            await interaction.reply({ content: '🔒 Thread closed.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
