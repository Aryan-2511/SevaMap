import { CATEGORY_META, NgoCategory } from '../types';

interface CategoryPinSvgProps {
  category: NgoCategory;
  selected?: boolean;
  hovered?: boolean;
  size?: number;
}

export function CategoryPinSvg({
  category,
  selected = false,
  hovered = false,
  size = 38,
}: CategoryPinSvgProps) {
  const color = CATEGORY_META[category].color;
  const scale = selected ? 1.22 : hovered ? 1.12 : 1;

  const renderGlyph = () => {
    switch (category) {
      case 'children':
        // Graduation / child care star-book emblem
        return (
          <path
            d="M16 10.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"
            fill="#FFFFFF"
          />
        );
      case 'animals':
        // Paw print emblem
        return (
          <g fill="#FFFFFF">
            <circle cx="13" cy="13.5" r="1.35" />
            <circle cx="16" cy="12.2" r="1.35" />
            <circle cx="19" cy="13.5" r="1.35" />
            <path d="M16 15.2c-2.2 0-3.5 1.5-3.5 3 0 1.1.8 1.8 1.9 1.8.6 0 1.1-.2 1.6-.2s1 .2 1.6.2c1.1 0 1.9-.7 1.9-1.8 0-1.5-1.3-3-3.5-3z" />
          </g>
        );
      case 'elderly':
        // Heart & shelter roof emblem
        return (
          <path
            d="M16 20.5s-4.4-2.8-4.4-5.9c0-1.5 1.2-2.6 2.6-2.6.8 0 1.5.4 1.8 1 .3-.6 1-1 1.8-1 1.4 0 2.6 1.1 2.6 2.6 0 3.1-4.4 5.9-4.4 5.9z"
            fill="#FFFFFF"
          />
        );
      case 'disaster_relief':
        // Cross / emergency medical relief emblem
        return (
          <path
            d="M14.7 11.5h2.6v3.2h3.2v2.6h-3.2v3.2h-2.6v-3.2h-3.2v-2.6h3.2z"
            fill="#FFFFFF"
          />
        );
      case 'community':
        // Community hands / leaf emblem
        return (
          <path
            d="M16 11.2c-2.6 0-4.6 2-4.6 4.5 0 2.2 1.5 4 3.6 4.5v-3.1l-1.5-1.4.9-.9 1.6 1.5 1.6-1.5.9.9-1.5 1.4v3.1c2.1-.5 3.6-2.3 3.6-4.5 0-2.5-2-4.5-4.6-4.5z"
            fill="#FFFFFF"
          />
        );
    }
  };

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'bottom center',
        transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className="relative flex flex-col items-center cursor-pointer select-none drop-shadow-md"
    >
      <svg
        width={size}
        height={Math.round(size * 1.22)}
        viewBox="0 0 32 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer selection halo */}
        {selected && (
          <circle
            cx="16"
            cy="16"
            r="15"
            fill={color}
            fillOpacity="0.22"
          />
        )}
        {/* Teardrop pin body */}
        <path
          d="M16 2C8.82 2 3 7.82 3 15c0 9.4 11.45 21.34 12.19 22.1a1.15 1.15 0 0 0 1.62 0C17.55 36.34 29 24.4 29 15 29 7.82 23.18 2 16 2z"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth={selected ? '2.5' : '1.8'}
        />
        {renderGlyph()}
      </svg>
    </div>
  );
}
