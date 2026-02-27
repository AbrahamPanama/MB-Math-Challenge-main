import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <circle cx="12" cy="12" r="10" fill="currentColor" className="text-primary" />
        <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy=".3em"
            fontSize="12"
            fontWeight="bold"
            fill="hsl(var(--primary-foreground))"
            className="font-headline"
        >
            R
        </text>
    </svg>
  );
}
