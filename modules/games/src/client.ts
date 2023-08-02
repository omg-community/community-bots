import {
	Client,
	Guild,
	GatewayIntentBits,
	Partials,
	ActivityType,
} from "discord.js";

import { registerClientAsCommandHandler } from "../../../src/command-handler";
import path from "node:path";

const lameBotClient: Client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Channel],
	allowedMentions: { parse: ["users"] },
});

function updatePresence(): void {
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

async function waitForReady() {
	if (lameBotClient.readyAt) return;
	await new Promise((resolve) => {
		lameBotClient.once("ready", resolve);
	});
}

async function getGuild(guildID): Promise<Guild | undefined> {
	await waitForReady();
	return lameBotClient.guilds.cache.get(guildID);
}

async function getChannel(channelID) {
	await waitForReady();
	return lameBotClient.channels.cache.get(channelID);
}

// async function to send a message to a channel and wait for it to be sent, retrying with backoff with a maximum length of 5 seconds
async function sendMessage(channel, message) {
	await waitForReady();

	if (typeof channel === "string") {
		channel = await getChannel(channel);
	}

	let retryDelay = 500;
	while (true) {
		try {
			return await channel.send(message);
		} catch (error) {
			console.error(error);
			await new Promise((resolve) => setTimeout(resolve, retryDelay));

			retryDelay = Math.min(retryDelay + 500, 5000);
		}
	}
}

async function sendMessageAsReply(replyMessage, message) {
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

module.exports = {
	lameBotClient,
	sendMessage,
	sendMessageAsReply,
	getChannel,
	getGuild,
	waitForReady,
};