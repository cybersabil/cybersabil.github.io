#!/usr/bin/env node
/* CyberSabil v2.10.1 build-time synchronization
   Purpose: Generates current raw HTML metadata, critical content, initial Gateway order and a deployment revision from the same Pages CMS JSON sources. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const VERSION = '2.10.1';
const SCHEMA_VERSION = '2.10.0';
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(ROOT, file), value, 'utf8');
const json = (file) => JSON.parse(read(file));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

function replaceTextById(source, id, value) {
  const safe = String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pattern = new RegExp(`(<[^>]+\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(<\\/[^>]+>)`);
  return source.replace(pattern, `$1${safe}$3`);
}

function replaceHrefAndText(source, id, href, text) {
  const safeHref = String(href ?? '#').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const pattern = new RegExp(`(<a[^>]+\\bid=["']${id}["'][^>]*)(>)([\\s\\S]*?)(<\\/a>)`);
  return source.replace(pattern, (match, open, gt, oldText, close) => {
    const nextOpen = /\shref=/.test(open)
      ? open.replace(/\shref=["'][^"']*["']/, ` href="${safeHref}"`)
      : `${open} href="${safeHref}"`;
    const safeText = String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `${nextOpen}${gt}${safeText}${close}`;
  });
}

function setStylePropertyOnModeButton(source, mode, property, value) {
  const pattern = new RegExp(`(<button[^>]+data-cs-mode-choice=["']${mode}["'][^>]*)(>)`);
  return source.replace(pattern, (match, open, gt) => {
    let next = open;
    const styleMatch = next.match(/\sstyle=["']([^"']*)["']/);
    let declarations = styleMatch ? styleMatch[1].split(';').map(s => s.trim()).filter(Boolean) : [];
    declarations = declarations.filter(item => !item.toLowerCase().startsWith(`${property.toLowerCase()}:`));
    if (value !== null && value !== undefined && value !== '') declarations.push(`${property}: ${value}`);
    const style = declarations.length ? ` style="${declarations.join('; ')}"` : '';
    if (styleMatch) next = next.replace(/\sstyle=["'][^"']*["']/, style);
    else next += style;
    return `${next}${gt}`;
  });
}

function setGatewayBackgroundAppState(source, id, visible, blurred) {
  const pattern = new RegExp(String.raw`(<div\s+id=["']${id}["']\s+class=["'])([^"']*)(["'])([^>]*)(>)`);
  return source.replace(pattern, (match, open, classes, quote, attrs, close) => {
    const tokens = classes.split(/\s+/).filter(Boolean).filter(token => token !== 'cs-mode-background-blur');
    if (blurred) tokens.push('cs-mode-background-blur');
    let nextAttrs = attrs.replace(/\s+hidden(?:=["']hidden["'])?/g, '');
    if (!visible) nextAttrs += ' hidden';
    return `${open}${tokens.join(' ')}${quote}${nextAttrs}${close}`;
  });
}

function meta(source, selector, value) {
  const escaped = String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const pattern = selector.startsWith('property:')
    ? new RegExp(`(<meta\\s+property=["']${selector.slice(9)}["']\\s+content=["'])[^"']*(["'][^>]*>)`)
    : new RegExp(`(<meta\\s+name=["']${selector}["']\\s+content=["'])[^"']*(["'][^>]*>)`);
  return source.replace(pattern, `$1${escaped}$2`);
}

const dataFiles = fs.readdirSync(DATA).filter(name => name.endsWith('.json') && name !== 'runtime-manifest.json').sort();
const contentBlob = dataFiles.map(name => `${name}\n${fs.readFileSync(path.join(DATA, name), 'utf8')}`).join('\n');
const contentRevision = hash(contentBlob).slice(0, 20);
const assetBlob = read('assets/css/style.css') + '\n' + read('assets/js/main.js');
const revision = hash(`v${VERSION}\n${contentRevision}\n${hash(assetBlob)}`).slice(0, 20);

const site = json('data/site.json');
const design = json('data/design.json');
const siteSettings = json('data/site-settings.json');
const sections = json('data/sections.json');
const seo = json('data/seo.json');
const gateway = json('data/gateway.json');
const visualBaseline = json('data/visual-baseline.json');
const gatewayAppearance = json('data/gateway-appearance.json');
const navigationStyle = json('data/navigation-style.json');
const portfolioSettings = json('data/portfolio-settings.json');
const profile = json('data/profile.json');
const contact = json('data/contact.json');

const manifest = { release: `v${VERSION}`, schemaVersion: SCHEMA_VERSION, revision, contentRevision };
write('data/runtime-manifest.json', JSON.stringify(manifest, null, 2) + '\n');

const critical = {
  schemaVersion: SCHEMA_VERSION,
  revision,
  config: { site, design, siteSettings, sections, seo, gateway, visualBaseline, gatewayAppearance, navigationStyle, portfolioSettings }
};

let index = read('index.html');
index = index.replace(/<script id="csCriticalConfig" type="application\/json">[\s\S]*?<\/script>/,
  `<script id="csCriticalConfig" type="application/json">${JSON.stringify(critical).replace(/</g, '\\u003c')}</script>`);
index = index.replace(/assets\/css\/style\.css\?v=[^"']+/g, `assets/css/style.css?v=${revision}`);
index = index.replace(/assets\/js\/main\.js\?v=[^"']+/g, `assets/js/main.js?v=${revision}`);
index = index.replace(/<title>[\s\S]*?<\/title>/, `<title>${String(seo.pageTitle || 'CyberSabil').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>`);
index = meta(index, 'description', seo.metaDescription || site.heroDescription || '');
index = meta(index, 'property:og:type', seo.ogType || 'website');
index = meta(index, 'property:og:url', seo.ogUrl || seo.canonicalUrl || '');
index = meta(index, 'property:og:title', seo.ogTitle || seo.pageTitle || '');
index = meta(index, 'property:og:description', seo.ogDescription || seo.metaDescription || '');
index = meta(index, 'property:og:image', seo.ogImage || '');
index = meta(index, 'twitter:card', seo.twitterCard || 'summary_large_image');
index = meta(index, 'twitter:title', seo.twitterTitle || seo.ogTitle || seo.pageTitle || '');
index = meta(index, 'twitter:description', seo.twitterDescription || seo.ogDescription || seo.metaDescription || '');
index = meta(index, 'twitter:image', seo.twitterImage || seo.ogImage || '');
index = meta(index, 'theme-color', seo.themeColor || '#120821');
index = index.replace(/(<link\s+id="csCanonical"\s+rel="canonical"\s+href=")[^"]*(")/, `$1${seo.canonicalUrl || 'https://cybersabil.github.io/'}$2`);

const textMap = {
  brandName: site.brandName, logoText: site.logoText, badge: site.badge,
  heroTitleBefore: site.heroTitleBefore, heroTitleHighlight: site.heroTitleHighlight, heroDescription: site.heroDescription,
  aboutTitle: site.aboutTitle, aboutDescription: site.aboutDescription, footerText: site.footerText,
  csGatewayLogoText: gateway.logoText, csGatewayEyebrow: gateway.eyebrow, csGatewayTitle: gateway.title,
  csGatewaySubtitle: gateway.subtitle, csGatewayChoiceLabel: gateway.choiceLabel, csGatewayChipOne: gateway.chipOne,
  csGatewayChipTwo: gateway.chipTwo, csGatewayChipThree: gateway.chipThree, csGatewayFooterNote: gateway.footerNote,
  csGatewayWebsiteIcon: gateway.websiteIcon, csGatewayWebsiteKicker: gateway.websiteKicker, csGatewayWebsiteTitle: gateway.websiteTitle,
  csGatewayWebsiteDescription: gateway.websiteDescription, csGatewayWebsiteButtonText: gateway.websiteButtonText,
  csGatewayPortfolioIcon: gateway.portfolioIcon, csGatewayPortfolioKicker: gateway.portfolioKicker, csGatewayPortfolioTitle: gateway.portfolioTitle,
  csGatewayPortfolioDescription: gateway.portfolioDescription, csGatewayPortfolioButtonText: gateway.portfolioButtonText,
  navToolsLabel: sections.navToolsLabel, navDownloadsLabel: sections.navDownloadsLabel, navProjectsLabel: sections.navProjectsLabel,
  navDocsLabel: sections.navDocsLabel, toolsSectionTitle: sections.toolsTitle, toolsSectionSubtitle: sections.toolsSubtitle,
  downloadsSectionTitle: sections.downloadsTitle, downloadsSectionSubtitle: sections.downloadsSubtitle,
  downloadsWarning: sections.downloadsWarning, projectsSectionTitle: sections.projectsTitle, projectsSectionSubtitle: sections.projectsSubtitle,
  skillsSectionTitle: sections.skillsTitle, skillsSectionSubtitle: sections.skillsSubtitle, quickCommandsTitle: sections.quickCommandsTitle,
  quickCommandsSubtitle: sections.quickCommandsSubtitle, docsSectionTitle: sections.docsTitle, docsSectionSubtitle: sections.docsSubtitle,
  faqSectionTitle: sections.faqTitle, faqSectionSubtitle: sections.faqSubtitle,
  csPortfolioInitials: profile.initials, csPortfolioAvatar: profile.initials, csPortfolioName: profile.name,
  csPortfolioCardName: profile.name, csPortfolioRole: profile.role, csPortfolioTagline: profile.tagline,
  csPortfolioAvailability: profile.availability, csPortfolioLocation: profile.location, csPortfolioExperience: profile.experience,
  csPortfolioBio: profile.bio, csPortfolioStatOneValue: profile.statOneValue, csPortfolioStatOneLabel: profile.statOneLabel,
  csPortfolioStatTwoValue: profile.statTwoValue, csPortfolioStatTwoLabel: profile.statTwoLabel,
  csPortfolioContactHeading: contact.heading, csPortfolioContactDescription: contact.description,
  csPortfolioEmailLabel: contact.emailLabel, csPortfolioGithubLabel: contact.githubLabel, csPortfolioWebsiteLabel: contact.websiteLabel
};
for (const [id, value] of Object.entries(textMap)) index = replaceTextById(index, id, value);
index = replaceHrefAndText(index, 'primaryButton', site.primaryButtonLink, site.primaryButtonText);
index = replaceHrefAndText(index, 'secondaryButton', site.secondaryButtonLink, site.secondaryButtonText);
index = replaceHrefAndText(index, 'githubNav', site.githubProfileLink, site.githubNavText || 'GitHub');
index = replaceHrefAndText(index, 'csPortfolioPrimaryCta', profile.primaryCtaLink, profile.primaryCtaText);
index = replaceHrefAndText(index, 'csPortfolioSecondaryCta', profile.secondaryCtaLink, profile.secondaryCtaText);
index = replaceHrefAndText(index, 'csPortfolioGithub', contact.githubLink, contact.githubText);
index = replaceHrefAndText(index, 'csPortfolioWebsite', contact.websiteLink, contact.websiteText);
index = replaceHrefAndText(index, 'csPortfolioContactCta', contact.ctaLink, contact.ctaText);

const globalAllowsSections = visualBaseline.globalVisualPreset === 'section-controlled';
const legacyCustomGateway = globalAllowsSections && gatewayAppearance.advancedControlsEnabled !== 'no' && gatewayAppearance.visualPreset === 'custom-advanced';
const layoutCustom = globalAllowsSections && gatewayAppearance.advancedControlsEnabled !== 'no' &&
  (Object.prototype.hasOwnProperty.call(gatewayAppearance, 'layoutControlMode')
    ? gatewayAppearance.layoutControlMode === 'custom'
    : legacyCustomGateway);
if (layoutCustom) {
  const websiteFirst = gatewayAppearance.cardOrder !== 'portfolio-first';
  index = setStylePropertyOnModeButton(index, 'website', 'order', websiteFirst ? '1' : '2');
  index = setStylePropertyOnModeButton(index, 'portfolio', 'order', websiteFirst ? '2' : '1');
} else {
  index = setStylePropertyOnModeButton(index, 'website', 'order', null);
  index = setStylePropertyOnModeButton(index, 'portfolio', 'order', null);
}

const enabledModes = [
  siteSettings.websiteEnabled !== 'no' ? 'website' : null,
  siteSettings.portfolioEnabled !== 'no' ? 'portfolio' : null
].filter(Boolean);
let gatewayBackgroundMode = gateway.backgroundMode === 'portfolio' ? 'portfolio' : 'website';
if (!enabledModes.includes(gatewayBackgroundMode)) gatewayBackgroundMode = enabledModes[0] || 'website';
index = setGatewayBackgroundAppState(index, 'csWebsiteApp', gatewayBackgroundMode === 'website', gatewayBackgroundMode === 'website');
index = setGatewayBackgroundAppState(index, 'csPortfolioApp', gatewayBackgroundMode === 'portfolio', gatewayBackgroundMode === 'portfolio');

const bodyClasses = [
  `theme-${design.themeMode || 'dark'}`, `accent-${design.accentColor || 'cyan'}`,
  `bg-${design.backgroundStyle || 'gradient'}`, `card-${design.cardStyle || 'glass'}`, 'cs-mode-gateway-open'
];
if ((design.heroLayout || 'split') === 'center') bodyClasses.push('hero-center');
index = index.replace(/<body\s+class="[^"]*"([^>]*)>/, (match, attrs) => {
  const cleanAttrs = attrs
    .replace(/\sdata-cs-generated-revision="[^"]*"/g, '')
    .replace(/\sdata-cs-active-mode="[^"]*"/g, '');
  return `<body class="${bodyClasses.join(' ')}"${cleanAttrs} data-cs-active-mode="${gatewayBackgroundMode}" data-cs-generated-revision="${revision}">`;
});
write('index.html', index);

let notFound = read('404.html');
notFound = notFound.replace(/\/assets\/css\/style\.css\?v=[^"']+/g, `/assets/css/style.css?v=${revision}`);
write('404.html', notFound);

console.log(`Generated CyberSabil v${VERSION}`);
console.log(`Revision: ${revision}`);
console.log(`Content revision: ${contentRevision}`);
