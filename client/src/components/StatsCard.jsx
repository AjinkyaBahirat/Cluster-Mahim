import React from 'react'

const StatsCard = ({ icon: Icon, label, value, color }) => {
  return (
    <div className="card stats-card">
      <div 
        className="stats-card__icon-wrap" 
        style={{ 
          borderColor: color ? `${color}20` : 'var(--border-glass)',
          background: color ? `rgba(${hexToRgb(color)}, 0.08)` : 'var(--bg-card)'
        }}
      >
        <Icon size={24} style={{ color: color || 'var(--accent-primary)' }} />
      </div>
      <div className="stats-card__content">
        <span className="stats-card__value">{value}</span>
        <span className="stats-card__label">{label}</span>
      </div>
    </div>
  )
}

// Helper to convert hex to rgb for background opacity styling
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '108, 92, 231'
}

export default StatsCard
