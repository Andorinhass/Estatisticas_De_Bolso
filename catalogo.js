(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const state = {
    categories: [], currentCategory: null, currentTopic: null, query: "",
    modalTopics: [], modalIndex: 0
  };
  const el = {
    searchInput: $("searchInput"), categoryView: $("categoryView"), topicView: $("topicView"),
    detailView: $("detailView"), sectionTitle: $("sectionTitle"), topicEyebrow: $("topicEyebrow"),
    topicHeading: $("topicHeading"), topicCount: $("topicCount"), topicGrid: $("topicGrid"),
    backToCategories: $("backToCategories"), backToTopics: $("backToTopics"),
    detailImage: $("detailImage"), detailCategory: $("detailCategory"), detailTitle: $("detailTitle"),
    sourceContent: $("sourceContent"), noSources: $("noSources"), detailPath: $("detailPath"),
    emptyState: $("emptyState"), footerCount: $("footerCount"), imageModal: $("imageModal"),
    modalImage: $("modalImage"), modalCaption: $("modalCaption"), modalPrev: $("modalPrev"),
    modalNext: $("modalNext"), modalClose: $("modalClose"), modalBack: $("modalBack")
  };

  const normalize = value => String(value ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const titleFromFilename = filename => filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const isImage = path => /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(path);
  const isSource = path => /\.(txt|md)$/i.test(path);
  const pathParts = path => String(path).replace(/\\/g, "/").split("/").filter(Boolean);
  const fileBase = path => pathParts(path).pop() || "";
  const stripExt = path => path.replace(/\.[^.]+$/, "");

  // Fixed, high-contrast palette inspired by the supplied reference image.
  const categoryStyles = [
    { bg: "#eadcf1", accent: "#70249a", dots: ["#70249a","#48127e","#211d20","#ffffff"] },
    { bg: "#f2dfc9", accent: "#75421f", dots: ["#75421f","#c68a4f","#211d20","#fffaf4"] },
    { bg: "#dce8d8", accent: "#315d37", dots: ["#315d37","#71976b","#211d20","#ffffff"] },
    { bg: "#dce6f3", accent: "#254c80", dots: ["#254c80","#6c91c2","#211d20","#ffffff"] },
    { bg: "#f3dadd", accent: "#9a3345", dots: ["#9a3345","#d78391","#211d20","#ffffff"] },
    { bg: "#f1e9c9", accent: "#6f5b15", dots: ["#6f5b15","#c4a942","#211d20","#ffffff"] }
  ];
  const getCategoryStyle = index => categoryStyles[index % categoryStyles.length];

  function renderSources(raw) {
    const lines = String(raw || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    el.sourceContent.innerHTML = "";
    if (!lines.length) {
      el.noSources.hidden = false;
      return;
    }
    el.noSources.hidden = true;
    for (const line of lines) {
      const p = document.createElement("p");
      // Convert only explicit http(s) URLs into links. Other text remains text, never HTML.
      const urlMatch = line.match(/https?:\/\/\S+/i);
      if (urlMatch) {
        const start = line.indexOf(urlMatch[0]);
        p.append(document.createTextNode(line.slice(0, start)));
        const a = document.createElement("a");
        a.href = urlMatch[0].replace(/[),.;]+$/, "");
        a.textContent = a.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        p.appendChild(a);
        p.append(document.createTextNode(line.slice(start + urlMatch[0].length)));
      } else {
        p.textContent = line;
      }
      el.sourceContent.appendChild(p);
    }
  }

  function showCategories() {
    state.currentCategory = null; state.currentTopic = null;
    el.categoryView.hidden = false; el.topicView.hidden = true; el.detailView.hidden = true;
    el.sectionTitle.textContent = "Categorias";
    renderCategories();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showTopics(category) {
    state.currentCategory = category; state.currentTopic = null;
    el.categoryView.hidden = true; el.topicView.hidden = false; el.detailView.hidden = true;
    el.sectionTitle.textContent = "Tópicos";
    el.topicEyebrow.textContent = "CATEGORIA / " + category.name.toLocaleUpperCase("pt-BR");
    el.topicHeading.textContent = category.name;
    el.topicHeading.style.color = category.style.accent;
    el.topicCount.textContent = `${category.topics.length} ${category.topics.length === 1 ? "publicação" : "publicações"}`;
    renderTopics(category.topics);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showTopic(topic) {
    state.currentTopic = topic;
    el.categoryView.hidden = true; el.topicView.hidden = true; el.detailView.hidden = false;
    el.sectionTitle.textContent = "Publicação";
    el.detailCategory.textContent = topic.category.toLocaleUpperCase("pt-BR");
    el.detailCategory.style.color = topic.style.accent;
    el.detailTitle.textContent = topic.title;
    el.detailTitle.style.color = topic.style.accent;
    el.detailImage.src = topic.image;
    el.detailImage.alt = topic.title;
    el.detailPath.textContent = "";
    renderSources(topic.sources);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getModalTopics() {
    if (state.currentCategory) return state.currentCategory.topics;
    return state.categories.flatMap(category => category.topics);
  }

  function openImageModal(topic) {
    const modalTopics = getModalTopics();
    const topicIndex = modalTopics.findIndex(item => item.title === topic.title && item.image === topic.image && item.category === topic.category);
    state.modalTopics = modalTopics;
    state.modalIndex = topicIndex >= 0 ? topicIndex : 0;
    renderModalImage();
  }

  function renderModalImage() {
    const item = state.modalTopics[state.modalIndex];
    if (!item) return;

    el.imageModal.hidden = false;
    el.imageModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    el.imageModal.style.setProperty("--modal-accent", item.style.accent);
    el.modalImage.src = item.image;
    el.modalImage.alt = item.title;
    el.modalCaption.textContent = `${item.title} · ${item.category}`;
    el.modalPrev.disabled = state.modalIndex === 0;
    el.modalNext.disabled = state.modalIndex === state.modalTopics.length - 1;
  }

  function closeImageModal() {
    el.imageModal.hidden = true;
    el.imageModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    state.modalTopics = [];
    state.modalIndex = 0;
  }

  function renderCategories() {
    const query = normalize(state.query);
    const categories = state.categories.map(category => {
      const matchedTopics = category.topics.filter(topic => !query || normalize(topic.title + " " + topic.category).includes(query));
      const nameMatches = normalize(category.name).includes(query);
      return { ...category, visibleTopics: query && nameMatches ? category.topics : matchedTopics };
    }).filter(category => category.visibleTopics.length > 0);
    el.categoryView.innerHTML = "";
    for (const category of categories) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "category-card";
      card.style.setProperty("--category-bg", category.style.bg);
      card.style.setProperty("--category-accent", category.style.accent);
      const top = document.createElement("div"); top.className = "category-top";
      const heading = document.createElement("h3"); heading.textContent = category.name;
      const count = document.createElement("span"); count.className = "count";
      count.textContent = `${category.visibleTopics.length.toString().padStart(2, "0")} ITENS`;
      top.append(heading, count);
      const bottomWrap = document.createElement("div");
      const dots = document.createElement("div"); dots.className = "palette-dots";
      category.style.dots.forEach(color => { const dot = document.createElement("span"); dot.style.background = color; dots.appendChild(dot); });
      const bottom = document.createElement("div"); bottom.className = "category-bottom";
      const sample = document.createElement("span"); sample.className = "sample-title";
      sample.textContent = category.visibleTopics[0]?.title || "Abrir categoria";
      const arrow = document.createElement("span"); arrow.className = "arrow-disc"; arrow.setAttribute("aria-hidden","true"); arrow.textContent = "↗";
      bottom.append(sample, arrow); bottomWrap.append(dots, bottom); card.append(top, bottomWrap);
      card.addEventListener("click", () => showTopics({ ...category, topics: category.visibleTopics }));
      el.categoryView.appendChild(card);
    }
    updateEmpty(categories.length > 0);
  }
  function renderTopics(topics) {
    const query = normalize(state.query);
    const visible = topics.filter(topic => !query || normalize(topic.title + " " + topic.category).includes(query));
    el.topicGrid.innerHTML = "";
    for (const topic of visible) {
      const card = document.createElement("button"); card.type = "button"; card.className = "topic-card";
      const thumb = document.createElement("div"); thumb.className = "topic-thumb";
      const img = document.createElement("img"); img.src = topic.image; img.alt = ""; img.loading = "lazy"; thumb.appendChild(img);
      const heading = document.createElement("h3"); heading.textContent = topic.title; heading.style.color = topic.style.accent;
      const caption = document.createElement("p"); caption.textContent = "ABRIR PUBLICAÇÃO ↗";
      card.append(thumb, heading, caption); card.addEventListener("click", () => openImageModal(topic));
      el.topicGrid.appendChild(card);
    }
    updateEmpty(visible.length > 0);
  }
  function updateEmpty(hasResults) {
    el.emptyState.hidden = hasResults;
    if (!hasResults) {
      el.emptyState.querySelector("h2").textContent = state.query ? "Nenhum resultado encontrado" : "Nenhuma publicação cadastrada";
      el.emptyState.querySelector("p").textContent = state.query
        ? "Tente outro termo de busca."
        : "As imagens aparecerão aqui assim que forem adicionadas ao catálogo do projeto.";
    }
  }

  async function loadCatalog() {
    try {
      const response = await fetch("catalogo.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar catalogo.json");
      const data = await response.json();
      const categories = [];
      const sourceFiles = data.sources || {};
      (data.categories || []).forEach((rawCategory, index) => {
        const categoryName = String(rawCategory.name || "Sem categoria");
        const style = getCategoryStyle(index);
        const topics = (rawCategory.topics || []).filter(t => t && t.image).map(rawTopic => {
          const imagePath = String(rawTopic.image);
          const title = String(rawTopic.title || titleFromFilename(fileBase(imagePath)));
          const sources = rawTopic.sources || sourceFiles[imagePath] || "";
          return { title, image: imagePath, sources, category: categoryName, style };
        });
        if (topics.length) categories.push({ name: categoryName, topics, style });
      });
      state.categories = categories;
      const total = categories.reduce((sum, c) => sum + c.topics.length, 0);
      el.footerCount.textContent = `${total} ${total === 1 ? "publicação" : "publicações"} · ${categories.length} ${categories.length === 1 ? "categoria" : "categorias"}`;
      renderCategories();
      if (!total) updateEmpty(false);
    } catch (error) {
      console.error(error);
      state.categories = [];
      el.footerCount.textContent = "Acervo indisponível";
      updateEmpty(false);
      el.emptyState.querySelector("h2").textContent = "Não foi possível carregar o catálogo";
      el.emptyState.querySelector("p").textContent = "Verifique se catalogo.json existe na raiz do site e se os caminhos das imagens estão corretos.";
    }
  }

  el.searchInput.addEventListener("input", event => {
    state.query = event.target.value;
    if (!el.detailView.hidden) return;
    if (!el.topicView.hidden && state.currentCategory) renderTopics(state.currentCategory.topics);
    else renderCategories();
  });
  el.backToCategories.addEventListener("click", showCategories);
  el.backToTopics.addEventListener("click", () => state.currentCategory ? showTopics(state.currentCategory) : showCategories());
  el.modalPrev.addEventListener("click", () => {
    if (state.modalIndex > 0) {
      state.modalIndex -= 1;
      renderModalImage();
    }
  });
  el.modalNext.addEventListener("click", () => {
    if (state.modalIndex < state.modalTopics.length - 1) {
      state.modalIndex += 1;
      renderModalImage();
    }
  });
  el.modalClose.addEventListener("click", closeImageModal);
  el.modalBack.addEventListener("click", closeImageModal);
  el.imageModal.addEventListener("click", event => {
    if (event.target === el.imageModal) closeImageModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (!el.imageModal.hidden) closeImageModal();
      else if (!el.detailView.hidden) el.backToTopics.click();
      else if (!el.topicView.hidden) showCategories();
    }
    if (!el.imageModal.hidden) {
      if (event.key === "ArrowRight") el.modalNext.click();
      if (event.key === "ArrowLeft") el.modalPrev.click();
    }
  });
  loadCatalog();
})();