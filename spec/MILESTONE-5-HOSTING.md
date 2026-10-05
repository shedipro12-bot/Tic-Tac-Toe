# פרסום ו־rollback — אבן דרך 5

## מצב בפועל

המפתח בחר בפרויקט Cloudflare Pages **חדש**. החשבון מחובר, חיבור GitHub זמין והריפו נבחר בטופס הבנייה. עדיין אין deployment או כתובת HTTPS מאומתים. לא נוצר token בקוד ולא נרשמו סודות בריפו.

הריפו: https://github.com/shedipro12-bot/Tic-Tac-Toe. ענף המימוש המקומי: `codex/milestone-5`. ענף production המוצע: `main`; יש לאמת את הבחירה לפני החיבור. השם המוצע לפרויקט: `tic-tac-toe`, בכפוף לזמינות בחשבון. פרויקט Pages המחובר ל־GitHub אינו ניתן להחלפה מאוחרת לפרויקט Direct Upload; יש לבחור Git integration כדי לממש את התוכנית.

## הגדרות הבנייה

- Framework preset: None; root: שורש הריפו; output: `dist`.
- Build command: `npm ci && npm test && npm run build`.
- Node: ‏24.15.0 דרך `.node-version`, זהה לבדיקה המקומית.
- משתנה סביבה `SKIP_DEPENDENCY_INSTALL=1` ב־preview וב־production: ההתקנה נעשית ב־npm ci מתוך הנעילה.
- production לפי הענף שנבחר; preview עבור `codex/milestone-5`. למועמד משתמשים בכתובת deployment קבועה; לבדיקת עדכון משתמשים באותו alias של ענף בשתי הבניות.
- לבחור הרשאת GitHub לריפו זה בלבד אם נדרש חיבור חדש. הרשאה חדשה נבדקת מול המסך בפועל לפני אישורה.
- ללא Functions, Web Analytics, תוספי משחק, שירותי AI או משתני סביבה סודיים לאפליקציה.

חיבור ראשוני ל־main עשוי לפרסם אוטומטית את הקוד הנמצא שם. יש לבדוק איזה commit יפורסם לפני יצירת הפרויקט. המועמד המקומי אינו ב־main כרגע; פרסום preview אינו אישור למיזוג או להשלמת ה־MVP.

## קבצים והגנות

`public/_headers` מועתק ל־dist ומגדיר את CSP המדויק מהארכיטקטורה, nosniff, Referrer-Policy ו־Permissions-Policy. רק `/assets/*` מכיל נכסים עם hash ומקבל immutable לשנה; מסמך, worker, עזריו, manifest, מלאי, metadata, אייקונים, טקסטורות וצלילים עוברים revalidation. אין חפיפה בין כללי Cache-Control.

`404.html` בשורש מונע את fallback ה־SPA של Pages. נכס חסר ו־`/api/*` צריכים להחזיר status 404 ודף שונה ממעטפת המשחק. HTML עם 404 מותר; HTML המתחזה ל־JS/MP3 עם 200 אינו מותר.

`npm run build` מאמת את ההעתקה, CSP, שמות הנכסים, המלאי וה־404. `npm run preview` הוא שרת אימות מקומי בלבד, המחיל את הכללים בפועל כדי לבדוק CSP בדפדפן. הוא אינו שרת production ואינו מוכיח התנהגות של Cloudflare.

## אימות לאחר פרסום preview

יש לרשום: שם פרויקט, כתובת deployment, alias ענף, commit, מזהה deployment, buildId מ־`/precache-inventory.json`, גרסת Node/npm בפלט הבנייה ותאריך. UUID בנייה משתנה גם עבור אותו commit.

1. בחיבור נקי ללא worker, לבדוק GET של `/`, manifest, worker, קובץ sw-support, JS, CSS, גופן, SVG, PNG ו־MP3: status, סוג תוכן, כל כותרות האבטחה ומדיניות המטמון. לבדוק ETag/304 אם נתמך.
2. לבדוק 404 של `/assets/missing.js`, `/sounds/missing.mp3`, `/api/missing` ונתיב חסר; אין מעטפת משחק ואין status 200.
3. לבדוק משחק מלא, Settings, שמע, גופן, manifest ורישום worker תחת CSP, בלי violations.
4. לשמור A בשלמותה באותו alias, לפרסם B לאותו alias ולוודא שהמארח מגיש buildId חדש. אין למחוק registration/cache כדי לדמות עדכון.
5. לבדוק waiting ב־Setup, הסתרה במשחק/Settings ממשחק, בחירה לאחר תוצאה ואיפוס מלא. טאב אחר וחלון מותקן נשארים באותו מסמך כש־B מופעלת מבחוץ; רק הבחירה המקומית מרעננת.
6. לנתק רשת אחרי הכנת B, לבחור עדכון ולפתוח מסמך חדש offline. מקור התגובות חייב להיות ה־worker, עם HTTP cache מנוטרל היכן שניתן.
7. לבדוק ש־preview ו־production הם origins שונים עם registrations ו־caches נפרדים. בדיקת המכשירים והשימושיות מתבצעת על המועמד המדויק לפי הצ׳קליסט.

לאחר אישור הפרסום, יש לוודא שה־commit הרצוי בענף production, לפרסם ולאמת מחדש HTTPS, headers, משחק ו־offline ב־origin של production. אין להעתיק תוצאת preview כאילו נמדדה ב־production.

## rollback

לרשום מראש deployment תקין קודם. אם השחרור נכשל, לבחור את אפשרות ה־rollback של Pages ל־deployment המתאים ולוודא את buildId המוגש. חזרה לגרסה קודמת היא עדכון נוסף לאפליקציה: היא ממתינה להסכמת המשתמש באותו חוזה; אין force reload לטאבים משחקים ואין מחיקה של caches זרים. בבדיקה המקומית נבדקת גם החלפה B→A באותו origin.

יש לשמור commit/build/deployment/כתובת/זמן וראיות לכל מעבר. אחרי תיקון או rollback לבדוק שוב את הכותרות, המשחק ופתיחה offline, ולהשאיר את השחרור לא מאושר עד לביקורת המפתח.

מקורות תפעול: [Build image](https://developers.cloudflare.com/pages/configuration/build-image/), [Headers](https://developers.cloudflare.com/pages/configuration/headers/), [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/). יש לאמת את הגדרות החשבון מול הממשק בעת החיבור.
