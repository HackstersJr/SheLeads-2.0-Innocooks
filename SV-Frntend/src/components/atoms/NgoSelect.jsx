/**
 * components/atoms/NgoSelect.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Glassmorphism-styled <select> for NGO / SHG affiliation.
 * USAGE: NgoAuth (RegisterPanel) and "Request Community Vouch" modal ONLY.
 * Must NOT appear in MemberAuth — members do not declare NGO affiliation
 * at registration to prevent data leakage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Building2, ChevronDown, CheckCircle2 } from 'lucide-react'

const NGO_OPTIONS = [
    'SEWA',
    'Kudumbashree',
    'Swayam Shikshan Prayog (SSP)',
    'SNEHA',
    "Working Women's Forum",
    'Other',
]

/**
 * @param {string}   value      controlled value
 * @param {Function} onChange   called with the selected string
 * @param {string}   [label]    field label text
 * @param {string}   [error]    validation error message
 */
export default function NgoSelect({ value, onChange, label = 'Affiliated NGO / SHG', error }) {
    const isSelected = !!value

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-stone-600 font-sans flex items-center gap-1.5">
                <Building2 size={12} className="text-emerald-500" />
                {label}
            </label>

            <div
                className={[
                    'relative flex items-center rounded-2xl border-2 bg-white/70 overflow-hidden transition-colors duration-150',
                    isSelected
                        ? 'border-emerald-400'
                        : error
                            ? 'border-rose-300'
                            : 'border-stone-200 focus-within:border-emerald-400',
                ].join(' ')}
            >
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    aria-label={label}
                    className="
                        flex-1 px-3 py-3.5
                        bg-transparent text-sm font-sans text-emerald-950
                        focus:outline-none appearance-none cursor-pointer
                    "
                >
                    <option value="" disabled>Select NGO / SHG…</option>
                    {NGO_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>

                <div className="flex items-center pr-3 gap-2 pointer-events-none">
                    {isSelected
                        ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        : <ChevronDown size={16} className="text-stone-400 shrink-0" />
                    }
                </div>
            </div>

            {error && (
                <p className="text-xs text-rose-500 font-sans">{error}</p>
            )}
        </div>
    )
}
