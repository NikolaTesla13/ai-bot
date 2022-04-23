import { AxiosResponse } from "./../node_modules/axios/index.d";
import { Client, Message } from "discord.js";
import { logger } from "./logger";
import { BayesClassifier, PorterStemmer } from "natural";
import WebScrapingManager from "./webScrapingManager";
import { load } from "cheerio";
import { randomInt, createHash } from "crypto";
import axios from "axios";
import { Configuration, OpenAIApi } from "openai";

export default class Application {
  static instance: Application;
  private discordClient: Client;
  private webScrapingManager: WebScrapingManager;
  private openai: OpenAIApi;
  private cache: AxiosResponse | null;
  private repostedContent: Map<string, boolean>;

  private constructor() {}

  public onReady(client: Client): void {
    this.discordClient = client;
    this.webScrapingManager = new WebScrapingManager();
    this.cache = null;
    this.repostedContent = new Map<string, boolean>();

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);

    logger.debug("Logged in as %s", this.discordClient.user!.tag);
  }

  public async onMessageCreate(message: Message): Promise<void> {
    if (message.author == this.discordClient.user) return;

    BayesClassifier.load(
      "assets/classifier.json",
      PorterStemmer,
      async (err, classifier: BayesClassifier) => {
        if (err) {
          logger.error(err);
          return;
        }

        if (message.content.includes("tldr")) {
          this.tldr(message);
          return;
        }

        const command = classifier.classify(message.content);

        switch (command) {
          case "chatting":
            this.chat(message);
            break;
          case "news":
            await this.news(message);
            break;
          case "meme":
            this.meme(message);
            break;
          case "translate":
            this.translate(message);
            break;
          default:
            message.channel.send("idk man");
            break;
        }
      }
    );
  }

  private chat(message: Message): void {
    message.channel.send("I have no clue what you're talking about.");
  }

  private async tldr(message: Message): Promise<void> {
    const completion = await this.openai.createCompletion("text-curie-001", {
      prompt: message.content,
      temperature: 0.7,
      max_tokens: 100,
      top_p: 1,
    });
    message.channel.send(completion.data.choices![0].text!);
  }

  private async translate(message: Message): Promise<void> {
    if (
      !message.content.startsWith("translate") ||
      message.content[10] != '"'
    ) {
      message.channel.send("error");
    }

    let text = "",
      language = "";
    let textDone = false,
      startLanguage = false;
    for (let i = 11; i < message.content.length; i++) {
      if (!textDone) text += message.content[i];
      else if (startLanguage) language += message.content[i];

      if (
        message.content[i] == "o" &&
        message.content[i - 1] == "t" &&
        textDone
      )
        startLanguage = true;

      if (message.content[i] == '"') textDone = true;
    }
    text = text.slice(0, -1);

    const prompt = `Translate this into 1.${language}:
${text}
1.`;

    const completion = await this.openai.createCompletion("text-curie-001", {
      prompt: prompt,
      temperature: 0.3,
      max_tokens: 100,
      top_p: 1,
    });

    message.channel.send(completion.data.choices![0].text!);
  }

  private async news(message: Message): Promise<void> {
    message.channel.send(this.getWaitingMessage());

    const newsSources = [
      "https://www.bbc.com/news/world-60525350",
      "https://www.foxnews.com/live-news/ukraine-russia-live-updates-04-02-2022",
      "https://www.reddit.com/r/ukraine.json",
    ];
    const randomSource =
      newsSources[Math.floor(Math.random() * newsSources.length)];

    const newsPage = await this.webScrapingManager.scrape(randomSource);

    if (randomSource.includes("bbc")) {
      const $ = load(newsPage!);
      const newsLink = $(
        "#topos-component > div.no-mpu > div > div:nth-child(2) > div > div.gel-layout__item.gs-u-pb\\+\\@m.gel-1\\/1.gel-1\\/1\\@xl.gel-2\\/5\\@xxl.gs-u-ml0.nw-o-keyline.nw-o-no-keyline\\@m > div > div.gs-c-promo-body.gs-u-mt\\@xxs.gs-u-mt\\@m.gs-c-promo-body--primary.gs-u-mt\\@xs.gs-u-mt\\@s.gs-u-mt\\@m.gs-u-mt\\@xl.gel-1\\/3\\@m.gel-1\\/2\\@xl.gel-1\\/1\\@xxl > div:nth-child(1) > a"
      );
      message.channel.send(
        newsLink.children("h3").text() +
          "\n" +
          "https://bbc.com" +
          newsLink.attr("href")!
      );
    } else if (randomSource.includes("foxnews")) {
      const $ = load(newsPage!);
      const fastFacts = $(
        "#wrapper > div.page > main > section > div > div.article-content > aside > div > div > div.item.item-summary > div > div > ul"
      );
      let msg =
        "Some quick facts from fox news https://www.foxnews.com/live-news/ukraine-russia-live-updates-04-02-2022\n";
      fastFacts.children().each((_, elem) => {
        msg += $(elem).children("p").text() + "\n";
      });
      message.channel.send(msg);
    } else if (randomSource.includes("reddit")) {
      const data = JSON.parse(newsPage!);
      const posts: Array<any> = data.data.children.slice(2);
      const warPosts = posts.filter(
        (post) =>
          post.data.link_flair_text.includes("WAR") &&
          post.data.over_18 === false
      );
      const randomPost =
        warPosts[Math.floor(Math.random() * warPosts.length)].data;
      message.channel.send(
        randomPost.title +
          "\n" +
          "https://reddit.com" +
          randomPost.permalink +
          "\n" +
          randomPost.url
      );
    }
  }

  private async meme(message: Message): Promise<void> {
    const funnySubreddits = ["memes", "ProgrammerHumor", "meme", "dankmemes"];
    let theFunnySubreddit =
      funnySubreddits[randomInt(0, funnySubreddits.length - 1)];
    if (this.cache == null) {
      this.cache = await axios.get(
        "https://www.reddit.com/r/" +
          theFunnySubreddit +
          "/top.json?sort=top&t=day"
      );
    }
    if (this.cache!.status != 200) {
      message.channel.send("something went wrong, I'm sorry, *daddy*");
    } else {
      const posts = this.cache!.data.data.children;
      let randomPost = posts[randomInt(0, posts.length - 1)].data;
      if (
        this.repostedContent.has(
          createHash("sha256").update(randomPost.url).digest("hex")
        )
      ) {
        randomPost = posts[randomInt(0, posts.length - 1)].data;
      }
      this.repostedContent.set(
        createHash("sha256").update(randomPost.url).digest("hex"),
        true
      );
      message.channel.send(randomPost.title);
      message.channel.send(randomPost.url);
    }
  }

  private getWaitingMessage(): string {
    const responses = [
      "working on it",
      "I'm working on it",
      "brb searching for it",
      "I will try my best",
      "I'm on it",
      "asap",
      "soon:tm:",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }
}
