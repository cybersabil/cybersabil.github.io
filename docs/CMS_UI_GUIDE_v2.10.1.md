# CyberSabil Pages CMS — Easy Editing Guide (Option A)

This update changes only the Pages CMS editing experience. It does not change the website design, runtime JavaScript behavior, CSS, JSON keys, JSON paths, or saved CMS values.

## CMS menu structure

### 00. START HERE — Common & Safe Controls

Use this group for normal day-to-day changes:

- **Modes, Sections & Basic Switch** — enable/disable Gateway, Website, Portfolio, sections, and the basic switch.
- **Gateway Text, Cards & Background** — Gateway title, card text, and Website/Portfolio background.
- **Gateway Order/Layout + Advanced Design** — card order, responsive row/column layouts, panel position, colors, animations, hover and click effects.
- **Switch Position + Header Design** — mobile/desktop switch position and advanced Website/Portfolio header styling.

### 01. WEBSITE — Content & Design

Website hero, brand, navigation labels, theme, tools, downloads, projects, skills, documentation and FAQ.

### 02. PORTFOLIO — Content & Sections

Portfolio profile, navigation, skills, projects, timeline, services and contact details.

### 03. SEO & SOCIAL SHARING

Page title, description, canonical URL, Open Graph and social-preview settings.

### 99. ADVANCED SYSTEM — Normally Do Not Change

Global visual baseline. Change this only when intentionally switching the whole visual authority model.

## Safety markers

- **✅ Safe** — normally editable.
- **⚠ Advanced** — edit carefully and test desktop/mobile afterward.
- **🔒 System** — read-only developer-managed value.

## Most common changes

### Gateway background

Open:

`00. START HERE → Gateway Text, Cards & Background`

Change:

`Gateway ke peeche kya dikhana hai?`

This setting changes only the background. It does not change card order.

### Gateway card order

Open:

`00. START HERE → Gateway Order/Layout + Advanced Design`

Keep:

- Advanced Gateway controls: Yes
- Gateway control mode: grouped custom controls
- Layout & card-order control: Custom
- Appearance: Inherit
- Animation: Inherit
- Hover/click: Inherit

Then change:

`Gateway me kaunsa card pehle?`

### Mobile switch position

Open:

`00. START HERE → Switch Position + Header Design`

Keep:

- Advanced Header & Switch controls: Yes
- Header & Switch control mode: grouped custom controls
- Switch position & layout controls: Custom
- Switch appearance: Inherit
- Switch animation & hover: Inherit

Then change:

`Mobile switch button position`

### Website section visibility

Open:

`00. START HERE → Modes, Sections & Basic Switch`

Use the fields starting with:

`Website me ... section dikhana hai?`

## Save and deployment

1. Change only one related setting group at a time.
2. Click **Save** in Pages CMS.
3. Open GitHub **Actions → Build and Deploy CyberSabil**.
4. Wait for build and deploy to become green.
5. Test the site in a private/incognito window on desktop and mobile.

## Important rules

- Do not use **Default Mode** to change the Gateway background.
- For order/layout changes, keep Appearance, Animation and Interaction on **Inherit**.
- Do not edit release version or runtime schema fields; they are now read-only.
- When changing an advanced visual value, make a small change and test before editing the next field.
