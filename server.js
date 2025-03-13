const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/scrape-linkedin', async (req, res) => {
    const { query } = req.body;

    if (!process.env.LINKEDIN_COOKIE) {
        return res.status(400).json({ error: "Missing LinkedIn session cookie in environment variables." });
    }

    if (!query) {
        return res.status(400).json({ error: "Missing 'query' parameter in request body." });
    }

    console.log(`Starting LinkedIn Scraper for: ${query}`);

    try {
        const browser = await puppeteer.launch({
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ],
            headless: "new"
        });

        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        await page.setViewport({ width: 1280, height: 800 });

        // Set LinkedIn session cookie
        await page.setCookie({
            name: "li_at",
            value: process.env.LINKEDIN_COOKIE,
            domain: ".linkedin.com"
        });

        console.log(`Navigating to LinkedIn search for: ${query}`);
        await page.goto(`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(query)}`, {
            waitUntil: 'networkidle2'
        });

        console.log("Extracting company data...");
        await page.waitForSelector('.reusable-search__result-container', { timeout: 10000 });

        const companies = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.reusable-search__result-container')).map(el => ({
                name: el.querySelector('span[dir="ltr"]')?.innerText || "N/A",
                website: el.querySelector('a')?.href || "N/A",
                profile: el.querySelector('a')?.href || "N/A"
            }));
        });

        console.log("Scraped Data:", companies);
        await browser.close();

        res.json({ status: "success", data: companies });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
