import { useEffect, useState } from 'react'
import { fetchPingMessage } from '../../../services/systemApi'

/** Tracks the top-bar API health badge state. */
export const useApiStatus = () => {
  const [pingMessage, setPingMessage] = useState<string>('Loading...')

  useEffect(() => {
    fetchPingMessage()
      .then(setPingMessage)
      .catch(() => setPingMessage('Error'))
  }, [])

  return pingMessage
}
