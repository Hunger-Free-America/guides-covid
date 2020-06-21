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
        const sites = await sitesTable.select({ view: 'Map/Algolia Export Fields' }).all();

        const objects = await sites.map(site => {
            return {
                objectID: site.id,
                name: site.fields.siteName,
                streetAddress: site.fields.siteStreetAddress,
                city: site.fields.siteCity,
                zip: site.fields.siteZip,
                state: site.fields.siteState,
                county: site.fields.siteCounty,
                _geoloc: {
                    lat: site.fields.lat,
                    lng: site.fields.lng
                },
                stockStatus: site.fields['Stock Status'],
                type: site.fields.siteType,
                subType: site.fields.siteSubType,
                verifiedAt: site.fields['Verified At'],
                validUntil: site.fields['Valid Until'],
                publicContactMethod: site.fields['Public Contact Method'],
                publicPhones: site.fields['Public Phones'],
                publicEmails: site.fields['Public Emails'],
                socialMedia: site.fields['Social Media'],
                websites: site.fields.Websites,
                gmapsUrl: site.fields.siteGmapsUrl,
                accessMethod: site.fields['Access Method'],
                deliveryEligibility: site.fields['Delivery Eligibility'],
                eligibilityRequirements: site.fields['Eligibility Requirements'],
                hoursEligibility1: site.fields.hoursEligibility1,
                hours1: site.fields.hours1,
                hoursEligibility2: site.fields.hoursEligibility2,
                hours2: site.fields.hours2,
                hoursEligibility3: site.fields.hoursEligibility3,
                hours3: site.fields.hours3,
                notes: site.fields.Notes
            }
        })
        
        await index.replaceAllObjects(objects).then(({ returnedObjectIDs }) => {        
            console.log(`Uploaded ${returnedObjectIDs} objects to Algolia ${process.env.ALGOLIA_INDEX} index.`);
        });

    } catch (err) {
        console.error(err);
        throw err;
    }
})()
