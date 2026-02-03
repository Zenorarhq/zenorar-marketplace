interface FlagProps {
  country: 'US' | 'GB' | 'EU' | 'CA' | 'AU' | 'DE' | 'FR' | 'JP' | 'CN' | 'BR'
  size?: number
  className?: string
}

// SVG flags for common countries
const flags: Record<string, React.ReactNode> = {
  US: (
    <svg viewBox="0 0 640 480" className="w-full h-full">
      <g fillRule="evenodd">
        <g strokeWidth="1pt">
          <path fill="#bd3d44" d="M0 0h640v37H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v36H0z"/>
          <path fill="#fff" d="M0 37h640v37H0zm0 74h640v36H0zm0 74h640v37H0zm0 73h640v37H0zm0 74h640v37H0z"/>
        </g>
        <path fill="#192f5d" d="M0 0h260v259H0z"/>
        <g fill="#fff">
          <g id="us-d">
            <g id="us-c">
              <g id="us-e">
                <g id="us-b">
                  <path id="us-a" d="M20 11.5l3 9.3h9.8l-8 5.7 3.1 9.4-8-5.8-7.9 5.8 3-9.4-7.9-5.7h9.8z" transform="scale(.9)"/>
                  <use xlinkHref="#us-a" y="27"/>
                  <use xlinkHref="#us-a" y="54"/>
                  <use xlinkHref="#us-a" y="81"/>
                  <use xlinkHref="#us-a" y="108"/>
                  <use xlinkHref="#us-a" y="135"/>
                </g>
                <use xlinkHref="#us-a" y="162"/>
              </g>
              <use xlinkHref="#us-b" x="42"/>
            </g>
            <use xlinkHref="#us-c" x="84"/>
          </g>
          <use xlinkHref="#us-d" x="168"/>
          <use xlinkHref="#us-e" x="21" y="13.5"/>
        </g>
      </g>
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 640 480" className="w-full h-full">
      <path fill="#012169" d="M0 0h640v480H0z"/>
      <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
      <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/>
      <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
      <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
    </svg>
  ),
  EU: (
    <svg viewBox="0 0 640 480" className="w-full h-full">
      <defs>
        <g id="eu-d">
          <g id="eu-b">
            <path id="eu-a" d="M0-1l-.3 1 .5.1z"/>
            <use xlinkHref="#eu-a" transform="scale(-1 1)"/>
          </g>
          <g id="eu-c">
            <use xlinkHref="#eu-b" transform="rotate(72)"/>
            <use xlinkHref="#eu-b" transform="rotate(144)"/>
          </g>
          <use xlinkHref="#eu-c" transform="scale(-1 1)"/>
        </g>
      </defs>
      <path fill="#039" d="M0 0h640v480H0z"/>
      <g fill="#fc0" transform="translate(320 242.3) scale(23.7)">
        <use xlinkHref="#eu-d" y="-6"/>
        <use xlinkHref="#eu-d" y="6"/>
        <g id="eu-e">
          <use xlinkHref="#eu-d" x="-6"/>
          <use xlinkHref="#eu-d" transform="rotate(-144 -2.3 -2.1)"/>
          <use xlinkHref="#eu-d" transform="rotate(144 -2.1 -2.3)"/>
          <use xlinkHref="#eu-d" transform="rotate(72 -4.7 -2)"/>
          <use xlinkHref="#eu-d" transform="rotate(72 -5 .5)"/>
        </g>
        <use xlinkHref="#eu-e" transform="scale(-1 1)"/>
      </g>
    </svg>
  ),
  CA: (
    <svg viewBox="0 0 640 480" className="w-full h-full">
      <path fill="#fff" d="M150 0h340v480H150z"/>
      <path fill="#d52b1e" d="M0 0h150v480H0zm490 0h150v480H490zm-240 75l-30 60 60-15-30 60 60-30v60h30v-60l60 30-30-60 60 15-30-60 30 15-60-75-30 30-30-30-60 75z"/>
    </svg>
  ),
}

export default function Flag({ country, size = 20, className = '' }: FlagProps) {
  const flag = flags[country]

  if (!flag) {
    // Fallback to emoji if flag not found
    const emojiMap: Record<string, string> = {
      US: '🇺🇸',
      GB: '🇬🇧',
      EU: '🇪🇺',
      CA: '🇨🇦',
      AU: '🇦🇺',
      DE: '🇩🇪',
      FR: '🇫🇷',
      JP: '🇯🇵',
      CN: '🇨🇳',
      BR: '🇧🇷',
    }
    return <span className={className} style={{ fontSize: size }}>{emojiMap[country] || '🏳️'}</span>
  }

  return (
    <span
      className={`inline-block rounded-sm overflow-hidden shadow-sm ${className}`}
      style={{ width: size * 1.5, height: size }}
    >
      {flag}
    </span>
  )
}
