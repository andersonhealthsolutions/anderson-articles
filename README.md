# Articles

A static GitHub Pages dashboard for tracking scheduled blog posts, owners, statuses, and downloadable task files.

## Current Schedule

The dashboard includes the blog calendar from May 28, 2026 through December 21, 2026.

## Easiest Update Option: Google Sheets

This dashboard can work like a custom website while being updated from Google Sheets.

Create a Google Sheet with these columns:

```text
Title,Date,Topic,Owner,Status,Description,Files
```

Use dates in this format:

```text
2026-05-28
```

For downloadable files, use this format in the `Files` cell:

```text
Writer Brief::https://example.com/brief.pdf::PDF | Image Pack::https://example.com/images.zip::ZIP
```

Then publish the sheet as a CSV:

1. In Google Sheets, click **File**.
2. Click **Share**.
3. Click **Publish to web**.
4. Choose the article schedule sheet.
5. Choose **Comma-separated values (.csv)**.
6. Copy the published CSV link.
7. Paste it into `config.js` as `googleSheetCsvUrl`.

If `googleSheetCsvUrl` is blank, the dashboard uses `data/blogs.js`.

## Manual Option: Edit the File

Edit `data/blogs.js` and add each post to `window.blogPosts`.

```js
{
  id: "unique-post-id",
  title: "Article Title",
  topic: "Topic",
  owner: "Team Member",
  date: "2026-06-12",
  status: "Scheduled",
  description: "Short article summary.",
  files: [
    {
      name: "Brief",
      type: "PDF",
      url: "downloads/brief.pdf"
    }
  ]
}
```

## File Downloads

Put downloadable files in the `downloads` folder, then add the matching file path to the post in `data/blogs.js`.

Example:

```js
files: [
  {
    name: "Writer Brief",
    type: "PDF",
    url: "downloads/writer-brief.pdf"
  }
]
```

## GitHub Pages

After you create the repository and upload these files:

1. Open the repository settings.
2. Go to Pages.
3. Choose the main branch and root folder.
4. Save.

GitHub will provide the public dashboard link.

## Easier Hosting Than GitHub

If you do not want to manage GitHub, use Netlify Drop:

1. Go to `https://app.netlify.com/drop`.
2. Drag this whole dashboard folder onto the page.
3. Netlify gives you a live website link.

When you update the Google Sheet, the website content updates without re-uploading the site.
