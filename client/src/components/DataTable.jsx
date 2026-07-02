import React, { useState } from 'react'
import { Search as SearchIcon, Inbox, ChevronDown, ChevronUp } from 'lucide-react'

const DataTable = ({ 
  columns, 
  data = [], 
  searchable = false, 
  searchKeys = [], 
  emptyMessage = "No records found",
  emptyIcon: EmptyIcon = Inbox
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  // Search logic
  const filteredData = data.filter((item) => {
    if (!searchable || !searchQuery) return true
    return searchKeys.some((key) => {
      const val = item[key]
      return val ? String(val).toLowerCase().includes(searchQuery.toLowerCase()) : false
    })
  })

  // Sort logic
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0
    const aVal = a[sortConfig.key]
    const bVal = b[sortConfig.key]

    if (aVal === bVal) return 0
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1

    const aStr = typeof aVal === 'string' ? aVal.toLowerCase() : aVal
    const bStr = typeof bVal === 'string' ? bVal.toLowerCase() : bVal

    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div>
      {searchable && (
        <div className="data-table__search">
          <SearchIcon className="data-table__search-icon" size={20} />
          <input
            type="text"
            className="form-input data-table__search-input"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="data-table-container">
        {sortedData.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} onClick={() => handleSort(col.key)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {col.label}
                      {sortConfig.key === col.key && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="data-table__empty">
            <EmptyIcon size={48} style={{ color: 'var(--text-muted)' }} />
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DataTable
