// Generated from cms-schema/field-registry.json. Do not hand-edit.
export const FILE_POLICIES = Object.freeze({
  "data/site-settings.json": {
    "kind": "object",
    "fields": {
      "gatewayEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "defaultMode": {
        "type": "string",
        "values": [
          "gateway",
          "website",
          "portfolio"
        ]
      },
      "websiteEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "portfolioEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showModeSwitch": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "modeSwitchWebsiteLabel": {
        "type": "string"
      },
      "modeSwitchPortfolioLabel": {
        "type": "string"
      },
      "modeSwitchPosition": {
        "type": "string",
        "values": [
          "top-right",
          "bottom-right"
        ]
      },
      "rememberVisitorChoice": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showToolsSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showDownloadsSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showProjectsSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showSkillsSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showDocsSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showFaqSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showAboutSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showQuickCommands": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "enableUrlModeOverride": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "allowGatewayCloseWithEscape": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "escapeFallbackMode": {
        "type": "string",
        "values": [
          "website",
          "portfolio"
        ]
      },
      "terminalReadyMessage": {
        "type": "string"
      },
      "copyButtonDefaultTitle": {
        "type": "string"
      },
      "copyButtonSuccessTitle": {
        "type": "string"
      },
      "copyButtonErrorTitle": {
        "type": "string"
      },
      "copyButtonAriaLabel": {
        "type": "string"
      },
      "showDataLoadWarning": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "dataLoadWarningTitle": {
        "type": "string"
      },
      "dataLoadWarningMessage": {
        "type": "string"
      },
      "bootStatusMessage": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "schemaVersion": {
        "type": "string"
      }
    }
  },
  "data/gateway.json": {
    "kind": "object",
    "fields": {
      "backgroundMode": {
        "type": "string",
        "values": [
          "website",
          "portfolio"
        ]
      },
      "title": {
        "type": "string"
      },
      "subtitle": {
        "type": "string"
      },
      "showSubtitle": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "logoText": {
        "type": "string"
      },
      "eyebrow": {
        "type": "string"
      },
      "showLogoRow": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "choiceLabel": {
        "type": "string"
      },
      "showChoiceLabel": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "chipOne": {
        "type": "string"
      },
      "chipTwo": {
        "type": "string"
      },
      "chipThree": {
        "type": "string"
      },
      "showChips": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "websiteIcon": {
        "type": "string"
      },
      "websiteKicker": {
        "type": "string"
      },
      "websiteTitle": {
        "type": "string"
      },
      "websiteDescription": {
        "type": "string"
      },
      "websiteButtonText": {
        "type": "string"
      },
      "portfolioIcon": {
        "type": "string"
      },
      "portfolioKicker": {
        "type": "string"
      },
      "portfolioTitle": {
        "type": "string"
      },
      "portfolioDescription": {
        "type": "string"
      },
      "portfolioButtonText": {
        "type": "string"
      },
      "showCardIcons": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showCardKickers": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showCardDescriptions": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showCardButtons": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "footerNote": {
        "type": "string"
      },
      "showFooterNote": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "stylePreset": {
        "type": "string",
        "values": [
          "minimal-selector",
          "premium-glass",
          "solid",
          "minimal"
        ]
      },
      "animationStyle": {
        "type": "string",
        "values": [
          "soft-scale",
          "none"
        ]
      },
      "backgroundBlur": {
        "type": "number",
        "min": 0,
        "max": 18
      },
      "backgroundDarkness": {
        "type": "number",
        "min": 0,
        "max": 0.9,
        "step": 0.1
      },
      "panelMaxWidth": {
        "type": "string"
      }
    }
  },
  "data/site.json": {
    "kind": "object",
    "fields": {
      "brandName": {
        "type": "string"
      },
      "logoText": {
        "type": "string"
      },
      "badge": {
        "type": "string"
      },
      "heroTitleBefore": {
        "type": "string"
      },
      "heroTitleHighlight": {
        "type": "string"
      },
      "heroDescription": {
        "type": "string"
      },
      "primaryButtonText": {
        "type": "string"
      },
      "primaryButtonLink": {
        "type": "string"
      },
      "secondaryButtonText": {
        "type": "string"
      },
      "secondaryButtonLink": {
        "type": "string"
      },
      "githubProfileLink": {
        "type": "string"
      },
      "aboutTitle": {
        "type": "string"
      },
      "aboutDescription": {
        "type": "string"
      },
      "footerText": {
        "type": "string"
      }
    }
  },
  "data/sections.json": {
    "kind": "object",
    "fields": {
      "navToolsLabel": {
        "type": "string"
      },
      "navDownloadsLabel": {
        "type": "string"
      },
      "navProjectsLabel": {
        "type": "string"
      },
      "navDocsLabel": {
        "type": "string"
      },
      "toolsTitle": {
        "type": "string"
      },
      "toolsSubtitle": {
        "type": "string"
      },
      "downloadsTitle": {
        "type": "string"
      },
      "downloadsSubtitle": {
        "type": "string"
      },
      "downloadsWarning": {
        "type": "string"
      },
      "projectsTitle": {
        "type": "string"
      },
      "projectsSubtitle": {
        "type": "string"
      },
      "skillsTitle": {
        "type": "string"
      },
      "skillsSubtitle": {
        "type": "string"
      },
      "quickCommandsTitle": {
        "type": "string"
      },
      "quickCommandsSubtitle": {
        "type": "string"
      },
      "docsTitle": {
        "type": "string"
      },
      "docsSubtitle": {
        "type": "string"
      },
      "faqTitle": {
        "type": "string"
      },
      "faqSubtitle": {
        "type": "string"
      }
    }
  },
  "data/design.json": {
    "kind": "object",
    "fields": {
      "themeMode": {
        "type": "string",
        "values": [
          "dark",
          "light",
          "blue",
          "green",
          "purple"
        ]
      },
      "accentColor": {
        "type": "string",
        "values": [
          "cyan",
          "green",
          "blue",
          "orange",
          "purple"
        ]
      },
      "backgroundStyle": {
        "type": "string",
        "values": [
          "gradient",
          "plain",
          "grid"
        ]
      },
      "cardStyle": {
        "type": "string",
        "values": [
          "glass",
          "solid",
          "border"
        ]
      },
      "heroLayout": {
        "type": "string",
        "values": [
          "split",
          "center"
        ]
      },
      "showTerminalPreview": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      }
    }
  },
  "data/tools.json": {
    "kind": "list",
    "fields": {
      "icon": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "problem": {
        "type": "string"
      },
      "solution": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "technology": {
        "type": "string"
      },
      "command": {
        "type": "string"
      },
      "buttonText": {
        "type": "string"
      },
      "buttonLink": {
        "type": "string"
      }
    }
  },
  "data/downloads.json": {
    "kind": "list",
    "fields": {
      "title": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "downloadLink": {
        "type": "string"
      },
      "releaseLink": {
        "type": "string"
      },
      "checksum": {
        "type": "string"
      }
    }
  },
  "data/projects.json": {
    "kind": "list",
    "fields": {
      "icon": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "problemSolved": {
        "type": "string"
      },
      "techUsed": {
        "type": "string"
      },
      "repoLink": {
        "type": "string"
      },
      "liveLink": {
        "type": "string"
      }
    }
  },
  "data/skills.json": {
    "kind": "list",
    "fields": {
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      }
    }
  },
  "data/docs.json": {
    "kind": "list",
    "fields": {
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "command": {
        "type": "string"
      },
      "link": {
        "type": "string"
      }
    }
  },
  "data/faq.json": {
    "kind": "list",
    "fields": {
      "question": {
        "type": "string"
      },
      "answer": {
        "type": "string"
      }
    }
  },
  "data/portfolio-settings.json": {
    "kind": "object",
    "fields": {
      "themePreset": {
        "type": "string",
        "values": [
          "purple-gold",
          "midnight"
        ]
      },
      "layoutPreset": {
        "type": "string",
        "values": [
          "professional",
          "compact",
          "spacious"
        ]
      },
      "brandText": {
        "type": "string"
      },
      "showNavigation": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "navSkillsLabel": {
        "type": "string"
      },
      "navProjectsLabel": {
        "type": "string"
      },
      "navTimelineLabel": {
        "type": "string"
      },
      "navServicesLabel": {
        "type": "string"
      },
      "navContactLabel": {
        "type": "string"
      },
      "showHero": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showProfileCard": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showSkillsSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showProjectsSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showTimelineSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showServicesSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "showContactSection": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "skillsEyebrow": {
        "type": "string"
      },
      "skillsTitle": {
        "type": "string"
      },
      "skillsSubtitle": {
        "type": "string"
      },
      "projectsEyebrow": {
        "type": "string"
      },
      "projectsTitle": {
        "type": "string"
      },
      "projectsSubtitle": {
        "type": "string"
      },
      "timelineEyebrow": {
        "type": "string"
      },
      "timelineTitle": {
        "type": "string"
      },
      "timelineSubtitle": {
        "type": "string"
      },
      "servicesEyebrow": {
        "type": "string"
      },
      "servicesTitle": {
        "type": "string"
      },
      "servicesSubtitle": {
        "type": "string"
      },
      "contactEyebrow": {
        "type": "string"
      },
      "showProjectLinks": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "projectLinkLabel": {
        "type": "string"
      },
      "footerText": {
        "type": "string"
      }
    }
  },
  "data/profile.json": {
    "kind": "object",
    "fields": {
      "name": {
        "type": "string"
      },
      "initials": {
        "type": "string"
      },
      "role": {
        "type": "string"
      },
      "tagline": {
        "type": "string"
      },
      "availability": {
        "type": "string"
      },
      "location": {
        "type": "string"
      },
      "experience": {
        "type": "string"
      },
      "bio": {
        "type": "string"
      },
      "statOneValue": {
        "type": "string"
      },
      "statOneLabel": {
        "type": "string"
      },
      "statTwoValue": {
        "type": "string"
      },
      "statTwoLabel": {
        "type": "string"
      },
      "primaryCtaText": {
        "type": "string"
      },
      "primaryCtaLink": {
        "type": "string"
      },
      "secondaryCtaText": {
        "type": "string"
      },
      "secondaryCtaLink": {
        "type": "string"
      }
    }
  },
  "data/portfolio-skills.json": {
    "kind": "list",
    "fields": {
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "level": {
        "type": "string"
      },
      "description": {
        "type": "string"
      }
    }
  },
  "data/portfolio-projects.json": {
    "kind": "list",
    "fields": {
      "title": {
        "type": "string"
      },
      "category": {
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "tech": {
        "type": "string"
      },
      "image": {
        "type": "string"
      },
      "imageAlt": {
        "type": "string"
      },
      "link": {
        "type": "string"
      },
      "buttonText": {
        "type": "string"
      }
    }
  },
  "data/portfolio-timeline.json": {
    "kind": "list",
    "fields": {
      "period": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "status": {
        "type": "string"
      },
      "description": {
        "type": "string"
      }
    }
  },
  "data/services.json": {
    "kind": "list",
    "fields": {
      "icon": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      }
    }
  },
  "data/contact.json": {
    "kind": "object",
    "fields": {
      "heading": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "emailLabel": {
        "type": "string"
      },
      "email": {
        "type": "string"
      },
      "githubLabel": {
        "type": "string"
      },
      "githubText": {
        "type": "string"
      },
      "githubLink": {
        "type": "string"
      },
      "websiteLabel": {
        "type": "string"
      },
      "websiteText": {
        "type": "string"
      },
      "websiteLink": {
        "type": "string"
      },
      "ctaText": {
        "type": "string"
      },
      "ctaLink": {
        "type": "string"
      }
    }
  },
  "data/seo.json": {
    "kind": "object",
    "fields": {
      "pageTitle": {
        "type": "string"
      },
      "metaDescription": {
        "type": "string"
      },
      "ogTitle": {
        "type": "string"
      },
      "ogDescription": {
        "type": "string"
      },
      "ogImage": {
        "type": "string"
      },
      "canonicalUrl": {
        "type": "string"
      },
      "ogType": {
        "type": "string"
      },
      "ogUrl": {
        "type": "string"
      },
      "twitterCard": {
        "type": "string",
        "values": [
          "summary_large_image",
          "summary"
        ]
      },
      "twitterTitle": {
        "type": "string"
      },
      "twitterDescription": {
        "type": "string"
      },
      "twitterImage": {
        "type": "string"
      },
      "themeColor": {
        "type": "string"
      }
    }
  },
  "data/gateway-appearance.json": {
    "kind": "object",
    "fields": {
      "advancedControlsEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "visualPreset": {
        "type": "string",
        "values": [
          "v2.8.3-exact",
          "custom-advanced"
        ]
      },
      "layoutControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "appearanceControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "animationControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "interactionControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "cardOrder": {
        "type": "string",
        "values": [
          "website-first",
          "portfolio-first"
        ]
      },
      "desktopCardLayout": {
        "type": "string",
        "values": [
          "row",
          "column"
        ]
      },
      "tabletCardLayout": {
        "type": "string",
        "values": [
          "row",
          "column"
        ]
      },
      "mobileCardLayout": {
        "type": "string",
        "values": [
          "row",
          "column"
        ]
      },
      "desktopPanelPosition": {
        "type": "string",
        "values": [
          "center",
          "top-left",
          "top-center",
          "top-right",
          "center-left",
          "center-right",
          "bottom-left",
          "bottom-center",
          "bottom-right"
        ]
      },
      "tabletPanelPosition": {
        "type": "string",
        "values": [
          "center",
          "top-left",
          "top-center",
          "top-right",
          "center-left",
          "center-right",
          "bottom-left",
          "bottom-center",
          "bottom-right"
        ]
      },
      "mobilePanelPosition": {
        "type": "string",
        "values": [
          "center",
          "top-left",
          "top-center",
          "top-right",
          "center-left",
          "center-right",
          "bottom-left",
          "bottom-center",
          "bottom-right"
        ]
      },
      "panelContentLayout": {
        "type": "string",
        "values": [
          "stacked",
          "brand-left",
          "brand-right"
        ]
      },
      "panelMaxWidth": {
        "type": "number",
        "min": 320,
        "max": 1400
      },
      "panelMaxHeightVh": {
        "type": "number",
        "min": 50,
        "max": 98
      },
      "panelPadding": {
        "type": "number",
        "min": 8,
        "max": 72
      },
      "panelGap": {
        "type": "number",
        "min": 0,
        "max": 64
      },
      "panelBorderRadius": {
        "type": "number",
        "min": 0,
        "max": 64
      },
      "panelBackgroundType": {
        "type": "string",
        "values": [
          "glass",
          "gradient",
          "solid",
          "transparent"
        ]
      },
      "panelBackgroundColor": {
        "type": "string"
      },
      "panelBackgroundOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "panelGradientStartColor": {
        "type": "string"
      },
      "panelGradientStartOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "panelGradientEndColor": {
        "type": "string"
      },
      "panelGradientEndOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "panelGradientDirection": {
        "type": "string",
        "values": [
          "top-to-bottom",
          "left-to-right",
          "diagonal-up",
          "diagonal-down"
        ]
      },
      "panelBackdropBlur": {
        "type": "number",
        "min": 0,
        "max": 48
      },
      "panelBackdropSaturation": {
        "type": "number",
        "min": 50,
        "max": 220
      },
      "panelBorderEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "panelBorderWidth": {
        "type": "number",
        "min": 0,
        "max": 8
      },
      "panelBorderStyle": {
        "type": "string",
        "values": [
          "solid",
          "dashed",
          "dotted"
        ]
      },
      "panelBorderColor": {
        "type": "string"
      },
      "panelBorderOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "panelShadowPreset": {
        "type": "string",
        "values": [
          "none",
          "soft",
          "medium",
          "strong"
        ]
      },
      "panelGlowEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "panelGlowColor": {
        "type": "string"
      },
      "panelGlowOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "panelInsetHighlightEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "panelInsetHighlightOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "overlayColor": {
        "type": "string"
      },
      "overlayDarkness": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "overlayBackdropBlur": {
        "type": "number",
        "min": 0,
        "max": 24
      },
      "websiteBackgroundBlur": {
        "type": "number",
        "min": 0,
        "max": 24
      },
      "websiteBackgroundBrightness": {
        "type": "number",
        "min": 20,
        "max": 120
      },
      "websiteBackgroundSaturation": {
        "type": "number",
        "min": 0,
        "max": 200
      },
      "showAmbientLights": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "ambientOneColor": {
        "type": "string"
      },
      "ambientTwoColor": {
        "type": "string"
      },
      "ambientOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "ambientBlur": {
        "type": "number",
        "min": 0,
        "max": 80
      },
      "titleAlignment": {
        "type": "string",
        "values": [
          "left",
          "center",
          "right"
        ]
      },
      "titleColor": {
        "type": "string"
      },
      "titleSize": {
        "type": "number",
        "min": 20,
        "max": 72
      },
      "titleWeight": {
        "type": "number",
        "min": 400,
        "max": 950
      },
      "subtitleColor": {
        "type": "string"
      },
      "subtitleOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "subtitleSize": {
        "type": "number",
        "min": 11,
        "max": 30
      },
      "choiceGap": {
        "type": "number",
        "min": 0,
        "max": 48
      },
      "cardMinHeight": {
        "type": "number",
        "min": 0,
        "max": 520
      },
      "cardPadding": {
        "type": "number",
        "min": 8,
        "max": 60
      },
      "cardBorderRadius": {
        "type": "number",
        "min": 0,
        "max": 48
      },
      "cardBorderWidth": {
        "type": "number",
        "min": 0,
        "max": 8
      },
      "cardTextAlignment": {
        "type": "string",
        "values": [
          "left",
          "center",
          "right"
        ]
      },
      "cardContentAlignment": {
        "type": "string",
        "values": [
          "start",
          "center",
          "end"
        ]
      },
      "cardShadowPreset": {
        "type": "string",
        "values": [
          "none",
          "soft",
          "medium",
          "strong"
        ]
      },
      "cardInsetHighlightEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "cardInsetHighlightOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "cardTitleColor": {
        "type": "string"
      },
      "cardDescriptionColor": {
        "type": "string"
      },
      "cardDescriptionOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "websiteCardBackgroundType": {
        "type": "string",
        "values": [
          "gradient",
          "solid",
          "transparent"
        ]
      },
      "websiteCardBackgroundColor": {
        "type": "string"
      },
      "websiteCardBackgroundOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "websiteCardGradientStartColor": {
        "type": "string"
      },
      "websiteCardGradientStartOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "websiteCardGradientEndColor": {
        "type": "string"
      },
      "websiteCardGradientEndOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "websiteCardBorderColor": {
        "type": "string"
      },
      "websiteCardBorderOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "websiteCardAccentColor": {
        "type": "string"
      },
      "websiteButtonStyle": {
        "type": "string",
        "values": [
          "pill",
          "solid",
          "outline",
          "soft",
          "text"
        ]
      },
      "websiteButtonStartColor": {
        "type": "string"
      },
      "websiteButtonEndColor": {
        "type": "string"
      },
      "websiteButtonTextColor": {
        "type": "string"
      },
      "portfolioCardBackgroundType": {
        "type": "string",
        "values": [
          "gradient",
          "solid",
          "transparent"
        ]
      },
      "portfolioCardBackgroundColor": {
        "type": "string"
      },
      "portfolioCardBackgroundOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "portfolioCardGradientStartColor": {
        "type": "string"
      },
      "portfolioCardGradientStartOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "portfolioCardGradientEndColor": {
        "type": "string"
      },
      "portfolioCardGradientEndOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "portfolioCardBorderColor": {
        "type": "string"
      },
      "portfolioCardBorderOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "portfolioCardAccentColor": {
        "type": "string"
      },
      "portfolioButtonStyle": {
        "type": "string",
        "values": [
          "pill",
          "solid",
          "outline",
          "soft",
          "text"
        ]
      },
      "portfolioButtonStartColor": {
        "type": "string"
      },
      "portfolioButtonEndColor": {
        "type": "string"
      },
      "portfolioButtonTextColor": {
        "type": "string"
      },
      "buttonBorderRadius": {
        "type": "number",
        "min": 0,
        "max": 999
      },
      "panelAnimation": {
        "type": "string",
        "values": [
          "none",
          "fade",
          "soft-scale",
          "slide-up",
          "slide-down",
          "slide-left",
          "slide-right",
          "zoom",
          "blur-in"
        ]
      },
      "overlayAnimation": {
        "type": "string",
        "values": [
          "none",
          "fade",
          "fade-blur"
        ]
      },
      "websiteCardAnimation": {
        "type": "string",
        "values": [
          "none",
          "fade",
          "soft-scale",
          "slide-up",
          "slide-down",
          "slide-left",
          "slide-right",
          "zoom"
        ]
      },
      "portfolioCardAnimation": {
        "type": "string",
        "values": [
          "none",
          "fade",
          "soft-scale",
          "slide-up",
          "slide-down",
          "slide-left",
          "slide-right",
          "zoom"
        ]
      },
      "animationDurationMs": {
        "type": "number",
        "min": 0,
        "max": 2000
      },
      "panelAnimationDelayMs": {
        "type": "number",
        "min": 0,
        "max": 1500
      },
      "websiteCardDelayMs": {
        "type": "number",
        "min": 0,
        "max": 2000
      },
      "portfolioCardDelayMs": {
        "type": "number",
        "min": 0,
        "max": 2000
      },
      "animationEasing": {
        "type": "string",
        "values": [
          "linear",
          "ease",
          "ease-in",
          "ease-out",
          "ease-in-out",
          "smooth",
          "spring-soft"
        ]
      },
      "cardHoverPreset": {
        "type": "string",
        "values": [
          "none",
          "lift",
          "scale",
          "glow",
          "border-glow",
          "tilt-soft",
          "lift-glow"
        ]
      },
      "cardHoverStrength": {
        "type": "number",
        "min": 0,
        "max": 12
      },
      "cardHoverDurationMs": {
        "type": "number",
        "min": 0,
        "max": 1000
      },
      "cardClickPreset": {
        "type": "string",
        "values": [
          "none",
          "press",
          "pulse"
        ]
      }
    }
  },
  "data/navigation-style.json": {
    "kind": "object",
    "fields": {
      "advancedControlsEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "visualPreset": {
        "type": "string",
        "values": [
          "v2.8.3-exact",
          "custom-advanced"
        ]
      },
      "modeSwitchPositionControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "modeSwitchDesktopPosition": {
        "type": "string",
        "values": [
          "top-left",
          "top-center",
          "top-right",
          "center-left",
          "center-right",
          "bottom-left",
          "bottom-center",
          "bottom-right"
        ]
      },
      "modeSwitchMobilePosition": {
        "type": "string",
        "values": [
          "top-left",
          "top-center",
          "top-right",
          "bottom-left",
          "bottom-center",
          "bottom-right"
        ]
      },
      "modeSwitchHorizontalOffset": {
        "type": "number",
        "min": 4,
        "max": 80
      },
      "modeSwitchVerticalOffset": {
        "type": "number",
        "min": 4,
        "max": 100
      },
      "modeSwitchMobileOffset": {
        "type": "number",
        "min": 4,
        "max": 60
      },
      "modeSwitchOrientation": {
        "type": "string",
        "values": [
          "horizontal",
          "vertical"
        ]
      },
      "modeSwitchAppearanceControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "modeSwitchSize": {
        "type": "string",
        "values": [
          "compact",
          "standard",
          "large"
        ]
      },
      "modeSwitchBackgroundColor": {
        "type": "string"
      },
      "modeSwitchBackgroundOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "modeSwitchBackdropBlur": {
        "type": "number",
        "min": 0,
        "max": 40
      },
      "modeSwitchBorderColor": {
        "type": "string"
      },
      "modeSwitchBorderOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "modeSwitchBorderWidth": {
        "type": "number",
        "min": 0,
        "max": 6
      },
      "modeSwitchBorderRadius": {
        "type": "number",
        "min": 0,
        "max": 999
      },
      "modeSwitchShadowPreset": {
        "type": "string",
        "values": [
          "none",
          "soft",
          "medium",
          "strong"
        ]
      },
      "modeSwitchWebsiteStartColor": {
        "type": "string"
      },
      "modeSwitchWebsiteEndColor": {
        "type": "string"
      },
      "modeSwitchWebsiteTextColor": {
        "type": "string"
      },
      "modeSwitchPortfolioStartColor": {
        "type": "string"
      },
      "modeSwitchPortfolioEndColor": {
        "type": "string"
      },
      "modeSwitchPortfolioTextColor": {
        "type": "string"
      },
      "modeSwitchInactiveTextColor": {
        "type": "string"
      },
      "modeSwitchInactiveTextOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "modeSwitchAnimationControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "modeSwitchAnimation": {
        "type": "string",
        "values": [
          "none",
          "fade",
          "pulse",
          "soft-scale"
        ]
      },
      "modeSwitchHoverPreset": {
        "type": "string",
        "values": [
          "none",
          "lift",
          "glow"
        ]
      },
      "websiteHeaderControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "websiteHeaderPosition": {
        "type": "string",
        "values": [
          "static",
          "sticky"
        ]
      },
      "websiteDesktopLayout": {
        "type": "string",
        "values": [
          "brand-left-menu-right",
          "menu-left-brand-right",
          "stacked-centered"
        ]
      },
      "websiteMenuAlignment": {
        "type": "string",
        "values": [
          "left",
          "center",
          "right"
        ]
      },
      "websiteHeaderMinHeight": {
        "type": "number",
        "min": 48,
        "max": 140
      },
      "websiteContainerMaxWidth": {
        "type": "number",
        "min": 720,
        "max": 1800
      },
      "websiteHeaderBackgroundType": {
        "type": "string",
        "values": [
          "glass",
          "solid",
          "transparent"
        ]
      },
      "websiteHeaderBackgroundColor": {
        "type": "string"
      },
      "websiteHeaderBackgroundOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "websiteHeaderBackdropBlur": {
        "type": "number",
        "min": 0,
        "max": 40
      },
      "websiteHeaderBorderEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "websiteHeaderBorderColor": {
        "type": "string"
      },
      "websiteHeaderBorderOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "websiteHeaderShadowPreset": {
        "type": "string",
        "values": [
          "none",
          "soft",
          "medium",
          "strong"
        ]
      },
      "websiteMenuGap": {
        "type": "number",
        "min": 0,
        "max": 48
      },
      "websiteMenuFontSize": {
        "type": "number",
        "min": 11,
        "max": 24
      },
      "websiteMenuLinkStyle": {
        "type": "string",
        "values": [
          "plain",
          "pill",
          "underline"
        ]
      },
      "websiteMenuTextColor": {
        "type": "string"
      },
      "websiteMenuHoverColor": {
        "type": "string"
      },
      "websiteMobileToggleSide": {
        "type": "string",
        "values": [
          "left",
          "right"
        ]
      },
      "websiteMobileMenuAlignment": {
        "type": "string",
        "values": [
          "left",
          "center",
          "right"
        ]
      },
      "portfolioHeaderControlMode": {
        "type": "string",
        "values": [
          "inherit",
          "custom"
        ]
      },
      "portfolioHeaderPosition": {
        "type": "string",
        "values": [
          "static",
          "sticky"
        ]
      },
      "portfolioDesktopLayout": {
        "type": "string",
        "values": [
          "brand-left-menu-right",
          "menu-left-brand-right",
          "stacked-centered"
        ]
      },
      "portfolioMenuAlignment": {
        "type": "string",
        "values": [
          "left",
          "center",
          "right"
        ]
      },
      "portfolioHeaderMinHeight": {
        "type": "number",
        "min": 48,
        "max": 140
      },
      "portfolioContainerMaxWidth": {
        "type": "number",
        "min": 720,
        "max": 1800
      },
      "portfolioHeaderBackgroundType": {
        "type": "string",
        "values": [
          "glass",
          "solid",
          "transparent"
        ]
      },
      "portfolioHeaderBackgroundColor": {
        "type": "string"
      },
      "portfolioHeaderBackgroundOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "portfolioHeaderBackdropBlur": {
        "type": "number",
        "min": 0,
        "max": 40
      },
      "portfolioHeaderBorderEnabled": {
        "type": "string",
        "values": [
          "yes",
          "no"
        ]
      },
      "portfolioHeaderBorderColor": {
        "type": "string"
      },
      "portfolioHeaderBorderOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "portfolioHeaderShadowPreset": {
        "type": "string",
        "values": [
          "none",
          "soft",
          "medium",
          "strong"
        ]
      },
      "portfolioMenuGap": {
        "type": "number",
        "min": 0,
        "max": 48
      },
      "portfolioMenuFontSize": {
        "type": "number",
        "min": 11,
        "max": 24
      },
      "portfolioMenuLinkStyle": {
        "type": "string",
        "values": [
          "plain",
          "pill",
          "underline"
        ]
      },
      "portfolioMenuTextColor": {
        "type": "string"
      },
      "portfolioMenuTextOpacity": {
        "type": "number",
        "min": 0,
        "max": 1
      },
      "portfolioMenuHoverColor": {
        "type": "string"
      },
      "portfolioMobileToggleSide": {
        "type": "string",
        "values": [
          "left",
          "right"
        ]
      },
      "portfolioMobileMenuAlignment": {
        "type": "string",
        "values": [
          "left",
          "center",
          "right"
        ]
      }
    }
  }
});

export const EDITABLE_PATHS = Object.freeze(Object.keys(FILE_POLICIES));
export const MAX_FILES_PER_COMMIT = EDITABLE_PATHS.length;
