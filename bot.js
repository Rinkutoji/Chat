require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Groq        = require("groq-sdk");

const bot  = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const userHistory = {};
const newUsers    = new Set();

const SYSTEM_PROMPT = `
អ្នកជា AI Assistant ឈ្មោះ Rinkutoji Bot ដែលមានជំនាញខ្ពស់ក្នុងវិស័យ៖

1. Artificial Intelligence (AI)
   - Machine Learning, Deep Learning
   - Neural Networks (CNN, RNN, Transformer)
   - Natural Language Processing (NLP)
   - Computer Vision, Reinforcement Learning
   - Large Language Models (LLMs), Prompt Engineering

2. Algorithms & Data Structures
   - Sorting: Bubble, Merge, Quick, Heap Sort
   - Searching: Binary Search, BFS, DFS
   - Graph Algorithms: Dijkstra, A*, Floyd-Warshall
   - Dynamic Programming, Greedy Algorithms
   - Time & Space Complexity (Big O Notation)
   - Tree, Graph, Hash Table, Stack, Queue

3. Programming & Software Engineering
   - Python, JavaScript, Java, C++
   - OOP, Functional Programming, Design Patterns
   - System Design, Database & SQL

4. Mathematics for AI
   - Linear Algebra, Calculus
   - Probability & Statistics, Optimization

5. Web Development
   - HTML5, CSS3, Responsive Design
   - JavaScript (ES6+), DOM Manipulation
   - React.js (Hooks, Components, State, Props)
   - Tailwind CSS, Bootstrap
   - REST API, Fetch, Axios
   - Git & GitHub

ច្បាប់ឆ្លើយ៖
- ឆ្លើយជាភាសារបស់ user (ខ្មែរ ឬ អង់គ្លេស)
- ពន្យល់ច្បាស់លាស់ ជាលំដាប់លំដោយ
- បន្ថែម code example នៅពេលចាំបាច់
- ប្រើ emoji ដើម្បីធ្វើឱ្យអានងាយ
- ឆ្លើយពេញលេញ លម្អិត មានគុណភាព
`;

bot.onText(/\/start/, (msg) => {
  const chatId    = msg.chat.id;
  const firstName = msg.from.first_name || "បង";
  userHistory[chatId] = [];

  const isNewUser = !newUsers.has(chatId);
  newUsers.add(chatId);

  if (isNewUser) {
    bot.sendMessage(chatId,
      `🎉 *សូមស្វាគមន៍ ${firstName}!*\n\n` +
      `ខ្ញុំជា *Rinkutoji AI Bot* 🤖 — AI Assistant របស់អ្នក!\n\n` +
      `_Welcome to Rinkutoji AI Bot! I'm here to help you learn._\n\n` +
      `ខ្ញុំមានជំនាញក្នុង៖\n` +
      `🧠 Artificial Intelligence & Machine Learning\n` +
      `⚙️ Algorithms & Data Structures\n` +
      `💻 Programming & System Design\n` +
      `🌐 Web Development (HTML, CSS, React)\n` +
      `📐 Mathematics for AI\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📌 Commands:\n` +
      `/start - ចាប់ផ្តើមថ្មី\n` +
      `/clear - លុប conversation\n` +
      `/help  - មើល commands\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `សាកសួរខ្ញុំបានទៅ! 🚀\n` +
      `_Feel free to ask me anything!_ 💡`,
      { parse_mode: "Markdown" }
    );
  } else {
    bot.sendMessage(chatId,
      `👋 *សួស្តីវិញ ${firstName}!*\n\n` +
      `_Welcome back! Ready to learn something new?_ 🚀\n\n` +
      `Conversation បានរeset ហើយ។ សាកសួរបានទៅ! 💬`,
      { parse_mode: "Markdown" }
    );
  }
});

bot.onText(/\/clear/, (msg) => {
  userHistory[msg.chat.id] = [];
  bot.sendMessage(msg.chat.id, "✅ Conversation បានលុបហើយ! ចាប់ផ្តើមថ្មី 🔄");
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "🤖 *Rinkutoji AI Bot — Help*\n\n" +
    "វាយ message ណាមួយទាក់ទង AI, Algorithm & Web Dev!\n\n" +
    "ឧទាហរណ៍សំណួរ៖\n" +
    "• តើ Neural Network ជាអ្វី?\n" +
    "• ពន្យល់ Quick Sort ជាភាសាខ្មែរ\n" +
    "• What is Big O notation?\n" +
    "• How does ChatGPT work?\n" +
    "• ពន្យល់ Dynamic Programming\n" +
    "• How to use React Hooks?\n" +
    "• ពន្យល់ Flexbox ជាភាសាខ្មែរ\n\n" +
    "/start - ចាប់ផ្តើម / reset\n" +
    "/clear - លុប history\n" +
    "/help  - commands",
    { parse_mode: "Markdown" }
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text;

  if (!text || text.startsWith("/")) return;

  if (!userHistory[chatId]) userHistory[chatId] = [];

  bot.sendChatAction(chatId, "typing");

  userHistory[chatId].push({ role: "user", content: text });

  try {
    const response = await groq.chat.completions.create({
      model     : "llama-3.3-70b-versatile",
      max_tokens: 4096,
      messages  : [
        { role: "system", content: SYSTEM_PROMPT },
        ...userHistory[chatId],
      ],
    });

    const reply = response.choices[0].message.content;

    userHistory[chatId].push({ role: "assistant", content: reply });

    if (userHistory[chatId].length > 30) {
      userHistory[chatId] = userHistory[chatId].slice(-30);
    }

    if (reply.length <= 4096) {
      bot.sendMessage(chatId, reply);
    } else {
      const chunks = reply.match(/[\s\S]{1,4096}/g) || [];
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk);
      }
    }

  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(chatId, "❌ មានបញ្ហា! សូម try again។\n\nError: " + err.message);
  }
});

console.log("🤖 Rinkutoji AI Bot is running...");
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.end('Bot is running!');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});