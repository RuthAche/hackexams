# Hack Exams · hackexams.co.uk

Short GCSE revision videos with quick quizzes. Students pick an exam board, then a subject, then watch and test themselves.

## Adding videos
1. Upload each video to YouTube as a Short (3 minutes or less) and to TikTok.
2. Open **hackexams.co.uk/manage.html**, paste the links (for example `P1-01 https://youtube.com/shorts/…`), then press **Download videos.json**.
3. Upload that file here (**Add file → Upload files**) and commit. The site updates in about a minute.

## Files
- `index.html`, `style.css`, `app.js`: the site
- `videos.json`: every video, with its key words, quiz and links
- `manage.html`: the easy editor for `videos.json`
- `manifest.webmanifest`, `sw.js`, `icons/`: make the site installable as a phone app
- `og.png`: the picture shown when the link is shared
- `CNAME`: points the site at hackexams.co.uk
