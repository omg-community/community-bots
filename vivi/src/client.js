const { Client, GatewayIntentBits } = require('discord.js');
const { registerClientAsCommandHandler } = require('../../src/command-handler');
const path = require('node:path');

const viviClient = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

function updatePresence() {
  viviClient.user.setPresence({
    activities: [{
      name: '286.6K words',
      type: 'WATCHING'
    }],
    status: 'online'
  });
  setTimeout(updatePresence, 86400000);
}

viviClient.on('ready', () => {
  console.log(`Logged in as ${viviClient.user.tag}!`);
  updatePresence();
});

//

registerClientAsCommandHandler(viviClient, path.join(__dirname, '../commands'), process.env.VIVI_CLIENT_ID, process.env.VIVI_TOKEN);

//

module.exports = {
  viviClient
}