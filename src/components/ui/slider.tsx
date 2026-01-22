import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onChange, min = 0, max = 1, step = 0.01, ...props }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-0.5 appearance-none cursor-pointer bg-transparent"
          style={{
            background: `linear-gradient(to right, rgba(168, 162, 158, 0.6) 0%, rgba(168, 162, 158, 0.6) ${percentage}%, rgba(168, 162, 158, 0.15) ${percentage}%, rgba(168, 162, 158, 0.15) 100%)`,
            borderRadius: "2px",
          }}
          {...props}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 2px;
            background: #a8a29e;
            cursor: pointer;
            border: none;
            transition: all 0.5s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            background: #fafaf9;
          }
          input[type="range"]::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 2px;
            background: #a8a29e;
            cursor: pointer;
            border: none;
          }
        `}</style>
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
