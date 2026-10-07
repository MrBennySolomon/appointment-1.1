import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, Heart,
  Phone, UserRound, Sparkles, X, CheckCircle2, LoaderCircle
} from "lucide-react";
import "./styles.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://6aae754a606bd915d110d395.mockapi.io/api/bookings";

const BUSINESS = {
  name: "Nail Bloom",
  subtitle: "יופי בקצות האצבעות",
  phone: "050-123-4567"
};

const WEEK_DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTHS = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
];

const SERVICES = [
  { id: "gel", name: "לק ג׳ל", duration: 60, price: 120 },
  { id: "builder", name: "בנייה / חיזוק", duration: 90, price: 180 },
  { id: "classic", name: "מניקור קלאסי", duration: 45, price: 90 },
  { id: "design", name: "לק ג׳ל + עיצוב", duration: 75, price: 150 }
];

const OPEN_HOUR = 9;
const CLOSE_HOUR = 19;
const SLOT_MINUTES = 30;

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function timeKey(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function startOfWeek(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0,0,0,0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a,b) { return dateKey(a) === dateKey(b); }

function getMonthDays(current) {
  const first = new Date(current.getFullYear(), current.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({length: 42}, (_, i) => addDays(start, i));
}

function getSlots(duration) {
  const slots = [];
  for (let min = OPEN_HOUR * 60; min + duration <= CLOSE_HOUR * 60; min += SLOT_MINUTES) {
    slots.push(`${pad(Math.floor(min/60))}:${pad(min%60)}`);
  }
  return slots;
}

function bookingEnd(time, duration) {
  const [h,m] = time.split(":").map(Number);
  const total = h*60+m+duration;
  return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
}

function overlaps(existing, newTime, duration) {
  const start = existing.time;
  const end = existing.endTime || bookingEnd(existing.time, existing.duration || 60);
  return newTime < end && bookingEnd(newTime, duration) > start;
}

function App() {
  const [view, setView] = useState("month");
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [service, setService] = useState(SERVICES[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  async function loadAppointments() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("MockAPI error");
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      setError("לא הצלחתי להתחבר ל‑MockAPI. בדוק שה‑API_URL מוגדר נכון.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAppointments(); }, []);

  const monthDays = useMemo(() => getMonthDays(current), [current]);

  function movePeriod(dir) {
    const d = new Date(current);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    if (view === "day") d.setDate(d.getDate() + dir);
    setCurrent(d);
    setSelectedDate(d);
  }

  function selectDay(d) {
    setSelectedDate(d);
    setCurrent(d);
    setView("day");
    setSuccess("");
  }

  function isBusy(date, time) {
    return appointments.some(a =>
      a.date === dateKey(date) && overlaps(a, time, service.duration)
    );
  }

  function openBooking(date, time) {
    if (isBusy(date, time)) return;
    setModal({ date, time });
  }

  async function saveBooking(form) {
    if (!modal) return;
    setSaving(true);
    setError("");
    try {
      // רענון נוסף לפני השמירה כדי לצמצם מצב שבו תור נתפס בינתיים.
      const check = await fetch(API_URL);
      const latest = check.ok ? await check.json() : appointments;

      if (latest.some(a =>
        a.date === dateKey(modal.date) &&
        overlaps(a, modal.time, service.duration)
      )) {
        setModal(null);
        await loadAppointments();
        setError("השעה נתפסה בינתיים. בחר שעה אחרת.");
        return;
      }

      const payload = {
        customerName: form.name,
        phone: form.phone,
        service: service.name,
        serviceId: service.id,
        duration: service.duration,
        price: service.price,
        date: dateKey(modal.date),
        time: modal.time,
        endTime: bookingEnd(modal.time, service.duration),
        createdAt: new Date().toISOString()
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("save failed");

      setModal(null);
      setSuccess(`התור נקבע בהצלחה ל־${modal.time}, ${dateKey(modal.date)}`);
      await loadAppointments();
    } catch {
      setError("אירעה שגיאה בשמירת התור. נסי שוב.");
    } finally {
      setSaving(false);
    }
  }

  const title = view === "month"
    ? `${MONTHS[current.getMonth()]} ${current.getFullYear()}`
    : view === "week"
      ? `שבוע של ${selectedDate.toLocaleDateString("he-IL", {day:"numeric", month:"long"})}`
      : selectedDate.toLocaleDateString("he-IL", {weekday:"long", day:"numeric", month:"long", year:"numeric"});

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-content">
          <div className="brand">
            <div className="logo"><Sparkles size={23}/></div>
            <div>
              <h1>{BUSINESS.name}</h1>
              <p>{BUSINESS.subtitle}</p>
            </div>
          </div>
          <a className="phone" href={`tel:${BUSINESS.phone}`}>
            <Phone size={17}/> {BUSINESS.phone}
          </a>
        </div>
      </header>

      <main className="container">
        <section className="intro">
          <div>
            <span className="eyebrow">קביעת תור אונליין</span>
            <h2>מגיע לך זמן לעצמך 💅</h2>
            <p>בחרי טיפול, תאריך ושעה שנוחה לך. התור יישמר במערכת באופן מיידי.</p>
          </div>
          <div className="service-picker">
            <label>בחרי טיפול</label>
            <select value={service.id} onChange={e => setService(SERVICES.find(s => s.id === e.target.value))}>
              {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name} · ₪{s.price}</option>)}
            </select>
          </div>
        </section>

        <section className="calendar-card">
          <div className="calendar-top">
            <div className="calendar-title">
              <CalendarDays size={22}/>
              <h3>{title}</h3>
            </div>
            <div className="controls">
              <button className="today-btn" onClick={() => {setCurrent(new Date()); setSelectedDate(new Date())}}>היום</button>
              <div className="view-switch">
                {["month","week","day"].map(v =>
                  <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
                    {v === "month" ? "חודש" : v === "week" ? "שבוע" : "יום"}
                  </button>
                )}
              </div>
              <button className="icon-btn" onClick={() => movePeriod(1)}><ChevronRight/></button>
              <button className="icon-btn" onClick={() => movePeriod(-1)}><ChevronLeft/></button>
            </div>
          </div>

          {loading && <div className="loading"><LoaderCircle className="spin"/> טוען תורים...</div>}
          {!loading && error && <div className="alert error">{error}</div>}
          {!loading && success && <div className="alert success"><CheckCircle2 size={18}/> {success}</div>}

          {!loading && view === "month" && (
            <div className="month-grid">
              {WEEK_DAYS.map(d => <div className="weekday" key={d}>{d}</div>)}
              {monthDays.map((d, i) => {
                const dayAppointments = appointments.filter(a => a.date === dateKey(d));
                const isCurrentMonth = d.getMonth() === current.getMonth();
                return (
                  <button key={i}
                    className={`day-cell ${!isCurrentMonth ? "muted" : ""} ${sameDay(d, selectedDate) ? "selected" : ""} ${sameDay(d,new Date()) ? "today" : ""}`}
                    onClick={() => selectDay(d)}
                  >
                    <span className="day-number">{d.getDate()}</span>
                    {dayAppointments.length > 0 && <span className="appointment-dot">{dayAppointments.length} תורים</span>}
                    <span className="day-hint">לחצי לבחירה</span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && view === "week" && (
            <WeekView date={selectedDate} appointments={appointments} onSelect={selectDay}/>
          )}

          {!loading && view === "day" && (
            <DayView
              date={selectedDate}
              appointments={appointments}
              service={service}
              onBook={openBooking}
            />
          )}
        </section>

        <section className="gallery">
          <div className="gallery-title">
            <Heart size={19}/><span>קצת השראה לציפורניים שלך</span>
          </div>
          <div className="gallery-grid">
            <img src="https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&q=85" alt="מניקור"/>
            <img src="https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=700&q=85" alt="ציפורניים"/>
            <img src="https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=700&q=85" alt="עיצוב ציפורניים"/>
          </div>
        </section>
      </main>

      {modal && <BookingModal
        date={modal.date}
        time={modal.time}
        service={service}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={saveBooking}
      />}
    </div>
  );
}

function WeekView({date, appointments, onSelect}) {
  const start = startOfWeek(date);
  const days = Array.from({length:7}, (_,i) => addDays(start,i));
  const slots = getSlots(30);

  return <div className="week-view">
    <div className="week-header"><div></div>{days.map(d =>
      <button key={dateKey(d)} onClick={() => onSelect(d)} className={sameDay(d,new Date()) ? "week-today" : ""}>
        <b>{WEEK_DAYS[d.getDay()]}</b><span>{d.getDate()}/{d.getMonth()+1}</span>
      </button>
    )}</div>
    <div className="week-body">
      {slots.map(t => <React.Fragment key={t}>
        <div className="time-label">{t}</div>
        {days.map(d => {
          const busy = appointments.some(a => a.date === dateKey(d) && overlaps(a,t,30));
          return <button key={dateKey(d)+t} className={`week-slot ${busy ? "busy":""}`} onClick={() => !busy && onSelect(d)}>
            {busy ? "תפוס" : "פנוי"}
          </button>
        })}
      </React.Fragment>)}
    </div>
  </div>
}

function DayView({date, appointments, service, onBook}) {
  const slots = getSlots(service.duration);
  const dayAppointments = appointments.filter(a => a.date === dateKey(date));
  return <div className="day-view">
    <div className="day-banner">
      <div><span>תאריך נבחר</span><strong>{date.toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}</strong></div>
      <div className="legend"><i></i> פנוי <i className="filled"></i> תפוס</div>
    </div>
    <div className="slots">
      {slots.map(t => {
        const busy = dayAppointments.some(a => overlaps(a,t,service.duration));
        return <button key={t} disabled={busy} onClick={() => onBook(date,t)} className={`slot ${busy ? "busy":""}`}>
          <Clock3 size={17}/>
          <span>{t} – {bookingEnd(t,service.duration)}</span>
          <small>{busy ? "התור תפוס" : "פנוי · לקביעת תור"}</small>
        </button>
      })}
    </div>
  </div>
}

function BookingModal({date,time,service,onClose,onSave,saving}) {
  const [form,setForm] = useState({name:"",phone:""});
  const [formError,setFormError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("נא למלא שם ומספר טלפון.");
      return;
    }
    onSave(form);
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={e => e.stopPropagation()}>
      <button className="close" onClick={onClose}><X/></button>
      <div className="modal-icon"><Sparkles/></div>
      <span className="eyebrow">קביעת תור</span>
      <h3>{service.name}</h3>
      <div className="booking-summary">
        <div><CalendarDays size={17}/>{date.toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}</div>
        <div><Clock3 size={17}/>{time} · {service.duration} דקות</div>
        <strong>₪{service.price}</strong>
      </div>
      <form onSubmit={submit}>
        <label><UserRound size={17}/> שם מלא
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="לדוגמה: דנה כהן"/>
        </label>
        <label><Phone size={17}/> טלפון
          <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="050-1234567" type="tel"/>
        </label>
        {formError && <div className="form-error">{formError}</div>}
        <button className="save-btn" disabled={saving}>
          {saving ? <><LoaderCircle className="spin"/> שומר...</> : <><CheckCircle2/> אישור וקביעת תור</>}
        </button>
      </form>
    </div>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
