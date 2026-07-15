const posterClass =
  'flex min-h-44 items-end overflow-hidden rounded-xl p-4 font-[var(--display)] text-xl font-black text-[#fff9d0] shadow-[inset_0_-80px_70px_rgba(0,0,0,0.44)] [text-shadow:0_3px_8px_rgba(0,0,0,0.55)] max-xl:min-h-36'

function PosterStack({ side }) {
  const posters =
    side === 'left'
      ? [
          {
            title: 'Trạng Quỳnh Nhí',
            className:
              'bg-[radial-gradient(circle_at_30%_20%,#ffcf7c_0_18%,transparent_19%),linear-gradient(135deg,#53d889,#08715c)]',
          },
          {
            title: 'Mumbo',
            className:
              'bg-[radial-gradient(circle_at_62%_30%,#ffd2e5_0_18%,transparent_19%),linear-gradient(135deg,#91dbff,#1a77ca)]',
          },
        ]
      : [
          {
            title: 'Dế Mèn',
            className:
              'bg-[radial-gradient(circle_at_30%_28%,#ffe783_0_18%,transparent_19%),linear-gradient(135deg,#ffc64a,#4ba84b)]',
          },
          {
            title: 'Wolfoo',
            className:
              'bg-[radial-gradient(circle_at_72%_20%,#fff1d0_0_14%,transparent_15%),linear-gradient(135deg,#ff7a5f,#7d2fd1)]',
          },
        ]

  return (
    <aside className="grid gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {posters.map((poster) => (
        <div className={`${posterClass} ${poster.className}`} key={poster.title}>
          <span>{poster.title}</span>
        </div>
      ))}
    </aside>
  )
}

export default PosterStack
