const { fork } = require('child_process');
const fs = require('node:fs');
const path = require('path');

// TODO: pull dictionaries from Vivi API
try {
  var dictionaryString = fs.readFileSync(path.join(__dirname, '../../assets/word-lists/dictionaries/english.txt'), 'utf8');
  var related1String = fs.readFileSync(path.join(__dirname, '../../assets/word-lists/lists/1-related.txt'), 'utf8');
  var related100String = fs.readFileSync(path.join(__dirname, '../../assets/word-lists/lists/100-related.txt'), 'utf8');
  var related1000String = fs.readFileSync(path.join(__dirname, '../../assets/word-lists/lists/1000-related.txt'), 'utf8');
  var related10000String = fs.readFileSync(path.join(__dirname, '../../assets/word-lists/lists/10000-related.txt'), 'utf8');
  var relatedDoomString = fs.readFileSync(path.join(__dirname, '../../assets/word-lists/lists/doom-related.txt'), 'utf8');
} catch (e) {
  throw "Couldn't retrieve word lists from files.";
}

// TODO holy copy-paste batman

function is1Related(word) {
  let cleanInput = standardizeWord(escapeRegExp(word));
  return new RegExp("^" + cleanInput + "$", "m").test(related1String);
}

function is100Related(word) {
  let cleanInput = standardizeWord(escapeRegExp(word));
  return new RegExp("^" + cleanInput + "$", "m").test(related100String);
}

function is1000Related(word) {
  let cleanInput = standardizeWord(escapeRegExp(word));
  return new RegExp("^" + cleanInput + "$", "m").test(related1000String);
}

function is10000Related(word) {
  let cleanInput = standardizeWord(escapeRegExp(word));
  return new RegExp("^" + cleanInput + "$", "m").test(related10000String);
}

function isDoomRelated(word) {
  let cleanInput = standardizeWord(escapeRegExp(word));
  return new RegExp("^" + cleanInput + "$", "m").test(relatedDoomString);
}

// is standardize the best name for this?
function standardizeWord(word) {
  return word.toUpperCase().replace(/[‘’]/g, "'").replace(/\-/g, '\-').replace(/…/g, '...').trim(); // TODO: trimming might ruin some searches
}

function standardizeRegexInput(regexInput) {
  return regexInput.replace(/[‘’]/g, "'").replace(/\-/g, '\-').replace(/…/g, '...');
}

const regexTest = /(?:^| )\/(.*)\/(?: |$)/;

function PromptException(message) {
   this.message = message;
   this.name = "PromptException";
}

function getPromptRegexFromPromptSearch(promptQuery) {
  let regexResult = regexTest.exec(promptQuery);
  
  // TODO find args in the query
  
  if (regexResult) {
    // This has regex
    let cleanQuery = standardizeRegexInput(promptQuery);

    if (/[`]/.test(cleanQuery)) {
      // i think removing the backslash sometime would be useful
      throw new PromptException("The regex you've entered is invalid.");
    }

    let notOK = /\\[nrt0v]/;
    let OK = /\\[sSdDwWvg0-9pPk]/;

    let regexInput = regexResult[1];

    if (regexInput === "") {
      // This regex is empty
      throw new PromptException("The regex you've entered is empty.");
    }

    if (regexInput.startsWith("^")) {
      regexInput = "(" + regexInput.slice(1);
    } else {
      regexInput = ".*(" + regexInput;
    }
    if (regexInput.endsWith("$")) {
      regexInput = regexInput.slice(0, -1) + ")";
    } else {
      regexInput = regexInput + ").*";
    }

    // check if the regex is valid
    let regex;
    try {
      regex = new RegExp("^" + regexInput + "$", "m");
    } catch (e) {
      throw new PromptException("The regex you've entered is invalid.");
    }

    // let's see what /\r/ returns
    console.log(regex);

    return regex;
  } else {
    // This isn't regex
    let cleanQuery = standardizeWord(promptQuery);

    if (cleanQuery.includes("`")) {
      throw new PromptException("The prompt you've entered is invalid.");
    }

    console.log("NOT REGEX");

    // will this even work? I don't know. I'm not a regex expert. I'm just a guy who wants to make a bot. :(
    return new RegExp("^.*(" + escapeRegExp(cleanQuery).replace(/\\\?|\\\./g, '.') + ").*$", "m");
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function isWord(word) {
  let cleanInput = standardizeWord(escapeRegExp(word));
  return new RegExp("^" + cleanInput + "$", "m").test(dictionaryString);
}

function solvePrompt(promptRegex) {
  // recreate the regex with the global flag
  if (!promptRegex.flags.includes("g")) {
    promptRegex = new RegExp(promptRegex.source, promptRegex.flags + "g");
  }

  console.log("Solving prompt with regex: " + promptRegex);

  let solutions = [];

  let match;
  while (match = promptRegex.exec(dictionaryString)) {
    solutions.push(match[0]);
  }
  
  return solutions;
}

function SolveWorkerException(message) {
  this.message = message;
  this.name = "SolveWorkerException";
}

let solverCache = new Set();

function solvePromptWithTimeout(promptRegex, timeout, user) {
  if (user) solverCache.add(user);

  return new Promise((resolve, reject) => {
    const worker = fork(path.join(__dirname, 'solve-worker.js'));

    let timeoutId = setTimeout(() => {
      worker.kill();
      reject(new SolveWorkerException("Your regex took too long to compute and timed out."));
    }, timeout);
    
    worker.on('message', (solutions) => {
      clearTimeout(timeoutId);
      worker.kill();
      resolve(solutions);
    });
    
    worker.on('error', (e) => {
      clearTimeout(timeoutId);
      worker.kill();
      reject(e);
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeoutId);
        reject(new SolveWorkerException('Your regex failed to compute.'));
      }
    });
    
    worker.send({ dictionaryString, regexSource: promptRegex.source });
  });
}

// TODO move this to utils
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// TODO: remake this because it's inefficient
function generatePrompt() {
  let promptLength = randInt(3, 5);
  let requiredCharacters = promptLength + 2;

  let solves = [];
  let repeatedRegex = '';
  for (let i = 0; i < requiredCharacters; i++) repeatedRegex += '[^\r\n\'\-]';
  let regex = new RegExp('(' + repeatedRegex + '[^\r\n\'\-]*)$', 'gm');

  let match;
  while (match = regex.exec(dictionaryString)) {
    solves.push(match[1]);
  }

  while (true) {
    let randIndex = Math.floor(Math.random() * solves.length);
    let actualPromptWord = solves[randIndex];
    let promptWord = actualPromptWord;
    let promptSubStart = randInt(0, promptWord.length - promptLength);

    let blanks = Math.min(promptLength - 2, 2);
    for (i = 0; i < blanks; i++) {
      let rand = randInt(promptSubStart, promptSubStart + promptLength - 1);
      promptWord = promptWord.substring(0, rand) + '`' + promptWord.substring(rand + 1, promptWord.length); //only thru substart and subend
    }

    let prompt = new RegExp("^.*(" + escapeRegExp(promptWord.slice(promptSubStart, promptSubStart + promptLength)).replace(/`/g, '.') + ").*$", "m");
    console.log(prompt);

    let lengthRequired = promptWord.length < 17 && randInt(1, 7) == 1;
    let solutions = solvePrompt(prompt);
    if (lengthRequired) {
      solutions = solutions.filter((word) => {
        return word.length == promptWord.length;
      });
    }
    if (solutions.length < 23) continue; // || solutions.length > 1200
    if (lengthRequired && solutions.length < 46) continue;

    return {
      promptWord: actualPromptWord,
      solutions: solutions.length,
      lengthRequired: lengthRequired,
      prompt
    }
  }
}

const invalidPromptDisplayRegex = /[^A-Z0-9'\-@ ]/;

// TODO: i'm going to lose my mind within the next 5 minutes
function getPromptRepeatableText(regex) {
  // get the string of the regex
  let regexString = regex.source;
  // remove the anchors from the start and end of the regex
  regexString = regexString.slice(1, regexString.length - 1);

  // remove the first opening parenthesis from a string
  regexString = regexString.replace(/\(/, "");
  let lastParenthesisIndex = regexString.lastIndexOf(")");
  // remove the last closing parenthesis from a string
  regexString = regexString.slice(0, lastParenthesisIndex) + regexString.slice(lastParenthesisIndex + 1);

  let startsWithWildcard = regexString.startsWith(".*");
  let endsWithWildcard = regexString.endsWith(".*");
  
  if (startsWithWildcard && endsWithWildcard) {
    let displayString = regexString.slice(2, regexString.length - 2);
    if (!invalidPromptDisplayRegex.test(displayString)) {
      return displayString;
    }
  }
}

module.exports = {
  cleanWord: standardizeWord,
  getPromptRegexFromPromptSearch,
  isWord,
  solvePrompt,
  solvePromptWithTimeout,
  generatePrompt,
  escapeRegExp,
  getPromptRepeatableText,
  is1Related,
  is100Related,
  is1000Related,
  is10000Related,
  isDoomRelated,
  solverCache
}