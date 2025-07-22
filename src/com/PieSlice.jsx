import React from 'react'

export default function PieSlice({ startAngle, endAngle, radius, cx, cy, fill, label }) {
  const rad = Math.PI / 180
  const x1 = cx + radius * Math.cos(startAngle * rad)
  const y1 = cy + radius * Math.sin(startAngle * rad)
  const x2 = cx + radius * Math.cos(endAngle * rad)
  const y2 = cy + radius * Math.sin(endAngle * rad)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  const midAngle = (startAngle + endAngle) / 2
  const tx = cx + (radius * 0.7) * Math.cos(midAngle * rad)
  const ty = cy + (radius * 0.7) * Math.sin(midAngle * rad)
  return (
    <g>
      <path d={pathData} fill={fill} stroke="black" strokeWidth="0.5" />
      <text x={tx} y={ty} fontSize="3" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">{label}</text>
    </g>
  )
}
