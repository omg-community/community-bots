import {
  Client,
  Guild,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Channel,
  Message,
  TextChannel,
} from "discord.js";

import { registerClientAsCommandHandler } from "../../src/command-handler";
import path from "node:path";

export const lameBotClient: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
  allowedMentions: { parse: ["users"] },
});

export function updatePresence(): void {
  lameBotClient.user?.setPresence({
    activities: [
      {
        name: "1 game",
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });
  setTimeout(updatePresence, 86400000);
}

lameBotClient.on("ready", () => {
  console.log(`Logged in as ${lameBotClient.user?.tag}!`);
  updatePresence();
});

export async function waitForReady(): Promise<void> {
  if (lameBotClient.readyAt) return;
  await new Promise((resolve) => {
    lameBotClient.once("ready", resolve);
  });
}

export async function getGuild(guildID: string): Promise<Guild | undefined> {
  await waitForReady();
  return lameBotClient.guilds.cache.get(guildID);
}

export async function getChannel(
  channelID: string
): Promise<Channel | undefined> {
  await waitForReady();
  return lameBotClient.channels.cache.get(channelID);
}

// async function to send a message to a channel and wait for it to be sent, retrying with backoff with a maximum length of 5 seconds
// yo this is VILE please god remove this
export async function sendMessage(
  channel: TextChannel | string,
  message: string
): Promise<Message> {
  await waitForReady();

  if (typeof channel === "string") {
    // FIXME: see issue #84
    // @ts-ignore
    channel = await getChannel(channel);
  }

  let retryDelay = 500;
  while (true) {
    try {
      // @ts-ignore, send is not a function for undefined, causes error
      return await channel.send(message);
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      retryDelay = Math.min(retryDelay + 500, 5000);
    }
  }
}

export async function sendMessageAsReply(
  replyMessage: Message,
  message: string
): Promise<Message> {
  await waitForReady();

  let retryDelay = 500;
  while (true) {
    try {
      return await replyMessage.reply(message);
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      retryDelay = Math.min(retryDelay + 500, 5000);
    }
  }
}

//

registerClientAsCommandHandler(
  lameBotClient,
  path.join(__dirname, "../commands"),
  process.env.LAME_CLIENT_ID,
  process.env.LAME_TOKEN
);

//