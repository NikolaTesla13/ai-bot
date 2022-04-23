import { Client, Message } from "discord.js";
import dotenv from "dotenv";
import Application from "./application";

const main = async () => {
  dotenv.config();

  const client = new Client({
    intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
    partials: ["CHANNEL"],
  });

  const application = Application.getInstance();

  client.on("ready", () => application.onReady(client));
  client.on("messageCreate", (message: Message) =>
    application.onMessageCreate(message)
  );

  client.login(process.env.DISCORD_TOKEN);
};

main();

// https://www.npmjs.com/package/natural https://github.com/NaturalNode/natural/blob/master/examples/classification/basic.js
// https://www.tensorflow.org/js
// https://discord.js.org/#/
