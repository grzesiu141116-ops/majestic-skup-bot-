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
  PermissionFlagsBits, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} = require('discord.js');
const http = require('http');

// Utrzymanie serwera dla Render.com
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Skup MajesticRP v2 dziala!');
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
    console.log('✅ Komenda /setup_skup została pomyślnie zarejestrowana!');
  } catch (error) {
    console.error('❌ Błąd rejestracji komend:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  // 1. Wysyłanie publicznego panelu
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup_skup') {
    const embed = new EmbedBuilder()
      .setTitle('🏬 SKUP UNIKATÓW & MYTHICÓW — MAJESTIC RP')
      .setDescription(
        '**Szybka gotówka na rękę od ręki!**\n\n' +
        'Chcesz szybko sprzedać rzadkie ubrania, unikatowe pojazdy lub akcesoria?\n' +
        'Złóż ofertę, a rozpatrzymy ją w kilka minut!\n\n' +
        '📌 **Zasady Skupu:**\n' +
        '• Skupujemy przedmioty za **50% – 70%** wartości rynkowej.\n' +
        '• Nie skupujemy zwykłych ubrań ze sklepów ani podstawowych pojazdów.\n' +
        '• Oferty rozpatrujemy indywidualnie.'
      )
      .setColor(0x2b2d31)
      .setFooter({ text: 'Kliknij przycisk poniżej, aby wysłać zgłoszenie.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_sell')
        .setLabel('💰 Sprzedaj Przedmiot')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // 2. Otwieranie Modala Formularza
  if (interaction.isButton() && interaction.customId === 'start_sell') {
    const modal = new ModalBuilder()
      .setCustomId('sell_modal')
      .setTitle('Formularz Sprzedaży Przedmiotu');

    const itemNameInput = new TextInputBuilder()
      .setCustomId('item_name')
      .setLabel('Nazwa przedmiotu')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('np. Słuchawki Apple V2 / Torba Gucci')
      .setRequired(true);

    const marketValueInput = new TextInputBuilder()
      .setCustomId('market_value')
      .setLabel('Szacowana wartość rynkowa ($)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('np. 19000000')
      .setRequired(true);

    const expectedPriceInput = new TextInputBuilder()
      .setCustomId('expected_price')
      .setLabel('Ile Ty za to chcesz? ($)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('np. 12000000')
      .setRequired(true);

    const wikiLinkInput = new TextInputBuilder()
      .setCustomId('wiki_link')
      .setLabel('Link do Majestic Wiki (Opcjonalnie)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://wiki.majestic-rp.ru/...')
      .setRequired(false);

    const proofInput = new TextInputBuilder()
      .setCustomId('proof_link')
      .setLabel('Link do Zdjęcia / Screena (Ctrl+V Imgur)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://i.imgur.com/... (lub wyślij fotkę w wiadomości)')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(itemNameInput),
      new ActionRowBuilder().addComponents(marketValueInput),
      new ActionRowBuilder().addComponents(expectedPriceInput),
      new ActionRowBuilder().addComponents(wikiLinkInput),
      new ActionRowBuilder().addComponents(proofInput)
    );

    await interaction.showModal(modal);
  }

  // 3. Obsługa Wysyłania Formularza -> Zgłoszenie na Twój prywatny kanał
  if (interaction.isModalSubmit() && interaction.customId === 'sell_modal') {
    const itemName = interaction.fields.getTextInputValue('item_name');
    const marketValueRaw = interaction.fields.getTextInputValue('market_value').replace(/[^0-9]/g, '');
    const expectedPriceRaw = interaction.fields.getTextInputValue('expected_price').replace(/[^0-9]/g, '');
    const wikiLink = interaction.fields.getTextInputValue('wiki_link') || 'Brak linku do Wiki';
    const proofLink = interaction.fields.getTextInputValue('proof_link') || 'Brak wklejonego linku (sprawdź załącznik)';

    const marketValue = parseInt(marketValueRaw) || 0;
    const expectedPrice = parseInt(expectedPriceRaw) || 0;

    // Kalkulacja widełek sugerowanego skupu (50% - 70%)
    const minBuy = Math.round(marketValue * 0.5);
    const maxBuy = Math.round(marketValue * 0.7);

    const offerEmbed = new EmbedBuilder()
      .setTitle(`📥 NOWA OFERTA: ${itemName}`)
      .setColor(0x3498db)
      .addFields(
        { name: '👤 Sprzedający', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
        { name: '🆔 ID Discord Gracza', value: `\`${interaction.user.id}\``, inline: true },
        { name: '📦 Przedmiot', value: itemName, inline: false },
        { name: '💎 Rynkowa Wartość', value: `$${marketValue.toLocaleString()}`, inline: true },
        { name: '💵 Chce dostać', value: `$${expectedPrice.toLocaleString()}`, inline: true },
        { name: '📊 Sugerowany Skup (50%-70%)', value: `\`$${minBuy.toLocaleString()} - $${maxBuy.toLocaleString()}\``, inline: false },
        { name: '🌐 Majestic Wiki', value: wikiLink !== 'Brak linku do Wiki' ? `[Kliknij, aby otworzyć Wiki](${wikiLink})` : 'Nie podano', inline: true },
        { name: '🖼️ Dowód / Screen', value: proofLink, inline: false }
      )
      .setFooter({ text: 'System Skupu • Podjmij decyzję przyciskami poniżej' })
      .setTimestamp();

    const adminButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${interaction.user.id}_${itemName}_${expectedPrice}`)
        .setLabel('✅ Akceptuj Ofertę')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_${interaction.user.id}_${itemName}`)
        .setLabel('❌ Odrzuć Ofertę')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ 
      content: '✅ Twoja oferta została pomyślnie wysłana do właściciela skupu! Otrzymasz wiadomość prywatną (PW) od bota, gdy oferta zostanie przeanalizowana.', 
      ephemeral: true 
    });

    // Powiadomienie do Twojego prywatnego kanału (na którym wpisałeś /setup_skup lub na kanał zgłoszeń)
    await interaction.channel.send({
      content: `🔔 **Nowa oferta od gracza ${interaction.user}!**`,
      embeds: [offerEmbed],
      components: [adminButtons]
    });
  }

  // 4. Obsługa Przycisków Decyzji (Akceptuj / Odrzuć) -> Wysyłanie PW do gracza
  if (interaction.isButton()) {
    const [action, userId, ...rest] = interaction.customId.split('_');

    if (action === 'accept') {
      const itemName = rest[0];
      const price = rest[1];

      try {
        const user = await client.users.fetch(userId);
        await user.send(
          `🎉 **Twoja oferta została AKEPTOWANA!**\n\n` +
          `📦 **Przedmiot:** ${itemName}\n` +
          `💵 **Uzgodniona kwota:** $${parseInt(price).toLocaleString()}\n\n` +
          `Napisz do nas na serwerze lub do właściciela skupu w grze/Discordzie, aby sfinalizować transakcję!`
        );

        await interaction.reply({ content: `✅ Akceptowano ofertę gracza <@${userId}>. Bot wysłał mu wiadomość na PW!`, ephemeral: false });
      } catch (err) {
        await interaction.reply({ content: `⚠️ Oferta zaakceptowana, ale gracz ma zablokowane PW (nie można było wysłać wiadomości).`, ephemeral: false });
      }
    }

    if (action === 'reject') {
      const itemName = rest[0];

      try {
        const user = await client.users.fetch(userId);
        await user.send(
          `❌ **Twoja oferta została ODRZUCONA.**\n\n` +
          `📦 **Przedmiot:** ${itemName}\n` +
          `Niestety aktualnie nie jesteśmy zainteresowani kupnem tego przedmiotu lub zaproponowana cena była za wysoka.`
        );

        await interaction.reply({ content: `❌ Odrzucono ofertę gracza <@${userId}>. Bot wysłał powiadomienie na PW!`, ephemeral: false });
      } catch (err) {
        await interaction.reply({ content: `⚠️ Oferta odrzucona. Bot nie mógł wysłać PW (zablokowane prywatne wiadomości u gracza).`, ephemeral: false });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
