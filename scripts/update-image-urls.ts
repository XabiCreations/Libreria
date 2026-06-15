/**
 * Actualiza el campo image_url de cada libro en Supabase
 * con la URL pública del bucket 'portadas'.
 *
 * Uso (después de subir las imágenes al bucket):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/update-image-urls.ts
 *
 * Las imágenes deben estar subidas con el mismo nombre que aparece
 * en el campo imageLink de books.json (sin el prefijo "images/").
 */

import books from '../books.json' assert { type: 'json' }

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET = 'portadas'
const REST = `${SUPABASE_URL}/rest/v1`

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

async function main() {
  const res = await fetch(`${REST}/libros?select=id,title`, { headers })
  if (!res.ok) {
    console.error('Error al obtener libros:', res.status, await res.text())
    process.exit(1)
  }
  const libros: { id: string; title: string }[] = await res.json()

  let ok = 0
  let ko = 0

  for (const book of books) {
    const filename = book.imageLink.replace('images/', '')
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`

    const libro = libros.find((l) => l.title === book.title)
    if (!libro) {
      console.warn(`⚠ No encontrado en BD: "${book.title}"`)
      ko++
      continue
    }

    const upd = await fetch(`${REST}/libros?id=eq.${libro.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ image_url: imageUrl }),
    })

    if (!upd.ok) {
      console.error(`✗ ${book.title}: ${upd.status} ${await upd.text()}`)
      ko++
    } else {
      console.log(`✓ ${book.title}`)
      ok++
    }
  }

  console.log(`\nFinalizado: ${ok} actualizados, ${ko} errores`)
}

main()
