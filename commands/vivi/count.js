const data = new SlashCommandBuilder()
  .setName('count')
  .setDescription('Find the amount of solves for a prompt!')
  .addStringOption(option =>
    option.setName('prompt')
      .setDescription('The prompt to search for')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('dictionary')
      .setDescription('The dictionary to search in')
      .setRequired(false)
      .addChoice('English', 'English'));

const Dictionary = require('./dictionary.js');

// create function to handle the command
async function execute(interaction, preferBroadcast) {
  let prompt = Dictionary.cleanWord(interaction.options.get("prompt").value);
  
  try {
    let regex = Dictionary.getPromptRegexFromPromptSearch(prompt);

    let solves = Dictionary.solveRegex(regex);
    let solveCount = solves.length;

    if (solveCount === 0) {
      replyToInteraction(interaction, "Solve Count", "\n• That prompt is impossible.", preferBroadcast);
    } else {
      replyToInteraction(interaction, "Solve Count",
        '\n• There '
        + (solves.length === 1 ? 'is **1** solve' : 'are **' + formatNumber(solves.length) + '** solves')
        + ' for ' + getEmoteText(presentEmotes, prompt) + '.'
      , preferBroadcast);
    }
  } catch (error) {
    if (error.name === 'PromptException') {
      replyToInteraction(interaction, "Solve Count", "\n• " + error, preferBroadcast);
    } else {
      throw error;
    }
  }
};

// export the command
export default {
  data,
  execute
};