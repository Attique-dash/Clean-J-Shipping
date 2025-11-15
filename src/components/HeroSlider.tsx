"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/images/airplane.png", alt: "Airplane" },
  { src: "/images/ship.png", alt: "Ship" },
  { src: "/images/package.jpg", alt: "Package" },
];

export default function HeroSlider({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Images stacked */}
      {slides.map((s, i) => (
        <div
          key={s.src}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={s.src}
            alt={s.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
