const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/scrape', async (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: "Missing search query in request body." });
    }
    if (!process.env.LINKEDIN_COOKIE) {
        return res.status(400).json({ error: "Missing LinkedIn session cookie in environment variables." });
    }
    
    console.log(`Starting LinkedIn Scraper for: ${query}`);
    
    let browser;
    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
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
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        
        try {
            await page.waitForSelector('.reusable-search__result-container', { timeout: 10000 });
            
            const companies = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.reusable-search__result-container')).map(el => {
                    const name = el.querySelector('span.entity-result__title-text')?.innerText || "No Name";
                    const websiteElement = el.querySelector('a.app-aware-link');
                    const website = websiteElement ? websiteElement.href : "No Website";
                    return { name, website };
                });
            });

        console.log("Scraped Data:", companies);
        
        res.json({ status: "success", data: companies });
    } catch (error) {
        console.error("Scraping error:", error.message);
        res.status(500).json({ error: "Scraping failed", details: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.post('/scrape-linkedin', async (req, res) => {
    await scrapeLinkedIn(req, res);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
