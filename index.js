const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TRADE_CHANNEL_ID = '1397162980327821413';   // ← Your channel ID is already here!

client.once('ready', () => {
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'trade') {
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

        const row1 = new ActionRowBuilder().addComponents(offeringInput);
        const row2 = new ActionRowBuilder().addComponents(lookingInput);
        const row3 = new ActionRowBuilder().addComponents(robloxInput);
        const row4 = new ActionRowBuilder().addComponents(extraInput);

        modal.addComponents(row1, row2, row3, row4);

        await interaction.showModal(modal);
    }

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
                { name: 'Offering', value: offering, inline: false },
                { name: 'Looking For', value: looking, inline: false },
                { name: 'Roblox Username', value: roblox, inline: true },
                { name: 'Extra Info', value: extra, inline: false }
            )
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId(`dm_${interaction.user.id}`)
            .setLabel('DM Me')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const tradeChannel = client.channels.cache.get(TRADE_CHANNEL_ID);
        if (tradeChannel) {
            await tradeChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Your trade ad has been posted successfully!', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Trade channel not found.', ephemeral: true });
        }
    }

    if (interaction.isButton() && interaction.customId.startsWith('dm_')) {
        const sellerId = interaction.customId.split('_')[1];
        try {
            const seller = await client.users.fetch(sellerId);
            await interaction.user.send(`👋 You want to trade with **${seller.tag}**!\n\nStart chatting here. Good luck!`);
            await interaction.reply({ content: '✅ I sent you a DM!', ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: '❌ Could not send DM. Make sure your DMs are open.', ephemeral: true });
        }
    }
});
// Register slash command and start the bot
client.once('ready', async () => {
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);

    const commands = [{
        name: 'trade',
        description: 'Post a trade advertisement'
    }];

    await client.application.commands.set(commands);
    console.log('✅ /trade command registered!');
});

client.login(process.env.TOKEN);
 // ← You still need to put your token here
