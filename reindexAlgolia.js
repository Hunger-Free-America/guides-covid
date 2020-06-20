'use strict';

require('dotenv').config();
const Airtable = require('airtable');
const algoliasearch = require('algoliasearch');

const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);
const index = algoliasearch(
    process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_WRITE_KEY
  ).initIndex(process.env.ALGOLIA_INDEX);
const sitesTable = base(process.env.AIRTABLE_SITES_TABLE);

(async () => {
    try {
        const objects = [];
        const sites = await sitesTable.select({ fields: ['siteID'] }).all();

        .

    } catch (err) {
        console.error(err);
        throw err;
    }
})()
