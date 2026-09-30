# Public browser keys: restricted, not hidden

Why the map's API key sits in plain sight in the browser, and what actually stops someone from abusing it. Note 01 covers the trust boundary. This note covers a key that has to cross it.

## Some keys can't be secret

A secret only stays secret if it never leaves the server. The Supabase secret key works that way: server code uses it, and the browser only ever sees results (note 09).

A browser map library is different. The browser itself calls the map provider directly, for every map tile and search suggestion, so the browser has to send the key. Anything the browser sends, the person using it can read: in "View source", in the network tab, or in the request URL. Build tools that inline "public" environment variables into the bundle are just being honest about this. Hiding the key behind obfuscation or a variable name changes nothing.

So the question isn't "how do I hide it?" but "what happens if someone copies it?"

## Restrictions decide what a copied key can do

The provider checks every request against rules attached to the key:

- **Where it may be used from (referrer restriction).** Browsers send a `Referer` header saying which page made the request. The key only works when that page is one of the listed sites, for example `https://your-site.example/*` and `http://localhost:3000/*`. Someone who pastes the key into their own website gets rejected, because their visitors' browsers report *their* site.
- **What it may be used for (API restriction).** The key is limited to the few APIs the page really calls, here the map and place search. A copied key can't be spent on unrelated, possibly expensive services.
- **How much (quotas and budget alerts).** A daily cap turns the worst case from "unbounded bill" into "the map stops working until tomorrow".

## Limits of referrer checks

The `Referer` header is set by the browser, not proven. A script outside a browser can send any header it likes, so a determined person *can* make requests that look like they come from your site. That's why the other two layers matter: the API restriction limits what they can reach, and the quota limits how much it can cost. Together they make abuse small and bounded rather than impossible.

## Compare: secret keys

| | Browser (public) key | Server (secret) key |
| --- | --- | --- |
| Where it lives | In the page, sent by every visitor | Only on the server |
| Protection | Restrictions: referrer, API list, quota | Secrecy |
| If leaked | Limited damage within the restrictions | Full access; rotate immediately |
| Example here | Google Maps key | Supabase secret key, `SESSION_SECRET` |

A good habit: put the public/secret distinction in the variable name (here, a `NEXT_PUBLIC_` prefix), so a secret never ends up in the bundle by accident, and apply restrictions on the day a public key is created, not after the first surprise bill.

## Checking a restriction works

Load the site from an allowed address and the map works. Then try the key from somewhere not on the list (a different port or host): the provider should refuse it with an authorisation error. If both work, the restriction isn't applied yet.
