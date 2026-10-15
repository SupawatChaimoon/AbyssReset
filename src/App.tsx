const GAMES = [
  { id: 'genshin', name: 'Genshin Impact', server: 'Asia', color: 'bg-genshin' },
  { id: 'starrail', name: 'Honkai: Star Rail', server: 'Asia', color: 'bg-starrail' },
  { id: 'zenless', name: 'Zenless Zone Zero', server: 'Asia', color: 'bg-zenless' },
  { id: 'wuwa', name: 'Wuthering Waves', server: 'SEA', color: 'bg-wuwa' },
];

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AbyssReset</h1>
        <p className="mt-1 text-sm text-slate-400">ปฏิทินรวมตู้กาชา แพตช์ และ Endgame</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {GAMES.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <span className={`h-3 w-3 rounded-full ${g.color}`} />
            <span className="font-medium">{g.name}</span>
            <span className="ml-auto text-xs text-slate-400">เซิร์ฟ {g.server}</span>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm text-slate-500">ขั้นที่ 1 เสร็จแล้ว ปฏิทินจะมาในขั้นที่ 4</p>
    </div>
  );
}
