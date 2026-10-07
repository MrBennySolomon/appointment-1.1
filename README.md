# Nail Bloom — React Appointment System

## התקנה
```bash
npm install
npm run dev
```

## MockAPI
1. צור Resource בשם `appointments` ב-MockAPI.
2. העתק את כתובת ה-API.
3. פתח `src/main.jsx`.
4. החלף:
`https://YOUR-MOCKAPI-ID.mockapi.io/api/appointments`
בכתובת שלך.

השדות שנשמרים:
- customerName
- phone
- service
- serviceId
- duration
- price
- date
- time
- endTime
- createdAt

המערכת בודקת תורים קיימים לפני הצגת שעות פנויות וגם מבצעת בדיקה נוספת מיד לפני POST.

### חשוב
MockAPI הוא API פשוט ולא מסד נתונים עם unique constraint/transaction. לכן בבקשות מקביליות משני מכשירים בדיוק באותה אלפית שנייה עדיין קיימת אפשרות נדירה ל-race condition. למערכת תורים אמיתית כדאי להעביר את בדיקת הזמינות והיצירה לשרת עם מנגנון נעילה/unique index.
