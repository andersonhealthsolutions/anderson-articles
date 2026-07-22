let articles = window.blogPosts || [];

const state = {
  displayDate: new Date(),
  selectedId: null,
  query: "",
  status: "all",
};

const els = {
  calendarGrid: document.querySelector("#calendarGrid"),
  monthLabel: document.querySelector("#monthLabel"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  currentMonth: document.querySelector("#currentMonth"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  articleRows: document.querySelector("#articleRows"),
  resultCount: document.querySelector("#resultCount"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  detailStatus: document.querySelector("#detailStatus"),
  detailDate: document.querySelector("#detailDate"),
  detailFiles: document.querySelector("#detailFiles"),
  nextPostTitle: document.querySelector("#nextPostTitle"),
  nextPostDate: document.querySelector("#nextPostDate"),
  nextPostTopic: document.querySelector("#nextPostTopic"),
  featureCard: document.querySelector(".feature-card"),
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function parseFiles(value) {
  if (!value) return [];

  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [name = "Download", url = "", type = "File"] = item.split("::").map((part) => part.trim());
      return { name, url, type };
    })
    .filter((file) => file.url);
}

function postsFromCsv(text) {
  const rows = parseCsv(text);
  const headers = rows.shift().map((header) => header.trim().toLowerCase());

  return rows
    .map((row) => {
      const record = headers.reduce((entry, header, index) => {
        entry[header] = row[index]?.trim() || "";
        return entry;
      }, {});

      const title = record.title || record["article title"];
      const date = record.date || record["publish date"];
      if (!title || !date) return null;

      return {
        id: record.id || slugify(`${date}-${title}`),
        title,
        topic: record.topic || "Blog",
        owner: record.owner || "",
        date,
        status: record.status || "Scheduled",
        description: record.description || `Scheduled article for ${title}.`,
        files: parseFiles(record.files || record.downloads),
      };
    })
    .filter(Boolean)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

async function loadArticles() {
  const csvUrl = window.dashboardConfig?.googleSheetCsvUrl?.trim();
  if (!csvUrl) return;

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`);
    articles = postsFromCsv(await response.text());
  } catch (error) {
    console.warn("Using built-in blog schedule because the sheet could not be loaded.", error);
  }
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFilteredArticles() {
  const query = state.query.trim().toLowerCase();

  return articles
    .filter((article) => state.status === "all" || article.status === state.status)
    .filter((article) => {
      if (!query) return true;

      return [article.title, article.owner, article.topic, article.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
}

function getDefaultArticle(filtered = getFilteredArticles()) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    filtered.find((article) => parseDate(article.date) >= today) ||
    filtered[0] ||
    null
  );
}

function renderCalendar() {
  const year = state.displayDate.getFullYear();
  const month = state.displayDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  els.monthLabel.textContent = monthFormatter.format(firstDay);
  els.calendarGrid.innerHTML = "";

  const filtered = getFilteredArticles();
  const byDate = filtered.reduce((map, article) => {
    map[article.date] = map[article.date] || [];
    map[article.date].push(article);
    return map;
  }, {});

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    const dayEl = document.createElement("div");
    const dateKey = toDateKey(day);
    dayEl.className = "calendar-day";
    if (day.getMonth() !== month) dayEl.classList.add("is-muted");

    const dateNumber = document.createElement("span");
    dateNumber.className = "date-number";
    dateNumber.textContent = day.getDate();
    dayEl.appendChild(dateNumber);

    (byDate[dateKey] || []).forEach((article) => {
      const eventButton = document.createElement("button");
      eventButton.className = "calendar-event";
      eventButton.type = "button";
      eventButton.dataset.status = article.status;
      eventButton.textContent = article.title;
      eventButton.addEventListener("click", () => selectArticle(article.id));
      dayEl.appendChild(eventButton);
    });

    els.calendarGrid.appendChild(dayEl);
  }
}

function renderArticleRows() {
  const filtered = getFilteredArticles();
  els.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "post" : "posts"}`;
  els.articleRows.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No posts match the current filters.";
    els.articleRows.appendChild(empty);
    return;
  }

  filtered.forEach((article) => {
    const row = document.createElement("button");
    row.className = "article-card";
    if (article.id === state.selectedId) row.classList.add("is-selected");
    row.type = "button";
    row.setAttribute("aria-pressed", String(article.id === state.selectedId));
    row.addEventListener("click", () => selectArticle(article.id));

    const fileLabel =
      article.files.length === 1
        ? "1 file"
        : `${article.files.length} files`;
    const statusBadge =
      article.status === "Scheduled"
        ? ""
        : `<span class="badge" data-status="${article.status}">${article.status}</span>`;

    row.innerHTML = `
      <span class="article-card-header">
        ${statusBadge}
        <span class="badge">${dateFormatter.format(parseDate(article.date))}</span>
      </span>
      <h3>${article.title}</h3>
      <p>${article.topic}</p>
      <span class="article-meta">
        <span>${fileLabel}</span>
      </span>
    `;

    els.articleRows.appendChild(row);
  });
}

function renderDetail() {
  const filtered = getFilteredArticles();
  const selected = articles.find((article) => article.id === state.selectedId) || getDefaultArticle(filtered);

  if (!selected) {
    els.detailTitle.textContent = "No article selected";
    els.detailMeta.textContent = "Add scheduled posts to see task details.";
    els.detailStatus.textContent = "-";
  els.detailDate.textContent = "-";
    els.detailFiles.innerHTML = "";
    return;
  }

  state.selectedId = selected.id;
  els.detailTitle.textContent = selected.title;
  els.detailMeta.textContent = selected.description;
  els.detailStatus.textContent = selected.status;
  els.detailDate.textContent = dateFormatter.format(parseDate(selected.date));
  els.detailFiles.innerHTML = "";

  const filesTitle = document.createElement("h3");
  filesTitle.className = "file-list-title";
  filesTitle.textContent = `Available files (${selected.files.length})`;
  els.detailFiles.appendChild(filesTitle);

  if (!selected.files.length) {
    const empty = document.createElement("p");
    empty.className = "detail-meta";
    empty.textContent = "No task files have been added for this post yet.";
    els.detailFiles.appendChild(empty);
    return;
  }

  selected.files.forEach((file) => {
    const link = document.createElement("a");
    link.className = "file-link";
    link.href = file.url;
    link.download = "";
    link.innerHTML = `${file.name}<span>${file.type}</span>`;
    els.detailFiles.appendChild(link);
  });
}

function renderStats() {
  const featuredArticleId = window.dashboardConfig?.featuredArticleId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextPost =
    articles.find((article) => article.id === featuredArticleId) ||
    articles
      .filter((article) => parseDate(article.date) >= today)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0];

  if (nextPost) {
    els.nextPostTitle.textContent = nextPost.title;
    els.nextPostDate.textContent = dateFormatter.format(parseDate(nextPost.date));
    els.nextPostTopic.textContent = nextPost.topic;
    els.featureCard.querySelectorAll(".feature-downloads").forEach((node) => node.remove());

    if (nextPost.files.length) {
      const downloads = document.createElement("div");
      downloads.className = "feature-downloads";
      nextPost.files.forEach((file) => {
        const link = document.createElement("a");
        link.className = "feature-download";
        link.href = file.url;
        link.download = "";
        link.textContent = `Download ${file.name}`;
        downloads.appendChild(link);
      });
      els.featureCard.appendChild(downloads);
    }
  }

}

function selectArticle(id) {
  const article = articles.find((item) => item.id === id);
  if (!article) return;

  state.selectedId = id;
  state.displayDate = parseDate(article.date);
  render();

  if (window.matchMedia("(max-width: 980px)").matches) {
    els.detailFiles.closest(".selected-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function render() {
  renderCalendar();
  renderArticleRows();
  renderDetail();
  renderStats();
}

els.prevMonth.addEventListener("click", () => {
  state.displayDate = new Date(state.displayDate.getFullYear(), state.displayDate.getMonth() - 1, 1);
  render();
});

els.nextMonth.addEventListener("click", () => {
  state.displayDate = new Date(state.displayDate.getFullYear(), state.displayDate.getMonth() + 1, 1);
  render();
});

els.currentMonth.addEventListener("click", () => {
  const featuredArticle = articles.find((article) => article.id === window.dashboardConfig?.featuredArticleId);
  state.displayDate = featuredArticle ? parseDate(featuredArticle.date) : new Date();
  render();
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

els.statusFilter.addEventListener("change", (event) => {
  state.status = event.target.value;
  render();
});

loadArticles().finally(() => {
  state.selectedId = articles[0]?.id || null;
  if (articles[0]) {
    state.displayDate = parseDate(articles[0].date);
  }
  render();
});
