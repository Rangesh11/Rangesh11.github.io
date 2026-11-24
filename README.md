# Rangesh S — Portfolio

A single-page, animated portfolio built with plain HTML, CSS and JavaScript. There is no build step and nothing to install.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | All the content: hero, about, experience, projects, skills, awards, education, contact |
| `styles.css` | Theme colours (dark + light), layout, animations, responsive rules |
| `script.js` | Typing effect, scroll reveals, counters, card tilt, particle background, theme toggle |
| `assets/profile.jpg` | Portrait in the hero |
| `assets/Rangesh_S_Resume.pdf` | Served by the "Resume" and "Download résumé" buttons |

## Common edits

- **Add LinkedIn / GitHub / LeetCode icons:** fill in the `LINKS` object at the top of `script.js`. Only the filled-in links appear.
- **Change the rotating job titles in the hero:** edit `ROLES` at the top of `script.js`.
- **Update the résumé:** replace `assets/Rangesh_S_Resume.pdf`, keeping the same file name.
- **Change accent colours:** edit `--a1`, `--a2`, `--a3` in `styles.css` (dark theme at the top, light theme right below).

## Preview locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Publish it (free)

- **GitHub Pages:** push this folder to a repo named `<your-username>.github.io`, and the site goes live at `https://<your-username>.github.io`.
- **Vercel / Netlify:** drag the folder onto app.netlify.com/drop, or run `npx vercel` in this folder.
