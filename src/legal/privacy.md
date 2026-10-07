# Privacy Notice

Last updated: 7 October 2026

This notice explains what personal data the Dusk Domains website at dusk.domains and testnet.dusk.domains and its public API (**the Services**) process, and why. The Services are operated by **Mochavi Limited**, a private company limited by shares incorporated in Hong Kong (Business Registration No. 77975303) (**Mochavi**, **we**, **us**), which is responsible for the processing described here.

The short version: we don't use cookies, ads or third-party analytics, we don't ask for your name or email, and we keep server logs with shortened IP addresses for 30 days.

## What we process

**Server logs.** When your browser loads the website or calls the API, our web server records:

- the date and time;
- the page or API path requested (without referral codes);
- the response status and size;
- your browser's user agent;
- the referring page;
- your IP address, **shortened before it is stored**: the last part is zeroed, to a /24 network for IPv4 and a /48 for IPv6.

We use these logs to run and secure the Services, investigate abuse and errors, and produce aggregate statistics such as daily visitor counts and popular pages. They are deleted after 30 days. The API also uses full IP addresses briefly, in memory, to enforce rate limits; these are not written to disk.

**Public blockchain data.** Wallet addresses, names, records, primary names, bids, listings and transactions are public data on the Dusk blockchain. Our indexer reads this data and our website and API display it, including statistics derived from it. We don't control the blockchain and can't change or delete what has been written to it. **Anything you publish in a name's records is public and permanent.** Consider this before linking a name to information that identifies you.

**Data stored in your browser.** The app keeps some data in your own browser's storage so it can work properly: pending name reservations, so you can finish a registration after a reload; your market watchlist; and, for the current session, a referral code from a link you followed and state about your last claim. This data stays in your browser and isn't sent to our servers. Parts of it, such as the referral code and the details of a reservation, go into the transactions you sign, and those become public on the blockchain. You can delete it through your browser's settings, but deleting a pending reservation may mean you lose that registration.

**Your wallet.** You connect a wallet, such as the Dusk Wallet browser extension, to sign transactions. The wallet is third-party software with its own terms and privacy practices; we only see the public account address and signed transactions it shares.

**Messages through GitHub.** Support, abuse and privacy requests go through forms on GitHub. GitHub's privacy statement applies, and issues are public; don't include personal data you don't want published.

We don't use cookies, tracking pixels, advertising, or third-party analytics. We don't sell personal data or use it for profiling.

## Who else is involved

- **Hosting.** Our servers are hosted by Hetzner Online GmbH in the European Union, which processes the data above on our behalf.
- **DNS.** Cloudflare provides DNS for dusk.domains. Website traffic does not pass through Cloudflare.
- **Dusk nodes.** To read the blockchain and submit transactions, your browser connects directly to public Dusk nodes, such as nodes.dusk.network, which see your IP address under their operators' own policies.
- **GitHub,** for the request forms described above.

Mochavi is based in Hong Kong, and our servers are in the EU. Where personal data is transferred outside the European Economic Area, we rely on the safeguards the law requires.

## Legal basis

Where the EU or UK General Data Protection Regulation applies, we process server logs and the data needed to run the Services on the basis of our **legitimate interests** in providing, securing and improving the Services and preventing abuse (Article 6(1)(f) GDPR). We keep these interests balanced against your rights by shortening IP addresses, keeping logs only 30 days, and using statistics only in aggregate.

## Your rights

Depending on where you live, you may have the right to access, correct, delete or restrict the processing of your personal data, to object to processing based on legitimate interests, and to complain to a data protection authority. Because our logs store shortened IP addresses only, we usually can't link them to you. We can't delete or change data on the blockchain.

To exercise your rights, use the [privacy request form](https://github.com/HDauven/dusk-domains-frontend/issues/new?template=privacy-request.yml). Don't include personal data in the public request; we'll reply there and, where needed, arrange a private way to continue.

## Children

The Services are not intended for anyone under 18.

## Changes

We may update this notice. The date at the top shows when it was last changed.
