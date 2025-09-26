// Archived: src/components/GameExercise.tsx
// Moved to archive by automated cleanup.

import React, { useState, useEffect } from 'react'

interface GameExerciseProps {
  exercise: any
  onUpdateProgress?: (p: any) => void
  onClose?: () => void
}

export const GameExercise: React.FC<GameExerciseProps> = ({ exercise, onUpdateProgress, onClose }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // archived component (no active imports detected)
  }, [])

  return (
    <div>
      <h3>Archived GameExercise</h3>
      <p>Progress: {progress}</p>
      <button onClick={() => onClose?.()}>Close</button>
    </div>
  )
}

export default GameExercise
