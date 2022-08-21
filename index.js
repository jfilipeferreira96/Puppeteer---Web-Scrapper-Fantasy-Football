"use strict";

const dotenv = require("dotenv").config();
const puppeteer = require("puppeteer");
const xlsx = require("xlsx");

(async function main() {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    //Sign In
    await page.goto("https://fantasy.realfevr.com/users/sign_in");

    await page.waitForSelector("#new_user");

    await page.type(
      "body > section > div.hero.hidden-lg.hidden-md > div.container > div.login.col-xs-12.col-sm-8.col-sm-offset-2 > form > div.form-group > input#user_email",
      process.env.USER
    );
    await page.type(
      "body > section > div.hero.hidden-lg.hidden-md > div.container > div.login.col-xs-12.col-sm-8.col-sm-offset-2 > form > div.form-group > input#user_password",
      process.env.PASSWORD
    );

    await Promise.all([
      page.waitForNavigation(),
      await page.click("#new_user > div:nth-child(6) > button"),
    ]);

    //Select the team
    //make sure you only have one team otherwise edit this code
    await page.click(".active.league-card.league-card--salaryCap");
    await page.waitForSelector(".main-navigation");

    const grabURL = await page.evaluate(() => {
      return document.URL;
    });

    //opens up transfer page
    await page.goto(grabURL + "/transfers");

    await page.waitForSelector(".sa-button-container");
    await page.click("div>.sa-button-container > button.confirm");

    //get the players json
    const grabPlayersJSON = await page.evaluate(() => {
      let playersURL = [];
      const maxPagination = document
        .querySelector(".pagination-results")
        .innerText.split(" ")
        .splice(-1);

      for (let i = 1; i <= maxPagination; i++) {
        const row = document.querySelectorAll(
          "tbody > tr > td.text-left.player-name > span"
        );

        row.forEach((playerURL) =>
          playersURL.push(
            "https://fantasy.realfevr.com/" + playerURL.getAttribute("data-url")
          )
        );

        document.querySelector("button.pagination-nav.right").click();
      }
      return playersURL;
    });

    const playersData = [];
    for (const player of grabPlayersJSON) {
      await page.goto(player);
      const jsonData = await page.evaluate(() => {
        return JSON.parse(document.querySelector("body").innerText);
      });

      playersData.push({
        name: jsonData.player.name,
        price: jsonData.stats[0].value,
        selectionPercentage: jsonData.stats[1].value,
        points: jsonData.stats[3].value,
        avgPoints: jsonData.stats[5].value,
        position: jsonData.player.position_label,
      });
    }

    //Creates excel with the players data
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(playersData);
    xlsx.utils.book_append_sheet(workbook, worksheet);
    xlsx.writeFile(workbook, "players.xlsx");

    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
