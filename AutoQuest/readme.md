# Discord Quest Auto-Completion Selfbot

A selfbot that automatically completes **Discord Quests**.

Based on the original work by [amia](https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb/4912415839790240d49c1d2553e940f0c65f95d5).

This project provides a minimal selfbot framework built on top of discord.js core libraries, demonstrating how selfbot patches can be implemented without modifying the library’s source code directly.

> [!WARNING]
> **I don't take any responsibility for blocked Discord accounts that used this repo.**

> [!CAUTION]
> **Using this on a user account is prohibited by the [Discord TOS](https://discord.com/terms) and can lead to the account block.**

## ✨ Features

* Automatically **enrolls** all currently active quests.
* Automatically **completes** supported quest types.
* Unsupported for now (due to no valid samples at time of development):

  * `STREAM_ON_DESKTOP`
  * `PLAY_ACTIVITY`

## 📦 Installation & Setup

> [!NOTE]
> **Node.js 24.0.0 or newer is required**

### 1. Install dependencies

```sh
npm install
```

### 2. Insert your token

Replace the token inside `.env`.

### 3. Start the bot

```sh
npm run start
```

## 📤 Example Output

After completion, your output may look like this:

```sh
Logged in as @<username>
Found 9 valid quests to do.
Spoofing video for Opera GX.
Spoofed your game to the Comet AI browser. Wait for 15 more minutes.
Spoofed your game to Delta Force. Wait for 15 more minutes.
Spoofed your game to Where Winds Meet. Wait for 15 more minutes.
Spoofing video for Mobile Orbs Intro.
Spoofing video for Amazon.
Spoofing video for Microsoft Edge - Your AI Browser.
Spoofed your game to Risk of Rain 2. Wait for 15 more minutes.
Spoofing video for EVE Online Video.
Quest "Opera GX" completed!
Quest "Mobile Orbs Intro" completed!
Quest "Amazon" completed!
Quest "Microsoft Edge - Your AI Browser" completed!
Spoofed your game to the Comet AI browser. Wait for 15 more minutes.
Spoofed your game to Delta Force. Wait for 15 more minutes.
Spoofed your game to Where Winds Meet. Wait for 15 more minutes.
Spoofed your game to Risk of Rain 2. Wait for 15 more minutes.
Quest "EVE Online Video" completed!
...
Spoofed your game to the Comet AI browser. Wait for 1 more minutes.
Spoofed your game to Delta Force. Wait for 1 more minutes.
Spoofed your game to Where Winds Meet. Wait for 1 more minutes.
Spoofed your game to Risk of Rain 2. Wait for 1 more minutes.
Quest "Download Comet Browser" completed!
Quest "New Season Ahsarah" completed!
Quest "Where Winds Meet Launch" completed!
Quest "Alloyed Collective Gupdoption" completed!
```

## 🙏 Credits

* [Complete Recent Discord Quest](https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb/4912415839790240d49c1d2553e940f0c65f95d5)
* [discord.js](https://github.com/discordjs/discord.js)

*Readme compiled with assistance from AI.*
