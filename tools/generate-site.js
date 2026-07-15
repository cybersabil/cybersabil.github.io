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
  const rawHref = String(href ?? '').trim();
  const safeHref = safeCmsUrl(rawHref);
  const visibleText = cmsText(text, rawHref || 'Open');
  const pattern = new RegExp(`(<a[^>]+\bid=["']${id}["'][^>]*)(>)([\s\S]*?)(<\/a>)`);
  return source.replace(pattern, (match, open, gt, oldText, close) => {
    let nextOpen = open.replace(/\s(?:href|target|rel)=["'][^"']*["']/g, '');
    const escapedHref = String(safeHref).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    nextOpen += ` href="${escapedHref}"`;
    if (/^https?:\/\//i.test(safeHref)) nextOpen += ' target="_blank" rel="noopener noreferrer"';
    const safeText = visibleText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

function toggleClassById(source, id, className, enabled) {
  const pattern = new RegExp(String.raw`(<[^>]+\bid=["']${id}["'][^>]*>)`);
  return source.replace(pattern, (tag) => {
    const classMatch = tag.match(/\sclass=["']([^"']*)["']/);
    const tokens = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];
    const nextTokens = tokens.filter(token => token !== className);
    if (enabled) nextTokens.push(className);
    if (classMatch) {
      if (!nextTokens.length) return tag.replace(/\sclass=["'][^"']*["']/, '');
      return tag.replace(/\sclass=["'][^"']*["']/, ` class="${nextTokens.join(' ')}"`);
    }
    if (!enabled) return tag;
    return tag.replace(/>$/, ` class="${className}">`);
  });
}

function cmsText(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function safeCmsUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '#';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '#';
  return raw;
}


function safeAbsoluteBuildUrl(value, fallback) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeBuildSeo(input, site = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const text = (key, fallback = '') => cmsText(source[key], fallback);
  const brand = cmsText(site.brandName, 'CyberSabil');
  const pageTitle = text('pageTitle', `${brand} IT Tools`);
  const metaDescription = text('metaDescription', cmsText(site.heroDescription, 'CyberSabil IT tools and portfolio.'));
  const canonicalUrl = safeAbsoluteBuildUrl(source.canonicalUrl, 'https://cybersabil.github.io/');
  const ogUrl = safeAbsoluteBuildUrl(source.ogUrl, canonicalUrl);
  const ogImage = safeAbsoluteBuildUrl(source.ogImage, 'https://cybersabil.github.io/media/social-preview.png');
  const twitterImage = safeAbsoluteBuildUrl(source.twitterImage, ogImage);
  const ogTypeRaw = String(source.ogType ?? '').trim().toLowerCase();
  const ogType = /^[a-z][a-z0-9._:-]{0,49}$/.test(ogTypeRaw) ? ogTypeRaw : 'website';
  const twitterCardRaw = String(source.twitterCard ?? '').trim().toLowerCase();
  const twitterCard = ['summary_large_image', 'summary'].includes(twitterCardRaw) ? twitterCardRaw : 'summary_large_image';
  const themeColorRaw = String(source.themeColor ?? '').trim();
  const themeColor = /^#[0-9a-f]{6}$/i.test(themeColorRaw) ? themeColorRaw.toLowerCase() : '#120821';
  return {
    pageTitle, metaDescription, canonicalUrl, ogType, ogUrl,
    ogTitle: text('ogTitle', pageTitle),
    ogDescription: text('ogDescription', metaDescription),
    ogImage, twitterCard,
    twitterTitle: text('twitterTitle', text('ogTitle', pageTitle)),
    twitterDescription: text('twitterDescription', text('ogDescription', metaDescription)),
    twitterImage, themeColor
  };
}

function normalizeBuildProfile(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const text = (key, fallback = '') => cmsText(source[key], fallback);
  const name = text('name', 'CyberSabil');
  const derivedInitials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  return {
    name,
    initials: text('initials', derivedInitials || 'CS'),
    role: text('role', 'IT Support Automation and Tools Builder'),
    tagline: text('tagline'), availability: text('availability'), location: text('location'), experience: text('experience'), bio: text('bio'),
    primaryCtaText: text('primaryCtaText'), primaryCtaLink: text('primaryCtaLink'),
    secondaryCtaText: text('secondaryCtaText'), secondaryCtaLink: text('secondaryCtaLink'),
    statOneValue: text('statOneValue'), statOneLabel: text('statOneLabel'), statTwoValue: text('statTwoValue'), statTwoLabel: text('statTwoLabel')
  };
}

function isValidBuildEmail(value) {
  const email = String(value || '').trim();
  if (!email || /add your email/i.test(email) || /[\r\n]/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeBuildContact(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const requiredText = (key, fallback) => cmsText(source[key], fallback);
  const optionalText = (key, fallback = '') => {
    if (source[key] === undefined || source[key] === null) return fallback;
    return String(source[key]).trim();
  };
  return {
    heading: requiredText('heading', 'Let’s build reliable IT support tools'),
    description: optionalText('description'),
    emailLabel: optionalText('emailLabel', 'Email:'),
    email: optionalText('email'),
    githubLabel: optionalText('githubLabel', 'GitHub:'),
    githubText: optionalText('githubText'),
    githubLink: optionalText('githubLink'),
    websiteLabel: optionalText('websiteLabel', 'Website:'),
    websiteText: optionalText('websiteText'),
    websiteLink: optionalText('websiteLink'),
    ctaText: optionalText('ctaText'),
    ctaLink: optionalText('ctaLink')
  };
}

function setHiddenAttributeById(source, id, hidden) {
  const pattern = new RegExp(String.raw`(<[^>]+\bid=["']${id}["'][^>]*>)`);
  return source.replace(pattern, (tag) => {
    const withoutHidden = tag.replace(/\s+hidden(?:=["']hidden["'])?/g, '');
    return hidden ? withoutHidden.replace(/>$/, ' hidden>') : withoutHidden;
  });
}

function replaceBuildContactLink(source, rowId, linkId, href, text, requireText = false) {
  const rawHref = String(href ?? '').trim();
  const safeHref = safeCmsUrl(rawHref);
  const label = String(text ?? '').trim();
  const usable = Boolean(rawHref && rawHref !== '#' && safeHref !== '#' && (!requireText || label));
  const pattern = new RegExp(String.raw`(<a[^>]+\bid=["']${linkId}["'][^>]*)(>)([\s\S]*?)(<\/a>)`);
  let next = source.replace(pattern, (match, open, gt, oldText, close) => {
    let nextOpen = open.replace(/\s(?:href|target|rel)=["'][^"']*["']/g, '');
    const escapedHref = String(usable ? safeHref : '#').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    nextOpen += ` href="${escapedHref}"`;
    if (usable && /^https?:\/\//i.test(safeHref)) nextOpen += ' target="_blank" rel="noopener noreferrer"';
    const visibleText = usable ? (label || rawHref) : '';
    const safeText = visibleText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `${nextOpen}${gt}${safeText}${close}`;
  });
  next = toggleClassById(next, linkId, 'cs-mode-hidden', !usable);
  if (rowId) next = toggleClassById(next, rowId, 'cs-mode-hidden', !usable);
  return next;
}

function replaceOptionalHrefAndText(source, id, href, text) {
  const rawHref = String(href ?? '').trim();
  const label = String(text ?? '').trim();
  const safeHref = safeCmsUrl(rawHref);
  const usable = Boolean(rawHref && label && rawHref !== '#' && safeHref !== '#');
  const pattern = new RegExp(String.raw`(<a[^>]+\bid=["']${id}["'][^>]*)(>)([\s\S]*?)(<\/a>)`);
  let nextSource = source.replace(pattern, (match, open, gt, oldText, close) => {
    let nextOpen = open.replace(/\s(?:href|target|rel)=["'][^"']*["']/g, '');
    const escapedHref = String(usable ? safeHref : '#').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    nextOpen += ` href="${escapedHref}"`;
    if (usable && /^https?:\/\//i.test(safeHref)) nextOpen += ' target="_blank" rel="noopener noreferrer"';
    const safeText = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `${nextOpen}${gt}${safeText}${close}`;
  });
  nextSource = toggleClassById(nextSource, id, 'cs-mode-hidden', !usable);
  return nextSource;
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
const seo = normalizeBuildSeo(json('data/seo.json'), site);
const gateway = json('data/gateway.json');
const visualBaseline = json('data/visual-baseline.json');
const gatewayAppearance = json('data/gateway-appearance.json');
const navigationStyle = json('data/navigation-style.json');
const portfolioSettings = json('data/portfolio-settings.json');
const profile = normalizeBuildProfile(json('data/profile.json'));
const contact = normalizeBuildContact(json('data/contact.json'));

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
index = index.replace(/<title>[\s\S]*?<\/title>/, `<title>${String(seo.pageTitle).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>`);
index = meta(index, 'description', seo.metaDescription);
index = meta(index, 'property:og:type', seo.ogType);
index = meta(index, 'property:og:url', seo.ogUrl);
index = meta(index, 'property:og:title', seo.ogTitle);
index = meta(index, 'property:og:description', seo.ogDescription);
index = meta(index, 'property:og:image', seo.ogImage);
index = meta(index, 'twitter:card', seo.twitterCard);
index = meta(index, 'twitter:title', seo.twitterTitle);
index = meta(index, 'twitter:description', seo.twitterDescription);
index = meta(index, 'twitter:image', seo.twitterImage);
index = meta(index, 'theme-color', seo.themeColor);
index = index.replace(/(<link\s+id="csCanonical"\s+rel="canonical"\s+href=")[^"]*(")/, `$1${seo.canonicalUrl}$2`);

const textMap = {
  brandName: cmsText(site.brandName, 'CyberSabil'), logoText: cmsText(site.logoText, 'CS'), badge: cmsText(site.badge),
  heroTitleBefore: cmsText(site.heroTitleBefore), heroTitleHighlight: cmsText(site.heroTitleHighlight), heroDescription: cmsText(site.heroDescription),
  aboutTitle: cmsText(site.aboutTitle, 'About'), aboutDescription: cmsText(site.aboutDescription), footerText: cmsText(site.footerText),
  footerBrand: `${cmsText(site.brandName, 'CyberSabil')} IT Tools`,
  csBootStatusText: cmsText(siteSettings.bootStatusMessage, 'Loading current CyberSabil configuration…'),
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
  csPortfolioEmailLabel: contact.emailLabel, csPortfolioGithubLabel: contact.githubLabel, csPortfolioWebsiteLabel: contact.websiteLabel,
  csPortfolioBrandText: cmsText(portfolioSettings.brandText, 'CyberSabil Portfolio'),
  csPortfolioNavSkills: cmsText(portfolioSettings.navSkillsLabel, 'Skills'),
  csPortfolioNavProjects: cmsText(portfolioSettings.navProjectsLabel, 'Projects'),
  csPortfolioNavTimeline: cmsText(portfolioSettings.navTimelineLabel, 'Timeline'),
  csPortfolioNavServices: cmsText(portfolioSettings.navServicesLabel, 'Services'),
  csPortfolioNavContact: cmsText(portfolioSettings.navContactLabel, 'Contact'),
  csPortfolioSkillsEyebrow: cmsText(portfolioSettings.skillsEyebrow, 'Core strengths'),
  csPortfolioSkillsTitle: cmsText(portfolioSettings.skillsTitle, 'Skills'),
  csPortfolioSkillsSubtitle: cmsText(portfolioSettings.skillsSubtitle, 'Focused capabilities for Windows support automation and practical deployment workflows.'),
  csPortfolioProjectsEyebrow: cmsText(portfolioSettings.projectsEyebrow, 'Selected work'),
  csPortfolioProjectsTitle: cmsText(portfolioSettings.projectsTitle, 'Projects'),
  csPortfolioProjectsSubtitle: cmsText(portfolioSettings.projectsSubtitle, 'Production-ready and planned tools built around real Windows support problems.'),
  csPortfolioTimelineEyebrow: cmsText(portfolioSettings.timelineEyebrow, 'Progress path'),
  csPortfolioTimelineTitle: cmsText(portfolioSettings.timelineTitle, 'Timeline'),
  csPortfolioTimelineSubtitle: cmsText(portfolioSettings.timelineSubtitle, 'A short view of how CyberSabil systems are growing over time.'),
  csPortfolioServicesEyebrow: cmsText(portfolioSettings.servicesEyebrow, 'How I can help'),
  csPortfolioServicesTitle: cmsText(portfolioSettings.servicesTitle, 'Services'),
  csPortfolioServicesSubtitle: cmsText(portfolioSettings.servicesSubtitle, 'Clear support areas for automation, troubleshooting, documentation and web deployment.'),
  csPortfolioContactEyebrow: cmsText(portfolioSettings.contactEyebrow, 'Contact'),
  csPortfolioFooterText: cmsText(portfolioSettings.footerText, 'CyberSabil Portfolio • Windows automation and IT support utilities')
};
for (const [id, value] of Object.entries(textMap)) index = replaceTextById(index, id, value);

/* Build-time Website visibility synchronization
   Purpose: Keeps raw/no-JS HTML aligned with section, navigation, hero CTA and terminal settings. */
const websiteSections = {
  tools: siteSettings.showToolsSection !== 'no',
  downloads: siteSettings.showDownloadsSection !== 'no',
  projects: siteSettings.showProjectsSection !== 'no',
  skills: siteSettings.showSkillsSection !== 'no',
  docs: siteSettings.showDocsSection !== 'no',
  faq: siteSettings.showFaqSection !== 'no',
  about: siteSettings.showAboutSection !== 'no',
  quickCommands: siteSettings.showQuickCommands !== 'no'
};
for (const [id, visible] of Object.entries({
  tools: websiteSections.tools, downloads: websiteSections.downloads, projects: websiteSections.projects,
  skills: websiteSections.skills, docs: websiteSections.docs, faq: websiteSections.faq, about: websiteSections.about,
  quickCommandsCard: websiteSections.quickCommands, navToolsLabel: websiteSections.tools,
  navDownloadsLabel: websiteSections.downloads, navProjectsLabel: websiteSections.projects, navDocsLabel: websiteSections.docs
})) index = toggleClassById(index, id, 'hide', !visible);
const primaryBuildHref = safeCmsUrl(site.primaryButtonLink || '#tools');
const secondaryBuildHref = safeCmsUrl(site.secondaryButtonLink || '#downloads');
index = toggleClassById(index, 'primaryButton', 'hide', primaryBuildHref === '#tools' && !websiteSections.tools);
index = toggleClassById(index, 'secondaryButton', 'hide', secondaryBuildHref === '#downloads' && !websiteSections.downloads);
index = toggleClassById(index, 'terminalBox', 'hide', design.showTerminalPreview === 'no');
for (const [id, value] of [
  ['csPortfolioTagline', profile.tagline], ['csPortfolioAvailability', profile.availability], ['csPortfolioLocation', profile.location],
  ['csPortfolioExperience', profile.experience], ['csPortfolioBio', profile.bio]
]) index = toggleClassById(index, id, 'cs-mode-hidden', !value);
const buildLocationVisible = Boolean(profile.location);
const buildExperienceVisible = Boolean(profile.experience);
index = toggleClassById(index, 'csPortfolioMeta', 'cs-mode-hidden', !buildLocationVisible && !buildExperienceVisible);
const buildStatOneVisible = Boolean(profile.statOneValue || profile.statOneLabel);
const buildStatTwoVisible = Boolean(profile.statTwoValue || profile.statTwoLabel);
index = toggleClassById(index, 'csPortfolioStatOne', 'cs-mode-hidden', !buildStatOneVisible);
index = toggleClassById(index, 'csPortfolioStatTwo', 'cs-mode-hidden', !buildStatTwoVisible);
index = toggleClassById(index, 'csPortfolioStats', 'cs-mode-hidden', !buildStatOneVisible && !buildStatTwoVisible);
index = replaceHrefAndText(index, 'primaryButton', site.primaryButtonLink, site.primaryButtonText);
index = replaceHrefAndText(index, 'secondaryButton', site.secondaryButtonLink, site.secondaryButtonText);
index = replaceHrefAndText(index, 'githubNav', site.githubProfileLink, site.githubNavText || 'GitHub');
index = replaceOptionalHrefAndText(index, 'csPortfolioPrimaryCta', profile.primaryCtaLink, profile.primaryCtaText);
index = replaceOptionalHrefAndText(index, 'csPortfolioSecondaryCta', profile.secondaryCtaLink, profile.secondaryCtaText);
index = toggleClassById(index, 'csPortfolioActions', 'cs-mode-hidden', !(profile.primaryCtaText && profile.primaryCtaLink && safeCmsUrl(profile.primaryCtaLink) !== '#') && !(profile.secondaryCtaText && profile.secondaryCtaLink && safeCmsUrl(profile.secondaryCtaLink) !== '#'));
index = toggleClassById(index, 'csPortfolioContactDescription', 'cs-mode-hidden', !contact.description);
index = toggleClassById(index, 'csPortfolioEmailLabel', 'cs-mode-hidden', !contact.emailLabel);
index = toggleClassById(index, 'csPortfolioGithubLabel', 'cs-mode-hidden', !contact.githubLabel);
index = toggleClassById(index, 'csPortfolioWebsiteLabel', 'cs-mode-hidden', !contact.websiteLabel);
const buildEmailVisible = isValidBuildEmail(contact.email);
index = setHiddenAttributeById(index, 'csPortfolioEmailRow', !buildEmailVisible);
index = replaceBuildContactLink(index, null, 'csPortfolioEmail', buildEmailVisible ? `mailto:${contact.email}` : '', buildEmailVisible ? contact.email : '');
index = replaceBuildContactLink(index, 'csPortfolioGithubRow', 'csPortfolioGithub', contact.githubLink, contact.githubText);
index = replaceBuildContactLink(index, 'csPortfolioWebsiteRow', 'csPortfolioWebsite', contact.websiteLink, contact.websiteText);
index = replaceBuildContactLink(index, null, 'csPortfolioContactCta', contact.ctaLink, contact.ctaText, true);

/* Build-time Portfolio settings synchronization
   Purpose: Keeps raw/no-JS HTML aligned with the same Portfolio settings that runtime JavaScript applies. */
const portfolioTheme = ['purple-gold', 'midnight'].includes(portfolioSettings.themePreset) ? portfolioSettings.themePreset : 'purple-gold';
const portfolioLayout = ['professional', 'compact', 'spacious'].includes(portfolioSettings.layoutPreset) ? portfolioSettings.layoutPreset : 'professional';
const portfolioNavigationVisible = portfolioSettings.showNavigation !== 'no';
const portfolioProfileVisible = portfolioSettings.showProfileCard !== 'no';
const portfolioSections = {
  skills: portfolioSettings.showSkillsSection !== 'no',
  projects: portfolioSettings.showProjectsSection !== 'no',
  timeline: portfolioSettings.showTimelineSection !== 'no',
  services: portfolioSettings.showServicesSection !== 'no',
  contact: portfolioSettings.showContactSection !== 'no'
};
index = toggleClassById(index, 'csPortfolioApp', 'cs-portfolio-theme-purple-gold', portfolioTheme === 'purple-gold');
index = toggleClassById(index, 'csPortfolioApp', 'cs-portfolio-theme-midnight', portfolioTheme === 'midnight');
for (const preset of ['professional', 'compact', 'spacious']) {
  index = toggleClassById(index, 'csPortfolioApp', `cs-portfolio-layout-${preset}`, portfolioLayout === preset);
}
index = toggleClassById(index, 'csPortfolioApp', 'cs-portfolio-profile-hidden', !portfolioProfileVisible);
index = toggleClassById(index, 'csPortfolioNav', 'cs-mode-hidden', !portfolioNavigationVisible);
index = toggleClassById(index, 'portfolioNavToggle', 'cs-mode-hidden', !portfolioNavigationVisible);
index = toggleClassById(index, 'csPortfolioHero', 'cs-mode-hidden', portfolioSettings.showHero === 'no');
index = toggleClassById(index, 'csPortfolioProfileCard', 'cs-mode-hidden', !portfolioProfileVisible);
index = toggleClassById(index, 'csPortfolioSkills', 'cs-mode-hidden', !portfolioSections.skills);
index = toggleClassById(index, 'csPortfolioProjects', 'cs-mode-hidden', !portfolioSections.projects);
index = toggleClassById(index, 'csPortfolioTimeline', 'cs-mode-hidden', !portfolioSections.timeline);
index = toggleClassById(index, 'csPortfolioServices', 'cs-mode-hidden', !portfolioSections.services);
index = toggleClassById(index, 'csPortfolioContact', 'cs-mode-hidden', !portfolioSections.contact);
index = toggleClassById(index, 'csPortfolioNavSkills', 'cs-mode-hidden', !portfolioNavigationVisible || !portfolioSections.skills);
index = toggleClassById(index, 'csPortfolioNavProjects', 'cs-mode-hidden', !portfolioNavigationVisible || !portfolioSections.projects);
index = toggleClassById(index, 'csPortfolioNavTimeline', 'cs-mode-hidden', !portfolioNavigationVisible || !portfolioSections.timeline);
index = toggleClassById(index, 'csPortfolioNavServices', 'cs-mode-hidden', !portfolioNavigationVisible || !portfolioSections.services);
index = toggleClassById(index, 'csPortfolioNavContact', 'cs-mode-hidden', !portfolioNavigationVisible || !portfolioSections.contact);

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

const buildChoice = (value, allowed, fallback) => allowed.includes(String(value || '').trim().toLowerCase()) ? String(value).trim().toLowerCase() : fallback;
const bodyClasses = [
  `theme-${buildChoice(design.themeMode, ['dark', 'light', 'blue', 'green', 'purple'], 'dark')}`,
  `accent-${buildChoice(design.accentColor, ['cyan', 'green', 'blue', 'orange', 'purple'], 'cyan')}`,
  `bg-${buildChoice(design.backgroundStyle, ['gradient', 'plain', 'grid'], 'gradient')}`,
  `card-${buildChoice(design.cardStyle, ['glass', 'solid', 'border'], 'glass')}`, 'cs-mode-gateway-open'
];
if (buildChoice(design.heroLayout, ['split', 'center'], 'split') === 'center') bodyClasses.push('hero-center');
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
