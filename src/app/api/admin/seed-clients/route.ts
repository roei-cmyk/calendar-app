import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const PROFILES: Record<string, {
  business_description: string;
  target_audience: string;
  competitors: string;
  tone: string;
  design_notes: string;
  content_pillars: { name: string; percentage: number }[];
  social_channels: { platform: string; posts_per_week: number }[];
  website_url: string;
  instagram_handle: string | null;
  facebook_url: string | null;
}> = {
  "כלכלית לוד": {
    business_description: "חברה עירונית לפיתוח לוד. מובילה שכונות חדשות — הרובע הבינלאומי (11,350 יח״ד), נופי בן שמן, לודקיישן — עם 12 מיליארד ₪ השקעה ממשלתית. רכבת 10 דקות לתל אביב. חולמים יוזמים מבצעים.",
    target_audience: "משפחות צעירות ורוכשי דירה ראשונה, ציבור דתי-לאומי וחילוני, גרעיני התיישבות, זכאי מחיר למשתכן, אוכלוסייה צבאית ומשפחות מורחבות.",
    competitors: "ערי פריפריה מתחרות בגוש דן (ראשון לציון, נס ציונה), פרויקטי מחיר למשתכן אחרים, ערים מתחדשות בפריפריה הקרובה.",
    tone: "גאווה עירונית חמה. לא ממשלתי, לא פרסומי — כמו ראש עיר נלהב. כל הכרזה = חג לעיר. שפה כוללת ומעצימה.",
    design_notes: "כחול-לבן עם אקסנטים חמים. תמונות משפחות ומרחבי ירוק. אינפוגרפיקות עם מספרים גדולים. סגנון דינמי ואופטימי. סרטוני ריאלס אמוציונליים.",
    content_pillars: [
      { name: "הכרזות מיילסטון ושכונות", percentage: 35 },
      { name: "סיפורי משפחות וקהילה", percentage: 25 },
      { name: "נתונים ואינפוגרפיקות צמיחה", percentage: 20 },
      { name: "תרבות, אירועים ולאום", percentage: 20 },
    ],
    social_channels: [
      { platform: "facebook", posts_per_week: 4 },
      { platform: "instagram", posts_per_week: 3 },
    ],
    website_url: "https://calcalitlod.co.il/",
    instagram_handle: null,
    facebook_url: "https://www.facebook.com/calcalitlod",
  },

  "ספארי רמת גן": {
    business_description: "אוסף החיות הגדול ביותר במזרח התיכון — 1,550 בעלי חיים ממעל 200 מינים על 250 דונם. פורמט ייחודי: ספארי נסיעה + גן חיות רגיל. בית חולים לחיות בר המטפל ב-2,000+ בעלי חיים בשנה.",
    target_audience: "משפחות עם ילדים (עיקרי), מוסדות חינוך, זוגות ובוגרים לסיורי ערב ולילה, קבוצות תאגידיות לגיבוש, תיירים.",
    competitors: "גן החיות התנ״כי ירושלים, פארקי אטרקציות משפחתיות (לונה פארק, ענבל), אטרקציות טבע ישראליות.",
    tone: "חם, משפחתי, מרגש. חיבור רגשי עמוק לבעלי חיים ולשימור הטבע. כל לידת חיה = חדשות. אנרגיה של הרפתקה ותגלית.",
    design_notes: "צבעי אדמה וטבע — ירוק, חום, כתום. תמונות קרובות ודרמטיות של בעלי חיים. גורים ולידות חדשות = תוכן ויראלי. ריאלס עם תנועה ורגש.",
    content_pillars: [
      { name: "לידות חיות וסיפורי טבע", percentage: 35 },
      { name: "חוויות ביקור וסיורים", percentage: 25 },
      { name: "שימור טבע ובית החולים", percentage: 20 },
      { name: "אירועים עונתיים וחגים", percentage: 20 },
    ],
    social_channels: [
      { platform: "instagram", posts_per_week: 5 },
      { platform: "facebook", posts_per_week: 4 },
    ],
    website_url: "https://www.safari.co.il/",
    instagram_handle: "safari_israel",
    facebook_url: "https://www.facebook.com/Safari.Israel",
  },

  "סקיפ הופ מבית H AND O": {
    business_description: "מותג ציוד תינוקות ופעוטות פרימיום מבית קרטרס, נמכר בישראל דרך H&O Kids. מתמחה בתיקי חיתולים, מרכזי פעילות, מוצרי אמבטיה, כלי אכילה וצעצועי התפתחות. 'Must-Haves Made Better'.",
    target_audience: "הורים לתינוקות 0-18 חודש, בוני רשימות מתנה לברית ולמקלחת לתינוק, הורי ילדי גן לתיקים ובקבוקים. הורים שמודעים לעיצוב ורוצים מוצרים שנראים טוב ועובדים טוב.",
    competitors: "שילב, פוקס בייבי, מאמא אנד מי, בייבי קיי — סקיפ הופ מתמקם מעליהם בעיצוב ובאיכות.",
    tone: "מודרני, עיצובי, תפקודי-שאפתני. מדבר להורים שגאים בבחירותיהם האסתטיות. לא ילדותי — נגיש ומלוטש.",
    design_notes: "פלטת צבעים נקייה ומינימליסטית. תמונות חדרי תינוקות מודרניים. עיצוב מול תפקוד — הראה איך המוצר עובד. צילום אורח חיים על רקע בית מסודר.",
    content_pillars: [
      { name: "מיילסטונים התפתחותיים ומוצר", percentage: 35 },
      { name: "מדריכי רישום ורשימות מתנה", percentage: 25 },
      { name: "סגנון חיים ועיצוב חדר תינוק", percentage: 20 },
      { name: "עונת גן — תיקים, בקבוקים, קופסאות", percentage: 20 },
    ],
    social_channels: [
      { platform: "instagram", posts_per_week: 5 },
      { platform: "facebook", posts_per_week: 3 },
    ],
    website_url: "https://www.cartersoshkosh.co.il/",
    instagram_handle: "skiphopisrael",
    facebook_url: null,
  },

  "קרטרס מבית H AND O": {
    business_description: "מותג הלבשת תינוקות וילדים הגדול בעולם, נמכר בישראל דרך H&O Kids. 150+ שנות היסטוריה, מגוון מלידה עד גיל 8. 'שילוב ייחודי של איכות, עיצוב ומחיר שלא קיים בישראל'.",
    target_audience: "הורים ישראלים לילדים 0-8, מביאי מתנות לברית/יום הולדת/חגים, הורי ילדי גן א', רוכשי קיץ וחזרה ללימודים. דור Z ומילניאלים צעירים כהורים חדשים.",
    competitors: "פוקס בייבי, גולף קידס, קיווי, קסטרו קידס, דלתא — קרטרס מתמקם מעל רובם בשילוב איכות+מחיר.",
    tone: "חם, חגיגי, קצת שובב. עברית עם שמות המותג באנגלית. חיבור רגשי למיילסטונים ישראליים — ברית, גן ראשון, חגים.",
    design_notes: "צבעים עזים ומודפסים חמודים. תמונות תינוקות ופעוטות בלבוש. מוצרים באורח חיים — לא רק פלאט לי. עיצוב אמריקאי נגיש עם טאץ׳ ישראלי.",
    content_pillars: [
      { name: "קולקציות ומוצרים חדשים", percentage: 30 },
      { name: "חגים ואירועי חיים ישראליים", percentage: 30 },
      { name: "מדריכי מתנות ורשימות", percentage: 20 },
      { name: "חזרה לגן ולבית הספר", percentage: 20 },
    ],
    social_channels: [
      { platform: "facebook", posts_per_week: 4 },
      { platform: "instagram", posts_per_week: 4 },
    ],
    website_url: "https://www.cartersoshkosh.co.il/",
    instagram_handle: "cartersisrael",
    facebook_url: "https://www.facebook.com/Carters.OshKosh.ISRAEL.Baby.Kids",
  },

  "קריית המוזיאונים פתח תקווה": {
    business_description: "קומפלקס תרבות-מורשת-טבע ייחודי בפתח תקווה — אמנות עכשווית, היסטוריה, גן חיות עירוני, תיאטרון, חוגי אמנות ותוכניות חינוך. לב הפעילות התרבותית של 'אם המושבות'.",
    target_audience: "משפחות עם ילדים 2-12, מוסדות חינוך (גנים ובתי ספר), מבוגרים לגלריות ומרכז אמנויות, קהל כללי לאירועים עונתיים. תושבי פתח תקווה וגוש דן.",
    competitors: "מוזיאון תל אביב, מוזיאון ראשון לציון, מרכזי תרבות עירוניים, פארקים ואטרקציות משפחתיות בגוש דן.",
    tone: "חם, סקרן, נגיש. לא אליטיסטי — המוזיאון שייך לכולם. שפה כוללת בין עולם האמנות לעולם הקהילה. עברית ישירה ומזמינה.",
    design_notes: "עיצוב אמנותי עם נגיעות עכשוויות. הפלטה משתנה לפי תערוכה. תמונות מאחורי הקלעים, תיעוד אמנים בעבודה, יצירות ילדים מהחוגים.",
    content_pillars: [
      { name: "תערוכות ואמנים", percentage: 30 },
      { name: "משפחה וילדים — חוגים ואירועים", percentage: 30 },
      { name: "מאחורי הקלעים", percentage: 20 },
      { name: "זהות עירונית ומורשת פתח תקווה", percentage: 20 },
    ],
    social_channels: [
      { platform: "facebook", posts_per_week: 4 },
      { platform: "instagram", posts_per_week: 3 },
    ],
    website_url: "https://www.petachtikvamuseum.com/",
    instagram_handle: "ptmuseum",
    facebook_url: "https://www.facebook.com/petachtikvamuseum",
  },

  "רולדין": {
    business_description: "רשת המאפייה הגדולה בישראל — 104+ סניפים מאז 1987. מתמחה בלחמים, עוגות, מאפים ומגשי אירוח. הסמכות הישראלית על מאפי חגים — זוכת תחרויות לאומיות בסופגנייה ובמשלוח מנות.",
    target_audience: "משפחות ישראליות (30-55), מביאי מתנות לחגים, מארחים לשבת ולאירועים, קניינים עסקיים לאירועי חברה. נשים 28-55 בעיקר.",
    competitors: "ארקפה, ארומה, גרג, לחמים — רולדין מתמקם כמאפייה אומנותית בגודל תאגידי.",
    tone: "חמים, נוסטלגי, חגיגי. 'חבר ישראלי חם שאופה כמו מקצוען'. כל פוסט מחובר לרגש, לאירוע או לזיכרון. לוח השנה העברי הוא עמוד השדרה העריכתי.",
    design_notes: "צילום אוכל מקצועי ועשיר, קרוב ומפתה. גוונים חמים — זהב, חום, קרם. הדגשת טריות — 'אפוי כל בוקר מחדש'. תמונות הגשה וסטיילינג לשבת ולחגים.",
    content_pillars: [
      { name: "ספירות לאחור למאפי חג", percentage: 35 },
      { name: "מאחורי הקלעים ותהליך האפייה", percentage: 25 },
      { name: "השראת אירוח לשבת ואירועים", percentage: 25 },
      { name: "סדנאות ומותג וחוויה", percentage: 15 },
    ],
    social_channels: [
      { platform: "instagram", posts_per_week: 5 },
      { platform: "facebook", posts_per_week: 4 },
      { platform: "tiktok", posts_per_week: 3 },
    ],
    website_url: "https://www.roladin.co.il/",
    instagram_handle: "roladin_il",
    facebook_url: "https://www.facebook.com/roladin",
  },
};

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const { data: clients, error: fetchErr } = await supabase
    .from("clients")
    .select("id, name");

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const results = [];

  // Match by prefix — handles name variations like "קרטרס" vs "קרטרס מבית H AND O"
  const PROFILE_KEYS = Object.keys(PROFILES);

  for (const client of clients ?? []) {
    const profileKey = PROFILE_KEYS.find(k =>
      client.name.startsWith(k.split(" ")[0]) ||
      k.startsWith(client.name.split(" ")[0]) ||
      client.name === k
    );

    if (!profileKey) {
      results.push({ name: client.name, status: "skipped — no profile match" });
      continue;
    }

    const profile = PROFILES[profileKey];
    const { error } = await supabase
      .from("clients")
      .update(profile)
      .eq("id", client.id);

    results.push({ name: client.name, matched: profileKey, status: error ? `error: ${error.message}` : "updated ✓" });
  }

  return NextResponse.json({ results });
}
