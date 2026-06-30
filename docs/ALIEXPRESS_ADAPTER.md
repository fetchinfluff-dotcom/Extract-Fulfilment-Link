# AliExpress Adapter

## Method order

1. Official API credentials when configured later.
2. Public product page fetch with URL/DNS/redirect guards.
3. Public AliExpress mtop product endpoint using the page product ID and transient public token cookie.
4. JSON-LD/title/meta fallback.
5. Fail with a visible error; never replace a real URL with fixture data.

## Extracted fields today

- product ID from `/item/<id>.html`;
- source title from `PRODUCT_TITLE.text`;
- selected SKU ID;
- selected price from `PRICE.targetSkuPriceInfo`;
- shipping quote from `SHIPPING.deliveryLayoutInfo`;
- product images from `HEADER_IMAGE_PC.imagePathList`;
- source warnings and confidence.

## Security limits

- No CAPTCHA, login, geo restriction, or access-control bypass.
- No supplier auth cookies are stored.
- Only normalized product data is persisted.
- Product media is marked `unknown` license until the merchant reviews rights.

## Known limits

- Full variant matrix is partially available but not yet persisted into dedicated variant rows.
- Shipping can be missing or change by destination.
- Browser fallback is not deployed in production yet.
