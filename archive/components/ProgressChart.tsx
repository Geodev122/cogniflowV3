// Archived: src/components/ProgressChart.tsx
// Moved to archive by automated cleanup.

import React from 'react'

interface ProgressChartProps { data?: any }

export const ProgressChart: React.FC<ProgressChartProps> = ({ data }) => {
  return (
    <div>
      <h4>Archived ProgressChart</h4>
      <pre>{JSON.stringify(data?.slice?.(0,5) ?? {}, null, 2)}</pre>
    </div>
  )
}

export default ProgressChart
