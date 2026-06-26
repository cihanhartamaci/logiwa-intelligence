const INTEGRATION_LOGOS = [
  { keys: ['shopify'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/512px-Shopify_logo_2018.svg.png' },
  { keys: ['netsuite', 'oracle'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Oracle_NetSuite_logo.svg/512px-Oracle_NetSuite_logo.svg.png' },
  { keys: ['fedex'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/FedEx_Corporation_-_2016_Logo.svg/512px-FedEx_Corporation_-_2016_Logo.svg.png' },
  { keys: ['amazon'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/512px-Amazon_logo.svg.png' },
  { keys: ['walmart'], url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Walmart_logo_%282008%29.svg' },
  { keys: ['tiktok'], url: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/512px-TikTok_logo.svg.png' },
  { keys: ['etsy'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Etsy_logo.svg/512px-Etsy_logo.svg.png' },
  { keys: ['shippo'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Shippo_logo.svg/512px-Shippo_logo.svg.png' },
  { keys: ['ebay'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/512px-EBay_logo.svg.png' },
  { keys: ['ups'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/United_Parcel_Service_logo_2014.svg/512px-United_Parcel_Service_logo_2014.svg.png' },
  { keys: ['usps'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/United_States_Postal_Service_Logo.svg/512px-United_States_Postal_Service_Logo.svg.png' },
  { keys: ['dhl'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/DHL_Logo.svg/512px-DHL_Logo.svg.png' },
  { keys: ['stripe'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/512px-Stripe_Logo%2C_revised_2016.svg.png' },
  { keys: ['quickbooks', 'intuit'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Intuit_QuickBooks_logo.svg/512px-Intuit_QuickBooks_logo.svg.png' },
  { keys: ['shipstation'], url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/ShipStation_logo.svg/512px-ShipStation_logo.svg.png' },
];

export const getIntegrationLogo = (name) => {
  if (!name) return null;
  const searchName = name.toLowerCase();
  for (const entry of INTEGRATION_LOGOS) {
    if (entry.keys.some((key) => searchName.includes(key))) {
      return entry.url;
    }
  }
  return null;
};

export const getImpactStyles = (impact) => {
  const level = (impact || '').toLowerCase();
  if (level.startsWith('high')) {
    return { bg: '#fef2f2', border: '#ef4444', badge: '#ef4444', label: 'HIGH IMPACT' };
  }
  if (level.startsWith('medium')) {
    return { bg: '#fffbeb', border: '#f59e0b', badge: '#f59e0b', label: 'MEDIUM IMPACT' };
  }
  return { bg: '#ecfdf5', border: '#10b981', badge: '#10b981', label: 'LOW IMPACT' };
};
