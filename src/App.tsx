import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, CalendarDays, ChartNoAxesCombined, Check, CheckSquare, GraduationCap,
  LayoutDashboard, Moon, Plus, Sun, Trash2, Trophy, X, Download, Upload, ClipboardList
} from 'lucide-react'

type Subject = { id: string; name: string; teacher: string; color: string }
type Grade = { id: string; subjectId: string; value: number; date: string; comment: string }
type Lesson = { id: string; subjectId: string; day: number; time: string; topic: string }
type Task = { id: string; text: string; done: boolean; date: string }
type Page = 'dashboard' | 'subjects' | 'grades' | 'schedule' | 'tasks' | 'stats'
const DAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const COLORS = ['#6558e8', '#16865b', '#d97736', '#287bb5', '#cf4e82', '#8b6b40']
const today = () => new Date().toISOString().slice(0, 10)
function read<T,>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}
const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
const fmt = (n: number | null) => n === null ? '—' : n.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 1 })

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => read('sh_theme', 'light'))
  const [subjects, setSubjects] = useState<Subject[]>(() => read('sh_subjects', []))
  const [grades, setGrades] = useState<Grade[]>(() => read('sh_grades', []))
  const [lessons, setLessons] = useState<Lesson[]>(() => read('sh_lessons', []))
  const [tasks, setTasks] = useState<Task[]>(() => read('sh_tasks', []))
  const [subjectName, setSubjectName] = useState('')
  const [teacher, setTeacher] = useState('')
  const [gradeSubject, setGradeSubject] = useState('')
  const [gradeValue, setGradeValue] = useState('5')
  const [gradeComment, setGradeComment] = useState('')
  const [gradeDate, setGradeDate] = useState(today())
  const [lessonSubject, setLessonSubject] = useState('')
  const [lessonDay, setLessonDay] = useState(String((new Date().getDay() + 1) % 7))
  const [lessonTime, setLessonTime] = useState('09:00')
  const [lessonTopic, setLessonTopic] = useState('')
  const [taskText, setTaskText] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('sh_theme', theme) }, [theme])
  useEffect(() => { localStorage.setItem('sh_subjects', JSON.stringify(subjects)) }, [subjects])
  useEffect(() => { localStorage.setItem('sh_grades', JSON.stringify(grades)) }, [grades])
  useEffect(() => { localStorage.setItem('sh_lessons', JSON.stringify(lessons)) }, [lessons])
  useEffect(() => { localStorage.setItem('sh_tasks', JSON.stringify(tasks)) }, [tasks])

  const subjectFor = (id: string) => subjects.find(s => s.id === id)
  const subjectGrades = (id: string) => grades.filter(g => g.subjectId === id)
  const overallAverage = average(grades.map(g => g.value))
  const doneCount = tasks.filter(t => t.done).length
  const taskPercent = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0
  const sortedLessons = useMemo(() => [...lessons].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)), [lessons])
  const titles: Record<Page, string> = { dashboard: 'Главная', subjects: 'Предметы', grades: 'Оценки', schedule: 'Расписание', tasks: 'Задачи', stats: 'Статистика' }

  function addSubject(e: React.FormEvent) {
    e.preventDefault()
    const name = subjectName.trim()
    if (!name) return
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) { alert('Такой предмет уже есть.'); return }
    const s = { id: makeId(), name, teacher: teacher.trim(), color: COLORS[subjects.length % COLORS.length] }
    setSubjects(prev => [...prev, s]); setSubjectName(''); setTeacher('')
  }
  function deleteSubject(id: string) {
    if (!confirm('Удалить предмет и связанные с ним оценки и занятия?')) return
    setSubjects(prev => prev.filter(s => s.id !== id))
    setGrades(prev => prev.filter(g => g.subjectId !== id))
    setLessons(prev => prev.filter(l => l.subjectId !== id))
  }
  function addGrade(e: React.FormEvent) {
    e.preventDefault()
    if (!gradeSubject) { alert('Сначала добавь предмет.'); return }
    setGrades(prev => [{ id: makeId(), subjectId: gradeSubject, value: Number(gradeValue), date: gradeDate, comment: gradeComment.trim() }, ...prev])
    setGradeComment('')
  }
  function addLesson(e: React.FormEvent) {
    e.preventDefault()
    if (!lessonSubject) { alert('Сначала добавь предмет.'); return }
    setLessons(prev => [...prev, { id: makeId(), subjectId: lessonSubject, day: Number(lessonDay), time: lessonTime, topic: lessonTopic.trim() }])
    setLessonTopic('')
  }
  function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskText.trim()) return
    setTasks(prev => [{ id: makeId(), text: taskText.trim(), done: false, date: today() }, ...prev])
    setTaskText('')
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, subjects, grades, lessons, tasks, theme }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `studyhelper-backup-${today()}.json`; a.click(); URL.revokeObjectURL(url)
  }
  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.subjects) || !Array.isArray(data.grades) || !Array.isArray(data.lessons) || !Array.isArray(data.tasks)) throw new Error('Неверный формат файла')
      if (!confirm('Импорт заменит текущие данные. Продолжить?')) return
      setSubjects(data.subjects); setGrades(data.grades); setLessons(data.lessons); setTasks(data.tasks)
      if (data.theme === 'light' || data.theme === 'dark') setTheme(data.theme)
      alert('Данные импортированы.')
    } catch (err) { alert(`Не удалось импортировать файл: ${String(err)}`) }
    e.target.value = ''
  }
  function resetData() {
    if (!confirm('Удалить все данные? Сначала скачай резервную копию, если она нужна.')) return
    setSubjects([]); setGrades([]); setLessons([]); setTasks([])
  }

  const subjectOptions = subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
  const recentLessons = [...sortedLessons].sort((a, b) => ((a.day - new Date().getDay() + 7) % 7) - ((b.day - new Date().getDay() + 7) % 7) || a.time.localeCompare(b.time)).slice(0, 5)
  const recentGrades = grades.slice(0, 5)
  const filteredGrades = grades.filter(g => gradeFilter === 'all' || g.subjectId === gradeFilter)

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><GraduationCap size={23}/></span><span>StudyHelper</span></div>
      <p className="nav-label">МОЯ УЧЁБА</p>
      <nav>{([
        ['dashboard', LayoutDashboard, 'Главная'], ['subjects', BookOpen, 'Предметы'], ['grades', Trophy, 'Оценки'],
        ['schedule', CalendarDays, 'Расписание'], ['tasks', CheckSquare, 'Задачи'], ['stats', ChartNoAxesCombined, 'Статистика'],
      ] as const).map(([key, Icon, label]) => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebar-note"><div className="avatar">У</div><div><strong>Моя учёба</strong><small>Личный кабинет</small></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><GraduationCap size={19}/></span>StudyHelper</div><span className="breadcrumb">Рабочее пространство / {titles[page]}</span><button className="theme-button" title="Переключить тему" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</button></header>
      <div className="content">
        <div className="page-heading"><div><h1>{page === 'dashboard' ? 'Добро пожаловать! 👋' : titles[page]}</h1><p>{page === 'dashboard' ? 'Давай сделаем этот день продуктивным.' : 'Всё необходимое для твоей учёбы — в одном месте.'}</p></div><span className="today-pill">{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date())}</span></div>

        {page === 'dashboard' && <>
          <div className="stats-grid">
            <Stat icon={<Trophy size={17}/>} label="Средний балл" value={fmt(overallAverage)} note="По всем оценкам"/>
            <Stat icon={<BookOpen size={17}/>} label="Предметы" value={String(subjects.length)} note="В твоём списке"/>
            <Stat icon={<CheckSquare size={17}/>} label="Задачи выполнены" value={`${taskPercent}%`} note={`${doneCount} из ${tasks.length} задач`}/>
            <Stat icon={<CalendarDays size={17}/>} label="Занятия" value={String(lessons.length)} note="В расписании"/>
          </div>
          <div className="dashboard-grid">
            <section className="panel"><PanelTitle title="Мои задачи" subtitle="Учебные дела под контролем" action={() => setPage('tasks')} actionText="Все задачи →"/>
              <form className="inline-form" onSubmit={addTask}><input value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Что нужно сделать?" maxLength={160} required/><button><Plus size={16}/> Добавить</button></form>
              <TaskList tasks={tasks.slice(0, 5)} onToggle={id => setTasks(p => p.map(t => t.id === id ? {...t, done: !t.done} : t))} onDelete={id => setTasks(p => p.filter(t => t.id !== id))}/>
            </section>
            <section className="panel"><PanelTitle title="Ближайшие занятия" subtitle="Твоё расписание" action={() => setPage('schedule')} actionText="Все →"/>
              {recentLessons.length ? <div className="stack">{recentLessons.map(l => <div className="lesson-row" key={l.id}><div className="time-block"><b>{DAY_SHORT[l.day]}</b><span>{l.time}</span></div><span className="subject-dot" style={{background: subjectFor(l.subjectId)?.color}}/><div className="row-copy"><strong>{subjectFor(l.subjectId)?.name ?? 'Предмет удалён'}</strong><small>{l.topic || 'Занятие'}</small></div></div>)}</div> : <Empty text="Добавь занятия в расписание."/>}
            </section>
            <section className="panel"><PanelTitle title="Успеваемость" subtitle="Средний балл по предметам" action={() => setPage('stats')} actionText="Подробнее →"/>
              {subjects.length ? subjects.map(s => { const a = average(subjectGrades(s.id).map(g => g.value)); return <div className="progress-item" key={s.id}><div className="progress-label"><span>{s.name}</span><b>{fmt(a)}</b></div><div className="progress-track"><div style={{width: `${Math.min(100, ((a ?? 0) / 5) * 100)}%`, background: s.color}}/></div></div> }) : <Empty text="Добавь предметы и оценки для статистики."/>}
            </section>
            <section className="panel"><PanelTitle title="Последние оценки" subtitle="Недавно добавленные результаты" action={() => setPage('grades')} actionText="Все →"/>
              {recentGrades.length ? <div className="stack">{recentGrades.map(g => <div className="grade-row" key={g.id}><div className="row-copy"><strong>{subjectFor(g.subjectId)?.name ?? 'Предмет удалён'}</strong><small>{g.comment || g.date}</small></div><span className={`grade-badge ${g.value >= 4 ? 'good' : g.value <= 2 ? 'bad' : ''}`}>{g.value}</span></div>)}</div> : <Empty text="Добавь первую оценку."/>}
            </section>
          </div>
        </>}

        {page === 'subjects' && <>
          <section className="panel"><PanelTitle title="Добавить предмет" subtitle="Например: математика, английский, история"/>
            <form onSubmit={addSubject} className="form-grid"><Field label="Название предмета"><input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="Название предмета" maxLength={70} required/></Field><Field label="Преподаватель"><input value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="Необязательно" maxLength={70}/></Field><div className="form-actions"><button><Plus size={16}/> Добавить предмет</button></div></form>
          </section>
          <div className="section-heading"><h2>Все предметы</h2><span className="count-pill">{subjects.length}</span></div>
          {subjects.length ? <div className="subject-grid">{subjects.map(s => {const a = average(subjectGrades(s.id).map(g => g.value));return <article className="subject-card" key={s.id}><div className="subject-card-head"><span className="subject-symbol" style={{background: `${s.color}20`, color: s.color}}><BookOpen size={20}/></span><div className="row-copy"><strong>{s.name}</strong><small>{s.teacher || 'Преподаватель не указан'}</small></div><button className="icon-quiet" title="Удалить предмет" onClick={() => deleteSubject(s.id)}><Trash2 size={16}/></button></div><div className="subject-score"><div><strong>{fmt(a)}</strong><small>Средний балл</small></div><span>{subjectGrades(s.id).length} оценок</span></div></article>})}</div> : <Empty text="Предметов пока нет. Добавь первый выше."/>}
        </>}

        {page === 'grades' && <>
          <section className="panel"><PanelTitle title="Добавить оценку" subtitle="Сначала добавь предмет в соответствующем разделе"/>
            <form onSubmit={addGrade} className="form-grid"><Field label="Предмет"><select value={gradeSubject} onChange={e => setGradeSubject(e.target.value)} required><option value="">Выбери предмет</option>{subjectOptions}</select></Field><Field label="Оценка"><select value={gradeValue} onChange={e => setGradeValue(e.target.value)}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n}{n===5?' — отлично':n===4?' — хорошо':n===3?' — удовлетворительно':''}</option>)}</select></Field><Field label="Дата"><input type="date" value={gradeDate} onChange={e => setGradeDate(e.target.value)} required/></Field><Field label="Комментарий"><input value={gradeComment} onChange={e => setGradeComment(e.target.value)} placeholder="Контрольная, домашняя работа…" maxLength={120}/></Field><div className="form-actions"><button><Plus size={16}/> Сохранить оценку</button></div></form>
          </section>
          <section className="panel"><PanelTitle title="Журнал оценок" subtitle="Все результаты"/><div className="toolbar"><select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}><option value="all">Все предметы</option>{subjectOptions}</select><span className="muted">{filteredGrades.length} записей</span></div>
            {filteredGrades.length ? <div className="table-wrap"><table><thead><tr><th>Предмет</th><th>Оценка</th><th>Дата</th><th>Комментарий</th><th></th></tr></thead><tbody>{filteredGrades.map(g => <tr key={g.id}><td>{subjectFor(g.subjectId)?.name ?? 'Предмет удалён'}</td><td><span className={`grade-badge ${g.value >= 4 ? 'good' : g.value <= 2 ? 'bad' : ''}`}>{g.value}</span></td><td>{g.date}</td><td>{g.comment || '—'}</td><td><button className="icon-quiet" title="Удалить оценку" onClick={() => setGrades(p => p.filter(x => x.id !== g.id))}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div> : <Empty text="Оценок пока нет."/>}
          </section>
        </>}

        {page === 'schedule' && <>
          <section className="panel"><PanelTitle title="Добавить занятие" subtitle="Выбери предмет, день недели и время"/>
            <form onSubmit={addLesson} className="form-grid"><Field label="Предмет"><select value={lessonSubject} onChange={e => setLessonSubject(e.target.value)} required><option value="">Выбери предмет</option>{subjectOptions}</select></Field><Field label="День недели"><select value={lessonDay} onChange={e => setLessonDay(e.target.value)}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></Field><Field label="Время"><input type="time" value={lessonTime} onChange={e => setLessonTime(e.target.value)} required/></Field><Field label="Кабинет или тема"><input value={lessonTopic} onChange={e => setLessonTopic(e.target.value)} placeholder="Необязательно" maxLength={100}/></Field><div className="form-actions"><button><Plus size={16}/> Добавить занятие</button></div></form>
          </section>
          <section className="panel"><PanelTitle title="Расписание недели" subtitle="Занятия по дням и времени"/><div className="week-grid">{[1,2,3,4,5,6,0].map(d => <div className={`day-column ${d === new Date().getDay() ? 'today' : ''}`} key={d}><div className="day-title">{DAYS[d]}</div>{sortedLessons.filter(l => l.day === d).map(l => <div className="lesson-chip" key={l.id} style={{borderColor: subjectFor(l.subjectId)?.color}}><b>{l.time}</b><span>{subjectFor(l.subjectId)?.name}</span><small>{l.topic}</small></div>)}{!sortedLessons.some(l => l.day === d) && <small className="muted">Нет уроков</small>}</div>)}</div></section>
          <section className="panel"><PanelTitle title="Все занятия"/>{sortedLessons.length ? <div className="stack">{sortedLessons.map(l => <div className="lesson-row" key={l.id}><div className="time-block"><b>{DAY_SHORT[l.day]}</b><span>{l.time}</span></div><span className="subject-dot" style={{background: subjectFor(l.subjectId)?.color}}/><div className="row-copy"><strong>{subjectFor(l.subjectId)?.name ?? 'Предмет удалён'}</strong><small>{l.topic || 'Занятие'} · {DAYS[l.day]}</small></div><button className="icon-quiet" title="Удалить занятие" onClick={() => setLessons(p => p.filter(x => x.id !== l.id))}><Trash2 size={16}/></button></div>)}</div> : <Empty text="Добавь первое занятие."/>}</section>
        </>}

        {page === 'tasks' && <section className="panel"><PanelTitle title="Мои учебные задачи" subtitle="Отмечай завершённые дела и следи за прогрессом"/>
          <form onSubmit={addTask} className="inline-form"><input value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Например, повторить английские слова" maxLength={160} required/><button><Plus size={16}/> Добавить</button></form>
          <div className="task-summary"><span>{doneCount} из {tasks.length} выполнено</span><div className="progress-track"><div style={{width: `${taskPercent}%`}}/></div><b>{taskPercent}%</b></div>
          {tasks.length ? <div className="task-list">{tasks.map(t => <div className={`task-row ${t.done ? 'done' : ''}`} key={t.id}><input type="checkbox" checked={t.done} onChange={() => setTasks(p => p.map(x => x.id === t.id ? {...x, done: !x.done} : x))}/><div className="row-copy"><strong>{t.text}</strong><small>{t.date} · {t.done ? 'Выполнено' : 'В процессе'}</small></div><button className="icon-quiet" title="Удалить задачу" onClick={() => setTasks(p => p.filter(x => x.id !== t.id))}><Trash2 size={16}/></button></div>)}</div> : <Empty text="Пока нет задач. Добавь первую выше."/>}
          {doneCount > 0 && <button className="button-secondary clear-button" onClick={() => setTasks(p => p.filter(t => !t.done))}>Убрать выполненные</button>}
        </section>}

        {page === 'stats' && <>
          <div className="stats-grid"><Stat icon={<Trophy size={17}/>} label="Средний балл" value={fmt(overallAverage)} note="Все выставленные оценки"/><Stat icon={<ClipboardList size={17}/>} label="Всего оценок" value={String(grades.length)} note="В журнале"/><Stat icon={<Check size={17}/>} label="Выполнено задач" value={String(doneCount)} note={`Из ${tasks.length} задач`}/><Stat icon={<BookOpen size={17}/>} label="Предметы" value={String(subjects.length)} note="В списке"/></div>
          <section className="panel"><PanelTitle title="Успеваемость по предметам" subtitle="Расчёт среднего арифметического балла"/>
            {subjects.length ? subjects.map(s => {const a = average(subjectGrades(s.id).map(g => g.value));return <div className="progress-item" key={s.id}><div className="progress-label"><span>{s.name}</span><b>{fmt(a)}</b></div><div className="progress-track"><div style={{width: `${Math.min(100, ((a ?? 0) / 5) * 100)}%`, background: s.color}}/></div></div>}) : <Empty text="Добавь предметы и оценки, чтобы увидеть статистику."/>}
          </section>
          <section className="panel"><PanelTitle title="Резервная копия" subtitle="Скачай или восстанови свои данные"/>
            <div className="backup-actions"><button onClick={exportData}><Download size={16}/> Скачать JSON</button><label className="button-secondary upload-button"><Upload size={16}/> Импортировать JSON<input type="file" accept=".json,application/json" onChange={importData}/></label><button className="button-danger" onClick={resetData}><Trash2 size={16}/> Сбросить всё</button></div>
            <p className="muted backup-note">Данные сейчас хранятся в браузере на этом компьютере. Резервная копия помогает перенести их в другой браузер или сохранить перед очисткой данных.</p>
          </section>
        </>}
        <footer>StudyHelper · Учись в своём темпе</footer>
      </div>
    </main>
  </div>
}

function Stat({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div> }
function PanelTitle({title,subtitle,action,actionText}:{title:string;subtitle?:string;action?:()=>void;actionText?:string}) { return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="text-button" onClick={action}>{actionText}</button>}</div> }
function Empty({text}:{text:string}) { return <div className="empty-state">{text}</div> }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="field"><span>{label}</span>{children}</label> }
function TaskList({tasks,onToggle,onDelete}:{tasks:Task[];onToggle:(id:string)=>void;onDelete:(id:string)=>void}) { return tasks.length ? <div className="task-list">{tasks.map(t => <div className={`task-row ${t.done?'done':''}`} key={t.id}><input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)}/><div className="row-copy"><strong>{t.text}</strong><small>{t.date} · {t.done?'Выполнено':'В процессе'}</small></div><button className="icon-quiet" title="Удалить задачу" onClick={() => onDelete(t.id)}><X size={16}/></button></div>)}</div> : <Empty text="Пока нет задач. Добавь первую выше."/> }
