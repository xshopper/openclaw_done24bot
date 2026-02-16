#!/usr/bin/env node
/**
 * Scrape document types from PreBuild using existing browser
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        // Connect to existing browser
        const browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
        });
        
        const pages = await browser.pages();
        let page = pages.find(p => p.url().includes('prebuild.docflow4.com'));
        
        if (!page) {
            console.log('📄 Opening PreBuild...');
            page = await browser.newPage();
            await page.goto('https://prebuild.docflow4.com/document-types', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
        } else {
            console.log(`✓ Found existing PreBuild tab: ${page.url()}`);
            
            // Navigate to document types if not already there
            if (!page.url().includes('document-types')) {
                console.log('📄 Navigating to document types...');
                await page.goto('https://prebuild.docflow4.com/document-types', {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
            }
        }
        
        console.log('⏳ Waiting for page to load...');
        await page.waitForTimeout(2000);
        
        // Extract all document types
        console.log('📥 Extracting document types...');
        
        const docTypes = await page.evaluate(() => {
            const results = [];
            
            // Try to find document type cards/rows
            const items = document.querySelectorAll('[class*="document"], [class*="type"], table tr');
            
            items.forEach((item) => {
                const text = item.innerText?.trim();
                if (text && text.length > 0 && text.length < 500) {
                    results.push({
                        html: item.outerHTML.substring(0, 1000),
                        text: text
                    });
                }
            });
            
            // Also get full page text
            return {
                items: results,
                pageText: document.body.innerText.substring(0, 20000),
                pageHtml: document.body.innerHTML.substring(0, 50000)
            };
        });
        
        // Save results
        const outputDir = '/home/gbacs/.openclaw/workspace/Projects/Prebuild/Document Types';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(outputDir, 'extraction.json'),
            JSON.stringify(docTypes, null, 2)
        );
        
        console.log(`\n✅ Saved to ${outputDir}/extraction.json`);
        console.log(`   Items found: ${docTypes.items.length}`);
        
        // Also save screenshot
        await page.screenshot({
            path: path.join(outputDir, 'screenshot.png'),
            fullPage: true
        });
        
        console.log(`📸 Screenshot saved to ${outputDir}/screenshot.png`);
        
        await browser.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
