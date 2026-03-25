'use client'

import { useEffect, useState } from 'react'

/** Client-only URL hash without the leading `#`. */
export function useHash() {
  const [hash, setHash] = useState('')

  useEffect(() => {
    const read = () =>
      typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''

    setHash(read())
    const onChange = () => setHash(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return hash
}
