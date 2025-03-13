const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000; // Change this if needed

app.use(bodyParser.json());

app.post('/scrape-linkedin', async (req, res) => {
    const searchQuery = req.body.query; // Get search keyword from n8n
    if (!searchQuery) return res.status(400).json({ error: 'Missing search query' });

    console.log(`Starting LinkedIn Scraper for: ${searchQuery}`);

    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        // Set LinkedIn session cookie (replace with your actual cookie value)
        await page.setCookie({ name: 'li_at', value: 'YOUR_LINKEDIN_COOKIE', domain: '.linkedin.com' });

        await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.reusable-search__result-container');

        const leads = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.reusable-search__result-container')).map(el => ({
                name: el.querySelector('span[dir="ltr"]')?.innerText || 'No name found',
                profile: el.querySelector('a')?.href || 'No profile found'
            }));
        });

        await browser.close();
        res.json({ leads });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.toString() });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
