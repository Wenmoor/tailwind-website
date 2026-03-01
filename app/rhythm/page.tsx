import RhythmGame from '@/components/RhythmGame'

export const metadata = {
  title: 'Phigros Web - My Blog',
  description: 'A Web-based rhythm game embedded in my blog',
}

export default function PhigrosPage() {
  return (
    <main>
      <RhythmGame />
    </main>
  )
}
