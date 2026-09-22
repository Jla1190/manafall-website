# Manafall website

Official landing page for Manafall by Jean-Luc Alexander.

Live: https://jla1190.github.io/manafall-website/

## Player pictures

The **From the road** section shows pictures and clips players send. Posts wait off the public page until you approve them.

1. A player fills the form on the site (or opens a GitHub issue with the From the road template).
2. Open [review.html](https://jla1190.github.io/manafall-website/review.html).
3. Paste a GitHub fine-grained token for `Jla1190/manafall-website` with **Issues: Read and write**.
4. Click **Approve** or **Deny**.

Approve writes the post into `gallery.json` and closes the issue. Deny closes it and leaves it off the wall. You can also add the `gallery-approved` or `gallery-denied` label on the issue itself.

## Counters

The home page footer shows **visitors total**, **visitors today**, and **downloads**. Counts are anonymous number tallies via [Abacus](https://abacus.jasoncameron.dev) (`counterNamespace` / `counterApiBase` in `config.js`). Visitor hits are deduped in the browser (once ever for total, once per local calendar day for today). Download clicks count once per browser tab session.
