'use client';

import {
  ChefHat,
  CookingPot,
  Utensils,
  Carrot,
  Apple,
  Leaf,
  Croissant,
} from 'lucide-react';

const iconProps = {
  size: 32,
  strokeWidth: 1.5,
  className: 'w-10 h-10',
};

const icons = [
  <ChefHat key="chef" {...iconProps} />,
  <CookingPot key="pot" {...iconProps} />,
  <Utensils key="utensils" {...iconProps} />,
  <Carrot key="carrot" {...iconProps} />,
  <Apple key="apple" {...iconProps} />,
  <Leaf key="leaf" {...iconProps} />,
  <Croissant key="croissant" {...iconProps} />,
];

export default function KitchenIconsBackground() {
  return (
    <>
      {icons.map((icon, i) => (
        <div key={i} aria-hidden>
          {icon}
        </div>
      ))}
    </>
  );
}
