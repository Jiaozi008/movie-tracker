import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
  allowClear?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  onRatingChange,
  readonly = false,
  size = 20,
  allowClear = true,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const effectiveRating = hoverRating !== null ? hoverRating : rating;

  const handleClick = (value: number) => {
    if (readonly || !onRatingChange) return;
    if (allowClear && rating === value) {
      onRatingChange(0);
    } else {
      onRatingChange(value);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1 touch-manipulation select-none"
      onMouseLeave={() => !readonly && setHoverRating(null)}
    >
      {Array.from({ length: maxRating }).map((_, i) => {
        const starBase = i;
        const leftValue = starBase + 0.5;
        const rightValue = starBase + 1.0;

        // Calculate fill percentage: 0%, 50%, or 100%
        let fillPercent = 0;
        if (effectiveRating >= rightValue) {
          fillPercent = 100;
        } else if (effectiveRating >= leftValue) {
          fillPercent = 50;
        }

        return (
          <div
            key={i}
            className={`relative inline-flex items-center justify-center ${readonly ? 'cursor-default' : 'cursor-pointer group'}`}
            style={{ width: size, height: size }}
          >
            {/* Background Empty Star */}
            <Star
              size={size}
              className="text-slate-600 shrink-0 transition-colors"
              strokeWidth={1.5}
            />

            {/* Foreground Filled Star with clip */}
            {fillPercent > 0 && (
              <div
                className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none transition-all duration-150"
                style={{ width: `${fillPercent}%` }}
              >
                <Star
                  size={size}
                  className="fill-yellow-400 text-yellow-400 shrink-0"
                  strokeWidth={0}
                />
              </div>
            )}

            {/* Interactive Hit Areas (Desktop & Mobile) */}
            {!readonly && (
              <div className="absolute inset-0 flex z-10">
                {/* Left Half (0.5 star) */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${leftValue} 星`}
                  className="w-1/2 h-full cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHoverRating(leftValue)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(leftValue);
                  }}
                />
                {/* Right Half (1.0 star) */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${rightValue} 星`}
                  className="w-1/2 h-full cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHoverRating(rightValue)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(rightValue);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};