import logoImage from '../assets/aura-cinema-logo-transparent.png'

function Logo({ compact = false }) {
  return (
    <a
      className="inline-flex items-center text-white no-underline"
      href="/"
      aria-label="Aura Cinema"
    >
      <img
        className={`object-contain ${compact ? 'h-20 w-44' : 'h-24 w-56 max-sm:h-16 max-sm:w-40'}`}
        src={logoImage}
        alt="Aura Cinema"
      />
    </a>
  )
}

export default Logo
