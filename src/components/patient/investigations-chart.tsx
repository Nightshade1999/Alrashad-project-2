"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const mockData = [
  { date: 'Oct 01', s_creatinine: 1.1, hba1c: null },
  { date: 'Oct 10', s_creatinine: 1.2, hba1c: 6.8 },
  { date: 'Oct 15', s_creatinine: 1.5, hba1c: null },
  { date: 'Oct 20', s_creatinine: 1.4, hba1c: null },
  { date: 'Oct 25', s_creatinine: 1.3, hba1c: 6.5 },
]

export function InvestigationsChart() {
  return (
    <div className="h-[300px] w-full mt-4 mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'S.Creatinine', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'HbA1c', angle: 90, position: 'insideRight' }} />
          <Tooltip contentStyle={{ borderRadius: '8px' }} />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="s_creatinine" 
            name="S.Creatinine (mg/dL)" 
            stroke="#ef4444" 
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 8 }} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="hba1c" 
            name="HbA1c (%)" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
