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
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  articleRows: document.querySelector("#articleRows"),
  resultCount: document.querySelector("#resultCount"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  detailStatus: document.querySelector("#detailStatus"),
  detailOwner: document.querySelector("#detailOwner"),
  detailDate: document.querySelector("#detailDate"),
  detailFiles: document.querySelector("#detailFiles"),
  statScheduled: document.querySelector("#statScheduled"),
  statDraft: document.querySelector("#statDraft"),
  statNeedsFiles: document.querySelector("#statNeedsFiles"),
  nextPostTitle: document.querySelector("#nextPostTitle"),
  nextPostDate: document.querySelector("#nextPostDate"),
  nextPostOwner: document.querySelector("#nextPostOwner"),
  nextPostTopic: document.querySelector("#nextPostTopic"),
  filesReady: document.querySelector("#filesReady"),
  filesNeeded: document.querySelector("#filesNeeded"),
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
        owner: record.owner || "Content Team",
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
    row.type = "button";
    row.addEventListener("click", () => selectArticle(article.id));

    row.innerHTML = `
      <span class="article-card-header">
        <span class="badge" data-status="${article.status}">${article.status}</span>
        <span class="badge">${dateFormatter.format(parseDate(article.date))}</span>
      </span>
      <h3>${article.title}</h3>
      <p>${article.topic}</p>
      <span class="article-meta">
        <span>${article.owner}</span>
        <span>${article.files.length} files</span>
      </span>
    `;

    els.articleRows.appendChild(row);
  });
}

function renderDetail() {
  const selected = articles.find((article) => article.id === state.selectedId) || getFilteredArticles()[0];

  if (!selected) {
    els.detailTitle.textContent = "No article selected";
    els.detailMeta.textContent = "Add scheduled posts to see task details.";
    els.detailStatus.textContent = "-";
    els.detailOwner.textContent = "-";
    els.detailDate.textContent = "-";
    els.detailFiles.innerHTML = "";
    return;
  }

  state.selectedId = selected.id;
  els.detailTitle.textContent = selected.title;
  els.detailMeta.textContent = selected.description;
  els.detailStatus.textContent = selected.status;
  els.detailOwner.textContent = selected.owner;
  els.detailDate.textContent = dateFormatter.format(parseDate(selected.date));
  els.detailFiles.innerHTML = "";

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
  const month = state.displayDate.getMonth();
  const year = state.displayDate.getFullYear();
  const monthlyArticles = articles.filter((article) => {
    const date = parseDate(article.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  els.statScheduled.textContent = monthlyArticles.filter((article) => article.status === "Scheduled").length;
  els.statDraft.textContent = monthlyArticles.filter((article) => article.status === "Drafting").length;
  els.statNeedsFiles.textContent = monthlyArticles.filter((article) => article.status === "Needs Files").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextPost = articles
    .filter((article) => parseDate(article.date) >= today)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0];

  if (nextPost) {
    els.nextPostTitle.textContent = nextPost.title;
    els.nextPostDate.textContent = dateFormatter.format(parseDate(nextPost.date));
    els.nextPostOwner.textContent = nextPost.owner;
    els.nextPostTopic.textContent = nextPost.topic;
  }

  const allFiles = articles.flatMap((article) => article.files);
  els.filesReady.textContent = allFiles.length;
  els.filesNeeded.textContent = `${articles.filter((article) => !article.files.length).length} posts still need files`;
}

function selectArticle(id) {
  const article = articles.find((item) => item.id === id);
  if (!article) return;

  state.selectedId = id;
  state.displayDate = parseDate(article.date);
  render();
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
