import logoImage from '../assets/aura-cinema-logo-transparent.png'
import { Link } from 'react-router-dom'

function Logo({ compact = false }) {
  return (
    <Link
      className="inline-flex items-center text-white no-underline"
      to="/"
      aria-label="Aura Cinema"
    >
      <img
        className={`object-contain ${compact ? 'h-20 w-44' : 'h-24 w-56 max-sm:h-16 max-sm:w-40'}`}
        src={logoImage}
        alt="Aura Cinema"
      />
    </Link>
  )
}

export default Logo
