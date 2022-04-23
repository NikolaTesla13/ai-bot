import { BayesClassifier } from "natural";

const classifier = new BayesClassifier();

interface DataEntry {
  key: string;
  value: "chatting" | "news" | "meme" | "translate";
}

const data: DataEntry[] = [
  {
    key: "hey girl, what's up?",
    value: "chatting",
  },
  {
    key: "sup",
    value: "chatting",
  },
  {
    key: "how's going?",
    value: "chatting",
  },
  {
    key: "hello, hi, bye, good bye, see ya",
    value: "chatting",
  },

  {
    key: "got news?",
    value: "news",
  },
  {
    key: "can you show us some news about the situation in Ukraine?",
    value: "news",
  },
  {
    key: "what's new these days?",
    value: "news",
  },
  {
    key: "btw what's happening lately in the world?",
    value: "news",
  },

  {
    key: "send us some news",
    value: "news",
  },

  {
    key: "I want to laugh",
    value: "meme",
  },
  {
    key: "show us some memes",
    value: "meme",
  },
  {
    key: "send some funny memes",
    value: "meme",
  },
  {
    key: "I need funny content",
    value: "meme",
  },
  {
    key: "new meme",
    value: "meme",
  },
  {
    key: "I want to translate",
    value: "translate",
  },
  {
    key: "translate 'blah blah' to english",
    value: "translate",
  },
  {
    key: "translate",
    value: "translate",
  },
];

data.forEach((item) => {
  classifier.addDocument(item.key, item.value);
});

classifier.train();

classifier.save(
  "assets/classifier.json",
  (err: any, _classifier: BayesClassifier) => {
    if (err) {
      console.log(err);
    }
  }
);
