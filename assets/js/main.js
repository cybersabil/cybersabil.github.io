const $ = (id) => document.getElementById(id);
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
} [c]));
const yes = (v) => String(v ?? "").trim().toLowerCase() !== "no";
async function loadJson(path, fallback) {
    try {
        const r = await fetch(path + "?v=" + Date.now());
        if (!r.ok) throw new Error(path);
        return await r.json()
    } catch (e) {
        console.warn(e);
        return fallback
    }
}

function copyIconSvg() {
    return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 9.5C9 8.67 9.67 8 10.5 8H18.5C19.33 8 20 8.67 20 9.5V18.5C20 19.33 19.33 20 18.5 20H10.5C9.67 20 9 19.33 9 18.5V9.5Z" stroke="currentColor" stroke-width="1.8"/>
            <path d="M6 16H5.5C4.67 16 4 15.33 4 14.5V5.5C4 4.67 4.67 4 5.5 4H14.5C15.33 4 16 4.67 16 5.5V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
    `;
}

async function copyTextToClipboard(text, btn) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }

        btn.classList.add("copied");
        btn.setAttribute("title", "Copied");

        setTimeout(() => {
            btn.classList.remove("copied");
            btn.setAttribute("title", "Copy");
        }, 1400);
    } catch (err) {
        console.warn("Copy failed", err);
        btn.setAttribute("title", "Copy failed");
    }
}

function addCopyButtons() {
    document.querySelectorAll(".code").forEach((codeBlock) => {
        if (codeBlock.closest(".copy-wrap")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "copy-wrap";

        codeBlock.parentNode.insertBefore(wrapper, codeBlock);
        wrapper.appendChild(codeBlock);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-btn";
        btn.setAttribute("aria-label", "Copy command");
        btn.setAttribute("title", "Copy");
        btn.innerHTML = copyIconSvg();

        btn.addEventListener("click", () => {
            copyTextToClipboard(codeBlock.textContent.trim(), btn);
        });

        wrapper.appendChild(btn);
    });
}

function applyDesign(d) {
    const b = document.body;
    b.className = "";
    b.classList.add("theme-" + (d.themeMode || "dark"));
    b.classList.add("accent-" + (d.accentColor || "cyan"));
    b.classList.add("bg-" + (d.backgroundStyle || "gradient"));
    b.classList.add("card-" + (d.cardStyle || "glass"));
    if ((d.heroLayout || "split").toLowerCase() === "center") b.classList.add("hero-center");
    $("terminalBox").classList.toggle("hide", !yes(d.showTerminalPreview));
    $("skills").classList.toggle("hide", !yes(d.showSkillsSection));
    $("docs").classList.toggle("hide", !yes(d.showDocumentationSection));
    $("faq").classList.toggle("hide", !yes(d.showFAQSection));
    $("projects").classList.toggle("hide", !yes(d.showProjectSection))
}

function renderSite(s) {
    document.title = (s.brandName || "CyberSabil") + " IT Tools";
    $("brandName").textContent = s.brandName || "CyberSabil";
    $("logoText").textContent = s.logoText || "CS";
    $("footerBrand").textContent = (s.brandName || "CyberSabil") + " IT Tools";
    $("badge").textContent = s.badge || "";
    $("heroTitleBefore").textContent = s.heroTitleBefore || "";
    $("heroTitleHighlight").textContent = s.heroTitleHighlight || "";
    $("heroDescription").textContent = s.heroDescription || "";
    $("primaryButton").textContent = s.primaryButtonText || "View Tools";
    $("primaryButton").href = s.primaryButtonLink || "#tools";
    $("secondaryButton").textContent = s.secondaryButtonText || "Download";
    $("secondaryButton").href = s.secondaryButtonLink || "#downloads";
    $("githubNav").href = s.githubProfileLink || "https://github.com/cybersabil";
    $("aboutTitle").textContent = s.aboutTitle || "About";
    $("aboutDescription").textContent = s.aboutDescription || "";
    $("footerText").textContent = s.footerText || ""
}

function renderTools(items) {
    $("toolCards").innerHTML = items.map(t => `<div class="card"><div class="icon">${escapeHtml(t.icon)}</div><span class="status">${escapeHtml(t.status)}</span><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.description)}</p><br><p><strong>Problem:</strong> ${escapeHtml(t.problem)}</p><p><strong>Solution:</strong> ${escapeHtml(t.solution)}</p><p class="small"><strong>Tech:</strong> ${escapeHtml(t.technology)}</p>${t.command && t.command !== "Coming soon" ? `<div class="code">${escapeHtml(t.command)}</div>` : ""}${t.buttonLink ? `<br><a class="btn secondary" href="${escapeHtml(t.buttonLink)}" target="_blank" rel="noopener">${escapeHtml(t.buttonText || "Open")}</a>` : ""}</div>`).join("");
    const cmd = items.filter(t => t.command && t.command !== "Coming soon");
    $("terminalCommands").innerHTML = cmd.map(t => `<div><span class="prompt">PS&gt;</span> <span class="cmd">${escapeHtml(t.command)}</span></div><div>${escapeHtml(t.title)}</div><br>`).join("") + `<div style="color:var(--accent2)">CyberSabil tools ready.</div>`;
    $("commandList").innerHTML = cmd.map(t => `<p class="small"><strong>${escapeHtml(t.title)}</strong></p><div class="code">${escapeHtml(t.command)}</div>`).join("")
}

function renderDownloads(items) {
    $("downloadsGrid").innerHTML = items.map(d => `<div class="download"><span class="status">${escapeHtml(d.type)}</span><h3>${escapeHtml(d.title)}</h3><p>${escapeHtml(d.description)}</p><p class="small"><strong>Version:</strong> ${escapeHtml(d.version)}</p><p class="small"><strong>Checksum:</strong> ${escapeHtml(d.checksum)}</p><br><div class="actions"><a class="btn primary" href="${escapeHtml(d.downloadLink)}" target="_blank" rel="noopener">Download</a><a class="btn secondary" href="${escapeHtml(d.releaseLink)}" target="_blank" rel="noopener">Release</a></div></div>`).join("")
}

function renderProjects(items) {
    $("projectCards").innerHTML = items.map(p => `<div class="card"><div class="icon">${escapeHtml(p.icon)}</div><span class="status">${escapeHtml(p.status)}</span><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description)}</p><br><p><strong>Problem solved:</strong> ${escapeHtml(p.problemSolved)}</p><p class="small"><strong>Tech:</strong> ${escapeHtml(p.techUsed)}</p><br><div class="actions"><a class="btn secondary" href="${escapeHtml(p.repoLink)}" target="_blank" rel="noopener">GitHub</a><a class="btn secondary" href="${escapeHtml(p.liveLink)}" target="_blank" rel="noopener">Open</a></div></div>`).join("")
}

function renderSkills(items) {
    $("skillsGrid").innerHTML = items.map(s => `<div class="card"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p></div>`).join("")
}

function renderDocs(items) {
    $("docsList").innerHTML = items.map(d => `<div class="tool"><div><span class="status">${escapeHtml(d.category)}</span><h3>${escapeHtml(d.title)}</h3><p>${escapeHtml(d.description)}</p>${d.command ? `<div class="code">${escapeHtml(d.command)}</div>` : ""}</div><a class="btn secondary" href="${escapeHtml(d.link)}" target="_blank" rel="noopener">Open</a></div>`).join("")
}

function renderFAQ(items) {
    $("faqGrid").innerHTML = items.map(f => `<div class="faq-item"><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></div>`).join("")
}
async function init() {
    const [site, design, tools, downloads, projects, skills, docs, faq] = await Promise.all([loadJson("data/site.json", {}), loadJson("data/design.json", {}), loadJson("data/tools.json", []), loadJson("data/downloads.json", []), loadJson("data/projects.json", []), loadJson("data/skills.json", []), loadJson("data/docs.json", []), loadJson("data/faq.json", [])]);
    applyDesign(design);
    renderSite(site);
    renderTools(tools);
    renderDownloads(downloads);
    renderProjects(projects);
    renderSkills(skills);
    renderDocs(docs);
    renderFAQ(faq);
    addCopyButtons()
}
init();
