// src/components/ContextMenu.tsx
import { Fragment, ReactNode, useRef, useState } from 'react';
import { useOnClickOutside } from 'usehooks-ts';

interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
  className?: string;
}

interface ContextMenuProps {
  trigger: (props: { onClick: (e: React.MouseEvent) => void }) => ReactNode;
  items: MenuItem[];
  position?: 'left' | 'right';
  align?: 'top' | 'bottom';
}

export default function ContextMenu({
  trigger,
  items,
  position = 'right',
  align = 'bottom',
}: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCoords({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  const handleClickOutside = () => {
    setIsOpen(false);
  };

  useOnClickOutside(menuRef, handleClickOutside);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position === 'right' ? coords.x : 'auto',
    right: position === 'left' ? window.innerWidth - coords.x : 'auto',
    top: align === 'bottom' ? coords.y : 'auto',
    bottom: align === 'top' ? window.innerHeight - coords.y : 'auto',
    zIndex: 50,
  };

  return (
    <>
      {trigger({ onClick: handleContextMenu })}

      {isOpen && (
        <div
          ref={menuRef}
          className="w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
          style={menuStyle}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <div className="py-1" role="none">
            {items.map((item, index) => (
              <Fragment key={index}>
                {item.divider && <div className="border-t border-gray-100 my-1" />}
                <button
                  type="button"
                  className={`${
                    item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  } group flex items-center w-full px-4 py-2 text-sm ${
                    item.className || ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!item.disabled) {
                      item.onClick();
                      setIsOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  role="menuitem"
                >
                  {item.icon && (
                    <span className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </>
  );
}