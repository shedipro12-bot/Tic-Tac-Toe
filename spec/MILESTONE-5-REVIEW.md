# מסירת אבן דרך 5 — מועמד לגרסה מאוחסנת

סטטוס: המימוש והפרסום ב־HTTPS מוכנים לבדיקה. בדיקות מכשירים ומשתתפים **לא בוצעו**, ולכן אבן הדרך וה־MVP אינם מושלמים או מאושרים עדיין.

## מה נבנה

- Update and reset session ב־Setup, בתוצאה ובהתאוששות בלבד. Settings ממשחק פעיל אינה מאפשרת עדכון.
- אימות מלאי הגרסה המיועדת, הפעלה מוגבלת בזמן, נעילת הבקרות בעת החלפה, ורענון מקומי יחיד בעקבות בחירה. כשל משחרר את הבקרות ומאפשר ניסיון נוסף.
- הפעלה מטאב אחר משמרת לוח, תור מחשב, מונים ומתגים; לאחר תוצאה אפשר לבחור מעבר לגרסה שכבר פעילה.
- בחירה מפורשת גם במעטפת Connection needed. תיקון bootstrap אוטומטי מרענן רק אותה גרסה; גרסה אחרת דורשת בחירה, גם ללא רשת.
- CSP המדויק, nosniff, referrer והרשאות מכשיר; revalidation לקבצים קבועים ו־immutable לנכסי hash בלבד. דף 404 נפרד מבטל fallback של נכסים/API חסרים.
- Node 24.15.0, אימות קובצי הפרסום, שרת אימות סטטי מקומי וסביבת שתי בניות production באותו origin.
- [פרסום ו־rollback](MILESTONE-5-HOSTING.md), [צ׳קליסט מכשירים ושימושיות](MILESTONE-5-DEVICE-CHECKLIST.md).

## בדיקות בפועל — 5 באוקטובר 2026

Node ‏24.15.0, npm ‏11.12.1, Chrome ‏154.0.8037.95 במחשב Windows.

- npm ci מתוך הנעילה עבר; audit דיווח 0 פגיעויות.
- 59/59 בדיקות יחידה ובדיקת הטיפוסים עברו.
- **85/85 בדיקות דפדפן עברו בריצה הסופית:** 69 בדיקות M1–M4 ו־16 בדיקות חדשות, כולל התאוששות מכשל רשת זמני.
- בניות production ואימות PWA/hosting עברו: 29 משאבים ייחודיים; Workbox מדווח 30 עקב רשומת manifest זהה נוספת, המנוכה מהמלאי.
- **12/12 מקרי קבלת offline במחשב עברו שוב**, כולל קשיים, תוצאות, מונים, משוב, אודיו, סגירת תהליך ו־bfcache. הם אינם תחליף ל־64 מקרי המכשירים.
- 13 בדיקות עדכון אמיתיות: הסכמה, לחיצה כפולה, תור אדם/מחשב, Settings, טאבים והסכמה מקבילה, כשל worker-owned בהורדת B, offline, timeout וניסיון חוזר, rollback, חלון מותקן, שגיאת משחק ו־bootstrap חסר.
- שתי בדיקות HTTP/CSP: GET ו־ETag/304 ללא worker; משחק מלא, גופן, שמע אמיתי והודעות worker ללא violations.
- התקנת Chrome בפועל ופתיחת standalone offline נבדקו בפרופיל מבודד והוסרו בסיום. גם עדכון בחלון מותקן נבדק.
- **15 בדיקות ב־HTTPS של Cloudflare עברו בריצות נפרדות:** 8 מקוריות — 3 ב־production, ‏3 ב־preview, עדכון A→B באותו alias ובידוד המקורות; ועוד 7 על המועמד שנבנה מחדש — 3 ב־production, ‏3 ב־preview ובידוד. אלה ריצות נפרדות מ־85 הבדיקות המקומיות.
- בשני המקורות אומתו HTTP/CSP, שלמות המשאבים, ETag/304 ו־404 אמיתי; משחק בכל הקשיים, שמע מקומי ממשי, פתיחה חדשה offline עם HTTP cache מנוטרל והתאוששות ממעטפת עם קוד חסר אחרי חזרת הרשת.
- בעדכון המאוחסן הותקן worker ממתין B; טאב אחר הפעיל אותו בזמן תור מחשב ו־Settings במסמך A. זהות המסמך, המתגים ותור יחיד נשמרו. לאחר תוצאה ובחירה מפורשת כל טאב התרענן פעם אחת ל־B ולברירות המחדל; B נפתחה offline מתגובות worker.
- בדיקת רשת ואחסון בגרסאות המאוחסנות מצאה בקשות לנכסי המשחק מאותו מקור בלבד, ללא violations של CSP ו־localStorage/sessionStorage ריקים. סקירת המימוש מאשרת שאין מסלול שמירת נתוני שחקן ב־IndexedDB או cookies. שני מקורות באותו פרופיל Chrome החזיקו scopes, controllers ומטמונים נפרדים.

התקנה ו־standalone אמיתיים; אירועי background/foreground האוטומטיים מדומים. סביבת Windows זו דיווחה visible גם בחלון ממוזער. בדיקות מחזור חיים פיזיות נשארות בצ׳קליסט. אמולציית viewport ו־Chrome במחשב אינם בדיקות Android/iOS.

בניות מקומיות: A `99cabde6-1971-482b-afa5-cb7b4dd99999`; B `9543c1dd-9177-4b3f-8704-37d902a78ba7`. B הנבדקת נמצאת ב־dist. גם בנייה של אותו commit מקבלת UUID אחר ודורשת ראיות המתאימות לפלט שלה.

## פרסום

נוצר פרויקט Git-integrated בשם **shedipro12-tic-tac-toe**, דרך חיבור GitHub הקיים של הריפו. המועמד הסופי בשני הענפים נבנה מ־commit ‏`e6ca366e281d833c0d424bc51f39aa4aa6b3e470`; קוד המשחק זהה ל־`1c08320`, שבו נבדק העדכון. העלאת תיעוד וראיות הפעילה בנייה מחדש; כללי ההחרגה תוקנו ונוספו בדיקות לפלט החדש. ב־5 באוקטובר 2026 הועבר Milestone 5 גם לענף main בהתקדמות ישירה (fast-forward), בהתאם לבקשת המפתח להעלות לגיטהאב. ההעלאה כוללת את הקוד, התיעוד והראיות; היא אינה תוצאת בדיקות מכשירים או שימושיות. ענף production ב־Cloudflare נשאר `codex/milestone-5`.

המועמד הסופי: production ב־https://shedipro12-tic-tac-toe.pages.dev/, כתובת קבועה https://cfc873f2.shedipro12-tic-tac-toe.pages.dev/, deployment ‏`cfc873f2-84d8-488d-aa26-0d87435bcc62`, build ‏`1c619dd8-91ac-4e34-9ec9-58febff546d7`. preview באותו alias להלן, כתובת קבועה https://b9ac0ab4.shedipro12-tic-tac-toe.pages.dev/, deployment ‏`b9ac0ab4-3eed-425a-b43c-245e0aa04759`, build ‏`d9abcf1e-8f48-410b-8177-2ed8f1106ca3`. שבע בדיקות smoke/isolation עברו על הפלט הזה.

הפלטים המקוריים שנבדקו מ־`1c08320`, כולל מעבר A→B:

- **האתר הראשי:** https://shedipro12-tic-tac-toe.pages.dev/ — ענף production הוא `codex/milestone-5`. הכתובת הקבועה שנבדקה: https://e2506ecc.shedipro12-tic-tac-toe.pages.dev/; deployment ‏`e2506ecc-fa18-4bb0-bd29-33761cbd87c7`; build ‏`b24090c6-111f-4c34-9f61-e9445c4a2681`.
- **preview:** https://codex-milestone-5-preview.shedipro12-tic-tac-toe.pages.dev/ — ענף `codex/milestone-5-preview`. A: deployment ‏`9cdd498f-e6b3-46dc-b7f3-e94e8b7d3cf1`, כתובת https://9cdd498f.shedipro12-tic-tac-toe.pages.dev/, build ‏`3e50a7bb-1612-4bf6-ad0e-9276ddbd381d`. B: deployment ‏`de2bfb72-1790-4328-9463-82db21fb8a7a`, כתובת https://de2bfb72.shedipro12-tic-tac-toe.pages.dev/, build ‏`c2061300-a488-4d68-878f-7d260440cbf8`.

בדיקת העדכון השתמשה באותו alias לכל המעבר; הכתובות הקבועות מתעדות פלט בלבד. Preview B נבנתה שוב מאותו commit; יומן הבנייה מאשר Node ‏24.15.0, npm ‏11.12.1, ‏59 בדיקות יחידה ואימותי טיפוסים/PWA/hosting. פרטי ההגדרות וה־rollback נמצאים במסמך הפרסום.

## ראיות ובדיקה מקומית

המשחק רץ ב־http://127.0.0.1:4173. התצוגה משתמשת ב־dist ובכותרות ההכנה ל־Pages. הצעת עדכון מופיעה רק כשקיימת גרסה מוכנה אחרת.

ראיות ב־`artifacts/milestone-5/`: הצעת עדכון ב־Setup ובתוצאה, שני טאבים, ניסיון חוזר, חלון מותקן, התאוששות משחק ו־bootstrap. `update-report.json` מכיל מזהי builds ותוצאות; `local-http-report.json` מכיל כותרות HTTP; `offline-resource-report.json` ו־`installation-report.json` מתעדים משאבים והתקנה. צילומי הנסיגה כוללים את כל המסכים והמצבים. ראיות M1–M4 נשמרו במקומן; הדוח האחרון נמצא גם ב־playwright-report.

ראיות פרסום באותה תיקייה: `hosted-production-{http,game,bootstrap}.json` ו־`hosted-preview-{http,game,bootstrap}.json` מתעדים את הפלטים המקוריים. `hosted-final-production-{http,game,bootstrap}.json` ו־`hosted-final-preview-{http,game,bootstrap}.json` וצילומי offline מתעדים את המועמד הסופי. בנוסף: `hosted-update-report.json` ושני צילומי המעבר, ‏`hosted-origin-isolation.json` מהבדיקה הסופית, ‏`hosting-deployment.json` וצילום האתר `published-game.jpg`. ‏`hosted-update-stage-a.json` הוא תיעוד ביניים של שמירת A; דוח העדכון הסופי מוכיח את המעבר. הדוחות מכילים מקור, זמן ומזהה בנייה שנמדדו בפועל.

לשחזור: `npm ci`, ‏`npm test`, ‏`npm run test:e2e`. הפקודה האחרונה בודקת טיפוסים, מכינה שתי בניות עם אימותי PWA/hosting ומריצה את הדפדפן. `npm run build` בונה מועמד יחיד; `npm run preview` מפעיל תצוגה מקומית. בדיקות התקנה דורשות desktop session ו־Chrome מותקן. פקודות בדיקת HTTPS ב־README משתמשות ב־`playwright.hosted.config.ts`; בדיקת עדכון חיה דורשת בנייה שנייה של preview בזמן הריצה.

לבדיקה ידנית: להתחיל משחק, לשנות מתגים, לסיים תוצאה ולנסות Play Again ו־Restart. להמתין ל־Ready to play offline לפני ניתוק ופתיחה חדשה. סביבת A/B מתועדת ב־README; צילומי ההצעה מציגים את מסך העדכון.

## תנאי סיום ופערים

- [x] production ו־preview ב־HTTPS, מ־GitHub, עם מקורות מבודדים וכותרות מאומתות.
- [x] שני builds, waiting ובחירה מקומית עם איפוס מלא — נבדקו מקומית וב־alias HTTPS.
- [x] שמירת משחק בהפעלה מטאב אחר וכשל הכנת עדכון — בדיקות מקומיות עברו; שמירת המשחק נבדקה גם בעדכון המאוחסן.
- [ ] Android Chrome ו־iOS Safari, נוכחי וקודם, דפדפן ומותקן — טרם בוצעו 8 הסביבות.
- [ ] offline במכשירים: עברו ___/64; כל 64 המקרים עדיין לא בוצעו.
- [ ] שימושיות: הצליחו ___/10; אף משתתף עדיין לא נבדק. נדרשות לפחות 9 הצלחות ללא עזרה.
- [x] פרטיות וכותרות ב־HTTPS — רשת, אחסון, CSP וכותרות מאוחסנות נבדקו ב־production וב־preview.
- [x] בדיקות אוטומטיות, בנייה, תצוגה מקומית וראיות למסירה.
- [ ] ביקורת ואישור מפורש של המפתח לאבן הדרך ול־MVP.

חוקים, הסתברויות, 400ms, מונים, חוזי איפוס ומשוב נשמרו. אין telemetry, חשבון, backend או נתוני משחק קבועים. יש להשלים ולתעד תוצאות מכשירים ושימושיות לפני אישור; אין להסיק אישור מבדיקות אוטומטיות או מהיעדר תגובה.
