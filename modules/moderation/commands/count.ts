import { SlashCommandBuilder } from "discord.js";
import { formatNumber } from "../../../src/utils.js";
import { replyToInteraction } from "../../../src/command-handler.js";
import {
  cleanWord,
  getPromptRegexFromPromptSearch,
  solvePromptWithTimeout,
} from "../../../src/dictionary/dictionary.js";
import { getPromptRegexDisplayText } from "../../../src/emoji-renderer.js";

export const data = new SlashCommandBuilder()
  .setName("count")
  .setDescription("Find the amount of solves for a prompt!")
  .addStringOption((option) =>
    option
      .setName("prompt")
      .setDescription("The prompt to search for")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("dictionary")
      .setDescription("The dictionary to search in")
      .setRequired(false)
      .addChoices({
        name: "English",
        value: "English",
      })
  );

// create function to handle the command
export async function execute(interaction, preferBroadcast) {
  let prompt = cleanWord(interaction.options.get("prompt").value);

  try {
    let regex = getPromptRegexFromPromptSearch(prompt);

    // @ts-ignore, i dont think its actually a string[] technically, but it should be fine...?
    let solutions: string[] = await solvePromptWithTimeout(regex, 1300);
    let solveCount = solutions.length;

    if (solveCount === 0) {
      await replyToInteraction(
        interaction,
        "Solve Count",
        "\n• That prompt is impossible.",
        preferBroadcast
      );
    } else {
      await replyToInteraction(
        interaction,
        "Solve Count",
        "\n• There " +
          (solutions.length === 1
            ? "is **1** solution"
            : "are **" + formatNumber(solutions.length) + "** solutions") +
          " for " +
          getPromptRegexDisplayText(regex) +
          ".",
        preferBroadcast
      );
    }
  } catch (error) {
    if (
      error.name === "PromptException" ||
      error.name === "SolveWorkerException"
    ) {
      await replyToInteraction(
        interaction,
        "Solve Count",
        "\n• " + error.message,
        preferBroadcast
      );
    } else {
      throw error;
    }
  }
}

export const broadcastable = true;
