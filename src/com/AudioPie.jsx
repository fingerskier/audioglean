import React from 'react'


export default function AudioPie() {
  return <>
    <svg width="500" height="500" viewBox="0 0 100 100"
      id="audio-pie"
    >
      <circle cx="50" cy="50" r="40" stroke="black" strokeWidth="3" fill="none" />
      <path d="M50,10 A40,40 0 1,1 50,90 A40,40 0 1,1 50,10" fill="none" stroke="blue" strokeWidth="3" />
      <text x="50" y="55" fontSize="12" textAnchor="middle" fill="black">Audio</text>
    </svg>
  </>
}