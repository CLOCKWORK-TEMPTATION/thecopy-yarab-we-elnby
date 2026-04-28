/**
 * @module app-header/HeaderBrand
 * @description مكون العلامة التجارية في الهيدر
 */

import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

interface HeaderBrandProps {
  infoDotColor: string;
  brandGradient: string;
}

export function HeaderBrand({
  infoDotColor,
  brandGradient,
}: HeaderBrandProps): React.JSX.Element {
  return (
    <HoverBorderGradient
      containerClassName="app-header-brand rounded-full"
      className="flex h-11 items-center gap-2.5 bg-transparent px-5"
      duration={2}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: infoDotColor,
          boxShadow: `0 0 8px ${infoDotColor}66`,
        }}
        aria-hidden="true"
      />
      <span
        className="bg-clip-text text-[15px] font-bold text-transparent"
        style={{ backgroundImage: brandGradient }}
      >
        أفان تيتر
      </span>
    </HoverBorderGradient>
  );
}
