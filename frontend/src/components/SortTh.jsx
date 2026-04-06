import React from 'react';

export default function SortTh({ col, label, sortCol, sortDir, onSort, style }) {
  const active = sortCol === col;
  return (
    <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
        onClick={() => onSort(col)}>
      {label}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.25, fontSize: 10 }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
      </span>
    </th>
  );
}
