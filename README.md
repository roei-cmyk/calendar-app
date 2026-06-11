# KNBL Content Planner

לוח תוכן (Content Calendar) לניהול פרסומים ללקוחות KNBL.
Next.js 14 · Supabase · Tailwind CSS · TypeScript · RTL Hebrew · Inter font.

## תכונות

- **מנהל (Admin):** רואה את כל הלקוחות, יוצר/עורך/מוחק פוסטים.
- **לקוח (Client):** רואה רק את היומן שלו ויכול להוסיף תגובות.
- **3 תצוגות:** יום / שבוע / חודש.
- **גרירה ושחרור (drag & drop):** המנהל גורר פוסט בין ימים בתצוגת חודש/שבוע — התאריך מתעדכן מיידית (עדכון אופטימי + שמירה ל-DB).
- **מונה תגובות:** כרטיס הפוסט מציג 💬 עם מספר התגובות.
- **סינון לפי סטטוס:** סינון מהיר של היומן לפי סטטוס הפוסט.
- ממשק מימין-לשמאל (RTL) בעברית, צבע ייעודי לכל לקוח.

## לקוחות וצבעים

| לקוח | צבע |
|------|-----|
| כלכלית לוד | `#027a48` |
| ספארי רמת גן | `#3f6212` |
| קרטרס | `#be123c` |
| סקיפ הופ | `#92400e` |
| רולדין | `#9a3412` |
| קריית המוזיאונים פ"ת | `#4c1d95` |

## הקמה (Setup)

### 1. התקנת חבילות
```bash
npm install
```

### 2. הגדרת Supabase
1. צרו פרויקט ב-[Supabase](https://supabase.com).
2. ב-`.env.local` מלאו את `NEXT_PUBLIC_SUPABASE_URL` (מתוך Project Settings → Data API).
   המפתח הציבורי (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) כבר מוגדר.
3. עבור הזרעת משתמשים מלאו גם `SUPABASE_SECRET_KEY` (Project Settings → API keys → secret).

### 3. יצירת הטבלאות
פתחו את **SQL Editor** ב-Supabase והריצו את התוכן של:
```
supabase/schema.sql
```
זה יוצר את הטבלאות (`clients`, `profiles`, `posts`, `comments`), מדיניות RLS,
טריגרים, ומזריע את 6 הלקוחות.

### 4. הזרעת משתמשים (אופציונלי)
יוצר משתמש מנהל ומשתמש אחד לכל לקוח:
```bash
node scripts/seed-users.mjs
```
- מנהל: `admin@knbl.test`
- לקוחות: `kalkalit@knbl.test`, `safari@knbl.test`, `carters@knbl.test`,
  `skiphop@knbl.test`, `roladin@knbl.test`, `museums@knbl.test`
- סיסמה לכולם: `Knbl2026!`

### 5. הרצה
```bash
npm run dev
```
פתחו http://localhost:3000

## מבנה הפרויקט

```
src/
├── app/
│   ├── layout.tsx           # שורש RTL + פונט Inter
│   ├── page.tsx             # דשבורד (טוען פרופיל → Planner)
│   ├── login/               # התחברות (Server Actions)
│   └── globals.css
├── components/
│   ├── Planner.tsx          # מעטפת ראשית: ניווט, סרגל צד, מתג תצוגות
│   ├── PostCard.tsx         # צ'יפ פוסט צבוע לפי לקוח
│   ├── PostModal.tsx        # עריכה (מנהל) / צפייה + תגובות (לקוח)
│   └── calendar/            # MonthView · WeekView · DayView
├── lib/
│   ├── supabase/            # client / server / middleware clients
│   ├── auth.ts              # getSessionContext (profile + clients)
│   ├── posts.ts             # CRUD לפוסטים ותגובות
│   ├── date.ts              # עזרי תאריך (RTL, שבוע מתחיל ביום א')
│   └── types.ts
├── middleware.ts            # רענון סשן + הגנת נתיבים
supabase/schema.sql          # סכימה + RLS + הזרעת לקוחות
scripts/seed-users.mjs       # הזרעת משתמשים
```

## הרשאות (RLS)

מדיניות אבטחה ברמת השורה נאכפת ב-DB:
- מנהל: גישה מלאה לכל הטבלאות.
- לקוח: קריאה בלבד של הלקוח/הפוסטים שלו; הוספת תגובות לפוסטים שלו בלבד.
