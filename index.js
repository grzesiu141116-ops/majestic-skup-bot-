const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ChannelType, 
  PermissionFlagsBits, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require('discord.js');
const http = require('http');

// Serwer HTTP wymagany przez Web Service na Render.com
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Skup MajesticRP dziala 24/7!');
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Rejestracja komendy /setup_skup
const commands = [
  new SlashCommandBuilder()
    .setName('setup_skup')
    .setDescription('Tworzy panel skupu przedmiotow MajesticRP')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

client.once('ready', async () => {
  console.log(`✅ Bot zalogowany jako: ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Komenda /setup_skup zostala pomyślnie zarejestrowana!');
  } catch (error) {
    console.error('❌ Błąd podczas rejestracji komend:', error);
  }
});

// Obsługa komend i interakcji
client.on('interactionCreate', async (interaction) => {
  // 1. Komenda /setup_skup
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setup_skup') {
      const embed = new EmbedBuilder()
        .setTitle('🏬 SKUP UNIKATÓW & MYTHICÓW — MAJESTRIC RP')
        .setDescription(
          '**Szybka gotówka na rękę!**\n\n' +
          'Masz unikalne ubrania, nakrycia głowy V2, auta z karnetu lub rzadkie akcesoria? ' +
          'Sprzedaj je u nas w kilka chwil bez marnowania czasu na rynku.\n\n' +
          '📌 **Zasady skupu:**\n' +
          '• Oferujemy **50% - 70%** wartości rynkowej (szybki wykup za płynność).\n' +
          '• **NIE skupujemy** zwykłych ubrań z binka, podstawowych aut ani śmieci.\n' +
          '• Wymagany dowód posiadania (screen z gry z widocznym UID/przedmiotem).\n\n' +
          'Kliknij przycisk poniżej, aby złożyć ofertę!'
        )
        .setColor(0x2b2d31)
        .setFooter({ text: 'MajesticRP Skup Bot • Oficjalny Panel' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('start_sell')
          .setLabel('💰 Sprzedaj Przedmiot (Szybka Kasa)')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // 2. Kliknięcie przycisku "Sprzedaj Przedmiot" -> Otwarcie Modala
  if (interaction.isButton()) {
    if (interaction.customId === 'start_sell') {
      const modal = new ModalBuilder()
        .setCustomId('sell_modal')
        .setTitle('Formularz Sprzedaży Przedmiotu');

      const itemNameInput = new TextInputBuilder()
        .setCustomId('item_name')
        .setLabel('Nazwa przedmiotu (np. Słuchawki Apple V2)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const marketValueInput = new TextInputBuilder()
        .setCustomId('market_value')
        .setLabel('Orientacyjna wartość rynkowa ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('np. 1500000')
        .setRequired(true);

      const expectedPriceInput = new TextInputBuilder()
        .setCustomId('expected_price')
        .setLabel('Twoja oczekiwana cena ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('np. 900000')
        .setRequired(true);

      const proofInput = new TextInputBuilder()
        .setCustomId('proof_link')
        .setLabel('Link do screena (Imgur/Discord) z dowodem')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://imgur.com/...')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(itemNameInput),
        new ActionRowBuilder().addComponents(marketValueInput),
        new ActionRowBuilder().addComponents(expectedPriceInput),
        new ActionRowBuilder().addComponents(proofInput)
      );

      await interaction.showModal(modal);
    }

    // Obsługa przycisków admina w prywatnym kanale
    if (interaction.customId === 'admin_accept') {
      await interaction.reply({ content: '✅ **Oferta zaakceptowana!** Gracz został powiadomiony, umów się na odbiór w grze.', ephemeral: false });
    }
    if (interaction.customId === 'admin_reject') {
      await interaction.reply({ content: '❌ **Oferta odrzucona.** Kanał zostanie zamknięty.', ephemeral: false });
    }
  }

  // 3. Wysyłanie formularza z Modala -> Tworzenie prywatnego kanału
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'sell_modal') {
      const itemName = interaction.fields.getTextInputValue('item_name');
      const marketValue = interaction.fields.getTextInputValue('market_value');
      const expectedPrice = interaction.fields.getTextInputValue('expected_price');
      const proofLink = interaction.fields.getTextInputValue('proof_link');

      await interaction.deferReply({ ephemeral: true });

      try {
        const ticketChannel = await interaction.guild.channels.create({
          name: `skup-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }
          ]
        });

        const offerEmbed = new EmbedBuilder()
          .setTitle(`📥 Nowa Oferta Skupu: ${itemName}`)
          .setColor(0xf1c40f)
          .addFields(
            { name: '👤 Sprzedający', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
            { name: '📦 Przedmiot', value: itemName, inline: true },
            { name: '💎 Wartość Rynkowa', value: `$${marketValue}`, inline: true },
            { name: '💵 Oczekiwana Cena', value: `$${expectedPrice}`, inline: true },
            { name: '🖼️ Dowód Posiadania', value: proofLink }
          )
          .setFooter({ text: 'Oczekiwanie na decyzję Skupującego' })
          .setTimestamp();

        const adminRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('admin_accept')
            .setLabel('✅ Akceptuj Cenę')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('admin_reject')
            .setLabel('❌ Odrzuć Ofertę')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
          content: `${interaction.user} Witaj! Oto Twój prywatny kanał transakcyjny. Wkrótce właściciel skupu przeanalizuje Twoją ofertę.`,
          embeds: [offerEmbed],
          components: [adminRow]
        });

        await interaction.editReply({ content: `✅ Stworzono prywatny kanał transakcyjny: ${ticketChannel}` });
      } catch (err) {
        console.error('Błąd tworzenia kanału:', err);
        await interaction.editReply({ content: '❌ Wystąpił błąd podczas tworzenia kanału. Upewnij się, że bot ma uprawnienia do zarządzania kanałami.' });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
