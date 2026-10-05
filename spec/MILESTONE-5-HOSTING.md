# פרסום ו־rollback — אבן דרך 5

## מצב בפועל

המפתח בחר בפרויקט Cloudflare Pages **חדש**. נוצר פרויקט **shedipro12-tic-tac-toe** באמצעות חיבור GitHub הקיים. production ו־preview נבנו ופורסמו; בדיקות HTTPS, כותרות, משחק, offline, התאוששות ועדכון באותו alias עברו. לא נוצר token בקוד ולא נרשמו סודות בריפו.

הריפו: https://github.com/shedipro12-bot/Tic-Tac-Toe. ענף production שנבחר הוא `codex/milestone-5`; ענף הבדיקה הוא `codex/milestone-5-preview`. ב־5 באוקטובר 2026, בעקבות בקשת המפתח להעלות לגיטהאב, הועבר המועמד גם ל־main בהתקדמות ישירה (fast-forward), יחד עם הקוד, התיעוד והראיות. ענף הפרסום ב־Cloudflare עדיין `codex/milestone-5`; מעבר לפרסום מתוך main מחייב בחירת הענף בהגדרות Pages ובדיקת הפלט. בדיקות מכשירים ושימושיות נשארות פתוחות.

## המועמדים שנבדקו — 5 באוקטובר 2026

המועמד הסופי נבנה מ־commit ‏`e6ca366e281d833c0d424bc51f39aa4aa6b3e470`, הכולל את אותו קוד משחק כמו `1c08320` יחד עם תיעוד וראיות:

- production: https://shedipro12-tic-tac-toe.pages.dev/; כתובת קבועה https://cfc873f2.shedipro12-tic-tac-toe.pages.dev/; deployment ID ‏`cfc873f2-84d8-488d-aa26-0d87435bcc62`; buildId ‏`1c619dd8-91ac-4e34-9ec9-58febff546d7`.
- preview באותו alias להלן: כתובת קבועה https://b9ac0ab4.shedipro12-tic-tac-toe.pages.dev/; deployment ID ‏`b9ac0ab4-3eed-425a-b43c-245e0aa04759`; buildId ‏`d9abcf1e-8f48-410b-8177-2ed8f1106ca3`.

על הפלט הסופי עברו עוד 7 בדיקות HTTPS של משחק, offline, HTTP/CSP, התאוששות ובידוד. שלוש הבניות המקוריות להלן מכילות קוד מ־commit ‏`1c083200b1be8264a88a57101b4772854917262f`, והן ראיות נפרדות לשמונה הבדיקות המקוריות ולמעבר A→B. UUID בנייה משתנה גם בבנייה חוזרת של אותו commit.

- production: https://shedipro12-tic-tac-toe.pages.dev/; כתובת קבועה https://e2506ecc.shedipro12-tic-tac-toe.pages.dev/; deployment ID ‏`e2506ecc-fa18-4bb0-bd29-33761cbd87c7`; buildId ‏`b24090c6-111f-4c34-9f61-e9445c4a2681`.
- preview A: כתובת קבועה https://9cdd498f.shedipro12-tic-tac-toe.pages.dev/; deployment ID ‏`9cdd498f-e6b3-46dc-b7f3-e94e8b7d3cf1`; buildId ‏`3e50a7bb-1612-4bf6-ad0e-9276ddbd381d`.
- preview B: כתובת קבועה https://de2bfb72.shedipro12-tic-tac-toe.pages.dev/; deployment ID ‏`de2bfb72-1790-4328-9463-82db21fb8a7a`; buildId ‏`c2061300-a488-4d68-878f-7d260440cbf8`.

בדיקת A→B בוצעה כולה ב־https://codex-milestone-5-preview.shedipro12-tic-tac-toe.pages.dev/ באמצעות Retry deployment של ענף preview. לא עברנו בין כתובות hash ולא מחקנו cache/registration כדי לדמות עדכון. בדיקות smoke נפרדות בוצעו ב־production וב־preview B; בדיקת בידוד בדקה את שני המקורות באותו פרופיל. התוצאות ב־[מסמך המסירה](MILESTONE-5-REVIEW.md) וב־`artifacts/milestone-5/hosted-*.json`.

## הגדרות הבנייה

- Framework preset: None; root: שורש הריפו; output: `dist`.
- Build command הנוכחי: `node --version && npm --version && npm ci && npm test && npm run build`. פלט production הנבדק נבנה באותן בדיקות באמצעות הפקודה ללא שתי הדפסות הגרסה; הדפסות נוספו לפני preview B.
- Node: ‏24.15.0 דרך `.node-version`, זהה לבדיקה המקומית. יומן preview B מאשר בפועל Node ‏24.15.0 ו־npm ‏11.12.1 לאחר בחירת Node.
- משתנה סביבה `SKIP_DEPENDENCY_INSTALL=1` ב־preview וב־production: ההתקנה נעשית ב־npm ci מתוך הנעילה.
- production deployments אוטומטיים עבור `codex/milestone-5`; preview deployments עבור ענפים אחרים לפי ברירת המחדל. ענף הבדיקה שנוצר הוא `codex/milestone-5-preview`.
- Build system: Version 3; build cache: Disabled; build comments: Disabled.
- Build watch paths: include `*`; exclude `spec/*`, ‏`artifacts/*`, ‏`README.md`. הגדרת `**` הקודמת לא מנעה בנייה בעקבות התיעוד ולכן תוקנה לתחביר המתועד. לפי [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/), כוכבית יחידה כוללת גם תיקיות מקוננות. מטרת הכללים היא לשמר פלט שנבדק בעת העלאת תיעוד בלבד; יש לוודא buildId לאחר push. שינוי קוד ממשיך להפעיל בנייה, וב־commit מעורב תידרש בדיקה למזהה החדש.
- חיבור GitHub הקיים כבר כלל גישה לריפו. לא ניתנה הרשאה חדשה דרך האוטומציה.
- ללא Functions, Web Analytics, תוספי משחק, שירותי AI או משתני סביבה סודיים לאפליקציה.

לפני שינוי ענף production או push עם שינוי קוד יש לבדוק איזה commit יפורסם אוטומטית. פרסום המועמד אינו אישור למיזוג או להשלמת ה־MVP; בדיקות מכשירים ושימושיות והביקורת הסופית עדיין פתוחות.

## קבצים והגנות

`public/_headers` מועתק ל־dist ומגדיר את CSP המדויק מהארכיטקטורה, nosniff, Referrer-Policy ו־Permissions-Policy. רק `/assets/*` מכיל נכסים עם hash ומקבל immutable לשנה; מסמך, worker, עזריו, manifest, מלאי, metadata, אייקונים, טקסטורות וצלילים עוברים revalidation. אין חפיפה בין כללי Cache-Control.

`404.html` בשורש מונע את fallback ה־SPA של Pages. נכס חסר ו־`/api/*` צריכים להחזיר status 404 ודף שונה ממעטפת המשחק. HTML עם 404 מותר; HTML המתחזה ל־JS/MP3 עם 200 אינו מותר.

`npm run build` מאמת את ההעתקה, CSP, שמות הנכסים, המלאי וה־404. `npm run preview` הוא שרת אימות מקומי בלבד, המחיל את הכללים בפועל כדי לבדוק CSP בדפדפן. הוא אינו שרת production ואינו מוכיח התנהגות של Cloudflare.

## נוהל אימות בפרסום הבא

יש לרשום: שם פרויקט, כתובת deployment, alias ענף, commit, מזהה deployment, buildId מ־`/precache-inventory.json`, גרסת Node/npm בפלט הבנייה ותאריך. UUID בנייה משתנה גם עבור אותו commit.

1. בחיבור נקי ללא worker, לבדוק GET של `/`, manifest, worker, קובץ sw-support, JS, CSS, גופן, SVG, PNG ו־MP3: status, סוג תוכן, כל כותרות האבטחה ומדיניות המטמון. לבדוק ETag/304 אם נתמך.
2. לבדוק 404 של `/assets/missing.js`, `/sounds/missing.mp3`, `/api/missing` ונתיב חסר; אין מעטפת משחק ואין status 200.
3. לבדוק משחק מלא, Settings, שמע, גופן, manifest ורישום worker תחת CSP, בלי violations.
4. לשמור A בשלמותה באותו alias, לפרסם B לאותו alias ולוודא שהמארח מגיש buildId חדש. אין למחוק registration/cache כדי לדמות עדכון.
5. לבדוק waiting ב־Setup, הסתרה במשחק/Settings ממשחק, בחירה לאחר תוצאה ואיפוס מלא. טאב אחר וחלון מותקן נשארים באותו מסמך כש־B מופעלת מבחוץ; רק הבחירה המקומית מרעננת.
6. לנתק רשת אחרי הכנת B, לבחור עדכון ולפתוח מסמך חדש offline. מקור התגובות חייב להיות ה־worker, עם HTTP cache מנוטרל היכן שניתן.
7. לבדוק ש־preview ו־production הם origins שונים עם registrations ו־caches נפרדים. בדיקת המכשירים והשימושיות מתבצעת על המועמד המדויק לפי הצ׳קליסט.

בכל פרסום חדש יש לוודא שה־commit הרצוי בענף production, ולבדוק מחדש HTTPS, headers, משחק ו־offline ב־origin של production. אין להעתיק תוצאת preview כאילו נמדדה ב־production. במסירה זו בוצעו בדיקות נפרדות בשני המקורות.

## rollback

לרשום מראש deployment תקין קודם. אם השחרור נכשל, לבחור את אפשרות ה־rollback של Pages ל־deployment המתאים ולוודא את buildId המוגש. חזרה לגרסה קודמת היא עדכון נוסף לאפליקציה: היא ממתינה להסכמת המשתמש באותו חוזה; אין force reload לטאבים משחקים ואין מחיקה של caches זרים. בבדיקה המקומית נבדקת גם החלפה B→A באותו origin.

יש לשמור commit/build/deployment/כתובת/זמן וראיות לכל מעבר. אחרי תיקון או rollback לבדוק שוב את הכותרות, המשחק ופתיחה offline, ולהשאיר את השחרור לא מאושר עד לביקורת המפתח.

מקורות תפעול: [Build image](https://developers.cloudflare.com/pages/configuration/build-image/), [Headers](https://developers.cloudflare.com/pages/configuration/headers/), [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/). יש לאמת את הגדרות החשבון מול הממשק בעת החיבור.
