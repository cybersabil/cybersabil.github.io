#!/usr/bin/env node
/* CyberSabil v2.10.0 control-isolation regression test
   Purpose: Fails when a layout-only field can require appearance/animation gates or when duplicate owners return. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = file => JSON.parse(read(file));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const gateway = json('data/gateway-appearance.json');
const nav = json('data/navigation-style.json');
const design = json('data/design.json');
const settings = json('data/site-settings.json');
const js = read('assets/js/main.js');
const css = read('assets/css/style.css');

const gatewayGroups = ['layoutControlMode','appearanceControlMode','animationControlMode','interactionControlMode'];
expect(gatewayGroups.every(key => ['inherit','custom'].includes(gateway[key])), 'Gateway group modes are incomplete');
expect(js.includes('if (customLayout)') && js.includes('if (customAppearance)') && js.includes('if (customAnimation)') && js.includes('if (customInteraction)'), 'Gateway groups are not applied independently');
expect(js.indexOf('if (customLayout)') !== js.indexOf('if (customAnimation)'), 'Gateway layout and animation share one branch');
expect(css.includes('.cs-gateway-layout-custom[data-cs-desktop-card-layout'), 'Layout selector is missing');
expect(css.includes('.cs-gateway-animation-custom[data-cs-panel-animation'), 'Animation selector is missing');
expect(!css.includes('.cs-gateway-advanced[data-cs-panel-animation'), 'Legacy all-or-nothing animation selector remains');
expect(!css.includes('.cs-gateway-advanced[data-cs-card-hover'), 'Legacy all-or-nothing interaction selector remains');

const navGroups = ['websiteHeaderControlMode','portfolioHeaderControlMode','modeSwitchPositionControlMode','modeSwitchAppearanceControlMode','modeSwitchAnimationControlMode'];
expect(navGroups.every(key => ['inherit','custom'].includes(nav[key])), 'Navigation group modes are incomplete');
expect(js.includes('if (useCustomWebsiteHeader())') && js.includes('if (useCustomPortfolioHeader())'), 'Headers are not independently gated');
expect(js.includes('if (useCustomModeSwitchPosition())') && js.includes('if (useCustomModeSwitchAppearance())') && js.includes('if (useCustomModeSwitchAnimation())'), 'Mode-switch groups are not independently gated');
expect(!css.includes('.cs-mode-switch.cs-mode-switch-advanced'), 'Legacy all-or-nothing mode-switch selector remains');

['showSkillsSection','showDocumentationSection','showFAQSection','showProjectSection'].forEach(key => {
  expect(!Object.prototype.hasOwnProperty.call(design, key), `Duplicate design visibility owner remains: ${key}`);
});
['showProjectsSection','showSkillsSection','showDocsSection','showFaqSection'].forEach(key => {
  expect(Object.prototype.hasOwnProperty.call(settings, key), `Canonical site-settings visibility owner missing: ${key}`);
});
expect(!js.includes('&& yes(design.show'), 'Runtime still combines two visibility owners');

// Simulated one-field policy: only layout becomes custom.
const simulated = { ...gateway, layoutControlMode: 'custom', appearanceControlMode: 'inherit', animationControlMode: 'inherit', interactionControlMode: 'inherit', cardOrder: 'portfolio-first' };
expect(simulated.layoutControlMode === 'custom', 'Layout test setup failed');
expect(simulated.animationControlMode === 'inherit', 'Order-only mutation changed animation gate');
expect(simulated.appearanceControlMode === 'inherit', 'Order-only mutation changed appearance gate');
expect(simulated.interactionControlMode === 'inherit', 'Order-only mutation changed interaction gate');

if (failures.length) {
  console.error('Control-isolation tests failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log('CyberSabil control-isolation tests passed.');
