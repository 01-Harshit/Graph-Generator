// ============================================================
// Icons.jsx — FontAwesome icon wrappers
// All icons use FontAwesome for consistency
// ============================================================

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartColumn,
  faWandMagicSparkles,
  faDownload,
  faSpinner,
  faSun,
  faMoon,
  faClockRotateLeft,
  faXmark,
  faTrashCan,
  faChartLine,
  faChartPie,
  faChartArea,
  faBraille,
  faCube,
  faInbox,
  faFolderOpen,
  faCheck,
  faTriangleExclamation,
  faBolt,
} from '@fortawesome/free-solid-svg-icons'


// ------------------------------------------------------------
// CHART ICONS
// ------------------------------------------------------------
export function ChartBarIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faChartColumn} className={className} />
}

export function SparklesIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faWandMagicSparkles} className={className} />
}

export function DownloadIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faDownload} className={className} />
}

export function LoadingSpinnerIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faSpinner} spin className={className} />
}


// ------------------------------------------------------------
// THEME ICONS
// ------------------------------------------------------------
export function SunIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faSun} className={className} />
}

export function MoonIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faMoon} className={className} />
}


// ------------------------------------------------------------
// UI ICONS
// ------------------------------------------------------------
export function HistoryIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faClockRotateLeft} className={className} />
}

export function CloseIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faXmark} className={className} />
}

export function TrashIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faTrashCan} className={className} />
}

export function InboxIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faInbox} className={className} />
}

export function FolderOpenIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faFolderOpen} className={className} />
}

export function CheckIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faCheck} className={className} />
}

export function WarningIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faTriangleExclamation} className={className} />
}

export function BoltIcon({ className = "w-6 h-6" }) {
  return <FontAwesomeIcon icon={faBolt} className={className} />
}


// ------------------------------------------------------------
// CHART TYPE ICONS — For History sidebar
// ------------------------------------------------------------
export function ChartTypeIcon({ type, className = "w-4 h-4" }) {
  const iconMap = {
    bar: faChartColumn,
    line: faChartLine,
    pie: faChartPie,
    scatter: faBraille,
    area: faChartArea,
    linear_programming: faCube,
  }
  const icon = iconMap[type] || faChartColumn
  return <FontAwesomeIcon icon={icon} className={className} />
}